export type PlayerNumber = number; // 1-indexed
export type Letter = string;

export interface Hand {
    letters: readonly Letter[];
    activeIndex: number; // 0-indexed, -1 if no active card
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
}>;

export interface Hint {
    readonly givenByPlayer: PlayerNumber;
    readonly lettersAndSources: Array<LetterAndSource>;
}

export interface HintSpecs {
    length: number,
    players: number,
    wildcard: boolean,
    dummies: number,
    bonuses: number,
}
