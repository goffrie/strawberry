import React from 'react';

function PlayerNumber({numberOrLetter}: {numberOrLetter: number | string}) {
    const displayStr = typeof numberOrLetter === 'string' ? numberOrLetter : numberOrLetter.toString();
    return <div className='playerNumber'>{displayStr}</div>
}

export {PlayerNumber};
