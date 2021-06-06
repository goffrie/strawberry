use anyhow::Context;
use parking_lot::RwLock;
use rand::seq::SliceRandom;
use rand::thread_rng;
use rand::Rng;
use serde::{Deserialize, Serialize};
use std::collections::hash_map::Entry;
use std::collections::HashMap;
use std::convert::Infallible;
use std::net::ToSocketAddrs;
use std::path::Path;
use std::sync::Arc;
use std::time::Duration;
use std::{env, fs, io};
use tokio::signal::ctrl_c;
use tokio::signal::unix::{signal, SignalKind};
use tokio::time::timeout;
use warp::http::StatusCode;
use warp::reply::Reply;
use warp::Filter;

mod words;

const SIZE_LIMIT: u64 = 1024 * 1024; // 1MB
const LIST_TIMEOUT: Duration = Duration::from_secs(45);
const DUMP_FILENAME: &str = "room_data.json";

#[tokio::main(flavor = "current_thread")]
async fn main() -> anyhow::Result<()> {
    let (listen_addr, static_dir, data_path) = {
        let mut args = env::args().skip(1);
        match (args.next(), args.next(), args.next()) {
            (Some(a), Some(b), Some(c)) => (a, b, c),
            _ => {
                anyhow::bail!("Usage: globby LISTEN_ADDRESS STATIC_DIRECTORY DATA_DIRECTORY");
            }
        }
    };
    let data_path = Path::new(&data_path);
    std::fs::create_dir_all(&data_path)
        .with_context(|| format!("Error creating data path {}", data_path.display()))?;
    let listen_addr = listen_addr
        .to_socket_addrs()
        .with_context(|| format!("Error resolving listen address {}", listen_addr))?
        .into_iter()
        .next()
        .context("Listen address resolved to nothing")?;
    let state = Arc::new(State {
        inner: RwLock::new(Inner::load_state(data_path).context("Error loading state")?),
    });
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
    let state_ = Arc::clone(&state);
    let make_room = warp::path!("make_room")
        .and(warp::body::json())
        .map(move |req| warp::reply::json(&state_.make_room(req)));
    let stateful_routes = warp::post()
        .and(warp::body::content_length_limit(SIZE_LIMIT))
        .and(list.or(commit).or(make_room));
    let static_routes = warp::get().and(warp::fs::dir(static_dir));
    let mut sigterm = signal(SignalKind::terminate())?;
    let ctrl_c = ctrl_c();
    let (listen_addr, server) =
        warp::serve(stateful_routes.or(static_routes)).try_bind_ephemeral(listen_addr)?;
    println!("Listening on {}", listen_addr);
    tokio::select! {
        _ = server => panic!("server cannot exit"),
        _ = sigterm.recv() => {
            println!("Received SIGTERM, shutting down");
        },
        _ = ctrl_c => {
            println!("\nReceived Ctrl-C, shutting down");
        },
    };
    state
        .inner
        .read()
        .dump_state(data_path)
        .context("Error dumping state")?;
    Ok(())
}

struct State {
    inner: RwLock<Inner>,
}

#[derive(Default, Serialize, Deserialize)]
struct Inner {
    rooms: HashMap<String, Room>,
}

#[derive(Serialize, Deserialize)]
struct Room {
    version: u32,
    #[serde(skip)]
    #[serde(default = "new_event")]
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
        room.event = new_event();
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
                        event: new_event(),
                        data: req.data,
                    });
                }
            }
            return MakeRoomReply { room };
        }
    }
}

fn new_event() -> Arc<futures_intrusive::channel::OneshotBroadcastChannel<Infallible>> {
    Arc::new(futures_intrusive::channel::OneshotBroadcastChannel::new())
}

impl Inner {
    fn dump_state(&self, data_path: &Path) -> anyhow::Result<()> {
        let dump_path = data_path.join(DUMP_FILENAME);
        println!("Dumping server state to {}", data_path.display());
        let random_path = data_path.join(format!("tmp.{:032x}", rand::thread_rng().gen::<u128>()));
        let mut dump_file =
            io::BufWriter::new(fs::File::create(&random_path).context("Error creating data dump")?);
        serde_json::to_writer(&mut dump_file, self).context("Error writing to data dump")?;
        let dump_file = dump_file
            .into_inner()
            .context("Error writing to data dump")?;
        dump_file.sync_all().context("Error writing to data dump")?;
        fs::rename(&random_path, &dump_path).context("Error writing to data dump")?;
        Ok(())
    }

    fn load_state(data_path: &Path) -> anyhow::Result<Inner> {
        let dump_path = data_path.join(DUMP_FILENAME);
        match fs::File::open(&dump_path) {
            Ok(f) => serde_json::from_reader(io::BufReader::new(f))
                .with_context(|| format!("Error reading dump file {}", dump_path.display())),
            Err(ref e) if e.kind() == io::ErrorKind::NotFound => Ok(Inner::default()),
            Err(e) => {
                Err(e).with_context(|| format!("Could not open dump file {}", dump_path.display()))
            }
        }
    }
}
