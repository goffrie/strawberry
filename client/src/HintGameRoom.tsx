import React, {useContext, useEffect, useState} from 'react';
import {
    Dummy,
    HintingPhase, HintingPhasePlayer,
    isProposing,
    isResolving,
    ProposingHintPhase, ResolveAction,
    ResolveActionKind,
    ResolvingHintPhase
} from './gameState';
import {Hint, Letter, LetterAndSource, LetterSources, PlayerNumber} from './gameTypes';
import {PlayerNameContext, useGiveHint, usePlayerContext, useProposeHint, useResolveHint, useSetHandGuess} from './gameHook';
import {
    Card,
    CardsFromLettersAndSources,
    CardsInHint,
    CardWithAnnotation,
    CardWithPlayerNumberOrLetter,
    DisplayNumberOrLetterWithTextAndCards,
    PlayerWithCardsInHand
} from './Cards';
import {ResolveActionChoice, specsOfHint, whichResolveActionRequired, playersWithOutstandingAction, LETTERS} from './gameLogic';
import {deepEqual} from './utils';
import { LinkButton } from './LinkButton';

function HintGameRoom({hintingGameState}: {hintingGameState: HintingPhase}) {
    const {username} = usePlayerContext();

    return <div className='gameContainer'>
        <HintGameRoomSidebar hintingGameState={hintingGameState} />
        <HintGameRoomLog hintingGameState={hintingGameState} />
    </div>;
}

