import React, { useState, useEffect, useContext } from 'react';
import { delay, deepEqual } from './utils';
import { Hint, Letter, PlayerNumber } from './gameTypes';
import {
    HintingPhase,
    HintingPhasePlayer,
    ProposingHintPhase,
    ResolveAction,
    ResolvingHintPhase,
    RoomPhase,
    RoomState,
    StartingPhase,
    StartedPhase,
    StartedPlayer,
    EndgamePhase,
    EndgameLetterChoice,
} from './gameState';
import {
    addPlayerToRoom,
    getPlayerNumber,
    giveHint,
    isRoomReady,
    MAX_PLAYERS,
    setPlayerWord,
    setProposedHint,
    startGameRoom,
    performResolveAction,
    setHandGuess,
    setFinalGuess,
    removePlayerFromRoom,
    commitFinalGuess,
} from './gameLogic';
import {callCommit, callList} from './gameAPI';

export type StrawberryGame = Readonly<{
    roomName: string,
    gameState: RoomState,
    stateVersion: number,
}>;

export const RoomContext = React.createContext<StrawberryGame | null>(null);
export const PlayerNameContext = React.createContext<string>("");

export function usePlayerContext(): {
    username: string,
    isSpectator: boolean,
    player: StartedPlayer | null,
    playerNumber: number | null,
} {
    const room = useContext(RoomContext);
    const username = useContext(PlayerNameContext);

    // game hasn't loaded
    if (room === null) {
        throw new Error('illegal');
    }
    // should have been provided
    if (username === '') {
        throw new Error('illegal');
    }
    if (room.gameState.phase === RoomPhase.START) {
        throw new Error('illegal');
    }

    let player = null;
    let playerNumber = null;

    // slightly inefficient, but n = 6 max...
    room.gameState.players.forEach((p, i) => {
        if (p.name === username) {
            player = p;
            playerNumber = i + 1;
        }
    });

    const isSpectator = player === null;

    return {
        username,
        player,
        playerNumber,
        isSpectator,
    }
}

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
    // We are actively trying to leave the room.
    LEAVING = 'leaving',
    // We have left the room.
    LEFT = 'left',
}

export function useJoinRoom(room: StartingPhase, shouldJoin: boolean): JoinRoomStatus {
    const { roomName, stateVersion } = useStrawberryGame()!;
    const playerName = useContext(PlayerNameContext);
    if (playerName == null) {
        throw new Error("PlayerNameContext not provided");
    }
    let status: JoinRoomStatus;
    const joined = room.players.some((player) => player.name === playerName);
    if (shouldJoin) {
        if (joined) status = JoinRoomStatus.JOINED;
        else if (room.players.length >= MAX_PLAYERS) status = JoinRoomStatus.ROOM_FULL;
        else status = JoinRoomStatus.JOINING;
    } else {
        if (joined) status = JoinRoomStatus.LEAVING;
        else status = JoinRoomStatus.LEFT;
    }
    useEffect(() => {
        if (status !== JoinRoomStatus.JOINING && status !== JoinRoomStatus.LEAVING) return;
        const abortController = new AbortController();
        callCommit(roomName, stateVersion, status === JoinRoomStatus.JOINING ? addPlayerToRoom(room, playerName) : removePlayerFromRoom(room, playerName))
            .catch((reason) => {
                console.error(reason);
            });
        return () => abortController.abort();
    }, [room, status, roomName, stateVersion, playerName]);
    return status;
}

// GOTCHA: the mutation *must* be idempotent!
function useMutateGame<Room, Mutation>(room: Room, allowed: boolean, mutator: (room: Room, mutation: Mutation) => RoomState): [Mutation | undefined, (arg: Mutation) => void] {
    const { roomName, stateVersion } = useStrawberryGame()!;
    const [mutation, setMutation] = useState<Mutation | undefined>(undefined);
    useEffect(() => {
        if (mutation === undefined) return;
        if (!allowed) {
            setMutation(undefined);
            return;
        }
        const newRoom = mutator(room, mutation);
        if (deepEqual(room, newRoom)) {
            // noop.
            setMutation(undefined);
            return;
        }
        const abortController = new AbortController();
        callCommit(roomName, stateVersion, newRoom, abortController.signal)
            .then((response) => {
                if (!response.success) {
                    console.log("commit failed; race condition occurred");
                }
            })
            .catch((reason) => {
                if (!abortController.signal.aborted) {
                    console.error(reason);
                }
            });
        return () => abortController.abort();
    }, [roomName, stateVersion, room, allowed, mutator, mutation]);
    return [mutation, setMutation];
}

function inputWordMutator(room: StartingPhase, {playerName, word}: {playerName: string, word: string | null}): StartingPhase {
    return setPlayerWord(room, playerName, word);
}

