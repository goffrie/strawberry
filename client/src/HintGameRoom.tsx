import React, {useState, useContext} from 'react';
import {HintingPhase} from './gameState';
import {PlayerNameContext} from './gameHook';
import {PlayerWithCardsInHand} from './Cards';

function HintGameRoom({hintingGameState}: {hintingGameState: HintingPhase}) {
    const username = useContext(PlayerNameContext);

    // TODO: refactor into shared hook
    const filteredPlayers = hintingGameState.players.filter(player => player.name === username);
    const playerIfExists = filteredPlayers.length !== 0 && filteredPlayers[0];
    const isSpectator = !playerIfExists;

    return <div className='gameContainer'>
        <HintGameRoomSidebar hintingGameState={hintingGameState} />
        <div className='flexColumnContainer'>
            okok
        </div>
    </div>;
}

function HintGameRoomSidebar({hintingGameState}: {hintingGameState: HintingPhase}) {
    const username = useContext(PlayerNameContext);
    return <div className='gameSidebar'>
        {hintingGameState.players.map((player, i) => {
            const hand = {
                letters: player.hand.letters,
                activeIndex: player.hand.activeIndex,
            };
            const playerNumber = i + 1;
            return <PlayerWithCardsInHand
                hand={hand}
                isForViewingPlayer={player.name === username}
                playerName={player.name}
                playerNumber={playerNumber}
                key={playerNumber}
                extraText={`${player.hintsGiven} hint${player.hintsGiven === 1 ? '' : 's'} given`}
            />
        })}
    </div>
}


export {HintGameRoom};
