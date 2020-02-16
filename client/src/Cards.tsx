import React from 'react';
import {DisplayNumberOrLetter} from './DisplayNumberOrLetter';
import {Hand, Hint, LetterAndSource, LetterSources, PlayerNumber} from './gameTypes';

function Card({letter}: {letter: string}) {
    return <div className='card cardActive'>{letter}</div>
}

function InactiveCard() {
    return <div className='card' />;
}

function CardWithAnnotation({letter, playerNumberOrLetter}: {letter: string, playerNumberOrLetter: number | string | null}) {
    return <div className='cardWithPlayerNumber'>
        <Card letter={letter} />
        {playerNumberOrLetter !== null && <DisplayNumberOrLetter numberOrLetter={playerNumberOrLetter} />}
    </div>
}

function CardsInHand({hand, isForViewingPlayer}: {hand: Hand, isForViewingPlayer: boolean}) {
    return <div className='cardsInHand'>
        {hand.letters.map((card, i) => {
            if (i === hand.activeIndex) {
                const letterToDisplay = isForViewingPlayer ? '?' : card;
                return <Card letter={letterToDisplay} key={i} />
            }
            return <InactiveCard />
        })}
    </div>
}

function getPlayerNumberOrLetterFromLetterAndSource(letterAndSource: LetterAndSource): number | string | null {
    switch (letterAndSource.sourceType) {
        case LetterSources.PLAYER:
            return letterAndSource.playerNumber;
        case LetterSources.WILDCARD:
            return null; // don't render a source
        case LetterSources.DUMMY:
            return 'D';
        case LetterSources.BONUS:
            return 'B';
    }
}

function CardsInHint({hint, viewingPlayer}: {hint: Hint, viewingPlayer: PlayerNumber}) {
    return <div className='cardsInHand'>
        {hint.lettersAndSources.map((letterAndSource, i) => {

            const letterToDisplay = letterAndSource.sourceType === LetterSources.PLAYER && letterAndSource.playerNumber === viewingPlayer ? '?' : letterAndSource.letter;

            const playerNumberOrLetter = getPlayerNumberOrLetterFromLetterAndSource(letterAndSource);
            return <CardWithAnnotation letter={letterToDisplay} playerNumberOrLetter={playerNumberOrLetter} key={i} />
        })}
    </div>
}

export {Card, CardWithAnnotation, InactiveCard, CardsInHand, CardsInHint};
