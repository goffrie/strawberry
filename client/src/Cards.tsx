import React, { useContext } from 'react';
import {DisplayNumberOrLetter} from './DisplayNumberOrLetter';
import {Hand, LetterAndSource, LetterSources, PlayerNumber, HandWithGuesses, Letter} from './gameTypes';
import { LETTERS } from './gameLogic';
import { FruitEmojiContext } from './Fruit';

function Card({letter, onClick, inactive, guess, setGuess}: {letter?: Letter | null, onClick?: () => void, inactive?: boolean, guess?: Letter | null, setGuess?: ((guess: Letter | null) => void) | null}) {
    let classNames = 'card';
    let letterToUse = letter;
    if (!inactive) classNames += ' cardActive';
    if (setGuess) classNames += ' cardGuessable';
    if (guess) classNames += ' cardGuessed';
    if (onClick !== undefined) {
        classNames += ' cardButton';
    }
    const fruitEmoji = useContext(FruitEmojiContext);
    if (letter === '*') {
        letterToUse = fruitEmoji; // lol
        classNames +=' cardStrawberry';
    }
    const keyDown = setGuess ? (e: React.KeyboardEvent) => {
        if (e.ctrlKey || e.altKey) return;
        if (e.key === "Backspace" || e.key === "Delete" || e.key === ' ' || e.key === '?') {
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
    const text = guess || letterToUse || '';
    return <div
        className={classNames}
        onClick={onClick}
        tabIndex={setGuess ? 0 : undefined}
        onKeyDown={keyDown}
    >{text}</div>
}

function CardWithAnnotation({letter, inactive, annotation, onClick, hidden=false}: {letter: Letter, inactive?: boolean, annotation: React.ReactNode, onClick?: () => void, hidden?: boolean}) {
    return <div className='cardWithPlayerNumber' style={hidden ? {visibility: "hidden"} : undefined}>
        <Card letter={letter} inactive={inactive} onClick={onClick} />
        {annotation}
    </div>
}

function CardWithPlayerNumberOrLetter({letter, playerNumberOrLetter, onClick, inactive=false, hidden=false}: {letter: Letter, playerNumberOrLetter: PlayerNumber | Letter | null, onClick?: () => void, inactive?: boolean, hidden?: boolean}) {
    // keep same height even when there is no number or letter.
    const annotation = <div style={playerNumberOrLetter === null ? {visibility: 'hidden'} : {}}>
        <DisplayNumberOrLetter numberOrLetter={playerNumberOrLetter || '🍓'} />
    </div> ;
    return <CardWithAnnotation letter={letter} inactive={inactive} annotation={annotation} onClick={onClick} hidden={hidden}/>
}

function RevealedCardsInHand({letters}: {letters: readonly (LetterAndSource | null)[]}) {
    return <div className='flex'>
        {letters.map((card, i) => <Card letter={card?.letter} inactive={card == null} key={i} />)}
    </div>;
}

function CardsInHand({hand, isForViewingPlayer, setGuess, hidden}: {hand: Hand | HandWithGuesses, isForViewingPlayer: boolean, setGuess?: (index: number, guess: Letter | null) => void, hidden?: boolean}) {
    return <div className='flex' style={hidden ? {visibility: "hidden"} : undefined}>
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

function PlayerWithCardsInHand({isForViewingPlayer, playerName, playerNumber, extraText='', cardsToRender}: {
    isForViewingPlayer: boolean,
    playerName: string,
    playerNumber: number,
    extraText?: React.ReactNode,
    cardsToRender: React.ReactNode,
}) {
    // TODO: later, for end game, separate isForViewingPlayer with shouldHideLetter
    // TODO: render fallback on top of cardsInHand or something so the whitespace doesn't look weird
    // TODO: dont inline style here
    // TODO: render top bar better when there are few cards

    const topText = <>
        <span style={{maxWidth: '150px'}} className='ellipsis'>{playerName}&nbsp;</span>
        {isForViewingPlayer ? <span className="you">(you)</span>: null}
        {extraText ? <span className='flexAlignRight'>{extraText}</span> : null}
    </>;

    return <DisplayNumberOrLetterWithTextAndCards
        numberOrLetter={playerNumber}
        topText={topText}
        cardsToRender={cardsToRender}
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
            {cardsToRender}
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

function CardsFromLettersAndSources({lettersAndSources, viewingPlayer, inactive, onClick}: {
    lettersAndSources: readonly LetterAndSource[],
    viewingPlayer: PlayerNumber,
    inactive?: (i: number) => void,
    onClick?: (letterAndSource: LetterAndSource, i: number) => void,
}) {
    return <div className='cardList'>
        {lettersAndSources.map((letterAndSource, i) => {

            const letterToDisplay = letterAndSource.sourceType === LetterSources.PLAYER && letterAndSource.playerNumber === viewingPlayer ? '?' : letterAndSource.letter;

            const playerNumberOrLetter = getPlayerNumberOrLetterFromLetterAndSource(letterAndSource);
            const cardInactive = !!(inactive && inactive(i));
            return <CardWithPlayerNumberOrLetter
                letter={letterToDisplay}
                inactive={cardInactive}
                playerNumberOrLetter={playerNumberOrLetter}
                onClick={(onClick !== undefined && !cardInactive) ? () => onClick(letterAndSource, i) : undefined}
                key={i}
            />
        })}
        {lettersAndSources.length === 0 && <CardWithPlayerNumberOrLetter letter={'🍓'} playerNumberOrLetter={'🍓'} hidden={true} />}
    </div>
}

export {Card, CardWithAnnotation, CardWithPlayerNumberOrLetter, PlayerWithCardsInHand, DisplayNumberOrLetterWithTextAndCards, CardsInHand, CardsFromLettersAndSources, RevealedCardsInHand};
