import {StartingPhase, RoomPhase, HintingPhase} from './gameState';
import {Letter} from './gameTypes';

export const MIN_PLAYERS: number = 2;
export const MAX_PLAYERS: number = 6;
const STARTING_HINTS: number = 11;

// no J, Q, V, X, Z
export const LETTERS: Array<Letter> = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L', 'M', 'N', 'O', 'P', 'R', 'S', 'T', 'U', 'W', 'Y'];

function randomLetter(): Letter {
    return LETTERS[Math.floor(Math.random() * LETTERS.length)];
}

export function isRoomReady(room: StartingPhase): boolean {
    return room.players.every((player) => player.word != null) &&
           room.players.length >= MIN_PLAYERS &&
           room.players.length <= MAX_PLAYERS;
}

function dummyLettersForFreeHint(playerCount: number): Array<number> {
    switch (playerCount) {
        // TODO: guessed
        case 2: return [7, 8, 9, 10];
        case 3: return [7, 8, 9];
        case 4: return [7, 8];
        case 5: return [7];
        case 6: return [];
        default: throw new Error("wrong number of players");
    }
}

// Initialize a brand-new room in the StartingPhase.
export function newStartingPhase(firstPlayerName: string, wordLength: number): StartingPhase {
    return {
        phase: RoomPhase.START,
        wordLength,
        players: [{name: firstPlayerName, word: null}],
    };
}

export function addPlayerToRoom(room: StartingPhase, playerName: string): StartingPhase {
    return {
        phase: RoomPhase.START,
        wordLength: room.wordLength,
        players: [...room.players, {name: playerName, word: null}],
    };
}

export function setPlayerWord(room: StartingPhase, playerName: string, word: string | null): StartingPhase {
    return {
        ...room,
        players: room.players.map((player) => {
            if (player.name === playerName) {
                return {name: playerName, word};
            } else {
                return player;
            }
        }),
    };
}

// Move a room from the StartingPhase to the HintingPhase.
export function startGameRoom(room: StartingPhase): HintingPhase {
    return {
        phase: RoomPhase.HINT,
        players: room.players.map((player, index) => {
            // each player receives the previous player's word
            const word = room.players[(index + room.players.length - 1) % room.players.length].word;
            if (word == null) {
                throw new Error("Room is not ready");
            }
            return {
                name: player.name,
                hand: {
                    letters: Array.from(word),
                    activeIndex: 0,
                },
                hintsGiven: 0,
            };
        }),
        dummies: dummyLettersForFreeHint(room.players.length).map((untilFreeHint) => ({
            currentLetter: randomLetter(),
            untilFreeHint,
        })),
        bonuses: [],
        hintsRemaining: STARTING_HINTS,
    };
}
