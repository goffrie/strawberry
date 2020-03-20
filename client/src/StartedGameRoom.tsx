import React, {useEffect, useState, useRef, useContext} from 'react';
import ScrollableFeed from 'react-scrollable-feed';
import {
    Dummy,
    HintingPhasePlayer,
    isProposing,
    isResolving,
    ProposingHintPhase, ResolveAction,
    ResolveActionKind,
    ResolvingHintPhase,
    StartedPhase,
    RoomPhase,
    EndgamePhase,
    StartedPlayer,
    EndgameLetterChoice,
    EndgamePhasePlayer,
} from './gameState';
import {Hint, Letter, LetterAndSource, LetterSources, PlayerNumber, StagedHint, TypedWildcard, stripTypedLetter} from './gameTypes';
import {useGiveHint, usePlayerContext, useProposeHint, useResolveHint, useSetHandGuess, useStrawberryGame, useSetFinalGuess, useCommitFinalGuess} from './gameHook';
import {
    Card,
    CardsFromLettersAndSources,
    CardWithAnnotation,
    DisplayNumberOrLetterWithTextAndCards,
    PlayerWithCardsInHand,
    CardsInHand,
    RevealedCardsInHand
} from './Cards';
import {ResolveActionChoice, specsOfHint, whichResolveActionRequired, playersWithOutstandingAction, LETTERS, lettersForFinalGuess, setFinalGuess} from './gameLogic';
import {deepEqual} from './utils';
import { LinkButton } from './LinkButton';
import { FruitEmojiContext } from './Fruit';

function StartedGameRoom({gameState}: {gameState: StartedPhase}) {
    const {isSpectator, playerNumber} = usePlayerContext();
    const [settingGuesses, setGuess] = useSetHandGuess(gameState);

    let action: React.ReactNode;
    if (gameState.phase === RoomPhase.HINT) {
        const activeHintNumber = gameState.hintLog.length + 1;
        const totalHintsAvailable = gameState.hintLog.length + gameState.hintsRemaining;
        action = <div className="hintLogEntry">
            <div className='hintLogTitle'>Hint {activeHintNumber} / {totalHintsAvailable}</div>
            {isProposing(gameState) && <ProposingHintComponent hintingGameState={gameState} />}
            {isResolving(gameState) && <ResolvingHintComponent hintingGameState={gameState} setGuess={setGuess} />}
        </div>;
    } else if (isSpectator) {
        // Spectators can't act in the ending phase
    } else if (!gameState.players[playerNumber! - 1].committed) {
        action = <div className="hintLogEntry">
            <div className='hintLogTitle'>Construct your word</div>
            <GuessWordComponent gameState={gameState} />
        </div>;
    } else {
        action = <div className="hintLogEntry">
            <div className='hintLogTitle'>Your final word</div>
            <FinalWordComponent gameState={gameState} />
        </div>;
    }

    return <div className='gameContainer'>
        <StartedGameRoomSidebar gameState={gameState} settingGuesses={settingGuesses} setGuess={setGuess}/>
        <StartedGameRoomLog gameState={gameState} settingGuesses={settingGuesses} setGuess={setGuess}>
            {action}
        </StartedGameRoomLog>
        {!isSpectator && <StartedGameRoomNotesSidebar />}
    </div>;
}

