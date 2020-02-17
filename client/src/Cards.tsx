import React from 'react';
import {DisplayNumberOrLetter} from './DisplayNumberOrLetter';
import {Hand, Hint, LetterAndSource, LetterSources, PlayerNumber} from './gameTypes';

function Card({letter, onClick}: {letter: string, onClick?: () => void}) {
    let classNames = 'card cardActive';
    if (onClick !== undefined) {
        classNames += ' cardButton';
    }
    return <div className={classNames} onClick={onClick}>{letter}</div>
}

function InactiveCard() {
    return <div className='card' />;
}

function CardWithAnnotation({letter, annotation, onClick}: {letter: string, annotation: React.ReactNode, onClick?: () => void}) {
    return <div className='cardWithPlayerNumber'>
        <Card letter={letter} onClick={onClick} />
        {annotation}
    </div>
}

function CardWithPlayerNumberOrLetter({letter, playerNumberOrLetter, onClick}: {letter: string, playerNumberOrLetter: number | string | null, onClick?: () => void}) {
    // keep same height even when there is no number or letter.
    const annotation = <div style={playerNumberOrLetter === null ? {visibility: 'hidden'} : {}}>
        <DisplayNumberOrLetter numberOrLetter={playerNumberOrLetter || '🍓'} />
    </div> ;
    return <CardWithAnnotation letter={letter} annotation={annotation} onClick={onClick} />
}

function CardsInHand({hand, isForViewingPlayer}: {hand: Hand, isForViewingPlayer: boolean}) {
    return <div className='flex'>
        {hand.letters.map((card, i) => {
            if (i === hand.activeIndex) {
                const letterToDisplay = isForViewingPlayer ? '?' : card;
                return <Card letter={letterToDisplay} key={i} />
            } else {
                return <InactiveCard key={i} />
            }
        })}
    </div>
}

function PlayerWithCardsInHand({hand, isForViewingPlayer, playerName, playerNumber, shouldHideHand=false, extraText=''}: {
    hand: Hand,
    isForViewingPlayer: boolean,
    playerName: string,
    playerNumber: number,
    shouldHideHand?: boolean,  // used for layout/sizing reasons
    extraText?: string,
}) {
    // TODO: later, for end game, separate isForViewingPlayer with shouldHideLetter
    // TODO: render fallback on top of cardsInHand or something so the whitespace doesn't look weird
    // TODO: dont inline style here
    // TODO: render top bar better when there are few cards

    const topText = <>
        <span style={{maxWidth: '150px'}} className='ellipsis'>{playerName}&nbsp;</span>
        {isForViewingPlayer ? <span style={{color: '#777777'}}>(you)</span>: null}
        {extraText ? <span style={{flex: 'auto', textAlign: 'right'}}>{extraText}</span> : null}
    </>;

    const cardsToRender = <CardsInHand hand={hand} isForViewingPlayer={isForViewingPlayer} />;

    return <DisplayNumberOrLetterWithTextAndCards
        numberOrLetter={playerNumber}
        topText={topText}
        cardsToRender={cardsToRender}
        shouldHideCards={shouldHideHand}
    />;
}

function DisplayNumberOrLetterWithTextAndCards({numberOrLetter, topText, cardsToRender, shouldHideCards=false} : {
    numberOrLetter: number | string,
    topText: React.ReactNode,
    cardsToRender: React.ReactNode,
    shouldHideCards?: boolean,
}) {
    // TODO: render fallback on top of cardsInHand or something so the whitespace doesn't look weird
    // TODO: dont inline style here
    // TODO: render top bar better when there are few cards
    return <div style={{display: 'flex', marginBottom: '10px'}}>
        <DisplayNumberOrLetter numberOrLetter={numberOrLetter}/>
        <div style={{marginLeft: '10px'}}>
            <div style={{marginLeft: '5px', marginBottom: '5px', marginRight: '5px', lineHeight: '25px', display: 'flex'}}>
                {topText}
            </div>
            <div style={shouldHideCards ? {visibility: 'hidden'}: {}}>
                {cardsToRender}
            </div>
        </div>
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

function CardsInHint({hint, viewingPlayer}: {
    hint: Hint,
    viewingPlayer: PlayerNumber,
}) {
    return <CardsFromLettersAndSources
        lettersAndSources={hint.lettersAndSources}
        viewingPlayer={viewingPlayer}
    />;
}

function CardsFromLettersAndSources({lettersAndSources, viewingPlayer, onClick}: {
    lettersAndSources: readonly LetterAndSource[],
    viewingPlayer: PlayerNumber,
    onClick? : (letterAndSource: LetterAndSource) => void,
}) {
    return <div className='flex'>
        {lettersAndSources.map((letterAndSource, i) => {

            const letterToDisplay = letterAndSource.sourceType === LetterSources.PLAYER && letterAndSource.playerNumber === viewingPlayer ? '?' : letterAndSource.letter;

            const playerNumberOrLetter = getPlayerNumberOrLetterFromLetterAndSource(letterAndSource);
            return <CardWithPlayerNumberOrLetter
                letter={letterToDisplay}
                playerNumberOrLetter={playerNumberOrLetter}
                onClick={onClick !== undefined ? () => onClick(letterAndSource) : undefined}
                key={i}
            />
        })}
    </div>
}

export {Card, CardWithAnnotation, CardWithPlayerNumberOrLetter, InactiveCard, PlayerWithCardsInHand, DisplayNumberOrLetterWithTextAndCards, CardsInHand, CardsInHint, CardsFromLettersAndSources};
