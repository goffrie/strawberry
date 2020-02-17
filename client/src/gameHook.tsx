import React, { useState, useEffect, useContext } from 'react';
import { delay } from './utils';
import { HintSpecs } from './gameTypes';
import { RoomState, StartingPhase, HintingPhase, ProposingHintPhase } from './gameState';
import {
    MAX_PLAYERS,
    addPlayerToRoom,
    getPlayerNumber,
    isRoomReady,
    setPlayerWord,
    setProposedHint,
    startGameRoom,
} from './gameLogic';
import { callCommit, callList } from './gameAPI';

export type StrawberryGame = Readonly<{
    roomName: string,
    gameState: RoomState,
    stateVersion: number,
}>;

export const RoomContext = React.createContext<StrawberryGame | null>(null);
export const PlayerNameContext = React.createContext<string>("");

export function StrawberryGameProvider({ roomName, children }: { roomName: string, children: React.ReactNode }) {
    const game = useListStrawberryGame(roomName);
    return <RoomContext.Provider value={game}>
        {children}
    </RoomContext.Provider>;
}

async function listLoop(roomName: string, version: number, signal: AbortSignal): Promise<StrawberryGame | null> {
    while (true) {
        try {
            const result = await callList(roomName, version, signal);
            if (result == null) {
                // TODO: potentially add error state
                return null;
            } else {
                return {
                    roomName,
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

function useListStrawberryGame(roomName: string): StrawberryGame | null {
    const [state, setState] = useState<StrawberryGame | null>(null);
    const version = state?.stateVersion || 0;
    useEffect(() => {
        const abortController = new AbortController();
        listLoop(roomName, version, abortController.signal).then(setState);
        return () => abortController.abort();
    }, [roomName, version]);
    return state;
}

// Gain access to the StrawberryGame from context.
export function useStrawberryGame(): StrawberryGame | null {
    return useContext(RoomContext);
}

export enum JoinRoomStatus {
    // We are actively trying to join the room.
    JOINING = 'joining',
    // We are a member of the room!
    JOINED = 'joined',
    // The room is full :(
    ROOM_FULL = 'room_full',
}

export function useJoinRoom(room: StartingPhase): JoinRoomStatus {
    const { roomName, stateVersion } = useStrawberryGame()!;
    const playerName = useContext(PlayerNameContext);
    if (playerName == null) {
        throw new Error("PlayerNameContext not provided");
    }
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

function useMutateGame<Room, Mutation>(room: Room, allowed: boolean, mutator: (room: Room, mutation: Mutation) => RoomState): (arg: Mutation) => void {
    const { roomName, stateVersion } = useStrawberryGame()!;
    const [mutation, setMutation] = useState<Mutation | null>(null);
    useEffect(() => {
        if (mutation == null) return;
        if (!allowed) {
            setMutation(null);
        }
        const newRoom = mutator(room, mutation);
        // TODO: check room != newRoom
        const abortController = new AbortController();
        callCommit(roomName, stateVersion, newRoom, abortController.signal)
            .then((response) => {
                if (response.success) {
                    setMutation(null);
                } else {
                    console.log("commit failed; race condition occurred");
                }
            })
            .catch((reason) => {
                if (!abortController.signal.aborted) {
                    console.error(reason);
                }
            });
    }, [roomName, stateVersion, room, allowed, mutator, mutation]);
    return setMutation;
}

function inputWordMutator(room: StartingPhase, {playerName, word}: {playerName: string, word: string | null}): StartingPhase {
    return setPlayerWord(room, playerName, word);
}

export function useInputWord(room: StartingPhase): (newWord: string | null) => void {
    const playerName = useContext(PlayerNameContext);
    if (playerName == null) {
        throw new Error("PlayerNameContext not provided");
    }
    const allowed = room.players.some(player => player.name === playerName);
    const mutate = useMutateGame(room, allowed, inputWordMutator);
    return (word) => {
        if (!allowed) {
            throw new Error("attempting to set word but we're not in the game");
        }
        mutate({playerName, word});
    };
}

function startGameMutator(room: StartingPhase, _: {}): HintingPhase {
    return startGameRoom(room);
}

export function useStartGame(room: StartingPhase): (() => void) | null {
    const allowed = isRoomReady(room);
    const mutate = useMutateGame(room, allowed, startGameMutator);
    return allowed ? () => mutate({}) : null;
}

function proposeHintMutator(room: ProposingHintPhase, {playerName, specs}: {playerName: string, specs: HintSpecs}): ProposingHintPhase {
    return setProposedHint(room, playerName, specs);
}

export function useProposeHint(room: ProposingHintPhase): ((specs: HintSpecs) => void) | null {
    const playerName = useContext(PlayerNameContext);
    if (playerName == null) {
        throw new Error("PlayerNameContext not provided");
    }
    const allowed = getPlayerNumber(room, playerName) != null;
    const mutate = useMutateGame(room, allowed, proposeHintMutator);
    return allowed ? (specs) => mutate({playerName, specs}) : null;
}
