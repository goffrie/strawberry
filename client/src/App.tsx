import React, { useState, useEffect } from 'react';

import { SuperWrappedLoadingStrawberry } from './LoadingStrawberry';
import { FRUIT, FruitEmojiContext, FRUIT_NAMES } from './Fruit';

import { MainPage } from './MainPage';
import { StartGameRoom } from './StartGameRoom';
import { StartedGameRoom } from './StartedGameRoom';
import { createNewRoom } from './gameActions';
import { useStrawberryGame, StrawberryGameProvider, PlayerNameContext } from './gameHook';
import { RoomPhase } from './gameState';

import './App.css';

function App({ initialUsername, initialRoom }: { initialUsername: string | null, initialRoom: string }) {
    const [username, setUsername] = useState(initialUsername);
    const [room, setRoom] = useState(initialRoom);
    const [isPendingRoomCreation, setIsPendingRoomCreation] = useState(false);

    const [fruitIndex, setFruitIndex] = useState(0);
    const fruitEmoji = FRUIT[fruitIndex];
    const changeFruit = () => {
        const newIndex = Math.floor(Math.random() * FRUIT.length);
        setFruitIndex(newIndex);
        document.title = FRUIT_NAMES[newIndex];
    };

    useEffect(() => {
        const listener = () => {
            const newRoom = window.location.hash.substr(1);
            if (room !== newRoom) {
                setRoom(newRoom);
            }
        };
        window.addEventListener('hashchange', listener, false);
        return () => {
            window.removeEventListener('hashchange', listener, false);
        };
    });

    let page;
    if (isPendingRoomCreation) {
        page = <SuperWrappedLoadingStrawberry />;
    } else if (username !== null && room !== '') {
        page = <StrawberryGameProvider roomName={room}>
            <PlayerNameContext.Provider value={username}>
                <Game />
            </PlayerNameContext.Provider>
        </StrawberryGameProvider>;
    } else {
        // TODO: confusingly, this handles both setting a username and creating a game. They should be separate.
        page = <MainPage
            isLoggedIn={username !== null}
            setUsername={(username) => {
                setUsername(username);
                localStorage.setItem('username', username);
            }}
            createGame={async (wordLength) => {
                setIsPendingRoomCreation(true);
                const newRoom = await createNewRoom(username!, wordLength);
                setRoom(newRoom);
                window.location.hash = `#${newRoom}`;
                setIsPendingRoomCreation(false);
            }}
            changeFruit={changeFruit}
        />;
    }
    return <FruitEmojiContext.Provider value={fruitEmoji}>
        {page}
    </FruitEmojiContext.Provider>;
}

function Game() {
    // TODO: bounce if game doesn't exist
    const strawberryGame = useStrawberryGame();

    // Game state is null if game doesnt exist or still loading.
    if (strawberryGame === null) {
        return <SuperWrappedLoadingStrawberry />;
    }
    // TODO: spectator mode overlay / banner

    switch (strawberryGame.gameState.phase) {
        case RoomPhase.START:
            return <StartGameRoom startingGameState={strawberryGame.gameState} />;
        default:
            return <StartedGameRoom gameState={strawberryGame.gameState} />;
    }
}

export default App;
