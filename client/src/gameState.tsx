import { Letter, Hint, PlayerNumber, HandWithGuesses, LetterSources } from './gameTypes';

export enum RoomPhase {
    START = 'start',
    HINT = 'hint',
    ENDGAME = 'endgame',
};

export interface StartingPhasePlayer {
    readonly name: string,
    // The word this player is *choosing*. Length must be equal to
    // `wordLength`.
    readonly word: string | null,
}

// The initial phase of the game, in which players can join and choose their
// words.
export interface StartingPhase {
    readonly phase: RoomPhase.START,
    readonly wordLength: number,
    readonly players: readonly StartingPhasePlayer[],
}

export interface StartedPlayer {
    readonly name: string,
    readonly hand: HandWithGuesses,
    readonly hintsGiven: number,
}

export interface HintingPhasePlayer extends StartedPlayer {
}

export interface Dummy {
    readonly currentLetter: Letter,
    // After the dummy is used this many times, an extra hint will be given.
    // Goes negative afterward.
    readonly untilFreeHint: number,
}

export enum ResolveActionKind {
    NONE = 'none',
    FLIP = 'flip',
    GUESS = 'guess',
}

export type ResolveAction = Readonly<{
    player: PlayerNumber,
    kind: ResolveActionKind.NONE | ResolveActionKind.FLIP
}> | Readonly<{
    player: PlayerNumber,
    kind: ResolveActionKind.GUESS,
    guess: Letter,
    actual: Letter,
}>;

export enum ActiveHintState {
    // Players are proposing hints.
    PROPOSING,
    // A hint has been given and players are deciding whether to flip their cards.
    RESOLVING,
}

export interface ProposingHint {
    readonly state: ActiveHintState.PROPOSING,
    readonly proposedHints: Readonly<Record<PlayerNumber, Hint>>,
}

export interface ResolvingHint {
    readonly state: ActiveHintState.RESOLVING,
    readonly hint: Hint,
    readonly playerActions: readonly ResolveAction[],
    // Which card was active for each player before any actions were taken.
    readonly activeIndexes: Readonly<Record<PlayerNumber, number>>,
}

export type ActiveHint = ProposingHint | ResolvingHint;

export interface HintLogEntry {
    readonly hint: Hint,
    // The total number of hints in the game as of when this hint was *given*
    // (not resolved).
    readonly totalHints: number,
    // Which card was active for each player.
    readonly activeIndexes: Readonly<Record<PlayerNumber, number>>,
    // The action each player took.
    readonly playerActions: readonly ResolveAction[],
}

export interface BaseStartedPhase {
    readonly wordLength: number,
    readonly players: readonly StartedPlayer[],
    readonly dummies: readonly Dummy[],
    readonly bonuses: readonly Letter[],
    // Hints that have previously been given and resolved.
    readonly hintLog: readonly HintLogEntry[],
    readonly deck: readonly Letter[],
}

// The main phase of the game, in which players give hints and flip over their
// cards.
export interface HintingPhase extends BaseStartedPhase {
    readonly phase: RoomPhase.HINT,
    readonly players: readonly HintingPhasePlayer[],
    readonly hintsRemaining: number,
    readonly activeHint: ActiveHint,
}

export type ProposingHintPhase = HintingPhase & { readonly activeHint: ProposingHint };
export type ResolvingHintPhase = HintingPhase & { readonly activeHint: ResolvingHint };

export type EndgameLetterChoice = Readonly<{
    index: number,
    sourceType: LetterSources.PLAYER,
}> | Readonly<{
    letter: Letter,
    sourceType: LetterSources.BONUS,
}> | Readonly<{
    letter: '*',
    sourceType: LetterSources.WILDCARD,
}>;

export interface EndgamePhasePlayer extends StartedPlayer {
    readonly guess: readonly EndgameLetterChoice[],
    readonly committed: boolean;
}

export interface EndgamePhase extends BaseStartedPhase {
    readonly phase: RoomPhase.ENDGAME,
    readonly hintsRemaining: 0,
    readonly players: readonly EndgamePhasePlayer[],
}

// TODO: ugh fix this
export function isProposing(phase: HintingPhase): phase is ProposingHintPhase {
    return phase.activeHint.state === ActiveHintState.PROPOSING;
}
export function isResolving(phase: HintingPhase): phase is ResolvingHintPhase {
    return phase.activeHint.state === ActiveHintState.RESOLVING;
}

export type StartedPhase = HintingPhase | EndgamePhase;
export type RoomState = StartingPhase | HintingPhase | EndgamePhase;
