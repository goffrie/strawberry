import { useState, useEffect } from 'react';
import { RoomPhase, RoomState } from './gameState';
import { joinRoom } from './gameActions';
import { callList } from './gameAPI';

export type StrawberryGame = Readonly<{
    // null if loading
    gameState: RoomState | null,
    stateVersion: number,
}>;

const nullState: StrawberryGame = Object.freeze({gameState: null, stateVersion: 0});

export function useStrawberryGame(roomName: string): StrawberryGame {
    const [state, setState] = useState(nullState);
    useEffect(() => {
        const abortController = new AbortController();
        callList(roomName, state.stateVersion, abortController.signal)
            .then((result) => {
                if (result == null) {
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

export function useJoinRoom(roomName: string, game: StrawberryGame, playerName: string): void {
    useEffect(() => {
        const gameState = game.gameState;
        if (gameState == null) return;
        // can't join if the game has started
        if (gameState.phase !== RoomPhase.START) return;
        // TODO: gross
        joinRoom(roomName, { gameState, stateVersion: game.stateVersion }, playerName);
    }, [game.stateVersion]);
}
