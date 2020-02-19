import React from 'react';
import {DisplayNumberOrLetter} from './DisplayNumberOrLetter';
import {Hand, Hint, LetterAndSource, LetterSources, PlayerNumber, HandWithGuesses, Letter} from './gameTypes';
import { LETTERS } from './gameLogic';

function Card({letter, onClick, inactive, guess, setGuess}: {letter?: Letter | null, onClick?: () => void, inactive?: boolean, guess?: Letter | null, setGuess?: ((guess: Letter | null) => void) | null}) {
    let classNames = 'card';
    let letterToUse = letter;
    if (!inactive) classNames += ' cardActive';
    if (setGuess) classNames += ' cardGuessable';
    if (guess) classNames += ' cardGuessed';
    if (onClick !== undefined) {
        classNames += ' cardButton';
    }
    if (letter === '*') {
        letterToUse = '🍓';
        classNames +=' cardStrawberry';
    }
    const keyDown = setGuess ? (e: React.KeyboardEvent) => {
        if (e.ctrlKey || e.altKey) return;
        if (e.keyCode === 8 /* backspace */ || e.keyCode === 46 /* delete */ || e.key === ' ' || e.key === '?') {
            setGuess(null);
            e.preventDefault();
        } else {
            const char = e.key.toUpperCase();
            if (LETTERS.includes(char)) {
                setGuess(char);
                e.preventDefault();
            }
        }
    } : undefined;
    return <div className={classNames} onClick={onClick} tabIndex={setGuess ? 0 : undefined} onKeyDown={keyDown}>{guess || letterToUse || ''}</div>
}

function CardWithAnnotation({letter, annotation, onClick}: {letter: Letter, annotation: React.ReactNode, onClick?: () => void}) {
    return <div className='cardWithPlayerNumber'>
        <Card letter={letter} onClick={onClick} />
        {annotation}
    </div>
}

function CardWithPlayerNumberOrLetter({letter, playerNumberOrLetter, onClick}: {letter: Letter, playerNumberOrLetter: PlayerNumber | Letter | null, onClick?: () => void}) {
    // keep same height even when there is no number or letter.
    const annotation = <div style={playerNumberOrLetter === null ? {visibility: 'hidden'} : {}}>
        <DisplayNumberOrLetter numberOrLetter={playerNumberOrLetter || '🍓'} />
    </div> ;
    return <CardWithAnnotation letter={letter} annotation={annotation} onClick={onClick} />
}

function CardsInHand({hand, isForViewingPlayer, setGuess}: {hand: Hand | HandWithGuesses, isForViewingPlayer: boolean, setGuess?: (index: number, guess: Letter | null) => void}) {
    return <div className='flex'>
        {hand.letters.map((card, i) => {
            const active = i === hand.activeIndex;
            if (isForViewingPlayer && 'guesses' in hand && setGuess != null && i < hand.guesses.length) {
                const guess = hand.guesses[i];
                return <Card
                    letter={i === hand.activeIndex ? '?' : null}
                    inactive={!active}
                    guess={guess}
                    // can only guess up to activeIndex
                    setGuess={i <= hand.activeIndex ? (guess: Letter | null) => setGuess(i, guess) : null}
                    key={i} />
            }
            const letterToDisplay = active ? (isForViewingPlayer ? '?' : card) : null;
            return <Card
                letter={letterToDisplay}
                inactive={!active}
                key={i} />;
        })}
    </div>
}

function PlayerWithCardsInHand({hand, isForViewingPlayer, playerName, playerNumber, shouldHideHand=false, extraText='', setGuess}: {
    hand: Hand | HandWithGuesses,
    isForViewingPlayer: boolean,
    playerName: string,
    playerNumber: number,
    shouldHideHand?: boolean,  // used for layout/sizing reasons
    extraText?: string,
    setGuess?: (index: number, guess: Letter | null) => void,
}) {
    // TODO: later, for end game, separate isForViewingPlayer with shouldHideLetter
    // TODO: render fallback on top of cardsInHand or something so the whitespace doesn't look weird
    // TODO: dont inline style here
    // TODO: render top bar better when there are few cards

    const topText = <>
        <span style={{maxWidth: '150px'}} className='ellipsis'>{playerName}&nbsp;</span>
        {isForViewingPlayer ? <span style={{color: '#777777'}}>(you)</span>: null}
        {extraText ? <span className='flexAlignRight'>{extraText}</span> : null}
    </>;

    const cardsToRender = <CardsInHand hand={hand} isForViewingPlayer={isForViewingPlayer} setGuess={setGuess} />;

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

function CardsInHint({hint, viewingPlayer, onClick}: {
    hint: Hint,
    viewingPlayer: PlayerNumber,
    onClick? : (letterAndSource: LetterAndSource, i: number) => void,
}) {
    return <CardsFromLettersAndSources
        lettersAndSources={hint.lettersAndSources}
        viewingPlayer={viewingPlayer}
        onClick={onClick}
    />;
}

function CardsFromLettersAndSources({lettersAndSources, viewingPlayer, onClick}: {
    lettersAndSources: readonly LetterAndSource[],
    viewingPlayer: PlayerNumber,
    onClick? : (letterAndSource: LetterAndSource, i: number) => void,
}) {
    return <div className='flex'>
        {lettersAndSources.map((letterAndSource, i) => {

            const letterToDisplay = letterAndSource.sourceType === LetterSources.PLAYER && letterAndSource.playerNumber === viewingPlayer ? '?' : letterAndSource.letter;

            const playerNumberOrLetter = getPlayerNumberOrLetterFromLetterAndSource(letterAndSource);
            return <CardWithPlayerNumberOrLetter
                letter={letterToDisplay}
                playerNumberOrLetter={playerNumberOrLetter}
                onClick={onClick !== undefined ? () => onClick(letterAndSource, i) : undefined}
                key={i}
            />
        })}
    </div>
}

export {Card, CardWithAnnotation, CardWithPlayerNumberOrLetter, PlayerWithCardsInHand, DisplayNumberOrLetterWithTextAndCards, CardsInHand, CardsInHint, CardsFromLettersAndSources};
