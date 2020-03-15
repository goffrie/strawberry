import { RoomState } from './gameState';

// null means the room doesn't exist
export type ListReply = {
    version: number,
    data: RoomState,
} | {
    timeout: true,
} | null;

export type CommitReply = {
    success: boolean,
};

export type MakeRoomReply = {
    // the new room name
    room: string,
};

async function call(endpoint: string, data: object, signal?: AbortSignal): Promise<Response> {
    return await fetch(endpoint, {
        method: "POST",
        cache: "no-cache",
        headers: {"content-type": "application/json"},
        body: JSON.stringify(data),
        signal,
    });
}

export async function callList(room: string, version: number, signal?: AbortSignal): Promise<ListReply> {
    const resp = await call("/list", { room, version }, signal);
    switch (resp.status) {
        case 200: return await resp.json();
        case 204: return { timeout: true };
        case 404: return null;
        default: throw new Error(`/list returned unexpected status code ${resp.status}`);
    }
}

export async function callCommit(room: string, version: number, data: RoomState, signal?: AbortSignal): Promise<CommitReply> {
    return await (await call("/commit", { room, version, data }, signal)).json();
}

export async function callMakeRoom(data: RoomState, signal?: AbortSignal): Promise<MakeRoomReply> {
    return await (await call("/make_room", { data }, signal)).json();
}
