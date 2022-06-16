import React, { useState, useEffect, useContext } from 'react';
import { deepEqual } from './utils';
import { Hint, Letter, PlayerNumber } from './gameTypes';
import {
    HintingPhase,
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
import {TestRooms} from './testData';
import { useMutation, useQuery } from './convex/_generated';

export type StrawberryGame = Readonly<{
    roomName: string,
    gameState: RoomState,
    stateVersion: number,
    setGameState: (newState: RoomState, abortSignal: AbortSignal) => void,
}>;

export const RoomContext = React.createContext<StrawberryGame | null>(null);
export const UsernameContext = React.createContext<{username: string, setUsername: (_: string) => void} | null>(null);

export function usePlayerContext(): {
    username: string,
    isSpectator: boolean,
    player: StartedPlayer | null,
    playerNumber: number | null,
} {
    const room = useContext(RoomContext);
    const { username } = useContext(UsernameContext)!;

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

function RealStrawberryGameProvider({ roomName, children }: { roomName: string, children: React.ReactNode }) {
    const game = useListStrawberryGame(roomName);
    return <RoomContext.Provider value={game}>
        {children}
    </RoomContext.Provider>;
}

function FakeStrawberryGameProvider({ roomName, children }: { roomName: string, children: React.ReactNode }) {
    const game = useFakeStrawberryGame(roomName);
    return <RoomContext.Provider value={game}>
        {children}
    </RoomContext.Provider>;
}

function DevStrawberryGameProvider({ roomName, children }: { roomName: string, children: React.ReactNode }) {
    const Provider = roomName in TestRooms ? FakeStrawberryGameProvider : RealStrawberryGameProvider;
    return <Provider roomName={roomName} children={children} />;
}

export const StrawberryGameProvider = process.env.NODE_ENV === 'development' ? DevStrawberryGameProvider : RealStrawberryGameProvider;

function useListStrawberryGame(roomName: string): StrawberryGame | null {
    const r = useQuery("getRoom", roomName);
    const setRoom = useMutation("setRoom");
    if (r == null) {
        return null;
    }
    const { name, value, version } = r;
    return {
        roomName,
        gameState: JSON.parse(value),
        stateVersion: version,
        setGameState: (newState, abortSignal) => {
            setRoom(roomName, version, JSON.stringify(newState));
        },
    };
}

function useFakeStrawberryGame(roomName: string): StrawberryGame | null {
    const [state, setState] = useState<StrawberryGame | null>(null);
    useEffect(() => {
        const makeSetGameState = (version: number) => (newState: RoomState, _: object) => {
            setState({
                roomName,
                gameState: newState,
                stateVersion: version + 1,
                setGameState: makeSetGameState(version + 1),
            })
        };
        setState({
            roomName,
            gameState: TestRooms[roomName],
            stateVersion: 1,
            setGameState: makeSetGameState(1),
        });
    }, [roomName]);
    return state;
}

// Gain access to the StrawberryGame from context.
export function useStrawberryGame(): StrawberryGame | null {
    return useContext(RoomContext);
}

// GOTCHA: the mutation *must* be idempotent!
function useMutateGame<Room, Mutation>(room: Room, allowed: boolean, mutator: (room: Room, mutation: Mutation) => RoomState, initial?: Mutation): [Mutation | undefined, (arg: Mutation) => void] {
    const { setGameState } = useStrawberryGame()!;
    const [mutation, setMutation] = useState<Mutation | undefined>(initial);
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
        setGameState(newRoom, abortController.signal)
        return () => abortController.abort();
    }, [setGameState, room, allowed, mutator, mutation]);
    return [mutation, setMutation];
}

function joinRoomMutator(room: StartingPhase, mutation: {username: string, shouldJoin: boolean} | null): StartingPhase {
    if (mutation == null) {
        return room;
    }
    const {username, shouldJoin} = mutation;
    const joined = room.players.some((player) => player.name === username);
    if (shouldJoin) {
        if (joined || room.players.length >= MAX_PLAYERS) {
            return room;
        }
        return addPlayerToRoom(room, username);
    } else {
        if (!joined) {
            return room;
        }
        return removePlayerFromRoom(room, username);
    }
}