export function useInputWord(room: StartingPhase): [string | null | undefined, (newWord: string | null) => void] {
    const playerName = useContext(PlayerNameContext);
    if (playerName == null) {
        throw new Error("PlayerNameContext not provided");
    }
    const allowed = room.players.some(player => player.name === playerName);
    const [mutation, mutate] = useMutateGame(room, allowed, inputWordMutator);
    return [mutation?.word, (word) => {
        if (!allowed) {
            throw new Error("attempting to set word but we're not in the game");
        }
        mutate({playerName, word});
    }];
}

function startGameMutator(room: StartingPhase, _: {}): HintingPhase {
    return startGameRoom(room);
}

export function useStartGame(room: StartingPhase): (() => void) | null {
    const allowed = isRoomReady(room);
    const [, mutate] = useMutateGame(room, allowed, startGameMutator);
    return allowed ? () => mutate({}) : null;
}

function proposeHintMutator(room: ProposingHintPhase, {playerName, hint}: {playerName: string, hint: Hint | null}): ProposingHintPhase {
    return setProposedHint(room, playerName, hint);
}

export function useProposeHint(room: ProposingHintPhase): [Hint | null | undefined, ((hint: Hint | null) => void) | null] {
    const playerName = useContext(PlayerNameContext);
    if (playerName == null) {
        throw new Error("PlayerNameContext not provided");
    }
    const allowed = getPlayerNumber(room, playerName) != null;
    const [mutation, mutate] = useMutateGame(room, allowed, proposeHintMutator);
    return [mutation?.hint, allowed ? (hint) => mutate({playerName, hint}) : null];
}

function giveHintMutator(room: ProposingHintPhase, {hintNumber, hint}: {hintNumber: number, hint: Hint}): HintingPhase {
    if (hintNumber !== room.hintLog.length) return room; // raced
    return giveHint(room, hint);
}

export function useGiveHint(room: ProposingHintPhase): ((hint: Hint) => void) | null {
    const playerName = useContext(PlayerNameContext);
    if (playerName == null) {
        throw new Error("PlayerNameContext not provided");
    }
    const hintNumber = room.hintLog.length;
    const allowed = getPlayerNumber(room, playerName) != null;
    const [, mutate] = useMutateGame(room, allowed, giveHintMutator);
    return allowed ? (hint) => mutate({hintNumber, hint}) : null;
}

function resolveHintMutator(room: ResolvingHintPhase, {action}: {action: ResolveAction}): HintingPhase {
    return performResolveAction(room, action);
}

export function useResolveHint(room: ResolvingHintPhase): ((action: ResolveAction) => void) {
    const [, mutate] = useMutateGame(room, true /* allowed */, resolveHintMutator);
    return (action) => mutate({action});
}

function setHandGuessMutator(room: StartedPhase, {playerNumber, changes}: {playerNumber: PlayerNumber, changes: Record<number, Letter | null>}): StartedPhase {
    for (const index in changes) {
        room = setHandGuess(room, playerNumber, parseInt(index), changes[index]);
    }
    return room;
}

export function useSetHandGuess(room: StartedPhase): [Record<number, Letter | null> | undefined, ((index: number, guess: Letter | null) => void)] {
    const playerName = useContext(PlayerNameContext);
    if (playerName == null) {
        throw new Error("PlayerNameContext not provided");
    }
    const playerNumber = getPlayerNumber(room, playerName);
    const allowed = playerNumber != null;
    const [mutation, mutate] = useMutateGame(room, allowed, setHandGuessMutator);
    return [mutation?.changes, (index, guess) => {
        if (playerNumber == null) return;
        // need to preserve the existing mutation since we can edit multiple indices.
        mutate({
            ...(mutation || {playerNumber}),
            changes: {
                ...mutation?.changes,
                [index]: guess,
            },
        });
    }];
}

function setFinalGuessMutator(room: EndgamePhase, {playerNumber, guess}: {playerNumber: PlayerNumber, guess: readonly EndgameLetterChoice[]}): EndgamePhase {
    return setFinalGuess(room, playerNumber, guess) ?? room;
}

export function useSetFinalGuess(room: EndgamePhase): [readonly EndgameLetterChoice[] | undefined, ((guess: readonly EndgameLetterChoice[]) => void)] {
    const playerName = useContext(PlayerNameContext);
    if (playerName == null) {
        throw new Error("PlayerNameContext not provided");
    }
    const playerNumber = getPlayerNumber(room, playerName)!;
    const [mutation, mutate] = useMutateGame(room, true /* allowed */, setFinalGuessMutator);
    return [mutation?.guess, (guess) => mutate({playerNumber, guess})];
}


export function useCommitFinalGuess(room: EndgamePhase): () => void {
    const playerName = useContext(PlayerNameContext);
    if (playerName == null) {
        throw new Error("PlayerNameContext not provided");
    }
    const playerNumber = getPlayerNumber(room, playerName)!;
    const allowed = room.players[playerNumber-1].guess.length >= room.wordLength && !room.players[playerNumber-1].committed;
    const [, mutate] = useMutateGame(room, allowed, commitFinalGuess);
    return () => mutate(playerNumber);
}