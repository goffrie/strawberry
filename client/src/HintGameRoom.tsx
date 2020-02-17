import React, {useContext, useState} from 'react';
import {ActiveHintState, Dummy, HintingPhase, ProposingHint, ProposingHintPhase, isProposing} from './gameState';
import {Hint, Letter, LetterAndSource, LetterSources, PlayerNumber} from './gameTypes';
import {PlayerNameContext, usePlayerContext, useProposeHint} from './gameHook';
import {
    Card,
    CardsFromLettersAndSources,
    CardsInHint,
    CardWithAnnotation,
    CardWithPlayerNumberOrLetter,
    DisplayNumberOrLetterWithTextAndCards,
    PlayerWithCardsInHand
} from './Cards';
import {specsOfHint} from './gameLogic';
import { deepEqual } from './utils';

function HintGameRoom({hintingGameState}: {hintingGameState: HintingPhase}) {
    const {username} = usePlayerContext();

    return <div className='gameContainer'>
        <HintGameRoomSidebar hintingGameState={hintingGameState} />
        <HintGameRoomLog hintingGameState={hintingGameState} />
    </div>;
}

function HintGameRoomSidebar({hintingGameState}: {hintingGameState: HintingPhase}) {
    const username = useContext(PlayerNameContext);
    return <div className='gameSidebar'>
        {hintingGameState.players.map((player, i) => {
            const hand = {
                letters: player.hand.letters,
                activeIndex: player.hand.activeIndex,
            };
            const playerNumber = i + 1;
            return <PlayerWithCardsInHand
                hand={hand}
                isForViewingPlayer={player.name === username}
                playerName={player.name}
                playerNumber={playerNumber}
                key={playerNumber}
                extraText={`${player.hintsGiven} hint${player.hintsGiven === 1 ? '' : 's'} given`}
            />
        })}
        {hintingGameState.dummies.length > 0 && <DummiesSection dummies={hintingGameState.dummies} />}
        {hintingGameState.bonuses.length > 0 && <BonusesSection bonuses={hintingGameState.bonuses} />}
    </div>
}

function DummiesSection({dummies}: {dummies: readonly Dummy[]}) {
    const cards = <div className='flex'>
        {dummies.map((dummy, i) => {
            const annotation = <span className='dummyAnnotation strawberryCenter'>{dummy.untilFreeHint > 0 ? `${dummy.untilFreeHint} to hint` : ''}</span>;
            return <CardWithAnnotation letter={dummy.currentLetter} annotation={annotation} key={i} />
        })}
    </div>;
    return <DisplayNumberOrLetterWithTextAndCards
        numberOrLetter='D'
        topText='Dummies'
        cardsToRender={cards}
    />
}

function BonusesSection({bonuses}: {bonuses: readonly Letter[]}) {
    const cards = <div className='flex'>
        {bonuses.map((letter, i) => {
            return <Card letter={letter} key={i} />
        })}
    </div>;
    return <DisplayNumberOrLetterWithTextAndCards
        numberOrLetter='B'
        topText='Bonuses'
        cardsToRender={cards}
    />
}

function HintGameRoomLog({hintingGameState}: {hintingGameState: HintingPhase}) {
    const username = useContext(PlayerNameContext);
    const activeHintNumber = hintingGameState.hintLog.length + 1;
    const totalHintsAvailable = activeHintNumber + hintingGameState.hintsRemaining;
    // TODO: render log when there are things to render
    return <div className='hintLog'>


        <span className='hintLogTitle'>Hint {activeHintNumber} / {totalHintsAvailable}</span>
        {isProposing(hintingGameState) && <ProposingHintComponent hintingGameState={hintingGameState} />}
    </div>
}

function plural(n: number): string {
    return n === 1 ? '' : 's';
}

function getHintSentence(hint: Hint): string {
    const specs = specsOfHint(hint);

    let sentence = `${specs.length} letter${plural(specs.length)}, ${specs.players} player${plural(specs.players)}, ${specs.wildcard ? '' : 'no '}wildcard`;

    if (specs.dummies > 0) {
        sentence += `, ${specs.dummies} ${specs.dummies === 1 ? 'dummy' : 'dummies'}`;
    }
    if (specs.bonuses > 0) {
        sentence += `, ${specs.bonuses} ${specs.bonuses === 1 ? 'bonus' : 'bonuses'}`;
    }

    return sentence ;
}


function ProposingHintComponent({hintingGameState}: {hintingGameState: ProposingHintPhase}) {
    const {username, isSpectator, player} = usePlayerContext();

    return <>
        <span className='hintLogLine'>Players are proposing hints.</span>
        {hintingGameState.players.map((player, i) => {
            const proposedHint = hintingGameState.activeHint.proposedHints[i + 1];
            const sentence = proposedHint && getHintSentence(proposedHint);
            return <span className='hintLogLine'>
                {player.name} {proposedHint ? `has proposed: ${sentence}.` : 'has not proposed a hint.'}
            </span>;
        })}
        {!isSpectator && <HintComposer hintingGameState={hintingGameState} />}
    </>;
}

