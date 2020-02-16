import React, {useState} from 'react';

type setUsernameFn = (username: string) => void;
type createGameFn = (wordLength: number) => void;

function MainPage({isLoggedIn, setUsername, createGame}: {
    isLoggedIn: boolean,
    setUsername: setUsernameFn,
    createGame: createGameFn,
}) {
    return (
        <div className='mainContainer'>
            <div className='mainPageContent'>
                <BigStrawberry />

                {isLoggedIn ? <StartNewGame createGame={createGame} /> : <SetUsername setUsername={setUsername} />}
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
        setUsername(input);
        e.preventDefault();
    }}>
        <input className='usernameInput' value={input} onChange={(e) => setInput(e.target.value)} />
    </form>
}

function StartNewGame({createGame}: {createGame: createGameFn}) {
    const [wordLength, setWordLength] = useState(5);
    return <div style={{textAlign: 'center'}}>
        <div className='startGameButton' onClick={() => createGame(wordLength)}>Start new game</div>

        <div className='wordLengthControl'>
            <select className='wordLengthSelect' value={wordLength} onChange={(e) => {setWordLength(Number(e.target.value))}}>
                {[3, 4, 5, 6, 7, 8].map(n => {
                    // yeah...
                    return <option value={n}>{n}</option>
                })}
            </select> letter words
        </div>
    </div>;
}

function BigStrawberry() {
    // TODO: make this interactive
    const fruitEmoji = '🍓';

    return <div className='bigStrawberry'>{fruitEmoji}</div>;
}

export {MainPage}
