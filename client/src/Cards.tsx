import React, { useContext } from 'react';
import {DisplayNumberOrLetter} from './DisplayNumberOrLetter';
import {Hand, LetterAndSource, LetterSources, PlayerNumber, HandWithGuesses, Letter, TypedWildcard, isTypedWildcard} from './gameTypes';
import { LETTERS } from './gameLogic';
import { FruitEmojiContext } from './Fruit';
import { LinkButton } from './LinkButton';
import { UsernameContext } from './gameHook';

function Card({letter, typedLetter, onClick, inactive, guess, setGuess}: {letter?: Letter | null, typedLetter?: Letter, onClick?: () => void, inactive?: boolean, guess?: Letter | null, setGuess?: ((guess: Letter | null) => void) | null}) {
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
    } else if (letter === '×') { // bad wildcard
        letterToUse = '×';
        classNames += ' cardBadWildcard';
    }
    if (typedLetter != null) {
        classNames += ' cardWithTypedLetter'
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
    const maybeTypedLetter = typedLetter ? (
        <div className="typedLetter">{typedLetter}</div>
    ): '';
    return <div
        className={classNames}
        onClick={onClick}
        tabIndex={setGuess ? 0 : undefined}
        onKeyDown={keyDown}
    >{text}{maybeTypedLetter}</div>
}

function CardWithAnnotation({letter, typedLetter, inactive, annotation, onClick, hidden=false, guess}: {letter: Letter, typedLetter?: Letter, inactive?: boolean, annotation: React.ReactNode, onClick?: () => void, hidden?: boolean, guess?: Letter}) {
    return <div className='cardWithPlayerNumber' style={hidden ? {visibility: "hidden"} : undefined}>
        <Card letter={letter} typedLetter={typedLetter} inactive={inactive} onClick={onClick} guess={guess} />
        {annotation}
    </div>
}

function CardWithPlayerNumberOrLetter({letter, typedLetter, playerNumberOrLetter, onClick, inactive=false, hidden=false, guess}: {letter: Letter, typedLetter?: Letter, playerNumberOrLetter: PlayerNumber | Letter | null, onClick?: () => void, inactive?: boolean, hidden?: boolean, guess?: Letter}) {
    // keep same height even when there is no number or letter.
    const annotation = <div style={playerNumberOrLetter === null ? {visibility: 'hidden'} : {}}>
        <DisplayNumberOrLetter numberOrLetter={playerNumberOrLetter || '🍓'} />
    </div> ;
    return <CardWithAnnotation letter={letter} typedLetter={typedLetter} inactive={inactive} annotation={annotation} onClick={onClick} hidden={hidden} guess={guess}/>
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
    const {setUsername} = useContext(UsernameContext)!;

    const topText = <>
        <span style={{maxWidth: '150px'}} className='ellipsis'>{playerName}&nbsp;</span>
        {isForViewingPlayer ? <span className="you">(you)</span>: null}
        {process.env.NODE_ENV === 'development' && !isForViewingPlayer ? <span className='flexAlignRight'><LinkButton onClick={() => setUsername(playerName)}>Impersonate</LinkButton></span> : null}
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

function getPlayerNumberOrLetterFromLetterAndSource(letterAndSource: LetterAndSource | TypedWildcard): number | string | null {
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

function CardsFromLettersAndSources({lettersAndSources, viewingPlayer, inactive, onClick, playerGuess}: {
    lettersAndSources: readonly (LetterAndSource | TypedWildcard)[],
    viewingPlayer: PlayerNumber | null,
    inactive?: (i: number) => void,
    onClick?: (letterAndSource: LetterAndSource | TypedWildcard, i: number) => void,
    playerGuess?: Letter | null,
}) {
    const wildcardsWithTypedLetters = lettersAndSources.filter(isTypedWildcard);
    let firstWildcardTypedLetter: string | undefined = undefined;
    if (wildcardsWithTypedLetters.length) {
        firstWildcardTypedLetter = wildcardsWithTypedLetters[0].typedLetter;
    }

    return <div className='cardList'>
        {lettersAndSources.map((letterAndSource, i) => {
            const isForViewingPlayer = letterAndSource.sourceType === LetterSources.PLAYER && letterAndSource.playerNumber === viewingPlayer;
            let letterToDisplay = isForViewingPlayer ? '?' : letterAndSource.letter;
            let typedLetter = isTypedWildcard(letterAndSource) ? letterAndSource.typedLetter : undefined;
            if (letterAndSource.sourceType === LetterSources.WILDCARD && !typedLetter && firstWildcardTypedLetter) {
                // a wildcard without a letter annotation inherits the annotation
                typedLetter = firstWildcardTypedLetter;
            } else if (typedLetter && firstWildcardTypedLetter && typedLetter !== firstWildcardTypedLetter) {
                // a wildcard with an annotation that doesn't agree should become a ×
                letterToDisplay = '×';
            }
            const playerNumberOrLetter = getPlayerNumberOrLetterFromLetterAndSource(letterAndSource);
            const cardInactive = !!(inactive && inactive(i));
            return <CardWithPlayerNumberOrLetter
                letter={letterToDisplay}
                typedLetter={typedLetter}
                inactive={cardInactive}
                playerNumberOrLetter={playerNumberOrLetter}
                onClick={(onClick !== undefined && !cardInactive) ? () => onClick(letterAndSource, i) : undefined}
                guess={(isForViewingPlayer && playerGuess) || undefined}
                key={i}
            />
        })}
        {lettersAndSources.length === 0 && <CardWithPlayerNumberOrLetter letter={'🍓'} playerNumberOrLetter={'🍓'} hidden={true} />}
    </div>
}

export {Card, CardWithAnnotation, CardWithPlayerNumberOrLetter, PlayerWithCardsInHand, DisplayNumberOrLetterWithTextAndCards, CardsInHand, CardsFromLettersAndSources, RevealedCardsInHand};