function StartedGameRoomSidebar({gameState, settingGuesses={}, setGuess}: {
    gameState: StartedPhase,
    settingGuesses?: Readonly<Record<number, Letter | null>>,
    setGuess?: (index: number, guess: Letter | null) => void,
}) {
    const { username } = usePlayerContext();
    const players: readonly StartedPlayer[] = gameState.players;
    return <div className='gameSidebar gameSidebarPlayers'>
        {players.map((player, i) => {
            const playerNumber = i + 1;
            const isForViewingPlayer = player.name === username;
            const hand = {...player.hand};
            if (isForViewingPlayer) {
                hand.guesses = Array.from(
                    // TODO: remove this migration
                    player.hand.guesses || {length: gameState.wordLength},
                    // overlay `settingGuesses` on top
                    (v, i) => settingGuesses ? settingGuesses[i] ?? v : v,
                );
            }
            let cardsToRender = <CardsInHand hand={hand} isForViewingPlayer={isForViewingPlayer} setGuess={isForViewingPlayer ? setGuess : undefined} />;

            if (gameState.phase === RoomPhase.ENDGAME) {
                const p = player as EndgamePhasePlayer;
                // All letters are guessable, but no letter is revealed.
                hand.activeIndex = gameState.wordLength;
                let override: (LetterAndSource | null)[] | undefined;
                const convert = (choice: EndgameLetterChoice): LetterAndSource => {
                    if (choice.sourceType === LetterSources.PLAYER) {
                        return {
                            sourceType: LetterSources.PLAYER,
                            letter: gameState.players[playerNumber-1].hand.letters[choice.index],
                            playerNumber,
                        };
                    }
                    return choice;
                }
                if (p.committed) {
                    // Reveal this player's final guess!
                    override = p.guess.map(convert);
                } else if (!isForViewingPlayer) {
                    // Show the letters that this player has taken from the centre.
                    override = p.guess.filter((choice) => choice.sourceType !== LetterSources.PLAYER).map(convert);
                    const length = Math.max(gameState.wordLength, p.guess.length);
                    while (override.length < length) {
                        override.push(null);
                    }
                }
                if (override) {
                    cardsToRender = <RevealedCardsInHand letters={override} />;
                }
            }
            return <PlayerWithCardsInHand
                cardsToRender={cardsToRender}
                isForViewingPlayer={isForViewingPlayer}
                playerName={player.name}
                playerNumber={playerNumber}
                key={playerNumber}
                extraText={`${player.hintsGiven} hint${player.hintsGiven === 1 ? '' : 's'} given`}
            />
        })}
        {gameState.dummies.length > 0 && <DummiesSection dummies={gameState.dummies} />}
        {gameState.bonuses.length > 0 && <BonusesSection bonuses={gameState.bonuses} />}
    </div>
}

