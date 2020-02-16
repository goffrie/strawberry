import React from 'react';

import {DisplayNumberOrLetter} from './DisplayNumberOrLetter';
import {Card, CardsInHand, CardsInHint, CardWithAnnotation, InactiveCard} from './Cards';

import {LetterSources} from './gameTypes';

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
        <CardWithAnnotation letter={'A'} playerNumberOrLetter={1}/>

        <Card letter={'A'} />
        <InactiveCard />

        <DisplayNumberOrLetter numberOrLetter={1} />

        <CardsInHand hand={{activeIndex: 2, letters: ['A', 'B', 'C', 'D', 'E']}} isForViewingPlayer={false} />
        <CardsInHand hand={{activeIndex: -1, letters: ['A', 'B', 'C', 'D', 'E']}} isForViewingPlayer={false} />
        <CardsInHand hand={{activeIndex: 2, letters: ['A', 'B', 'C', 'D', 'E']}} isForViewingPlayer={true} />

        <CardsInHint
            hint={{
                givenByPlayer: 1,
                lettersAndSources: [
                    {letter: 'A', sourceType: LetterSources.PLAYER, playerNumber: 2},
                    {letter: 'B', sourceType: LetterSources.PLAYER, playerNumber: 3},
                    {letter: '*', sourceType: LetterSources.WILDCARD},
                    {letter: 'D', sourceType: LetterSources.DUMMY},
                    {letter: 'E', sourceType: LetterSources.BONUS},
              ]}}
            viewingPlayer={2}
        />
      </header>
    </div>
  );
}

export default App;
