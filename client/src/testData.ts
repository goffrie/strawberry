import { StartingPhase, RoomPhase, HintingPhase, RoomState, ActiveHintState, ResolveActionKind } from "./gameState";
import { LetterSources } from "./gameTypes";

const starting: StartingPhase = {
    phase: RoomPhase.START,
    wordLength: 5,
    players: [
        {name: "player1", word: "FRUIT"},
        {name: "player2", word: "JUICE"},
        {name: "player3", word: "REACT"},
    ],
};

const proposing: HintingPhase = {"phase":RoomPhase.HINT,"wordLength":5,"players":[{"name":"player1","hand":{"letters":["A","T","C","R","E"],"guesses":[null,null,null,null,null],"activeIndex":0},"hintsGiven":0},{"name":"player2","hand":{"letters":["I","R","T","U","F"],"guesses":[null,null,null,null,null],"activeIndex":0},"hintsGiven":0},{"name":"player3","hand":{"letters":["C","I","J","U","E"],"guesses":[null,null,null,null,null],"activeIndex":0},"hintsGiven":0}],"dummies":[{"currentLetter":"Y","untilFreeHint":7},{"currentLetter":"S","untilFreeHint":8},{"currentLetter":"F","untilFreeHint":9}],"bonuses":[],"hintsRemaining":11,"hintLog":[],"activeHint":{"state":ActiveHintState.PROPOSING,"proposedHints":{"1":{"givenByPlayer":1,"lettersAndSources":[{"sourceType":LetterSources.DUMMY,"letter":"S","dummyNumber":2},{"sourceType":LetterSources.WILDCARD,"letter":"*"},{"sourceType":LetterSources.PLAYER,"letter":"I","playerNumber":2},{"sourceType":LetterSources.PLAYER,"letter":"C","playerNumber":3},{"sourceType":LetterSources.DUMMY,"letter":"Y","dummyNumber":1}]},"3":{"givenByPlayer":3,"lettersAndSources":[{"sourceType":LetterSources.DUMMY,"letter":"Y","dummyNumber":1},{"sourceType":LetterSources.PLAYER,"letter":"I","playerNumber":2},{"sourceType":LetterSources.DUMMY,"letter":"F","dummyNumber":3},{"sourceType":LetterSources.DUMMY,"letter":"F","dummyNumber":3},{"sourceType":LetterSources.DUMMY,"letter":"S","dummyNumber":2}]}}}};

