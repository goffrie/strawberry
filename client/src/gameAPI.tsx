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

export async function callList(room: string, version: number, signal?: AbortSignal): Promise<ListReply> {
    const resp = await fetch("/list", {
        method: "POST",
        cache: "no-cache",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({ room, version }),
        signal,
    });
    return await resp.json();
}

export async function callCommit(room: string, version: number, data: RoomState, signal?: AbortSignal): Promise<CommitReply> {
    const resp = await fetch("/make_room", {
        method: "POST",
        cache: "no-cache",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({ room, version, data }),
        signal,
    });
    return await resp.json();
}

export async function callMakeRoom(data: RoomState, signal?: AbortSignal): Promise<MakeRoomReply> {
    const resp = await fetch("/make_room", {
        method: "POST",
        cache: "no-cache",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({ data }),
        signal,
    });
    return await resp.json();
}
