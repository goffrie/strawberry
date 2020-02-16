import { Letter, Hand, Hint, PlayerNumber, HintSpecs } from './gameTypes';

export enum RoomPhase {
    START = 'start',
    HINT = 'hint',
};

export type StartingPhasePlayer = Readonly<{
    name: string,
    // The word this player is *choosing*. Length must be equal to
    // `wordLength`.
    word: string | null,
}>;

// The initial phase of the game, in which players can join and choose their
// words.
export type StartingPhase = Readonly<{
    phase: RoomPhase.START,
    wordLength: number,
    players: readonly StartingPhasePlayer[],
}>;

export type HintingPhasePlayer = Readonly<{
    name: string,
    hand: Hand,
    hintsGiven: number,
}>;

export type Dummy = Readonly<{
    currentLetter: Letter,
    // After the dummy is used this many times, an extra hint will be given.
    // Goes negative afterward.
    untilFreeHint: number,
}>;

export enum ResolveActionKind {
    NONE = 'none',
    FLIP = 'flip',
    GUESS = 'guess',
}

export type ResolveAction = Readonly<{
    kind: ResolveActionKind.NONE | ResolveActionKind.FLIP
}> | Readonly<{
    kind: ResolveActionKind.GUESS,
    guess: Letter,
}>;

export enum ActiveHintState {
    // Players are proposing hints.
    PROPOSING,
    // A hint has been given and players are deciding whether to flip their cards.
    RESOLVING,
}

export type ActiveHint = Readonly<{
    state: ActiveHintState.PROPOSING,
    proposedHints: Readonly<Record<PlayerNumber, HintSpecs>>,
}> | Readonly<{
    state: ActiveHintState.RESOLVING,
    hint: Hint,
    playerActions: Readonly<Record<PlayerNumber, ResolveAction>>,
}>;

// The main phase of the game, in which players give hints and flip over their
// cards.
export type HintingPhase = Readonly<{
    phase: RoomPhase.HINT,
    players: readonly HintingPhasePlayer[],
    dummies: readonly Dummy[],
    bonuses: readonly Letter[],
    hintsRemaining: number,
    // Hints that have previously been given and resolved.
    hintLog: readonly Hint[],
    activeHint: ActiveHint,
}>;

export type RoomState = StartingPhase | HintingPhase;
