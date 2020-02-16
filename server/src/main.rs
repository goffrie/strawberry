use parking_lot::RwLock;
use rand::seq::SliceRandom;
use rand::thread_rng;
use serde::{Deserialize, Serialize};
use std::collections::hash_map::Entry;
use std::collections::HashMap;
use std::convert::Infallible;
use std::net::ToSocketAddrs;
use std::sync::Arc;
use std::{env, io};
use warp::Filter;

mod words;

#[tokio::main]
async fn main() -> io::Result<()> {
    let listen_addr = env::args().nth(1).ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::InvalidInput,
            "First argument should be listen host:port",
        )
    })?;
    let listen_addr = listen_addr
        .to_socket_addrs()?
        .into_iter()
        .next()
        .ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::InvalidInput,
                "Listen address resolved to nothing",
            )
        })?;
    println!("Listening on {}", listen_addr);
    let state = Arc::new(State::default());
    let state_ = state.clone();
    let list = warp::path!("list")
        .and(warp::body::json())
        .and_then(move |req| {
            let state_ = state_.clone();
            async move { Ok::<_, Infallible>(warp::reply::json(&state_.list(req).await)) }
        });
    let state_ = state.clone();
    let commit = warp::path!("commit")
        .and(warp::body::json())
        .map(move |req| {
            warp::reply::json(&CommitReply {
                success: state_.commit(req),
            })
        });
    let make_room = warp::path!("make_room")
        .and(warp::body::json())
        .map(move |req| warp::reply::json(&state.make_room(req)));
    let mutating_routes = warp::post().and(list.or(commit).or(make_room));
    warp::serve(mutating_routes).run(listen_addr).await;
    Ok(())
}

#[derive(Default)]
struct State {
    inner: RwLock<Inner>,
}

#[derive(Default)]
struct Inner {
    rooms: HashMap<String, Room>,
}

struct Room {
    version: u32,
    event: Arc<futures_intrusive::channel::OneshotBroadcastChannel<Infallible>>,
    data: serde_json::Value,
}

#[derive(Deserialize)]
struct ListReq {
    version: u32,
    room: String,
}

#[derive(Serialize)]
struct ListReply {
    version: u32,
    data: serde_json::Value,
}

#[derive(Deserialize)]
struct CommitReq {
    version: u32,
    room: String,
    data: serde_json::Value,
}

#[derive(Serialize)]
struct CommitReply {
    success: bool,
}

#[derive(Deserialize)]
struct MakeRoomReq {
    data: serde_json::Value,
}

#[derive(Serialize)]
struct MakeRoomReply {
    room: String,
}

impl State {
    async fn list(&self, req: ListReq) -> Option<ListReply> {
        loop {
            let event = {
                let inner = self.inner.read();
                let room = inner.rooms.get(&req.room)?;
                if room.version != req.version {
                    return Some(ListReply {
                        version: room.version,
                        data: room.data.clone(),
                    });
                } else {
                    room.event.clone()
                }
            };
            event.receive().await;
        }
    }

    fn commit(&self, req: CommitReq) -> bool {
        let mut inner = self.inner.write();
        let room = if let Some(r) = inner.rooms.get_mut(&req.room) {
            r
        } else {
            return false;
        };
        if room.version != req.version {
            return false;
        }
        room.data = req.data;
        room.version += 1;
        room.event.close();
        room.event = Arc::new(futures_intrusive::channel::OneshotBroadcastChannel::new());
        true
    }

    fn make_room(&self, req: MakeRoomReq) -> MakeRoomReply {
        let mut inner = self.inner.write();
        let mut rng = thread_rng();
        loop {
            let room = format!(
                "{}.{}",
                words::FRUITS.choose(&mut rng).unwrap(),
                words::FRUITS.choose(&mut rng).unwrap(),
            );
            match inner.rooms.entry(room.clone()) {
                Entry::Occupied(_) => continue,
                Entry::Vacant(v) => {
                    v.insert(Room {
                        version: 1,
                        event: Arc::new(futures_intrusive::channel::OneshotBroadcastChannel::new()),
                        data: req.data,
                    });
                }
            }
            return MakeRoomReply { room };
        }
    }
}
