import React from 'react';
import {StartingPhase} from './gameState';
import {PlayerWithCardsInHand} from './Cards';

function StartGameRoom({username, startingGameState}: {username: string, startingGameState: StartingPhase}) {
    return <div className='gameContainer'>
        <StartGameRoomSidebar username={username} startingGameState={startingGameState} />
        <StartGameRoomMain username={username} startingGameState={startingGameState} />
    </div>;
}


function StartGameRoomSidebar({username, startingGameState}: {username: string, startingGameState: StartingPhase}) {
    return <div className='gameSidebar'>
        {startingGameState.players.map((player, i) => {
            // For sizing purposes, we render an invisible dummy hand if the player has not yet submitted a word
            const shouldHideHand = !player.word;
            const hand = {
                // letters themselves not currently rendered, but might be later?
                letters: player.word ? player.word.split('') : Array.from({length: startingGameState.wordLength}, () => {return '🍓'}),
                activeIndex: -1, // useless here, idk
            };
            const playerNumber = i + 1;
            return <PlayerWithCardsInHand
                hand={hand}
                shouldHideHand={shouldHideHand}
                isForViewingPlayer={player.name === username}
                playerName={player.name}
                playerNumber={playerNumber}
                key={playerNumber}
            />
        })}
    </div>
}

function StartGameRoomMain({username, startingGameState}: {username: string, startingGameState: StartingPhase}) {
    const filteredPlayers = startingGameState.players.filter(player => player.name === username);
    const playerIfExists = filteredPlayers.length !== 0 && filteredPlayers[0];
    const isSpectator = !playerIfExists;

    const needsToInputWord = playerIfExists && playerIfExists.word === null;

    return <div className='flexCenterContainer'>bluh</div>;
}

export {StartGameRoom};
