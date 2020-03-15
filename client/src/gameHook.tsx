import React, { useState, useEffect, useContext } from 'react';
import { delay, deepEqual } from './utils';
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
import {callCommit, callList} from './gameAPI';
import {TestRooms} from './testData';

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

async function listLoop(roomName: string, version: number, signal: AbortSignal): Promise<StrawberryGame | null> {
    let backoff = 1000;
    while (true) {
        try {
            const result = await callList(roomName, version, signal);
            backoff = 1000;
            if (result == null) {
                // TODO: potentially add error state
                return null;
            } else if ('timeout' in result) {
                continue;
            } else {
                return {
                    roomName,
                    gameState: result.data,
                    stateVersion: result.version,
                    setGameState: (newState, abortSignal) => {
                        callCommit(roomName, result.version, newState, abortSignal)
                            .then((response) => {
                                if (!response.success) {
                                    console.log("commit failed; race condition occurred");
                                }
                            })
                            .catch((reason) => {
                                if (!abortSignal.aborted) {
                                    console.error(reason);
                                }
                            });
                    },
                };
            }
        } catch (e) {
            if (signal.aborted) return null;
            console.error(e);
            // back off and retry
            console.log(`Backing off for ${backoff} ms`);
            await delay(backoff);
            backoff *= (Math.random() + 0.5);
            backoff = Math.min(backoff, 30000);
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
    const { setGameState } = useStrawberryGame()!;
    const { username } = useContext(UsernameContext)!;
    if (username == null) {
        throw new Error("PlayerNameContext not provided");
    }
    let status: JoinRoomStatus;
    const joined = room.players.some((player) => player.name === username);
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
        setGameState(status === JoinRoomStatus.JOINING ? addPlayerToRoom(room, username) : removePlayerFromRoom(room, username), abortController.signal);
        return () => abortController.abort();
    }, [room, status, setGameState, username]);
    return status;
}

// GOTCHA: the mutation *must* be idempotent!
function useMutateGame<Room, Mutation>(room: Room, allowed: boolean, mutator: (room: Room, mutation: Mutation) => RoomState): [Mutation | undefined, (arg: Mutation) => void] {
    const { setGameState } = useStrawberryGame()!;
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
        setGameState(newRoom, abortController.signal)
        return () => abortController.abort();
    }, [setGameState, room, allowed, mutator, mutation]);
    return [mutation, setMutation];
}

function inputWordMutator(room: StartingPhase, {playerName, word}: {playerName: string, word: string | null}): StartingPhase {
    return setPlayerWord(room, playerName, word);
}

export function useInputWord(room: StartingPhase): [string | null | undefined, (newWord: string | null) => void] {
    const { username } = useContext(UsernameContext)!;
    if (username == null) {
        throw new Error("PlayerNameContext not provided");
    }
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
    if (username == null) {
        throw new Error("PlayerNameContext not provided");
    }
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
    if (username == null) {
        throw new Error("PlayerNameContext not provided");
    }
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
    if (username == null) {
        throw new Error("PlayerNameContext not provided");
    }
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
    if (username == null) {
        throw new Error("PlayerNameContext not provided");
    }
    const playerNumber = getPlayerNumber(room, username)!;
    const [mutation, mutate] = useMutateGame(room, true /* allowed */, setFinalGuessMutator);
    return [mutation?.guess, (guess) => mutate({playerNumber, guess})];
}


export function useCommitFinalGuess(room: EndgamePhase): () => void {
    const { username } = useContext(UsernameContext)!;
    if (username == null) {
        throw new Error("PlayerNameContext not provided");
    }
    const playerNumber = getPlayerNumber(room, username)!;
    const allowed = room.players[playerNumber-1].guess.length >= room.wordLength && !room.players[playerNumber-1].committed;
    const [, mutate] = useMutateGame(room, allowed, commitFinalGuess);
    return () => mutate(playerNumber);
}