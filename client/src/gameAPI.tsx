import { RoomState } from './gameState';

// null if the room does not exist
export type ListReply = {
    version: number,
    data: RoomState,
} | null;

export type CommitReply = {
    success: boolean,
};

export type MakeRoomReply = {
    // the new room name
    room: string,
};

async function call(endpoint: string, data: object, signal?: AbortSignal): Promise<any> {
    const resp = await fetch(endpoint, {
        method: "POST",
        cache: "no-cache",
        headers: {"content-type": "application/json"},
        body: JSON.stringify(data),
        signal,
    });
    return await resp.json();
}

export function callList(room: string, version: number, signal?: AbortSignal): Promise<ListReply> {
    return call("/list", { room, version }, signal);
}

export function callCommit(room: string, version: number, data: RoomState, signal?: AbortSignal): Promise<CommitReply> {
    return call("/commit", { room, version, data }, signal);
}

export function callMakeRoom(data: RoomState, signal?: AbortSignal): Promise<MakeRoomReply> {
    return call("/make_room", { data }, signal);
}
