import React, { useState, useEffect, useContext } from 'react';

import { SuperWrappedLoadingStrawberry } from './LoadingStrawberry';
import { FRUIT, FruitEmojiContext, FRUIT_NAMES } from './Fruit';

import { MainPage } from './MainPage';
import { StartGameRoom } from './StartGameRoom';
import { StartedGameRoom } from './StartedGameRoom';
import { createNewRoom } from './gameActions';
import { useStrawberryGame, StrawberryGameProvider, PlayerNameContext } from './gameHook';
import { RoomPhase, ResolveActionKind, isResolving, RoomState } from './gameState';

import './App.css';
import { useLocalStorage } from './localStorage';
import { ResolveActionChoice, whichResolveActionRequired } from './gameLogic';

const USERNAME_KEY: string = 'username';
const FRUIT_KEY: string = 'fruit';

function App({ initialRoom }: { initialRoom: string }) {
    const [username, setUsername] = useLocalStorage(USERNAME_KEY);
    const [room, setRoom] = useState(initialRoom);
    const [isPendingRoomCreation, setIsPendingRoomCreation] = useState(false);

    const [fruitIndexVar, setFruitIndexVar] = useLocalStorage(FRUIT_KEY);
    let fruitIndex = fruitIndexVar ? parseInt(fruitIndexVar) : 0;
    if (!FRUIT[fruitIndex]) fruitIndex = 0;
    const fruitEmoji = FRUIT[fruitIndex];
    const changeFruit = () => {
        // pick a random index other than `fruitIndex`
        let newIndex = Math.floor(Math.random() * (FRUIT.length - 1));
        if (newIndex >= fruitIndex) newIndex += 1;
        setFruitIndexVar(newIndex.toString());
    };

    const [isNotified, setNotified] = useState(false);

    // Update the window title as needed
    useEffect(() => {
        document.title = (isNotified ? "(!) " : "") + FRUIT_NAMES[fruitIndex];
    }, [isNotified, fruitIndex]);

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

    let page;
    if (isPendingRoomCreation) {
        page = <SuperWrappedLoadingStrawberry />;
    } else if (username !== null && room !== '') {
        page = <StrawberryGameProvider roomName={room}>
            <PlayerNameContext.Provider value={username}>
                <Game setNotified={setNotified} />
            </PlayerNameContext.Provider>
        </StrawberryGameProvider>;
    } else {
        // TODO: confusingly, this handles both setting a username and creating a game. They should be separate.
        page = <MainPage
            isLoggedIn={username !== null}
            setUsername={setUsername}
            createGame={async (wordLength) => {
                setIsPendingRoomCreation(true);
                const newRoom = await createNewRoom(username!, wordLength);
                setRoom(newRoom);
                window.location.hash = `#${newRoom}`;
                setIsPendingRoomCreation(false);
            }}
            changeFruit={changeFruit}
        />;
    }
    return <FruitEmojiContext.Provider value={fruitEmoji}>
        {page}
    </FruitEmojiContext.Provider>;
}

enum GameAction {
    WAITING = "",
    GIVE_HINT = "You can give a hint.",
    RESOLVE = "You have received a hint.",
    ENDGAME = "You can guess your word.",
}

function playerCurrentAction(game: RoomState, username: string | null): GameAction | null {
    if (username == null) return null;
    switch (game.phase) {
        case RoomPhase.START:
            return null;
        case RoomPhase.HINT:
            if (!isResolving(game)) {
                return GameAction.GIVE_HINT;
            } else if ([ResolveActionChoice.FLIP, ResolveActionKind.GUESS]
                .includes(whichResolveActionRequired(game, username))) {
                return GameAction.RESOLVE;
            } else {
                return GameAction.WAITING;
            }
        case RoomPhase.ENDGAME:
            return GameAction.ENDGAME;
    }
}

function Game({setNotified}: {setNotified: (_: boolean) => void}) {
    // TODO: bounce if game doesn't exist
    const strawberryGame = useStrawberryGame();
    const username = useContext(PlayerNameContext);

    const [oldAction, setOldAction] = useState<GameAction | null>(null);
    const currentAction = strawberryGame && playerCurrentAction(strawberryGame.gameState, username);
    useEffect(() => {
        setOldAction(currentAction);
        if (!("Notification" in window)) return;
        if (window.Notification.permission !== "granted") return;
        if (oldAction == null || !currentAction || oldAction === currentAction) return;
        new Notification(currentAction, {silent: true});
    }, [oldAction, currentAction, setOldAction]);

    const needsResolve = currentAction === GameAction.RESOLVE;
    useEffect(() => {
        setNotified(needsResolve);
        return () => setNotified(false);
    }, [needsResolve, setNotified])

    // Game state is null if game doesnt exist or still loading.
    if (strawberryGame === null) {
        return <SuperWrappedLoadingStrawberry />;
    }
    // TODO: spectator mode overlay / banner

    switch (strawberryGame.gameState.phase) {
        case RoomPhase.START:
            return <StartGameRoom startingGameState={strawberryGame.gameState} />;
        default:
            return <StartedGameRoom gameState={strawberryGame.gameState} />;
    }
}

export default App;