let debounceTimeout: null | number = null;
function StartedGameRoomNotesSidebar() {
    // TODO: refactor local storage keys into constants
    // TODO: separate into components
    // TODO: save sidebar width to localStorage
    const [sidebarWidth, setSidebarWidth] = useState(350);
    const [notes, setNotes] = useState('');
    const strawberryGame = useStrawberryGame();
    const roomName = strawberryGame?.roomName!;
    const localStorageKey = `notes:${roomName}`;
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Load the notes from local storage in case user rejoined
    useEffect(() => {
        const existingNotes = window.localStorage.getItem(localStorageKey);
        if (existingNotes !== null) {
            setNotes(existingNotes);
        }
    }, [localStorageKey]);

    const [isDragging, setIsDragging] = useState(false);
    const handleRef = useRef<HTMLDivElement>(null);

    return <>
        <div className='gameSidebar gameSidebarNotesHandle'
             onPointerDown={e => {
                 handleRef!.current!.setPointerCapture(e.pointerId);
                 setIsDragging(true)
             }}
             onMouseMove={e => {
                 if (isDragging) {
                     // minus 10 due to width of handle
                     // TODO: fix this properly. handle is width 7 but need to consider where in the handle
                     // the mouse is to accurately offset
                     let newWidth = window.innerWidth - e.pageX - 10;
                     if (newWidth < 100) newWidth = 100;
                     setSidebarWidth(newWidth);
                 }
             }}
             onPointerUp={e => {
                 handleRef!.current!.releasePointerCapture(e.pointerId);
                 setIsDragging(false)
             }}
             ref={handleRef}
        />
        <div className='gameSidebar gameSidebarNotes' style={{width: `${sidebarWidth}px`, position: 'relative'}}>
            <textarea
                className='notesBox'
                value={notes}
                placeholder='You can type notes here'
                onChange={e => {
                    const newValue = e.target.value;
                    if (debounceTimeout !== null) {
                        clearTimeout(debounceTimeout);
                    }
                    debounceTimeout = window.setTimeout(() => {localStorage.setItem(localStorageKey, newValue)}, 1000);
                    setNotes(e.target.value);
                }}
                ref={textareaRef}
                onKeyDown={e => {
                    // tab to insert space https://jsfiddle.net/2wAzx/13/
                   if (e.keyCode === 9) {
                       e.preventDefault();
                       const textarea = textareaRef.current;
                       if (!textarea) return;

                       // get caret position/selection
                       const val = textarea.value;
                       const start = textarea.selectionStart;
                       const end = textarea.selectionEnd;

                       // set textarea value to: text before caret + spaces + text after caret
                       textarea.value = val.substring(0, start) + '    ' + val.substring(end);

                       // put caret at right position again
                       textarea.selectionStart = textarea.selectionEnd = start + 4;

                       // prevent the focus lose
                       return false;
                   }
                }}
            />
        </div>
    </>
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
    const cards = <div className='flex bonuses'>
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

function StartedGameRoomLog({gameState, settingGuesses={}, setGuess, children}: {
    gameState: StartedPhase,
    settingGuesses?: Readonly<Record<number, Letter | null>>,
    setGuess?: (index: number, guess: Letter | null) => void,
    children: React.ReactNode,
}) {
    const {playerNumber} = usePlayerContext();

    return <ScrollableFeed className='hintLogContainer'>
        <div className='hintLogContent'>
            {gameState.hintLog.map((logEntry, i) => {
                const wasViewingPlayerInHint = playerNumber !== null && logEntry.hint.lettersAndSources.some(letterAndSource => {
                    return letterAndSource.sourceType === LetterSources.PLAYER && letterAndSource.playerNumber === playerNumber;
                });
                const playerCardUsed = wasViewingPlayerInHint ? logEntry.activeIndexes[playerNumber! - 1] : null;
                return <div className="hintLogEntry" key={i}>
                    <div className='hintLogTitle' key={i}>Hint {i + 1} / {logEntry.totalHints}</div>
                    <HintInLog
                        hint={logEntry.hint}
                        playerActions={logEntry.playerActions}
                        playerCardUsed={playerCardUsed}
                        gameState={gameState}
                        settingGuesses={settingGuesses}
                        setGuess={setGuess}
                    />
                </div>
            })}
            {children}
        </div>
    </ScrollableFeed>
}

function plural(n: number): string {
    return n === 1 ? '' : 's';
}

function HintSentence({hint}: {hint: Hint}) {
    const fruitEmoji = useContext(FruitEmojiContext);
    const {isSpectator} = usePlayerContext();
    if (hint.lettersAndSources.every((letterAndSource) => letterAndSource.sourceType === LetterSources.WILDCARD)) {
        return <>{fruitEmoji.repeat(hint.lettersAndSources.length)}</>;
    }

    const specs = specsOfHint(hint);

    let sentence = `${specs.length} letter${plural(specs.length)}, ${specs.players} player${plural(specs.players)}, ${specs.wildcard ? '' : 'no '}wildcard`;

    if (specs.dummies > 0) {
        sentence += `, ${specs.dummies} ${specs.dummies === 1 ? 'dummy' : 'dummies'}`;
    }
    if (specs.bonuses > 0) {
        sentence += `, ${specs.bonuses} ${specs.bonuses === 1 ? 'bonus' : 'bonuses'}`;
    }

    if (isSpectator) {
        sentence = `${''.concat(...hint.lettersAndSources.map((l) => l.letter))} (${sentence})`;
    }

    return <>{sentence}</>;
}


function ProposingHintComponent({hintingGameState}: {hintingGameState: ProposingHintPhase}) {
    const {isSpectator, username} = usePlayerContext();

    return <>
        <div className='hintLogLine'>Players are proposing hints.</div>
        {hintingGameState.players.map((player, i) => {
            const proposedHint = hintingGameState.activeHint.proposedHints[i + 1];
            const sentence = proposedHint && <HintSentence hint={proposedHint} />;
            return <div className='hintLogLine' key={i}>
                <PlayerName name={player.name} /> <span className="has">has</span> {proposedHint ? <>proposed: {sentence}.</> : 'not proposed a hint.'}
            </div>;
        })}
        {!isSpectator && <HintComposer hintingGameState={hintingGameState} key={`hintComposer:${username}`}/>}
    </>;
}

function addLetterAndSourceToHint(hint: StagedHint | null, letterAndSource: LetterAndSource | TypedWildcard, playerNumber: PlayerNumber): StagedHint {
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

function removeLetterFromHintByIndex(hint: StagedHint, i: number): StagedHint | null {
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

function proposableLettersAndSources(hintingGameState: ProposingHintPhase, playerNumber: PlayerNumber): LetterAndSource[] {
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

    return lettersAndSources;
}

function HintComposer({hintingGameState}: {hintingGameState: ProposingHintPhase}) {
    const [nextProposedHint, callProposeHint] = useProposeHint(hintingGameState);
    const callSubmitHint = useGiveHint(hintingGameState);

    const {playerNumber} = usePlayerContext();
    if (playerNumber == null || callProposeHint == null || callSubmitHint == null) {
        throw new Error("HintComposer requires a non-spectator");
    }

    const proposedHint: Hint | null = hintingGameState.activeHint.proposedHints[playerNumber] || null;

    const [stagedHint, setStagedHint] = useState<StagedHint | null>(proposedHint);
    const strippedStagedHint: Hint | null = stagedHint && {
        ...stagedHint,
        lettersAndSources: stagedHint.lettersAndSources.map(stripTypedLetter),
    };

    const stagedHintSentence = strippedStagedHint !== null && <HintSentence hint={strippedStagedHint} />;

    const proposedWord = proposedHint && proposedHint.lettersAndSources.map(letterAndSource => letterAndSource.letter).join('').toUpperCase();
    let proposeText = 'Propose hint';
    if (proposedWord) {
        proposeText += ` (current: ${proposedWord})`;
    }

    const canSubmitHint = strippedStagedHint != null && deepEqual(strippedStagedHint, proposedHint) && nextProposedHint === undefined;

    const addToStagedHint = (letterAndSource: LetterAndSource | TypedWildcard) => {
        const newHint = addLetterAndSourceToHint(stagedHint, letterAndSource, playerNumber);
        setStagedHint(newHint);

        if (newHint.lettersAndSources.length === 11) {
            const isUserAlreadyWarned = localStorage.getItem('longHintWarning');
            if (isUserAlreadyWarned === null) {
                alert('ok stop :^)');
                localStorage.setItem('longHintWarning', 'true');
            }
        }
    };

    const addTypedLetterToStagedHint = (letter: string) => {
        // typing a digit gets you that player's letter
        const letterInt = parseInt(letter);
        if (letterInt.toString() === letter) {
            if (letterInt >= 1 && letterInt <= hintingGameState.players.length && letterInt != playerNumber) {
                const player = hintingGameState.players[letterInt - 1];
                addToStagedHint({
                    sourceType: LetterSources.PLAYER,
                    letter: player.hand.letters[player.hand.activeIndex],
                    playerNumber: letterInt,
                });
            }
            return;
        }

        const availableLettersWithThatLetter = availableLetters
            .filter((availableLetter) => availableLetter.letter === letter);
        if (availableLettersWithThatLetter.length) {
            const choices = availableLettersWithThatLetter.map((l) => {
                return {
                    letterAndSource: l,
                    source: l.sourceType === LetterSources.PLAYER ? 0 : l.sourceType === LetterSources.DUMMY ? 1 : 2,
                    timesUsed: strippedStagedHint ? strippedStagedHint.lettersAndSources.filter((stagedLetter) => deepEqual(stagedLetter, l)).length : 0,
                };
            });
            choices.sort((l1, l2) => {
                if (l1.source !== l2.source) {
                    return l1.source - l2.source;
                }
                if (l1.timesUsed !== l2.timesUsed) {
                    return l1.timesUsed - l2.timesUsed;
                }
                if (l1.letterAndSource.sourceType === LetterSources.PLAYER && l2.letterAndSource.sourceType === LetterSources.PLAYER) {
                    return hintingGameState.players[l1.letterAndSource.playerNumber - 1].hand.activeIndex - hintingGameState.players[l2.letterAndSource.playerNumber - 1].hand.activeIndex;
                }
                return 0;
            });
            addToStagedHint(choices[0].letterAndSource);
        } else {
            addToStagedHint({
                letter: '*',
                sourceType: LetterSources.WILDCARD,
                typedLetter: letter,
            });
        }
    }

    const submit = () => {
        if (strippedStagedHint != null && canSubmitHint) {
            callSubmitHint(strippedStagedHint);
            setStagedHint(null);
        }
    };

    const removeLetterFromHint = (i: number) => {
       const newHint = removeLetterFromHintByIndex(stagedHint!, i);
       setStagedHint(newHint);
    };

    const availableLetters = proposableLettersAndSources(hintingGameState, playerNumber);

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Backspace") {
            e.preventDefault();
            if (stagedHint) {
                removeLetterFromHint(stagedHint.lettersAndSources.length - 1);
            }
        }
    };

    const onKeyPress = (e: React.KeyboardEvent) => {
        e.preventDefault();
        if (e.key === "Enter") {
            if (strippedStagedHint) {
                callProposeHint(strippedStagedHint);
            }
            return;
        }

        const letter = e.key.toUpperCase();
        addTypedLetterToStagedHint(letter);
    };

    return <>
        <div className='hintLogLine'>&nbsp;</div>
        <div className='hintLogLine italics'>Available letters (click to use): </div>
        <AvailableCards
            lettersAndSources={availableLetters}
            playerNumber={playerNumber}
            addToStagedHint={addToStagedHint}
        />
        <div className='hintLogGuessBox' tabIndex={0} onKeyDown={onKeyDown} onKeyPress={onKeyPress}>
            {<CardsFromLettersAndSources lettersAndSources={stagedHint?.lettersAndSources ?? []} viewingPlayer={playerNumber} onClick={(_, i) => removeLetterFromHint(i)} />}
            <div className='flexAlignRight hintLogGuessBoxClear'>
                <LinkButton onClick={() => {
                    setStagedHint(null);
                }} isDisabled={stagedHint === null}>Clear</LinkButton>
            </div>
        </div>
        <div className='flex hintLogLine stagedHintActions'>
            {stagedHint !== null && <span className='stagedHintSentence italics'>{stagedHintSentence}</span>}
            <span className='flexAlignRight'>
                <LinkButton isDisabled={stagedHint == null} onClick={() => stagedHint != null && callProposeHint(strippedStagedHint)}>{proposeText}</LinkButton>
                <span style={{marginLeft: '10px'}} />
                <LinkButton isDisabled={!canSubmitHint} onClick={submit}>Submit hint</LinkButton>
            </span>
        </div>
    </>
}

function AvailableCards({lettersAndSources, playerNumber, addToStagedHint}: {
    lettersAndSources: readonly LetterAndSource[],
    playerNumber: PlayerNumber,
    addToStagedHint: (letterAndSource: LetterAndSource | TypedWildcard) => void,
}) {
    return <div className='hintLogLine' style={{marginLeft: '12px'}}>
        <CardsFromLettersAndSources lettersAndSources={lettersAndSources} viewingPlayer={playerNumber} onClick={addToStagedHint} />
    </div>
}

function PlayerName({name}: {name: string}) {
    const { username } = usePlayerContext();
    return <>
        <span className="playerName">{name}</span>
        {username === name && <> <span className="you">(you)</span></>}
    </>;
}

function HintInLog({hint, playerActions, playerCardUsed, gameState, settingGuesses={}, setGuess}: {
    hint: Hint,
    playerActions: readonly ResolveAction[],
    playerCardUsed: null | number,
    gameState: StartedPhase,
    settingGuesses?: Readonly<Record<number, Letter | null>>,
    setGuess?: (index: number, guess: Letter | null) => void,
}) {
    const {playerNumber} = usePlayerContext();
    const players = gameState.players;

    let playerNamesByNumber: Record<PlayerNumber, string> = {};
    players.forEach((player, i) => {
        playerNamesByNumber[i + 1] = player.name;
    });

    let playerActionStrings = playerActions.map(playerAction => {
        const actingPlayerName = playerNamesByNumber[playerAction.player];

        switch (playerAction.kind) {
            case ResolveActionKind.NONE:
                return <><PlayerName name={actingPlayerName} /> <span className="incorrect">did not flip</span> <span className="their">their</span> card.</>;
            case ResolveActionKind.FLIP:
                return <><PlayerName name={actingPlayerName} /> <span className="correct">flipped</span> <span className="their">their</span> card.</>;
            case ResolveActionKind.GUESS:
                if (playerAction.actual === playerAction.guess) {
                    return <><PlayerName name={actingPlayerName} /> <span className="correct">correctly</span> guessed {playerAction.actual}.</>;
                }
                return <><PlayerName name={actingPlayerName} /> <span className="incorrect">incorrectly</span> guessed {playerAction.guess} (actual: {playerAction.actual}).</>;
            default:
                return '';
        }
    });

    const playerGuess = playerNumber != null && playerCardUsed != null ? (settingGuesses && settingGuesses[playerCardUsed]) ?? gameState.players[playerNumber-1].hand.guesses[playerCardUsed] : null;

    // TODO: marginLeft -12 if want to align cards with hint construction
    return <>
        <div className='hintLogLine'><PlayerName name={playerNamesByNumber[hint.givenByPlayer]} /> gave a hint: <HintSentence hint={hint} /></div>
        <div className='hintLogLine'>
            <CardsFromLettersAndSources lettersAndSources={hint.lettersAndSources} viewingPlayer={playerNumber} playerGuess={playerGuess} />
        </div>
        {playerCardUsed !== null && <div className='hintLogLine'>
            {playerCardUsed < gameState.wordLength ?
            `Your position ${playerCardUsed + 1} card was used.`:
            `Your bonus letter was used.`}
            {playerCardUsed < gameState.wordLength && setGuess &&
                <> Your guess: <InlineHandGuess cardIndex={playerCardUsed} playerGuess={playerGuess} setGuess={setGuess} /></>}
        </div>}

        {playerActionStrings.map((str, i) => {
            return <div className='hintLogLine' key={i}>{str}</div>;
        })}
    </>;
}

function InlineHandGuess({cardIndex, playerGuess, setGuess}: {
    cardIndex: number,
    playerGuess: Letter | null,
    setGuess: (index: number, guess: Letter | null) => void,
}) {
    const {playerNumber} = usePlayerContext();
    const guess = playerGuess ?? '';
    return <input
        className='strawberryInput strawberryInputSmall inlineHandGuess'
        value={guess}
        onChange={(e) => {
            const letter = e.target.value.substr(e.target.value.length - 1, 1).toUpperCase();
            setGuess(cardIndex, LETTERS.includes(letter) ? letter : null);
        }}
    />;
}

function ResolvingHintComponent({hintingGameState, setGuess}: {
    hintingGameState: ResolvingHintPhase,
    setGuess?: (index: number, guess: Letter | null) => void,
}) {
    const {username, player, playerNumber} = usePlayerContext();

    const activeHint = hintingGameState.activeHint;

    const resolveActionRequired = whichResolveActionRequired(hintingGameState, username);
    // Compute whether a card of the player's was used (based on activeIndex and whether they flipped) to render.
    const isPlayerCardUsedInHint = resolveActionRequired !== ResolveActionChoice.UNINVOLVED;
    const playerCardUsed = isPlayerCardUsedInHint ? hintingGameState.activeHint.activeIndexes[playerNumber! - 1] : null;

    const waitingOnPlayers = playersWithOutstandingAction(hintingGameState.activeHint);
    const waitingOnPlayerNames = hintingGameState.players.filter((player, i) => waitingOnPlayers.has(i+1)).map((player) => player.name);

    return <>
        <HintInLog
            hint={activeHint.hint}
            playerActions={activeHint.playerActions}
            playerCardUsed={playerCardUsed}
            gameState={hintingGameState}
            setGuess={setGuess} />
        <div className='hintLogLine flex resolveAction'>
            {resolveActionRequired === ResolveActionChoice.FLIP && <FlipResolve playerNumber={playerNumber!} hintingGameState={hintingGameState} />}
            {resolveActionRequired === ResolveActionChoice.GUESS && <GuessResolve player={player!} playerNumber={playerNumber!} hintingGameState={hintingGameState} />}
            {waitingOnPlayerNames.length > 0 && <span className='flexAlignRight italics waitingOnPlayers'>Waiting on: {waitingOnPlayerNames.join(', ')}</span>}
        </div>
    </>;
}

function FlipResolve({playerNumber, hintingGameState}: {playerNumber: PlayerNumber, hintingGameState: ResolvingHintPhase}) {
    const resolveFn = useResolveHint(hintingGameState);
    if (resolveFn === null) throw new Error('illegal');
    return <>
        <span className='italics'>Would you like to flip your card?&nbsp;&nbsp;</span>
        <LinkButton onClick={() => {
            resolveFn({
                player: playerNumber,
                kind: ResolveActionKind.FLIP,
            });
        }}>Yes</LinkButton>
        <span className="or">&nbsp;/&nbsp;</span>
        <LinkButton onClick={() => {
            resolveFn({
                player: playerNumber,
                kind: ResolveActionKind.NONE,
            });
        }}>No</LinkButton></>;
}

function GuessResolve({player, playerNumber, hintingGameState}: {
    player: HintingPhasePlayer,
    playerNumber: PlayerNumber,
    hintingGameState: ResolvingHintPhase,
}) {
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

function GuessWordComponent({gameState}: {gameState: EndgamePhase}) {
    const {player, playerNumber} = usePlayerContext();
    if (player == null || playerNumber == null) throw new Error("no");

    const [settingGuess, setGuess] = useSetFinalGuess(gameState);
    const guess = settingGuess ?? gameState.players[playerNumber-1].guess;

    const optimisticGameState = settingGuess
    ? setFinalGuess(gameState, playerNumber, settingGuess) ?? gameState
    : gameState;

    const available = lettersForFinalGuess(optimisticGameState, playerNumber);
    const convert = (choice: EndgameLetterChoice): LetterAndSource => {
        if (choice.sourceType === LetterSources.PLAYER) {
            return {
                sourceType: LetterSources.PLAYER,
                letter: gameState.players[playerNumber-1].hand.guesses[choice.index] ?? '?',
                playerNumber,
            };
        }
        return choice;
    };
    const lettersAndSources: LetterAndSource[] = available.map(convert);

    const addToGuess = (_: object, i: number) => {
        setGuess([...guess, available[i]]);
    };
    const removeLetterFromGuess = (_: object, i: number) => {
        let newGuess = [...guess];
        newGuess.splice(i, 1);
        setGuess(newGuess);
    };

    const canSubmitGuess = !settingGuess && guess.length >= gameState.wordLength;
    const submit = useCommitFinalGuess(gameState);

    return <>
        <div className='hintLogLine' style={{marginLeft: '12px'}}>
            <CardsFromLettersAndSources lettersAndSources={lettersAndSources} inactive={(i) => !available[i].available} viewingPlayer={-1} onClick={addToGuess} />
        </div>
        <div className='hintLogGuessBox'>
            <CardsFromLettersAndSources lettersAndSources={guess.map(convert)} viewingPlayer={-1} onClick={removeLetterFromGuess} />
            <div className='flexAlignRight hintLogGuessBoxClear'>
                <LinkButton onClick={() => {
                    setGuess([]);
                }} isDisabled={guess.length === 0}>Clear</LinkButton>
            </div>
        </div>
        <div className='flex hintLogLine stagedHintActions'>
            <span className='flexAlignRight'>
                <LinkButton isDisabled={!canSubmitGuess} onClick={submit}>Submit guess</LinkButton>
            </span>
        </div>
    </>
}

function FinalWordComponent({gameState}: {gameState: EndgamePhase}) {
    const {player, playerNumber} = usePlayerContext();
    if (player == null || playerNumber == null) throw new Error("no");
    const guess = gameState.players[playerNumber-1].guess;
    // TODO: remove duplication
    const convert = (choice: EndgameLetterChoice): LetterAndSource => {
        if (choice.sourceType === LetterSources.PLAYER) {
            return {
                sourceType: LetterSources.PLAYER,
                letter: gameState.players[playerNumber-1].hand.letters[choice.index],
                playerNumber,
            };
        }
        return choice;
    };
    const lettersAndSources: LetterAndSource[] = guess.map(convert);

    return <div className='hintLogLine'>
        <CardsFromLettersAndSources lettersAndSources={lettersAndSources} viewingPlayer={-1} />
    </div>;
}

export { StartedGameRoom };
