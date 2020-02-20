import React, {useState, useContext, useEffect} from 'react';
import {StartingPhase} from './gameState';
import {PlayerWithCardsInHand, CardsInHand} from './Cards';
import {LETTERS, MIN_PLAYERS, MAX_PLAYERS} from './gameLogic';
import {useJoinRoom, PlayerNameContext, useInputWord, useStartGame, useStrawberryGame} from './gameHook';
import { LinkButton } from './LinkButton';

function StartGameRoom({startingGameState}: {startingGameState: StartingPhase}) {
    // Clear the player's notes, in the rare case where they've played a game with this room name before.
    const strawberryGame = useStrawberryGame();
    const roomName = strawberryGame?.roomName!;
    useEffect(() => {
        localStorage.removeItem(`notes:${roomName}`);
    }, []);
    const [shouldJoin, setShouldJoin] = useState(true);
    useJoinRoom(startingGameState, shouldJoin);

    return <div className='gameContainer'>
        <StartGameRoomSidebar startingGameState={startingGameState} leaveGame={() => setShouldJoin(false)} />
        <div className='flexCenterContainer'>
            <StartGameRoomMain startingGameState={startingGameState} joinGame={() => setShouldJoin(true)} />
        </div>
    </div>;
}

function StartGameRoomSidebar({startingGameState, leaveGame}: {startingGameState: StartingPhase, leaveGame: () => void}) {
    const username = useContext(PlayerNameContext);
    const placeholderLetters = Array.from({length: startingGameState.wordLength}, () => {return '🍓'});
    return <div className='gameSidebar gameSidebarPlayers'>
        {startingGameState.players.map((player, i) => {
            const hand = {
                // letters themselves not currently rendered, but might be later?
                letters: player.word?.split('') ?? placeholderLetters,
                activeIndex: -1, // useless here, idk
            };
            const playerNumber = i + 1;
            const isForViewingPlayer = player.name === username;
            return <PlayerWithCardsInHand
                cardsToRender={<CardsInHand hand={hand} isForViewingPlayer={isForViewingPlayer} hidden={player.word == null} />}
                isForViewingPlayer={isForViewingPlayer}
                playerName={player.name}
                playerNumber={playerNumber}
                extraText={isForViewingPlayer ? <LinkButton onClick={leaveGame}>Leave</LinkButton> : undefined}
                key={playerNumber}
            />
        })}
        {startingGameState.players.length === 0 && <div style={{visibility: "hidden"}}>
        <PlayerWithCardsInHand
            cardsToRender={<CardsInHand hand={{letters: placeholderLetters, activeIndex: -1}} isForViewingPlayer={false} />}
            isForViewingPlayer={false}
            playerName={""}
            playerNumber={0}
        />
        </div>}
    </div>
}

function StartGameRoomMain({startingGameState, joinGame}: {startingGameState: StartingPhase, joinGame: () => void}) {
    const username = useContext(PlayerNameContext);
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
        let msg;
        if (doStartGame != null) {
            msg = "🕐 Waiting for game to start...";
        } else if (startingGameState.players.length < MIN_PLAYERS) {
            msg = "🕐 Waiting for players to join...";
        } else {
            msg = "🕐 Waiting for players to decide on words...";
        }
        return <div className='strawberryCenter'>
            <div className='bigText'>{msg}</div>
            {startingGameState.players.length < MAX_PLAYERS && <LinkButton onClick={joinGame}>Join game</LinkButton>}
        </div>;
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
                    autoFocus
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
        startGame = <div className='bigText'>🕐 Waiting for other players to enter words...</div>;
    }

    return <div className='strawberryCenter'>
        {startGame}
        <LinkButton onClick={() => setCommittedWord(null)}>Change my word</LinkButton>
    </div>;
}

export {StartGameRoom};
