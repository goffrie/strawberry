export type PlayerNumber = number;
export type Letter = string;

export type Hand = {
    letters: Array<Letter>;
    activeIndex: number; // -1 if no active card
};

export enum LetterSources {
    PLAYER = 'player',
    WILDCARD = 'wildcard',
    DUMMY = 'dummy',
    BONUS = 'bonus',
};

export type LetterAndSource = {
    letter: Letter,
    sourceType: LetterSources.PLAYER,
    playerNumber: PlayerNumber,
} | {
    letter: Letter,
    sourceType: LetterSources.DUMMY | LetterSources.BONUS,
} | {
    letter: '*',
    sourceType: LetterSources.WILDCARD,
}

export type Hint = {
    givenByPlayer: PlayerNumber;
    lettersAndSources: Array<LetterAndSource>;
}