export function useJoinRoom(room: StartingPhase, initialJoin: boolean | undefined): [boolean | undefined, (shouldJoin: boolean) => void] {
    const { username } = useContext(UsernameContext)!;
    const [mutation, mutate] = useMutateGame(room, true, joinRoomMutator, initialJoin != null ? { username, shouldJoin: initialJoin } : undefined);
    return [mutation?.shouldJoin, (shouldJoin) => mutate({username, shouldJoin})];
}

function inputWordMutator(room: StartingPhase, {playerName, word}: {playerName: string, word: string | null}): StartingPhase {
    return setPlayerWord(room, playerName, word);
}

export function useInputWord(room: StartingPhase): [string | null | undefined, (newWord: string | null) => void] {
    const { username } = useContext(UsernameContext)!;
    const allowed = room.players.some(player => player.name === username);
    const [mutation, mutate] = useMutateGame(room, allowed, inputWordMutator);
    return [mutation?.word, (word) => {
        if (!allowed) {
            throw new Error("attempting to set word but we're not in the game");
        }
        mutate({playerName: username, word});
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
    const { username } = useContext(UsernameContext)!;
    const allowed = getPlayerNumber(room, username) != null;
    const [mutation, mutate] = useMutateGame(room, allowed, proposeHintMutator);
    return [mutation?.hint, allowed ? (hint) => mutate({playerName: username, hint}) : null];
}

function giveHintMutator(room: ProposingHintPhase, {hintNumber, hint}: {hintNumber: number, hint: Hint}): StartedPhase {
    if (hintNumber !== room.hintLog.length) return room; // raced
    return giveHint(room, hint);
}

export function useGiveHint(room: ProposingHintPhase): ((hint: Hint) => void) | null {
    const { username } = useContext(UsernameContext)!;
    const hintNumber = room.hintLog.length;
    const allowed = getPlayerNumber(room, username) != null;
    const [, mutate] = useMutateGame(room, allowed, giveHintMutator);
    return allowed ? (hint) => mutate({hintNumber, hint}) : null;
}

function resolveHintMutator(room: ResolvingHintPhase, {action}: {action: ResolveAction}): StartedPhase {
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

export function useSetHandGuess(room: StartedPhase): [Record<number, Letter | null> | undefined, ((index: number, guess: Letter | null) => void) | undefined] {
    const { username } = useContext(UsernameContext)!;
    const playerNumber = getPlayerNumber(room, username);
    const allowed = playerNumber != null && (room.phase === RoomPhase.HINT || !room.players[playerNumber-1].committed);
    const [mutation, mutate] = useMutateGame(room, allowed, setHandGuessMutator);
    const setGuess = (index: number, guess: Letter | null) => {
        if (playerNumber == null) return;
        // need to preserve the existing mutation since we can edit multiple indices.
        mutate({
            ...(mutation || {playerNumber}),
            changes: {
                ...mutation?.changes,
                [index]: guess,
            },
        });
    };
    return [mutation?.changes, allowed ? setGuess : undefined];
}

function setFinalGuessMutator(room: EndgamePhase, {playerNumber, guess}: {playerNumber: PlayerNumber, guess: readonly EndgameLetterChoice[]}): EndgamePhase {
    return setFinalGuess(room, playerNumber, guess) ?? room;
}

export function useSetFinalGuess(room: EndgamePhase): [readonly EndgameLetterChoice[] | undefined, ((guess: readonly EndgameLetterChoice[]) => void)] {
    const { username } = useContext(UsernameContext)!;
    const playerNumber = getPlayerNumber(room, username)!;
    const [mutation, mutate] = useMutateGame(room, true /* allowed */, setFinalGuessMutator);
    return [mutation?.guess, (guess) => mutate({playerNumber, guess})];
}


export function useCommitFinalGuess(room: EndgamePhase): () => void {
    const { username } = useContext(UsernameContext)!;
    const playerNumber = getPlayerNumber(room, username)!;
    const allowed = room.players[playerNumber-1].guess.length >= room.wordLength && !room.players[playerNumber-1].committed;
    const [, mutate] = useMutateGame(room, allowed, commitFinalGuess);
    return () => mutate(playerNumber);
}