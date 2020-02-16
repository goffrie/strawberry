import React, {useState} from 'react';

import {DisplayNumberOrLetter} from './DisplayNumberOrLetter';
import {Card, CardsInHand, CardsInHint, CardWithAnnotation, InactiveCard} from './Cards';

import {LetterSources} from './gameTypes';
import {SuperWrappedLoadingStrawberry} from './LoadingStrawberry';

import {MainPage} from './MainPage';
import {createNewRoom} from './gameActions';
import {useStrawberryGame, useJoinRoom} from './gameHook';

import './App.css';

function App({initialUsername, initialRoom}: {initialUsername: string | null, initialRoom: string}) {
    const [username, setUsername] = useState(initialUsername);
    const [room, setRoom] = useState(initialRoom);
    const [isPendingRoomCreation, setIsPendingRoomCreation] = useState(false);

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
    const strawberryGame = useStrawberryGame(room);

    // TODO: bounce back to main page if joining the room fails
    useJoinRoom(room, strawberryGame, username);

    if (strawberryGame === null) {
        return <SuperWrappedLoadingStrawberry />;
    }

    return <div>{JSON.stringify(strawberryGame)}</div>;
}

export default App;
