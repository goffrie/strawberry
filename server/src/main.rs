use std::cell::RefCell;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::{env, error, io};
use std::rc::Rc;
use tokio::net::TcpListener;
use tokio::stream::StreamExt;
use warp::Filter;
use rand::thread_rng;

#[tokio::main]
async fn main() -> io::Result<()> {
    let listen_addr = env::args().nth(1).ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::InvalidInput,
            "First argument should be listen host:port",
        )
    })?;
    let state = State::default();
    let list = warp::post()
        .and(warp::path!("list"))
        .and(warp::body::json())
        .map(|req| warp::reply::json(state.list(req)));
    let commit = warp::post()
        .and(warp::path!("commit"))
        .and(warp::body::json())
        .map(|req| warp::reply::json(state.commit(req)));
    let make_room = warp::post()
        .and(warp::path!("make_room"))
        .map(|req| warp::reply::json(state.make_room()));
    warp::serve(list.or(commit).or(make_room)).run(&listen_addr).await;
}

#[derive(Default)]
struct State {
    inner: RefCell<Inner>,
}

#[derive(Default)]
struct Inner {
    rooms: HashMap<String, Room>,
}

struct Room {
    version: u32,
    event: Rc<futures_intrusive::channel::LocalOneshotBroadcastChannel<()>>,
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
struct MakeRoomReply {
    room: String,
}

impl State {
    async fn list(&self, req: &ListReq) -> Option<ListReply> {
        loop {
            let inner = self.inner.borrow();
            let room = inner.rooms.get(&req.room)?;
            if room.version < req.version {
                let event = inner.event.clone();
                drop(inner);
                event.receive().await;
            } else {
                return Some(ListReply {
                    version: room.version,
                    data: room.data.clone(),
                });
            }
        }
    }

    fn commit(&self, req: &CommitReq) -> bool {
        let mut inner = self.inner.borrow_mut();
        let room = if let Some(r) = inner.rooms.get_mut(&req.room) { r } else { return false; };
        if room.version != req.version { return false; }
        room.data = req.data;
        room.version += 1;
        room.event.send(());
        true
    }

    fn make_room(&self) -> MakeRoomReply {

    }
}
