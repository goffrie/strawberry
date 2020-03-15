use parking_lot::RwLock;
use rand::seq::SliceRandom;
use rand::thread_rng;
use serde::{Deserialize, Serialize};
use std::collections::hash_map::Entry;
use std::collections::HashMap;
use std::convert::Infallible;
use std::net::ToSocketAddrs;
use std::sync::Arc;
use std::time::Duration;
use std::{env, io};
use tokio::time::timeout;
use warp::http::StatusCode;
use warp::reply::Reply;
use warp::Filter;

mod words;

const SIZE_LIMIT: u64 = 1024 * 1024; // 1MB
const LIST_TIMEOUT: Duration = Duration::from_secs(45);

#[tokio::main]
async fn main() -> io::Result<()> {
    let listen_addr = env::args().nth(1).ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::InvalidInput,
            "First argument should be listen host:port",
        )
    })?;
    let static_dir = env::args().nth(2).ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::InvalidInput,
            "Second argument should be static directory",
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
    let state_ = Arc::clone(&state);
    let list = warp::path!("list")
        .and(warp::body::json())
        .and_then(move |req| {
            let state_ = Arc::clone(&state_);
            async move {
                match timeout(LIST_TIMEOUT, state_.list(req)).await {
                    Ok(Some(reply)) => Ok(reply.into_response()),
                    Ok(None) => Err(warp::reject::not_found()),
                    Err(_) => {
                        Ok(warp::reply::with_status("", StatusCode::NO_CONTENT).into_response())
                    }
                }
            }
        });
    let state_ = Arc::clone(&state);
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
    let stateful_routes = warp::post()
        .and(warp::body::content_length_limit(SIZE_LIMIT))
        .and(list.or(commit).or(make_room));
    let static_routes = warp::get().and(warp::fs::dir(static_dir));
    warp::serve(stateful_routes.or(static_routes))
        .run(listen_addr)
        .await;
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
    data: Box<serde_json::value::RawValue>,
}

#[derive(Deserialize)]
struct ListReq {
    version: u32,
    room: String,
}

#[derive(Serialize)]
struct ListReply<'a> {
    version: u32,
    data: &'a serde_json::value::RawValue,
}

#[derive(Deserialize)]
struct CommitReq {
    version: u32,
    room: String,
    data: Box<serde_json::value::RawValue>,
}

#[derive(Serialize)]
struct CommitReply {
    success: bool,
}

#[derive(Deserialize)]
struct MakeRoomReq {
    data: Box<serde_json::value::RawValue>,
}

#[derive(Serialize)]
struct MakeRoomReply {
    room: String,
}

impl State {
    async fn list(&self, req: ListReq) -> Option<warp::reply::Json> {
        loop {
            let event = {
                let inner = self.inner.read();
                let room = inner.rooms.get(&req.room)?;
                if room.version != req.version {
                    return Some(warp::reply::json(&ListReply {
                        version: room.version,
                        data: &room.data,
                    }));
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
