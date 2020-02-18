import React, {useState, useContext} from 'react';
import {StartingPhase} from './gameState';
import {PlayerWithCardsInHand} from './Cards';
import {LETTERS, MIN_PLAYERS} from './gameLogic';
import {useJoinRoom, PlayerNameContext, useInputWord, useStartGame} from './gameHook';

function StartGameRoom({startingGameState}: {startingGameState: StartingPhase}) {
    return <div className='gameContainer'>
        <StartGameRoomSidebar startingGameState={startingGameState} />
        <div className='flexCenterContainer'>
            <StartGameRoomMain startingGameState={startingGameState} />
        </div>
    </div>;
}

function StartGameRoomSidebar({startingGameState}: {startingGameState: StartingPhase}) {
    const username = useContext(PlayerNameContext);
    return <div className='gameSidebar'>
        {startingGameState.players.map((player, i) => {
            // For sizing purposes, we render an invisible dummy hand if the player has not yet submitted a word
            const shouldHideHand = !player.word;
            const hand = {
                // letters themselves not currently rendered, but might be later?
                letters: player.word ? player.word.split('') : Array.from({length: startingGameState.wordLength}, () => {return '🍓'}),
                activeIndex: -1, // useless here, idk
            };
            const playerNumber = i + 1;
            return <PlayerWithCardsInHand
                hand={hand}
                shouldHideHand={shouldHideHand}
                isForViewingPlayer={player.name === username}
                playerName={player.name}
                playerNumber={playerNumber}
                key={playerNumber}
            />
        })}
    </div>
}

function StartGameRoomMain({startingGameState}: {startingGameState: StartingPhase}) {
    const username = useContext(PlayerNameContext);
    const joinStatus = useJoinRoom(startingGameState);
    const doStartGame = useStartGame(startingGameState);

    const [inputWord, setInputWord] = useState('');
    const [errorToRender, setErrorToRender] = useState('');

    const [settingCommittedWord, setCommittedWord] = useInputWord(startingGameState);

    const filteredPlayers = startingGameState.players.filter(player => player.name === username);
    const playerIfExists = filteredPlayers.length !== 0 && filteredPlayers[0];
    const isSpectator = !playerIfExists;

    const playerNeedsToInputWord = playerIfExists && (
        // if the word has not been committed *and* we are not attempting to commit...
        (playerIfExists.word == null && settingCommittedWord === undefined)
        // or if we have attempted to un-commit.
        || (settingCommittedWord === null));

    let isInputWordValid = false;
    // note: we don't always render this (only rendered after a submit until next keystroke), but compute it here
    // instead of in form onSubmit to not duplicate logic
    let errorMessage = '';
    if (inputWord.length !== startingGameState.wordLength) {
        const wordLengthDiff = startingGameState.wordLength - inputWord.length;
        const absDiff = Math.abs(wordLengthDiff);
        errorMessage = `Try ${absDiff} ${wordLengthDiff > 0 ? 'more': 'less'} letter${absDiff === 1 ? '' : 's'}`;
    } else if (!/^[a-zA-Z]+$/.test(inputWord)) {
        errorMessage = "Letters only, please!"
    } else if (inputWord.split('').some(letter => !LETTERS.includes(letter.toUpperCase()))) {
        errorMessage = "J, Q, V, X and Z aren't allowed, sorry";
    } else {
        isInputWordValid = true;
    }

    if (isSpectator) {
        if (doStartGame != null) {
            return <div className='bigText'>🕐 Waiting for game to start...</div>
        } else {
            return <div className='bigText'>🕐 Waiting for players to decide on words...</div>
        }
    }

    if (playerNeedsToInputWord) {
        return <div className='gameStartMainContent'>
            📝 Enter your {startingGameState.wordLength} letter word
            <form onSubmit={e => {
                e.preventDefault();
                if (isInputWordValid) {
                    setCommittedWord(inputWord.toUpperCase());
                } else {
                    setErrorToRender(errorMessage);
                }
            }}>
                <input
                    className='strawberryInput strawberryInputBig'
                    value={inputWord}
                    style={{
                        // hack so it only turns green when valid
                        borderColor: isInputWordValid ? '#19AF00' : '#D20B0B',
                    }}
                    onChange={e => {
                        setInputWord(e.target.value);
                        setErrorToRender('');
                    }}
                />
            </form>
            <div className='gameStartWordErrorMessage'>{errorToRender}</div>
        </div>;
    }

    let startGame;
    if (startingGameState.players.length < MIN_PLAYERS) {
        startGame = <div className='bigText'>🕐 Waiting for players to join...</div>;
    } else if (doStartGame != null) {
        startGame = <div className='strawberryButton' onClick={doStartGame}>Start game</div>
    } else {
        startGame = <div className='bigText' style={{marginBottom: '20px'}}>🕐 Waiting for other players to enter words...</div>;
    }

    return <div className='strawberryCenter'>
        {startGame}
        <span className='strawberryLinkButton' onClick={() => setCommittedWord(null)}>Change my word</span>
    </div>;
}

export {StartGameRoom};