function LinkButton({children, onClick, isDisabled}: {children: React.ReactNode, onClick?: () => void, isDisabled: boolean}) {
    return <span className={isDisabled ? 'strawberryLinkButtonDisabled' : 'strawberryLinkButton'} onClick={isDisabled ? undefined : onClick}>
        {children}
    </span>
}

function addLetterAndSourceToHint(hint: Hint | null, letterAndSource: LetterAndSource, playerNumber: PlayerNumber): Hint {
    // First letter
    if (hint === null) {
        return {
            givenByPlayer: playerNumber,
            lettersAndSources: [letterAndSource],
        }
    }
    return {
        givenByPlayer: hint.givenByPlayer,
        lettersAndSources: [...hint.lettersAndSources, letterAndSource],
    }
}

function HintComposer({hintingGameState}: {hintingGameState: ProposingHintPhase}) {
    const {username, player, playerNumber} = usePlayerContext();
    const proposedHint: Hint | null = hintingGameState.activeHint.proposedHints[playerNumber!] || null;

    const [stagedHint, setStagedHint] = useState<Hint | null>(proposedHint);

    const [nextProposedHint, callProposeHint] = useProposeHint(hintingGameState);

    const stagedHintSentence = stagedHint !== null && getHintSentence(stagedHint);

    const proposedWord = proposedHint && proposedHint.lettersAndSources.map(letterAndSource => letterAndSource.letter).join('').toUpperCase();
    let proposeText = 'Propose hint';
    if (proposedWord) {
        proposeText += ` (current: ${proposedWord})`;
    }

    const canSubmitHint = stagedHint != null && deepEqual(stagedHint, proposedHint) && nextProposedHint === undefined;

    const addToStagedHint = (letterAndSource: LetterAndSource) => {
        const newHint = addLetterAndSourceToHint(stagedHint, letterAndSource, playerNumber!);
        setStagedHint(newHint);
    };

    return <>
        <span className='hintLogLine' />
        <span className='hintLogLine italics'>Available letters (click to use): </span>
        <AvailableCards
            hintingGameState={hintingGameState}
            playerNumber={playerNumber!}
            addToStagedHint={addToStagedHint}
        />
        <div className='hintLogGuessBox' style={{position: 'relative'}}>
            {stagedHint !== null ?
                <CardsInHint hint={stagedHint} viewingPlayer={playerNumber!} />:
                // Render a hidden thing to make sure we have the right width.
                <div style={{visibility: 'hidden'}}><CardWithPlayerNumberOrLetter letter={'🍓'} playerNumberOrLetter={'🍓'} /></div>}
            <div style={{position: 'absolute', top: '0px', right: '0px', padding: '5px'}}>
                <LinkButton onClick={() => {
                    setStagedHint(null);
                }} isDisabled={stagedHint === null}>Clear</LinkButton>
            </div>
        </div>
        <div className='flex hintLogLine'>
            {stagedHint !== null && <span className='italics'>{stagedHintSentence}</span>}
            <span style={{flex: 'auto', textAlign: 'right'}}>
                <LinkButton isDisabled={stagedHint == null && callProposeHint != null} onClick={() => stagedHint != null && callProposeHint != null && callProposeHint(stagedHint)}>{proposeText}</LinkButton>
                <span style={{marginLeft: '10px'}} />
                <LinkButton isDisabled={!canSubmitHint}>Submit hint</LinkButton>
            </span>

        </div>
    </>
}

function AvailableCards({hintingGameState, playerNumber, addToStagedHint}: {
    hintingGameState: ProposingHintPhase,
    playerNumber: PlayerNumber,
    addToStagedHint: (letterAndSource: LetterAndSource) => void,
}) {
    let lettersAndSources: LetterAndSource[] = [];

    hintingGameState.players.forEach((player, i) => {
        if (i + 1 !== playerNumber) {
            lettersAndSources.push({
                sourceType: LetterSources.PLAYER,
                letter: player.hand.letters[player.hand.activeIndex],
                playerNumber: i + 1,
            });
        }
    });

    hintingGameState.dummies.forEach((dummy, i) => {
        lettersAndSources.push({
            sourceType: LetterSources.DUMMY,
            letter: dummy.currentLetter,
            dummyNumber: i + 1,
        });
    });

    hintingGameState.bonuses.forEach(bonus => {
        lettersAndSources.push({
            sourceType: LetterSources.BONUS,
            letter: bonus,
        })
    });

    lettersAndSources.push({
        sourceType: LetterSources.WILDCARD,
        letter: '*',
    });

    return <div className='hintLogLine' style={{marginLeft: '12px'}}>
        <CardsFromLettersAndSources lettersAndSources={lettersAndSources} viewingPlayer={playerNumber} onClick={addToStagedHint} />
    </div>
}

export {HintGameRoom};
