import React, {useState} from 'react';

type setUsernameFn = (username: string) => void;
type createGameFn = (wordLength: number) => void;

function MainPage({isLoggedIn, setUsername, createGame}: {
    isLoggedIn: boolean,
    setUsername: setUsernameFn,
    createGame: createGameFn,
}) {
    // TODO: make this interactive
    const fruitEmoji = '🍓';

    return (
        <div className='mainContainer'>
            <div className='mainPageContent'>
                <BigStrawberry fruitEmoji={fruitEmoji} />
                <div className='mainPageControl'>
                    {isLoggedIn ? <StartNewGame createGame={createGame} /> : <SetUsername setUsername={setUsername} />}
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

function StartNewGame({createGame}: {createGame: createGameFn}) {
    const [wordLength, setWordLength] = useState(5);
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
    </>;
}

function BigStrawberry({fruitEmoji}: {fruitEmoji: string}) {
    return <div className='bigStrawberry'>{fruitEmoji}</div>;
}

export {MainPage};