function HintGameRoomSidebar({hintingGameState}: {hintingGameState: HintingPhase}) {
    const username = useContext(PlayerNameContext);
    const setGuess = useSetHandGuess(hintingGameState);
    return <div className='gameSidebar'>
        {hintingGameState.players.map((player, i) => {
            const playerNumber = i + 1;
            const isForViewingPlayer = player.name === username;
            const hand = {...player.hand};
            if (isForViewingPlayer) {
                hand.guesses = hand.guesses || Array.from({length: hintingGameState.wordLength}, _ => null);
            } else {
                delete hand.guesses;
            }
            return <PlayerWithCardsInHand
                hand={hand}
                isForViewingPlayer={isForViewingPlayer}
                playerName={player.name}
                playerNumber={playerNumber}
                key={playerNumber}
                extraText={`${player.hintsGiven} hint${player.hintsGiven === 1 ? '' : 's'} given`}
                setGuess={isForViewingPlayer ? setGuess : undefined}
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
    const {playerNumber} = usePlayerContext();

    const activeHintNumber = hintingGameState.hintLog.length + 1;
    const totalHintsAvailable = activeHintNumber + hintingGameState.hintsRemaining;
    return <div className='hintLog'>
        {hintingGameState.hintLog.map((logEntry, i) => {
            const wasViewingPlayerInHint = playerNumber !== null && logEntry.hint.lettersAndSources.some(letterAndSource => {
                return letterAndSource.sourceType === LetterSources.PLAYER && letterAndSource.playerNumber === playerNumber;
            });
            const playerCardUsed = wasViewingPlayerInHint ? logEntry.activeIndexes[playerNumber! - 1] : null;
            return <React.Fragment key={i}>
                <div className='hintLogTitle' key={i}>Hint {i + 1} / {logEntry.totalHints}</div>
                <HintInLog
                    hint={logEntry.hint}
                    playerActions={logEntry.playerActions}
                    playerCardUsed={playerCardUsed}
                    players={hintingGameState.players}
                />
                <div className='hintLogLine' />
            </React.Fragment>
        })}
        <div className='hintLogTitle'>Hint {activeHintNumber} / {totalHintsAvailable}</div>
        {isProposing(hintingGameState) && <ProposingHintComponent hintingGameState={hintingGameState} />}
        {isResolving(hintingGameState) && <ResolvingHintComponent hintingGameState={hintingGameState} />}
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
        <div className='hintLogLine'>Players are proposing hints.</div>
        {hintingGameState.players.map((player, i) => {
            const proposedHint = hintingGameState.activeHint.proposedHints[i + 1];
            const sentence = proposedHint && getHintSentence(proposedHint);
            return <div className='hintLogLine' key={i}>
                {player.name} {proposedHint ? `has proposed: ${sentence}.` : 'has not proposed a hint.'}
            </div>;
        })}
        {!isSpectator && <HintComposer hintingGameState={hintingGameState} />}
    </>;
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

function removeLetterFromHintByIndex(hint: Hint, i: number): Hint | null {
    if (hint.lettersAndSources.length === 1) {
        return null;
    }

    const newLettersAndSources = [...hint.lettersAndSources];
    newLettersAndSources.splice(i, 1);

    return {
        givenByPlayer: hint.givenByPlayer,
        lettersAndSources: newLettersAndSources,
    }
}

function HintComposer({hintingGameState}: {hintingGameState: ProposingHintPhase}) {
    const {username, player, playerNumber} = usePlayerContext();
    const proposedHint: Hint | null = hintingGameState.activeHint.proposedHints[playerNumber!] || null;

    const [stagedHint, setStagedHint] = useState<Hint | null>(proposedHint);

    const [nextProposedHint, callProposeHint] = useProposeHint(hintingGameState);
    const callSubmitHint = useGiveHint(hintingGameState);

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

        if (newHint.lettersAndSources.length === 11) {
            const isUserAlreadyWarned = localStorage.getItem('longHintWarning');
            if (isUserAlreadyWarned === null) {
                alert('ok stop :^)');
                localStorage.setItem('longHintWarning', 'true');
            }
        }
    };

    const submit = () => {
        if (stagedHint != null
            && canSubmitHint
            && callSubmitHint != null) {
            callSubmitHint(stagedHint);
            setStagedHint(null);
        }
    };

    const removeLetterFromHint = (letterAndSource: LetterAndSource, i: number) => {
       const newHint = removeLetterFromHintByIndex(stagedHint!, i);
       setStagedHint(newHint);
    };

    return <>
        <div className='hintLogLine' />
        <div className='hintLogLine italics'>Available letters (click to use): </div>
        <AvailableCards
            hintingGameState={hintingGameState}
            playerNumber={playerNumber!}
            addToStagedHint={addToStagedHint}
        />
        <div className='hintLogGuessBox'>
            {stagedHint !== null ?
                <CardsInHint hint={stagedHint} viewingPlayer={playerNumber!} onClick={removeLetterFromHint} />:
                // Render a hidden thing to make sure we have the right width.
                <div style={{visibility: 'hidden'}}><CardWithPlayerNumberOrLetter letter={'🍓'} playerNumberOrLetter={'🍓'} /></div>}
                <div className='flexAlignRight hintLogGuessBoxClear'>
                    <LinkButton onClick={() => {
                        setStagedHint(null);
                    }} isDisabled={stagedHint === null}>Clear</LinkButton>
                </div>
        </div>
        <div className='flex hintLogLine'>
            {stagedHint !== null && <span className='italics'>{stagedHintSentence}</span>}
            <span className='flexAlignRight'>
                <LinkButton isDisabled={stagedHint == null && callProposeHint != null} onClick={() => stagedHint != null && callProposeHint != null && callProposeHint(stagedHint)}>{proposeText}</LinkButton>
                <span style={{marginLeft: '10px'}} />
                <LinkButton isDisabled={!canSubmitHint} onClick={submit}>Submit hint</LinkButton>
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

    lettersAndSources.push({
        sourceType: LetterSources.WILDCARD,
        letter: '*',
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

    return <div className='hintLogLine' style={{marginLeft: '12px'}}>
        <CardsFromLettersAndSources lettersAndSources={lettersAndSources} viewingPlayer={playerNumber} onClick={addToStagedHint} />
    </div>
}

function HintInLog({hint, playerActions, playerCardUsed, players}: {
    hint: Hint,
    playerActions: readonly ResolveAction[],
    playerCardUsed: null | number,
    players: readonly HintingPhasePlayer[],
}) {
    const {playerNumber} = usePlayerContext();

    let playerNamesByNumber: Record<PlayerNumber, string> = {};
    players.forEach((player, i) => {
        playerNamesByNumber[i + 1] = player.name;
    });

    let playerActionStrings = playerActions.map(playerAction => {
        const actingPlayerName = playerNamesByNumber[playerAction.player];

        switch (playerAction.kind) {
            case ResolveActionKind.NONE:
                return `${actingPlayerName} did not flip their card.`;
            case ResolveActionKind.FLIP:
                return `${actingPlayerName} flipped their card.`;
            case ResolveActionKind.GUESS:
                if (playerAction.actual === playerAction.guess) {
                    return `${actingPlayerName} correctly guessed ${playerAction.actual}.`;
                }
                return `${actingPlayerName} incorrectly guessed ${playerAction.guess} (actual: ${playerAction.actual}).`;
            default:
                return '';
        }
    });

    // TODO: marginLeft -12 if want to align cards with hint construction
    return <>
        <div className='hintLogLine'>{playerNamesByNumber[hint.givenByPlayer]} gave a hint: {getHintSentence(hint)}</div>
        <div className='hintLogLine' style={{marginLeft: '-5px'}}>
            <CardsInHint hint={hint} viewingPlayer={playerNumber!} />
        </div>
        {playerCardUsed !== null && <div className='hintLogLine'>Your position {playerCardUsed + 1} card was used.</div>}

        {playerActionStrings.map((str, i) => {
            return <div className='hintLogLine' key={i}>{str}</div>;
        })}
    </>;
}

function ResolvingHintComponent({hintingGameState}: {hintingGameState: ResolvingHintPhase}) {
    const {username, player, playerNumber} = usePlayerContext();

    const activeHint = hintingGameState.activeHint;

    const resolveActionRequired = whichResolveActionRequired(hintingGameState, username);
    // Compute whether a card of the player's was used (based on activeIndex and whether they flipped) to render.
    const isPlayerCardUsedInHint = resolveActionRequired !== ResolveActionChoice.UNINVOLVED;
    const playerCardUsed = isPlayerCardUsedInHint ? hintingGameState.activeHint.activeIndexes[playerNumber! - 1] : null;

    const waitingOnPlayers = playersWithOutstandingAction(hintingGameState.activeHint);
    const waitingOnPlayerNames = hintingGameState.players.filter((player, i) => waitingOnPlayers.has(i+1)).map((player) => player.name);

    return <>
        <HintInLog hint={activeHint.hint} playerActions={activeHint.playerActions} playerCardUsed={playerCardUsed} players={hintingGameState.players} />
        <div className='hintLogLine flex'>
            {resolveActionRequired === ResolveActionChoice.FLIP && <FlipResolve playerNumber={playerNumber!} hintingGameState={hintingGameState} />}
            {resolveActionRequired === ResolveActionChoice.GUESS && <GuessResolve player={player!} playerNumber={playerNumber!} hintingGameState={hintingGameState} />}
            {waitingOnPlayerNames.length > 0 && <span className='flexAlignRight italics'>Waiting on: {waitingOnPlayerNames.join(', ')}</span>}
        </div>
    </>;
}

function FlipResolve({playerNumber, hintingGameState}: {playerNumber: PlayerNumber, hintingGameState: ResolvingHintPhase}) {
    const resolveFn = useResolveHint(hintingGameState);
    if (resolveFn === null) throw new Error('illegal');
    return <>
        <span className='italics'>Would you like to flip your card?&nbsp;</span>
        <LinkButton onClick={() => {
            resolveFn({
                player: playerNumber,
                kind: ResolveActionKind.FLIP,
            });
        }}>Yes</LinkButton>
        &nbsp;/&nbsp;
        <LinkButton onClick={() => {
            resolveFn({
                player: playerNumber,
                kind: ResolveActionKind.NONE,
            });
        }}>No</LinkButton></>;
}

function GuessResolve({player, playerNumber, hintingGameState}: {player: HintingPhasePlayer, playerNumber: PlayerNumber, hintingGameState: ResolvingHintPhase}) {
    const [guess, setGuess] = useState('');
    const resolveFn = useResolveHint(hintingGameState);
    if (resolveFn === null) throw new Error('illegal');
    return <>
        <span className='italics'>Guess the value of your bonus card: </span>
        <form onSubmit={e => {
            e.preventDefault();
            if (guess !== '') {
                if (guess.length !== 1) throw new Error('how did you guess more than one letter');
                resolveFn({
                    player: playerNumber,
                    kind: ResolveActionKind.GUESS,
                    guess,
                    actual: player.hand.letters[player.hand.activeIndex],
                });
            }
        }}>
            <input
                className='strawberryInput strawberryInputSmall'
                value={guess}
                onChange={(e) => {
                    const letter = e.target.value.substr(e.target.value.length - 1, 1).toUpperCase();
                    setGuess(LETTERS.includes(letter) ? letter : '');
                }}
                autoFocus
            />
        </form>
    </>;
}

export {HintGameRoom};
