import {
    ActiveHintState,
    HintingPhase,
    HintingPhasePlayer,
    ProposingHintPhase,
    ResolveAction,
    ResolveActionKind,
    ResolvingHint,
    ResolvingHintPhase,
    RoomPhase,
    StartingPhase,
} from './gameState';
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
        wordLength: room.wordLength,
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
        if (room.players[i].name === playerName) return i+1;
    }
    return null;
}

export function setProposedHint(room: ProposingHintPhase, playerName: string, hint: Hint | null): ProposingHintPhase {
    const proposedHints: Record<PlayerNumber, Hint> = Object.assign({}, room.activeHint.proposedHints);
    const playerNumber = getPlayerNumber(room, playerName);
    if (playerNumber == null) {
        throw new Error("player not in room");
    }
    if (hint == null) {
        delete proposedHints[playerNumber];
    } else {
        proposedHints[playerNumber] = hint;
    }
    return {
        ...room,
        activeHint: {
            ...room.activeHint,
            proposedHints,
        },
    };
}

export function giveHint(room: ProposingHintPhase, playerName: string, hint: Hint): ResolvingHintPhase {
    return {
        ...room,
        players: room.players.map((player) => {
            if (player.name === playerName) {
                return {...player, hintsGiven: player.hintsGiven + 1};
            } else {
                return player;
            }
        }),
        activeHint: {
            state: ActiveHintState.RESOLVING,
            hint,
            playerActions: [],
        },
    };
}

export enum ResolveActionChoice {
    // The player was not involved, so there is nothing to do.
    UNINVOLVED = 'uninvolved',
    // The player already made a choice.
    DONE = 'done',
    // The player must choose to flip or not flip their card.
    FLIP = 'flip',
    // The player must guess their bonus letter.
    GUESS = 'guess',
}

export function whichResolveActionRequired(room: ResolvingHintPhase, playerName: string): ResolveActionChoice {
    const hint = room.activeHint.hint;
    const playerNumber = getPlayerNumber(room, playerName);
    if (playerNumber == null ||
        !hint.lettersAndSources.some((letterAndSource) => letterAndSource.sourceType === LetterSources.PLAYER && letterAndSource.playerNumber === playerNumber)) {
        return ResolveActionChoice.UNINVOLVED;
    }
    if (room.activeHint.playerActions.some((action) => action.player === playerNumber)) {
        return ResolveActionChoice.DONE;
    }
    const handLength = room.players[playerNumber-1].hand.letters.length;
    if (room.wordLength !== handLength) {
        if (handLength !== room.wordLength + 1) {
            throw new Error("Inconsistent state: hand has illegal length " + handLength);
        }
        return ResolveActionChoice.GUESS;
    }
    return ResolveActionChoice.FLIP;
}

function allPlayersHaveActed(activeHint: ResolvingHint): boolean {
    const hint = activeHint.hint;
    const playerNumbers: Set<PlayerNumber> = new Set();
    for (const letterAndSource of hint.lettersAndSources) {
        if (letterAndSource.sourceType === LetterSources.PLAYER) {
            playerNumbers.add(letterAndSource.playerNumber);
        }
    }
    return playerNumbers.size === activeHint.playerActions.length;
}

function fullyResolveHint(room: ResolvingHintPhase): ProposingHintPhase {
    const logEntry = {
        hint: room.activeHint.hint,
        totalHints: room.hintLog.length + room.hintsRemaining,
        activeIndexes: room.players.map((player) => player.hand.activeIndex),
        playerActions: room.activeHint.playerActions,
    };
    let hintsRemaining = room.hintsRemaining - 1;

    // process cards used up
    const dummiesUsed: Set<number> = new Set(); // 0-indexed
    const bonusesUsed: Set<number> = new Set(); // 0-indexed
    for (const letterAndSource of room.activeHint.hint.lettersAndSources) {
        if (letterAndSource.sourceType === LetterSources.BONUS) {
            bonusesUsed.add(room.bonuses.findIndex((bonus) => bonus === letterAndSource.letter));
        } else if (letterAndSource.sourceType === LetterSources.DUMMY) {
            dummiesUsed.add(letterAndSource.dummyNumber - 1);
        }
    }
    const dummies = room.dummies.map((dummy, index) => {
        if (dummiesUsed.has(index)) {
            if (dummy.untilFreeHint === 1) {
                // got a hint!
                hintsRemaining += 1;
            }
            return {
                currentLetter: randomLetter(),
                untilFreeHint: dummy.untilFreeHint - 1,
            };
        } else {
            return dummy;
        }
    });
    const bonuses = room.bonuses.filter((bonus, index) => !bonusesUsed.has(index));

    const players = Array.from(room.players);
    for (const action of room.activeHint.playerActions) {
        let player = players[action.player - 1];
        if (action == null || action.kind === ResolveActionKind.NONE) {
            // do nothing
        } else if (action.kind === ResolveActionKind.FLIP) {
            const letters = (player.hand.activeIndex === room.wordLength - 1) ?
                            [...player.hand.letters, randomLetter()] :
                            player.hand.letters;
            player = {
                ...player,
                hand: {
                    letters,
                    activeIndex: player.hand.activeIndex+1,
                }
            };
        } else if (action.kind === ResolveActionKind.GUESS) {
            if (action.guess === action.actual) {
                bonuses.push(action.guess);
            }
            player = {
                ...player,
                hand: {
                    letters: [
                        ...player.hand.letters.slice(0, room.wordLength),
                        randomLetter(),
                    ],
                    // index doesn't change
                    activeIndex: player.hand.activeIndex,
                },
            };
        }
        players[action.player - 1] = player;
    }
    return {
        ...room,
        players,
        dummies,
        bonuses,
        hintsRemaining,
        hintLog: [...room.hintLog, logEntry],
        activeHint: {
            state: ActiveHintState.PROPOSING,
            proposedHints: {},
        },
    };
}

export function performResolveAction(room: ResolvingHintPhase, playerName: string, action: ResolveAction): HintingPhase {
    const newRoom = {
        ...room,
        activeHint: {
            ...room.activeHint,
            playerActions: [...room.activeHint.playerActions, action],
        }
    };
    if (allPlayersHaveActed(newRoom.activeHint)) {
        return fullyResolveHint(newRoom);
    } else {
        return newRoom;
    }
}
