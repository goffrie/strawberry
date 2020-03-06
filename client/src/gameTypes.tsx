export type PlayerNumber = number; // 1-indexed
export type Letter = string;

export interface Hand {
    letters: readonly Letter[];
    activeIndex: number; // 0-indexed, -1 if no active card
}

export interface HandWithGuesses extends Hand {
    guesses: readonly (Letter | null)[];
}

export enum LetterSources {
    PLAYER = 'player',
    WILDCARD = 'wildcard',
    DUMMY = 'dummy',
    BONUS = 'bonus',
};

export type LetterAndSource = Readonly<{
    letter: Letter,
    sourceType: LetterSources.PLAYER,
    playerNumber: PlayerNumber,
}> | Readonly<{
    letter: Letter,
    sourceType: LetterSources.BONUS,
}> | Readonly<{
    letter: Letter,
    sourceType: LetterSources.DUMMY,
    dummyNumber: number, // 1-indexed
}> | Readonly<{
    letter: '*',
    sourceType: LetterSources.WILDCARD,
    typedLetter?: never,
}>;

export type TypedWildcard = Readonly<{
    letter: '*',
    sourceType: LetterSources.WILDCARD,
    typedLetter: Letter,
}>;

export function isTypedWildcard(letterAndSource: LetterAndSource | TypedWildcard): letterAndSource is TypedWildcard {
    return letterAndSource.sourceType === LetterSources.WILDCARD && letterAndSource.typedLetter != null;
}

export function stripTypedLetter(letterAndSource: LetterAndSource | TypedWildcard): LetterAndSource {
    if (isTypedWildcard(letterAndSource)) {
        const { letter, sourceType } = letterAndSource;
        return { letter, sourceType };
    }
    return letterAndSource;
}

export interface Hint {
    readonly givenByPlayer: PlayerNumber;
    readonly lettersAndSources: Array<LetterAndSource>;
}

export interface StagedHint {
    readonly givenByPlayer: PlayerNumber;
    readonly lettersAndSources: Array<LetterAndSource | TypedWildcard>;
}

export interface HintSpecs {
    length: number,
    players: number,
    wildcard: boolean,
    dummies: number,
    bonuses: number,
}
