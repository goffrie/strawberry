import React, {useContext, useEffect, useState} from 'react';
import {
    Dummy,
    HintingPhase, HintingPhasePlayer,
    isProposing,
    isResolving,
    ProposingHintPhase,
    ResolveActionKind,
    ResolvingHintPhase
} from './gameState';
import {Hint, Letter, LetterAndSource, LetterSources, PlayerNumber} from './gameTypes';
import {PlayerNameContext, useGiveHint, usePlayerContext, useProposeHint, useResolveHint} from './gameHook';
import {
    Card,
    CardsFromLettersAndSources,
    CardsInHint,
    CardWithAnnotation,
    CardWithPlayerNumberOrLetter,
    DisplayNumberOrLetterWithTextAndCards,
    PlayerWithCardsInHand
} from './Cards';
import {ResolveActionChoice, specsOfHint, whichResolveActionRequired} from './gameLogic';
import {deepEqual} from './utils';

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
        <span className='hintLogLine'>Players are proposing hints.</span>
        {hintingGameState.players.map((player, i) => {
            const proposedHint = hintingGameState.activeHint.proposedHints[i + 1];
            const sentence = proposedHint && getHintSentence(proposedHint);
            return <span className='hintLogLine' key={i}>
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
    };

    const submit = () => {
        if (stagedHint != null
            && canSubmitHint
            && callSubmitHint != null) {
            callSubmitHint(stagedHint);
            setStagedHint(null);
        }
    }

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

function ResolvingHintComponent({hintingGameState}: {hintingGameState: ResolvingHintPhase}) {
    const {username, player, playerNumber} = usePlayerContext();

    const activeHint = hintingGameState.activeHint;

    // Compute whether a card of the player's was used (based on activeIndex and whether they flipped) to render.
    const isPlayerCardUsedInHint = activeHint.hint.lettersAndSources.some(letterAndSource => {
        return letterAndSource.sourceType === LetterSources.PLAYER && letterAndSource.playerNumber === playerNumber;
    });

    let playerCardUsed = null;
    if (isPlayerCardUsedInHint) {
        const didPlayerFlip = hintingGameState.activeHint.playerActions.some(playerAction => {
            return playerAction.kind === ResolveActionKind.FLIP && playerAction.player === playerNumber;
        });

        playerCardUsed = didPlayerFlip ? player!.hand.activeIndex - 1 : player!.hand.activeIndex;
    }

    // TODO: refactor some of this to share with hint log
    let playerNamesByNumber: Record<PlayerNumber, string> = {};
    hintingGameState.players.forEach((player, i) => {
        playerNamesByNumber[i + 1] = player.name;
    });

    let playerActionStrings = hintingGameState.activeHint.playerActions.map(playerAction => {
        const actingPlayerName = playerNamesByNumber[playerAction.player];

        switch (playerAction.kind) {
            case ResolveActionKind.NONE:
                return `${actingPlayerName} did not flip their card.`;
            case ResolveActionKind.FLIP:
                return `${actingPlayerName} did flipped their card.`;
            case ResolveActionKind.GUESS:
                if (playerAction.actual === playerAction.guess) {
                    return `${actingPlayerName} correctly guessed ${playerAction.actual}.`;
                }
                return `${actingPlayerName} incorrectly guessed ${playerAction.guess} (actual: ${playerAction.actual}).`;
            default:
                return '';
        }
    });

    const resolveActionRequired = whichResolveActionRequired(hintingGameState, username);

    const waitingOnPlayerNames: string[] = [];
    hintingGameState.players.forEach(player => {
        const resolveActionRequired = whichResolveActionRequired(hintingGameState, username);
        if (resolveActionRequired === ResolveActionChoice.FLIP || resolveActionRequired === ResolveActionChoice.GUESS) {
            waitingOnPlayerNames.push(player.name);
        }
    });

    return <>
        <span className='hintLogLine'>{playerNamesByNumber[activeHint.hint.givenByPlayer]} gave a hint: {getHintSentence(activeHint.hint)}</span>
        <div className='hintLogLine'>
            <CardsInHint hint={activeHint.hint} viewingPlayer={playerNumber!} />
        </div>
        {playerCardUsed !== null && <span className='hintLogLine'>Your position {playerCardUsed + 1} card was used.</span>}

        {playerActionStrings.map((str, i) => {
            return <span className='hintLogLine' key={i}>{str}</span>;
        })}

        <span className='hintLogLine flex'>
            {resolveActionRequired === ResolveActionChoice.FLIP && <FlipResolve playerNumber={playerNumber!} hintingGameState={hintingGameState} />}
            {resolveActionRequired === ResolveActionChoice.GUESS && <GuessResolve player={player!} playerNumber={playerNumber!} hintingGameState={hintingGameState} />}
            {waitingOnPlayerNames.length > 0 && <span className='flexAlignRight italics'>Waiting on: {waitingOnPlayerNames.join(', ')}</span>}
        </span>
    </>;
}

function FlipResolve({playerNumber, hintingGameState}: {playerNumber: PlayerNumber, hintingGameState: ResolvingHintPhase}) {
    const resolveFn = useResolveHint(hintingGameState);
    if (resolveFn === null) throw new Error('illegal');
    return <>
        <span className='italics'>Would you like to flip your card?&nbsp;</span>
        <span className='strawberryLinkButton' onClick={() => {
            resolveFn({
                player: playerNumber,
                kind: ResolveActionKind.FLIP,
            });
        }}>Yes</span>
        &nbsp;/&nbsp;
        <span className='strawberryLinkButton' onClick={() => {
            resolveFn({
                player: playerNumber,
                kind: ResolveActionKind.NONE,
            });
        }}>No</span></>;
}

function GuessResolve({player, playerNumber, hintingGameState}: {player: HintingPhasePlayer, playerNumber: PlayerNumber, hintingGameState: ResolvingHintPhase}) {
    const [guess, setGuess] = useState('');
    const resolveFn = useResolveHint(hintingGameState);
    if (resolveFn === null) throw new Error('illegal');
    return <>
        <span className='italics'>Guess the value of your bonus card: </span>
        <form onSubmit={e => {
            if (guess !== '') {
                if (guess.length !== 1) throw new Error('how did you guess more than one letter');
                e.preventDefault();
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
                    setGuess(e.target.value.substr(e.target.value.length - 1, 1));
                }}
            />
        </form>
    </>;
}

export {HintGameRoom};
