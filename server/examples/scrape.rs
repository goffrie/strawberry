use bytes::buf::ext::BufExt;
use std::collections::BTreeMap;
use serde::{Serialize, Deserialize};

#[path = "../src/words.rs"]
mod words;

#[tokio::main]
async fn main() {
    let url = std::env::args().nth(1).unwrap();
    let mut state = State { rooms: Default::default() };
    let client = hyper::Client::new();
    for &word1 in words::FRUITS {
        for &word2 in words::FRUITS {
            let room_name = format!("{}.{}", word1, word2);
            let request = serde_json::to_string(&ListReq { version: 0, room: &room_name }).unwrap();
            let response = client.request(hyper::Request::post(&url).body(request.into()).unwrap()).await.expect("request failed");
            let response_data = hyper::body::aggregate(response.into_body()).await.expect("read failed");
            let reply: Option<ListReply> = serde_json::from_reader(response_data.reader()).expect("json failed");
            if let Some(reply) = reply {
                eprintln!("{}", room_name);
                state.rooms.insert(room_name, reply);
            }
        }
    }
    serde_json::to_writer(std::io::stdout().lock(), &state).unwrap();
}


#[derive(Serialize)]
struct ListReq<'a> {
    version: u32,
    room: &'a str,
}

#[derive(Serialize, Deserialize)]
struct ListReply {
    version: u32,
    data: Box<serde_json::value::RawValue>,
}

#[derive(Serialize)]
struct State {
    rooms: BTreeMap<String, ListReply>,
}