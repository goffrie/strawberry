import React, {useState, useEffect} from 'react';
import {SuperWrappedLoadingStrawberry} from './LoadingStrawberry';

import {MainPage} from './MainPage';
import {StartGameRoomSidebar} from './StartGameRoomSidebar';
import {createNewRoom} from './gameActions';
import {JoinRoomStatus, StrawberryGame, useJoinRoom, useStrawberryGame} from './gameHook';

import './App.css';
import {RoomPhase, StartingPhase} from './gameState';

function App({initialUsername, initialRoom}: {initialUsername: string | null, initialRoom: string}) {
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
        return <Game username={username} room={room} />;
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

function Game({username, room}: {username: string, room: string}) {
    // TODO: bounce if game doesn't exist
    const strawberryGame = useStrawberryGame(room);

    const joinStatus = useJoinRoom(room, strawberryGame, username);

    // Game state is null if game doesnt exist or still loading.
    if (strawberryGame === null || joinStatus === JoinRoomStatus.JOINING) {
        return <SuperWrappedLoadingStrawberry />;
    }

    if (strawberryGame.gameState.phase === RoomPhase.START) {
        return <StartGameRoom username={username} startingGameState={strawberryGame.gameState} />;
    }

    return <div>{JSON.stringify(strawberryGame)}</div>;
}

function StartGameRoom({username, startingGameState}: {username: string, startingGameState: StartingPhase}) {
    // TODO: remove ! later
    const filteredPlayers = startingGameState.players.filter(player => player.name === username);
    const playerIfExists = filteredPlayers.length !== 0 && filteredPlayers[0];
    const isSpectator = !playerIfExists;

    const needsToInputWord = playerIfExists && playerIfExists.word === null;

    return <div className='gameContainer'>
        <StartGameRoomSidebar username={username} startingGameState={startingGameState} />
    </div>;
}

export default App;
