import { useState, useEffect } from 'react';
import { RoomPhase, RoomState } from './gameState';
import { MAX_PLAYERS, setPlayerWord, addPlayerToRoom } from './gameLogic';
import { callCommit, callList } from './gameAPI';

export type StrawberryGame = Readonly<{
    // null if loading
    gameState: RoomState | null,
    stateVersion: number,
}>;

const nullState: StrawberryGame = Object.freeze({ gameState: null, stateVersion: 0 });

export function useStrawberryGame(roomName: string): StrawberryGame {
    const [state, setState] = useState(nullState);
    useEffect(() => {
        const abortController = new AbortController();
        callList(roomName, state.stateVersion, abortController.signal)
            .then((result) => {
                if (result == null) {
                    // TODO: potentially add error state
                    setState(nullState);
                } else {
                    setState({
                        gameState: result.data,
                        stateVersion: result.version,
                    });
                }
            });
        return () => abortController.abort();
    });
    return state;
}

export enum JoinRoomStatus {
    // The game has not loaded or doesn't exist.
    WAITING = 'waiting',
    // We are actively trying to join the room.
    JOINING = 'joining',
    // We are a member of the room!
    JOINED = 'joined',
    // The room is full :(
    ROOM_FULL = 'room_full',
    // The game has started.
    GAME_STARTED = 'game_started',
}

export function useJoinRoom(roomName: string, game: StrawberryGame, playerName: string): JoinRoomStatus {
    const room = game.gameState;
    let status: JoinRoomStatus;
    if (room == null) status = JoinRoomStatus.WAITING;
    // can't join if the game has started
    else if (room.phase !== RoomPhase.START) status = JoinRoomStatus.GAME_STARTED;
    else if (room.players.some((player) => player.name === playerName)) status = JoinRoomStatus.JOINED;
    else if (room.players.length >= MAX_PLAYERS) status = JoinRoomStatus.ROOM_FULL;
    else status = JoinRoomStatus.JOINING;
    useEffect(() => {
        if (status !== JoinRoomStatus.JOINING) return;
        if (room == null) throw new Error("impossible");
        if (room.phase !== RoomPhase.START) throw new Error("impossible");
        const abortController = new AbortController();
        callCommit(roomName, game.stateVersion, addPlayerToRoom(room, playerName));
        return () => abortController.abort();
    }, [room, status, roomName, game.stateVersion, playerName]);
    return status;
}

export function useInputWord(roomName: string, game: StrawberryGame, playerName: string, word: string | null): void {
    useEffect(() => {
        const abortController = new AbortController();
        const room = game.gameState;
        if (room == null) return;
        if (room.phase !== RoomPhase.START) return;
        if (!room.players.some((player) => player.name === playerName && player.word !== word)) return;
        callCommit(roomName, game.stateVersion, setPlayerWord(room, playerName, word), abortController.signal);
        return () => abortController.abort();
    }, [roomName, game.gameState, game.stateVersion, playerName, word]);
}
