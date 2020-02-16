import { useState, useEffect } from 'react';
import { delay } from './utils';
import { RoomPhase, RoomState, StartingPhase } from './gameState';
import { MAX_PLAYERS, setPlayerWord, addPlayerToRoom } from './gameLogic';
import { callCommit, callList } from './gameAPI';

export type StrawberryGame = Readonly<{
    gameState: RoomState,
    stateVersion: number,
}>;

async function listLoop(roomName: string, version: number, signal: AbortSignal): Promise<StrawberryGame | null> {
    while (true) {
        try {
            const result = await callList(roomName, version, signal);
            if (result == null) {
                // TODO: potentially add error state
                return null;
            } else {
                return {
                    gameState: result.data,
                    stateVersion: result.version,
                };
            }
        } catch (e) {
            if (signal.aborted) return null;
            console.error(e);
            // probably timed out.
            // back off and retry
            await delay(1000);
            continue;
        }
    }
}

export function useStrawberryGame(roomName: string): StrawberryGame | null {
    const [state, setState] = useState<StrawberryGame | null>(null);
    const version = state?.stateVersion || 0;
    useEffect(() => {
        const abortController = new AbortController();
        listLoop(roomName, version, abortController.signal).then(setState);
        return () => abortController.abort();
    }, [roomName, version]);
    return state;
}

export enum JoinRoomStatus {
    // We are actively trying to join the room.
    JOINING = 'joining',
    // We are a member of the room!
    JOINED = 'joined',
    // The room is full :(
    ROOM_FULL = 'room_full',
}

// TODO: consider using a context to pass through roomName, stateVersion, playerName
export function useJoinRoom(roomName: string, room: StartingPhase, stateVersion: number, playerName: string): JoinRoomStatus {
    let status: JoinRoomStatus;
    if (room.players.some((player) => player.name === playerName)) status = JoinRoomStatus.JOINED;
    else if (room.players.length >= MAX_PLAYERS) status = JoinRoomStatus.ROOM_FULL;
    else status = JoinRoomStatus.JOINING;
    useEffect(() => {
        if (status !== JoinRoomStatus.JOINING) return;
        const abortController = new AbortController();
        callCommit(roomName, stateVersion, addPlayerToRoom(room, playerName))
            .catch((reason) => {
                console.error(reason);
            });
        return () => abortController.abort();
    }, [room, status, roomName, stateVersion, playerName]);
    return status;
}

export function useInputWord(roomName: string, room: StartingPhase, stateVersion: number, playerName: string): [string | null, (newWord: string | null) => void] {
    const [transition, setTransition] = useState<(Readonly<{from: string | null, to: string | null}> | null)>(null);
    useEffect(() => {
        if (transition == null) return;
        if (!room.players.some((player) => player.name === playerName && player.word !== transition.from)) return;
        const abortController = new AbortController();
        callCommit(roomName, stateVersion, setPlayerWord(room, playerName, transition.to), abortController.signal)
            .catch((reason) => {
                console.error(reason);
            });
        return () => abortController.abort();
    }, [roomName, room, stateVersion, playerName, transition]);
    for (const player of room.players) {
        if (player.name === playerName) {
            let word = player.word;
            if (transition != null && word === transition.from) {
                word = transition.to;
            }
            return [word, (newWord) => {
                setTransition({from: player.word, to: newWord});
            }];
        }
    }
    // not in the game!
    return [null, (_) => {}];
}