const longGame: HintingPhase = {"phase":RoomPhase.HINT,"wordLength":5,"players":[{"name":"player1","hand":{"letters":["A","T","C","R","E"],"guesses":["A","T",null,null,null],"activeIndex":2},"hintsGiven":2},{"name":"player2","hand":{"letters":["I","R","T","U","F","M"],"guesses":["I","R","T",null,null],"activeIndex":5},"hintsGiven":1},{"name":"player3","hand":{"letters":["C","I","J","U","E"],"guesses":["C","P",null,null,null],"activeIndex":2},"hintsGiven":4}],"dummies":[{"currentLetter":"P","untilFreeHint":0},{"currentLetter":"R","untilFreeHint":2},{"currentLetter":"A","untilFreeHint":6}],"bonuses":["I"],"hintsRemaining":5,"hintLog":[{"hint":{"givenByPlayer":3,"lettersAndSources":[{"sourceType":LetterSources.DUMMY,"letter":"Y","dummyNumber":1},{"sourceType":LetterSources.PLAYER,"letter":"I","playerNumber":2},{"sourceType":LetterSources.DUMMY,"letter":"F","dummyNumber":3},{"sourceType":LetterSources.DUMMY,"letter":"F","dummyNumber":3},{"sourceType":LetterSources.DUMMY,"letter":"S","dummyNumber":2}]},"totalHints":11,"activeIndexes":[0,0,0],"playerActions":[{"player":2,"kind":ResolveActionKind.FLIP}]},{"hint":{"givenByPlayer":2,"lettersAndSources":[{"sourceType":LetterSources.PLAYER,"letter":"C","playerNumber":3},{"sourceType":LetterSources.PLAYER,"letter":"A","playerNumber":1},{"sourceType":LetterSources.WILDCARD,"letter":"*"},{"sourceType":LetterSources.PLAYER,"letter":"A","playerNumber":1},{"sourceType":LetterSources.DUMMY,"letter":"L","dummyNumber":1},{"sourceType":LetterSources.DUMMY,"letter":"A","dummyNumber":3},{"sourceType":LetterSources.DUMMY,"letter":"N","dummyNumber":2}]},"totalHints":11,"activeIndexes":[0,1,0],"playerActions":[{"player":3,"kind":ResolveActionKind.FLIP},{"player":1,"kind":ResolveActionKind.NONE}]},{"hint":{"givenByPlayer":1,"lettersAndSources":[{"sourceType":LetterSources.DUMMY,"letter":"A","dummyNumber":1},{"sourceType":LetterSources.PLAYER,"letter":"R","playerNumber":2},{"sourceType":LetterSources.PLAYER,"letter":"I","playerNumber":3},{"sourceType":LetterSources.DUMMY,"letter":"A","dummyNumber":1},{"sourceType":LetterSources.DUMMY,"letter":"S","dummyNumber":2}]},"totalHints":11,"activeIndexes":[0,1,1],"playerActions":[{"player":2,"kind":ResolveActionKind.FLIP},{"player":3,"kind":ResolveActionKind.FLIP}]},{"hint":{"givenByPlayer":3,"lettersAndSources":[{"sourceType":LetterSources.PLAYER,"letter":"A","playerNumber":1},{"sourceType":LetterSources.PLAYER,"letter":"T","playerNumber":2},{"sourceType":LetterSources.PLAYER,"letter":"T","playerNumber":2},{"sourceType":LetterSources.DUMMY,"letter":"I","dummyNumber":1},{"sourceType":LetterSources.DUMMY,"letter":"C","dummyNumber":2}]},"totalHints":11,"activeIndexes":[0,2,2],"playerActions":[{"player":2,"kind":ResolveActionKind.FLIP},{"player":1,"kind":ResolveActionKind.FLIP}]},{"hint":{"givenByPlayer":3,"lettersAndSources":[{"sourceType":LetterSources.DUMMY,"letter":"W","dummyNumber":1},{"sourceType":LetterSources.PLAYER,"letter":"U","playerNumber":2},{"sourceType":LetterSources.PLAYER,"letter":"T","playerNumber":1}]},"totalHints":11,"activeIndexes":[1,3,2],"playerActions":[{"player":2,"kind":ResolveActionKind.FLIP},{"player":1,"kind":ResolveActionKind.NONE}]},{"hint":{"givenByPlayer":1,"lettersAndSources":[{"sourceType":LetterSources.PLAYER,"letter":"F","playerNumber":2},{"sourceType":LetterSources.WILDCARD,"letter":"*"},{"sourceType":LetterSources.DUMMY,"letter":"R","dummyNumber":2},{"sourceType":LetterSources.DUMMY,"letter":"M","dummyNumber":1}]},"totalHints":11,"activeIndexes":[1,4,2],"playerActions":[{"player":2,"kind":ResolveActionKind.FLIP}]},{"hint":{"givenByPlayer":3,"lettersAndSources":[{"sourceType":LetterSources.PLAYER,"letter":"T","playerNumber":1},{"sourceType":LetterSources.DUMMY,"letter":"R","dummyNumber":3},{"sourceType":LetterSources.PLAYER,"letter":"I","playerNumber":2},{"sourceType":LetterSources.WILDCARD,"letter":"*"},{"sourceType":LetterSources.DUMMY,"letter":"K","dummyNumber":1},{"sourceType":LetterSources.DUMMY,"letter":"Y","dummyNumber":2}]},"totalHints":11,"activeIndexes":[1,5,2],"playerActions":[{"player":2,"kind":ResolveActionKind.GUESS,"guess":"I","actual":"I"},{"player":1,"kind":ResolveActionKind.FLIP}]}],"activeHint":{"state":0,"proposedHints":{}}};

export const TestRooms: Record<string, RoomState> = {
    starting,
    proposing,
    longGame,
};
