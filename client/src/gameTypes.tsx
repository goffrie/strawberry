export type PlayerNumber = number;
export type Letter = string;

export type Hand = Readonly<{
    letters: readonly Letter[];
    activeIndex: number; // -1 if no active card
}>;

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
    sourceType: LetterSources.DUMMY | LetterSources.BONUS,
}> | Readonly<{
    letter: '*',
    sourceType: LetterSources.WILDCARD,
}>;

export type Hint = Readonly<{
    givenByPlayer: PlayerNumber;
    lettersAndSources: Array<LetterAndSource>;
}>;

export type HintSpecs = Readonly<{
    length: number,
    players: number,
    wildcard: boolean,
    dummies: number,
    bonuses: number,
}>;
