import React from 'react';
import {PlayerNumber} from './PlayerNumber';

function Card({letter}: {letter: string}) {
    return <div className='card cardActive'>{letter}</div>
}

function InactiveCard() {
    return <div className='card' />;
}

function CardWithPlayerNumber({letter, playerNumberOrLetter}: {letter: string, playerNumberOrLetter: number | string}) {
    return <div className='cardWithPlayerNumber'>
        <Card letter={letter} />
        <PlayerNumber numberOrLetter={playerNumberOrLetter} />
    </div>
}

export {Card, CardWithPlayerNumber, InactiveCard};
