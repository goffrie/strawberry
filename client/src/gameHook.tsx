import { useState, useEffect } from 'react';
import { RoomState } from './gameState';
import { callList } from './gameAPI';

export type StrawberryGame = {
    // null if loading
    gameState: RoomState | null,
    stateVersion: number,
};

const nullState: StrawberryGame = {gameState: null, stateVersion: 0};

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
