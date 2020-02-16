import React, {useState} from 'react';

import {DisplayNumberOrLetter} from './DisplayNumberOrLetter';
import {Card, CardsInHand, CardsInHint, CardWithAnnotation, InactiveCard} from './Cards';

import {LetterSources} from './gameTypes';
import {SuperWrappedLoadingStrawberry} from './LoadingStrawberry';

import {MainPage} from './MainPage';
import {createNewRoom} from './gameActions';

import './App.css';

function App({initialUsername}: {initialUsername: string | null}) {
    const [username, setUsername] = useState(initialUsername);
    // TODO: read this from hash
    const [room, setRoom] = useState('');
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
            setIsPendingRoomCreation(false);
        }}
    />;
}

function Game({username, room}: {username: string, room: string}) {
    return <div />;
}

export default App;
