import React, {useState} from 'react';

import {DisplayNumberOrLetter} from './DisplayNumberOrLetter';
import {Card, CardsInHand, CardsInHint, CardWithAnnotation, InactiveCard} from './Cards';

import {LetterSources} from './gameTypes';

import {MainPage} from './MainPage';

import './App.css';

function App({initialUsername}: {initialUsername: string | null}) {
    const [username, setUsername] = useState(initialUsername);

    const isLoggedIn = username !== null;

    return <MainPage
        isLoggedIn={isLoggedIn}
        setUsername={(username) => {
            setUsername(username);
            localStorage.setItem('username', username);
        }}
        createGame={(wordLength) => {
            console.log('creating game of word length', wordLength);
        }}
    />;
}

export default App;
