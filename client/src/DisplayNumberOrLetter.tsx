import React from 'react';

function DisplayNumberOrLetter({numberOrLetter}: {numberOrLetter: number | string}) {
    const displayStr = typeof numberOrLetter === 'string' ? numberOrLetter : numberOrLetter.toString();
    return <div className='displayNumberOrLetter'>{displayStr}</div>
}

export {DisplayNumberOrLetter};
