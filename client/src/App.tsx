import React, { useState, useEffect } from 'react';
import { SuperWrappedLoadingStrawberry } from './LoadingStrawberry';

import { MainPage } from './MainPage';
import { StartGameRoom } from './StartGameRoom';
import { createNewRoom } from './gameActions';
import { useStrawberryGame, StrawberryGameProvider, PlayerNameContext } from './gameHook';
import { RoomPhase } from './gameState';

import './App.css';

function App({ initialUsername, initialRoom }: { initialUsername: string | null, initialRoom: string }) {
    const [username, setUsername] = useState(initialUsername);
    const [room, setRoom] = useState(initialRoom);
    const [isPendingRoomCreation, setIsPendingRoomCreation] = useState(false);

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

    if (isPendingRoomCreation) {
        return <SuperWrappedLoadingStrawberry />;
    }

    if (username !== null && room !== '') {
        return <StrawberryGameProvider roomName={room}>
            <PlayerNameContext.Provider value={username}>
                <Game />
            </PlayerNameContext.Provider>
        </StrawberryGameProvider>;
    }

    // TODO: confusingly, this handles both setting a username and creating a game. They should be separate.
    return <MainPage
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
    />;
}

function Game() {
    // TODO: bounce if game doesn't exist
    const strawberryGame = useStrawberryGame();

    // Game state is null if game doesnt exist or still loading.
    if (strawberryGame === null) {
        return <SuperWrappedLoadingStrawberry />;
    }

    if (strawberryGame.gameState.phase === RoomPhase.START) {
        return <StartGameRoom startingGameState={strawberryGame.gameState} />;
    }

    return <div>{JSON.stringify(strawberryGame)}</div>;
}

export default App;
