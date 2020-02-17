import { ActiveHintState, StartingPhase, RoomPhase, HintingPhase, ProposingHintPhase } from './gameState';
import { PlayerNumber, Letter, Hint, HintSpecs, LetterSources } from './gameTypes';
import { shuffle } from './utils';

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
        players: [{ name: firstPlayerName, word: null }],
    };
}

export function addPlayerToRoom(room: StartingPhase, playerName: string): StartingPhase {
    return {
        phase: RoomPhase.START,
        wordLength: room.wordLength,
        players: [...room.players, { name: playerName, word: null }],
    };
}

export function setPlayerWord(room: StartingPhase, playerName: string, word: string | null): StartingPhase {
    return {
        ...room,
        players: room.players.map((player) => {
            if (player.name === playerName) {
                return { name: playerName, word };
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
                    letters: shuffle(word),
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
        hintLog: [],
        activeHint: {
            state: ActiveHintState.PROPOSING,
            proposedHints: {},
        },
    };
}

export function specsOfHint(hint: Hint): HintSpecs {
    const players: Record<number, boolean> = {};
    const dummies: Record<number, boolean> = {};
    const bonuses: Record<Letter, boolean> = {};
    let wildcard = false;
    for (const l of hint.lettersAndSources) {
        switch (l.sourceType) {
            case LetterSources.PLAYER:
                players[l.playerNumber] = true;
                break;
            case LetterSources.WILDCARD:
                wildcard = true;
                break;
            case LetterSources.DUMMY:
                dummies[l.dummyNumber] = true;
                break;
            case LetterSources.BONUS:
                bonuses[l.letter] = true;
                break;
        }
    }
    return {
        length: hint.lettersAndSources.length,
        players: Object.keys(players).length,
        wildcard,
        dummies: Object.keys(dummies).length,
        bonuses: Object.keys(bonuses).length,
    };
}

export function getPlayerNumber(room: HintingPhase, playerName: string): PlayerNumber | null {
    for (let i = 0; i < room.players.length; i++) {
        if (room.players[i].name == playerName) return i+1;
    }
    return null;
}

export function setProposedHint(room: ProposingHintPhase, playerName: string, specs: HintSpecs | null): ProposingHintPhase {
    const proposedHints: Record<PlayerNumber, HintSpecs> = Object.assign({}, room.activeHint.proposedHints);
    const playerNumber = getPlayerNumber(room, playerName);
    if (playerNumber == null) {
        throw new Error("player not in room");
    }
    if (specs == null) {
        delete proposedHints[playerNumber];
    } else {
        proposedHints[playerNumber] = specs;
    }
    return {
        ...room,
        activeHint: {
            ...room.activeHint,
            proposedHints,
        },
    };
}
