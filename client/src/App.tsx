import React from 'react';

import {PlayerNumber} from './PlayerNumber';
import {Card, CardWithPlayerNumber, InactiveCard} from './Card';

import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
        <CardWithPlayerNumber letter={'A'} playerNumberOrLetter={1}/>

        <Card letter={'A'} />
        <InactiveCard />

        <PlayerNumber numberOrLetter={1} />
      </header>
    </div>
  );
}

export default App;
