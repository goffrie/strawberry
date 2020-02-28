import React, {useState, useContext} from 'react';
import { FruitEmojiContext } from './Fruit';
import { LinkButton } from './LinkButton';

type setUsernameFn = (username: string | null) => void;
type createGameFn = (wordLength: number) => void;

function MainPage({isLoggedIn, setUsername, createGame, changeFruit}: {
    isLoggedIn: boolean,
    setUsername: setUsernameFn,
    createGame: createGameFn,
    changeFruit: () => void,
}) {
    const fruitEmoji = useContext(FruitEmojiContext);
    return (
        <div className='mainContainer'>
            <div className='mainPageContent'>
                <BigStrawberry onClick={changeFruit} />
                <div className='mainPageControl'>
                    {isLoggedIn ? <StartNewGame createGame={createGame} setUsername={setUsername} /> : <SetUsername setUsername={setUsername} />}
                </div>
            </div>
            <div className='mainPageAttribution'>
                Made with {fruitEmoji} by goffrie and minicat
            </div>
        </div>
    )
}

function SetUsername({setUsername}: {setUsername: setUsernameFn}) {
    return <div style={{textAlign: 'center'}}>
        What's your name?
        <UsernameInput setUsername={setUsername}/>
    </div>;

}
function UsernameInput({setUsername}: {setUsername: setUsernameFn}) {
    const [input, setInput] = useState('');
    return <form onSubmit={(e) => {
        e.preventDefault();

        if (input !== '') {
            setUsername(input);
        }
    }}>
        <input className='strawberryInput strawberryInputBig' value={input} onChange={(e) => setInput(e.target.value)} autoFocus />
    </form>
}

function StartNewGame({createGame, setUsername}: {createGame: createGameFn, setUsername: setUsernameFn}) {
    const [wordLength, setWordLength] = useState(5);
    const [notificationsEnabled, setNotificationsEnabled] = useState(Notification.permission);
    const enableNotifications = () => {
        Notification.requestPermission().then(() => {
            setNotificationsEnabled(Notification.permission);
        });
    };
    return <>
        <button className='strawberryButton' onClick={() => createGame(wordLength)}>Start new game</button>

        <div className='wordLengthControl'>
            <select className='wordLengthSelect' value={wordLength} onChange={(e) => {setWordLength(Number(e.target.value))}}>
                {[3, 4, 5, 6, 7, 8].map(n => {
                    // yeah...
                    return <option value={n} key={n}>{n}</option>
                })}
            </select> letter words
        </div>

        {"Notification" in window &&
        <div className='enableNotifications'>
            <LinkButton onClick={enableNotifications} isDisabled={notificationsEnabled !== "default"}>
                {notificationsEnabled === "granted" ? "Notifications enabled!" : "Enable notifications"}
            </LinkButton>
        </div>
        }

        <div className='logOut'>
            <LinkButton onClick={() => setUsername(null)}>Log out</LinkButton>
        </div>
    </>;
}

function BigStrawberry({onClick}: {onClick: () => void}) {
    const fruitEmoji = useContext(FruitEmojiContext);
    return <div className='bigStrawberry' onClick={onClick}>{fruitEmoji}</div>;
}

export {MainPage};
