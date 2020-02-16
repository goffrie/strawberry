import { useState, useEffect } from 'react';
import { RoomPhase, RoomState } from './gameState';
import { MAX_PLAYERS, setPlayerWord, addPlayerToRoom } from './gameLogic';
import { callCommit, callList } from './gameAPI';

export type StrawberryGame = Readonly<{
    gameState: RoomState,
    stateVersion: number,
}>;

export function useStrawberryGame(roomName: string): StrawberryGame | null {
    const [state, setState] = useState<StrawberryGame | null>(null);
    useEffect(() => {
        const abortController = new AbortController();
        callList(roomName, state?.stateVersion || 0, abortController.signal)
            .then((result) => {
                if (result == null) {
                    // TODO: potentially add error state
                    setState(null);
                } else {
                    setState({
                        gameState: result.data,
                        stateVersion: result.version,
                    });
                }
            })
            .catch((reason) => {
                console.error(reason);
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

export function useJoinRoom(roomName: string, game: StrawberryGame | null, playerName: string): JoinRoomStatus {
    const room = game?.gameState;
    let status: JoinRoomStatus;
    if (room == null) status = JoinRoomStatus.WAITING;
    // can't join if the game has started
    else if (room.phase !== RoomPhase.START) status = JoinRoomStatus.GAME_STARTED;
    else if (room.players.some((player) => player.name === playerName)) status = JoinRoomStatus.JOINED;
    else if (room.players.length >= MAX_PLAYERS) status = JoinRoomStatus.ROOM_FULL;
    else status = JoinRoomStatus.JOINING;
    useEffect(() => {
        if (status !== JoinRoomStatus.JOINING) return;
        if (game == null || room == null || room.phase !== RoomPhase.START) throw new Error("impossible");
        const abortController = new AbortController();
        callCommit(roomName, game.stateVersion, addPlayerToRoom(room, playerName))
            .catch((reason) => {
                console.error(reason);
            });
        return () => abortController.abort();
    }, [room, status, roomName, game, playerName]);
    return status;
}

export function useInputWord(roomName: string, game: StrawberryGame, playerName: string): [string | null, (newWord: string | null) => void] {
    const [transition, setTransition] = useState<(Readonly<{from: string | null, to: string | null}> | null)>(null);
    useEffect(() => {
        if (transition == null) return;
        if (game == null) return;
        const room = game.gameState;
        if (room.phase !== RoomPhase.START) return;
        if (!room.players.some((player) => player.name === playerName && player.word !== transition.from)) return;
        const abortController = new AbortController();
        callCommit(roomName, game.stateVersion, setPlayerWord(room, playerName, transition.to), abortController.signal)
            .catch((reason) => {
                console.error(reason);
            });
        return () => abortController.abort();
    }, [roomName, game, playerName, transition]);
    if (game != null && game.gameState.phase === RoomPhase.START) {
        for (const player of game.gameState.players) {
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
    }
    return [null, (_) => {}];
}
