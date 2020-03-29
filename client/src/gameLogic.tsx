import {
    ActiveHintState,
    HintingPhase,
    ProposingHintPhase,
    ResolveAction,
    ResolveActionKind,
    ResolvingHint,
    ResolvingHintPhase,
    RoomPhase,
    StartingPhase,
    EndgamePhase,
    BaseStartedPhase,
    EndgameLetterChoice,
    StartedPhase,
} from './gameState';
import { PlayerNumber, Letter, Hint, HintSpecs, LetterSources } from './gameTypes';
import { flatten, shuffle, mapNth } from './utils';

export const MIN_PLAYERS: number = 2;
export const MAX_PLAYERS: number = 6;
const STARTING_HINTS: number = 11;

// no J, Q, V, X, Z
export const LETTER_DISTRIBUTION: Readonly<Record<Letter, number>> = {'E': 6, 'I': 4, 'R': 4, 'O': 4, 'S': 4, 'T': 4, 'A': 4, 'U': 3, 'N': 3, 'L': 3, 'H': 3, 'C': 3, 'D': 3, 'K': 2, 'Y': 2, 'B': 2, 'W': 2, 'F': 2, 'M': 2, 'P': 2, 'G': 2};
export const LETTERS: readonly Letter[] = Object.keys(LETTER_DISTRIBUTION);

function reshuffleDeck<T extends BaseStartedPhase>(room: T): T {
    const excluded = flatten([
        flatten(room.players.map((player) => player.hand.letters)),
        room.dummies.map((dummy) => dummy.currentLetter),
        room.bonuses,
    ]);
    return {
        ...room,
        deck: createShuffledDeck(excluded),
    };
}

function createShuffledDeck(excluded: Letter[]): Letter[] {
    let distribution = {...LETTER_DISTRIBUTION};
    for (let letter of excluded) {
        if (distribution[letter] > 0) {
            distribution[letter]--;
        }
    }
    // fallback to a new deck if we've exhausted every letter
    if (LETTERS.every((letter) => distribution.letter <= 0)) {
        distribution = {...LETTER_DISTRIBUTION};
    }
    const result = shuffle(flatten(LETTERS.map(letter => Array.from({length: distribution[letter]}, () => letter))));
    return result;
}

function drawFromDeck<T extends BaseStartedPhase>(room: T): [Letter, T] {
    // !room.deck check is for migration
    if (!room.deck || room.deck.length === 0) {
        room = reshuffleDeck(room);
    }
    let deck = Array.from(room.deck);
    const drawnLetter = deck.pop()!;
    return [drawnLetter, {...room, deck}];
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

function cycleDummies(room: HintingPhase, predicate: (index: number) => boolean): HintingPhase {
    let hintsRemaining = room.hintsRemaining;
    let dummies = Array.from(room.dummies);
    dummies.forEach((dummy, index) => {
        if (predicate(index)) {
            if (dummy.untilFreeHint === 1) {
                // got a hint!
                hintsRemaining += 1;
            }
            let [newLetter, newRoom] = drawFromDeck(room);
            dummies[index] = {
                currentLetter: newLetter,
                untilFreeHint: dummy.untilFreeHint - 1,
            };
            // Update the room with each iteration since the deck might need to be reshuffled.
            room = {
                ...newRoom,
                dummies,
            };
        }
    });
    return {
        ...room,
        hintsRemaining,
    };
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
        ...room,
        players: [...room.players, { name: playerName, word: null }],
    };
}

export function removePlayerFromRoom(room: StartingPhase, playerName: string): StartingPhase {
    return {
        ...room,
        players: room.players.filter((p) => p.name !== playerName),
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
    const players = room.players.map((player, index) => {
        // each player receives the previous player's word
        const word = room.players[(index + room.players.length - 1) % room.players.length].word;
        if (word == null) {
            throw new Error("Room is not ready");
        }
        return {
            name: player.name,
            hand: {
                letters: shuffle(word),
                guesses: Array.from(word, _ => null),
                activeIndex: 0,
            },
            hintsGiven: 0,
        };
    });

    const deck = createShuffledDeck(flatten(players.map((player) => player.hand.letters)));
    const dummies = dummyLettersForFreeHint(players.length).map((untilFreeHint) => ({
        currentLetter: '#',    // placeholder to be replaced by cycleDummies
        untilFreeHint: untilFreeHint + 1,
    }));
    const result: HintingPhase = {
        phase: RoomPhase.HINT,
        wordLength: room.wordLength,
        players,
        dummies,
        bonuses: [],
        hintLog: [],
        deck,
        hintsRemaining: STARTING_HINTS,
        activeHint: {
            state: ActiveHintState.PROPOSING,
            proposedHints: {},
        },
    };
    return cycleDummies(result, () => true);
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

export function getPlayerNumber(room: BaseStartedPhase, playerName: string): PlayerNumber | null {
    for (let i = 0; i < room.players.length; i++) {
        if (room.players[i].name === playerName) return i+1;
    }
    return null;
}

export function setProposedHint(room: ProposingHintPhase, playerName: string, hint: Hint | null): ProposingHintPhase {
    const proposedHints: Record<PlayerNumber, Hint> = {...room.activeHint.proposedHints};
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

export function giveHint(room: ProposingHintPhase, hint: Hint): StartedPhase {
    // Sanity check that the letters used in the hint actually exist.
    for (const letterAndSource of hint.lettersAndSources) {
        switch (letterAndSource.sourceType) {
            case LetterSources.BONUS:
                if (!room.bonuses.includes(letterAndSource.letter)) throw new Error("illegal hint");
                break;
            case LetterSources.DUMMY:
                if (room.dummies[letterAndSource.dummyNumber-1].currentLetter !== letterAndSource.letter) throw new Error("illegal hint");
                break;
            case LetterSources.PLAYER:
                const player = room.players[letterAndSource.playerNumber-1];
                if (player.hand.letters[player.hand.activeIndex] !== letterAndSource.letter) throw new Error("illegal hint");
                break;
            case LetterSources.WILDCARD: break;
        }
    }

    // The player `playerName` gives a hint. This sets that hint as the activeHint, moving the game into the ResolvingHintPhase.
    const newRoom: ResolvingHintPhase = {
        ...room,
        players: mapNth(room.players, hint.givenByPlayer - 1, (player) => {
            return {...player, hintsGiven: player.hintsGiven + 1};
        }),
        activeHint: {
            state: ActiveHintState.RESOLVING,
            hint,
            playerActions: [],
            activeIndexes: room.players.map((player) => player.hand.activeIndex),
        },
    };
    // It's possible no players were actually involved in the hint. In that case we immediately finish the resolving phase.
    // TODO: is this actually legal?
    if (playersWithOutstandingAction(newRoom.activeHint).size === 0) {
        return fullyResolveHint(newRoom);
    } else {
        return newRoom;
    }
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

export function playersWithOutstandingAction(activeHint: ResolvingHint): Set<PlayerNumber> {
    const hint = activeHint.hint;
    const playerNumbers: Set<PlayerNumber> = new Set();
    for (const letterAndSource of hint.lettersAndSources) {
        if (letterAndSource.sourceType === LetterSources.PLAYER) {
            playerNumbers.add(letterAndSource.playerNumber);
        }
    }
    for (const action of activeHint.playerActions) {
        playerNumbers.delete(action.player);
    }
    return playerNumbers;
}

function applyResolution(room: ResolvingHintPhase, action: ResolveAction): ResolvingHintPhase {
    const players = [...room.players];
    let player = room.players[action.player - 1];
    const bonuses = [...room.bonuses];
    if (action.kind === ResolveActionKind.NONE) {
        // do nothing
        return room;
    } else if (action.kind === ResolveActionKind.FLIP) {
        let letters = player.hand.letters;
        if (player.hand.activeIndex === room.wordLength - 1) {
            let [newLetter, newRoom] = drawFromDeck(room);
            letters = [...player.hand.letters, newLetter];
            room = newRoom;
        }
        player = {
            ...player,
            hand: {
                letters,
                guesses: player.hand.guesses,
                activeIndex: player.hand.activeIndex+1,
            }
        };
    } else if (action.kind === ResolveActionKind.GUESS) {
        if (action.guess === action.actual) {
            bonuses.push(action.guess);
        }
        let [newLetter, newRoom] = drawFromDeck({...room, bonuses});
        room = newRoom;
        player = {
            ...player,
            hand: {
                letters: [
                    ...player.hand.letters.slice(0, room.wordLength),
                    newLetter,
                ],
                guesses: player.hand.guesses,
                // index doesn't change
                activeIndex: player.hand.activeIndex,
            },
        };
    }
    players[action.player - 1] = player;
    return {
        ...room,
        players,
    }
}

function fullyResolveHint(room: ResolvingHintPhase): StartedPhase {
    const logEntry = {
        hint: room.activeHint.hint,
        totalHints: room.hintLog.length + room.hintsRemaining,
        activeIndexes: room.activeHint.activeIndexes,
        playerActions: room.activeHint.playerActions,
    };

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
    const bonuses = room.bonuses.filter((bonus, index) => !bonusesUsed.has(index));

    let newRoom: HintingPhase = {
        ...room,
        bonuses,
        hintsRemaining: room.hintsRemaining - 1,
        hintLog: [...room.hintLog, logEntry],
        activeHint: {
            state: ActiveHintState.PROPOSING,
            proposedHints: {},
        },
    };
    newRoom = cycleDummies(newRoom, (index) => dummiesUsed.has(index));

    if (newRoom.hintsRemaining <= 0) {
        return moveToEndgame(newRoom);
    } else {
        return newRoom;
    }
}

export function performResolveAction(room: ResolvingHintPhase, action: ResolveAction): StartedPhase {
    let newRoom: ResolvingHintPhase = {
        ...room,
        activeHint: {
            ...room.activeHint,
            playerActions: [...room.activeHint.playerActions, action],
        }
    };
    newRoom = applyResolution(newRoom, action);
    if (playersWithOutstandingAction(newRoom.activeHint).size === 0) {
        return fullyResolveHint(newRoom);
    } else {
        return newRoom;
    }
}

export function moveToEndgame(room: HintingPhase): EndgamePhase {
    const {players, wordLength, dummies, bonuses, hintLog, deck} = room;
    return {
        phase: RoomPhase.ENDGAME,
        wordLength,
        dummies,
        bonuses,
        hintLog,
        deck,
        hintsRemaining: 0,
        players: players.map((player) => ({
            ...player,
            hand: {
                guesses: player.hand.guesses,
                // Remove any bonus letter from the player's hand.
                letters: player.hand.letters.slice(0, room.wordLength),
                // All letters are guessable, but none are active.
                activeIndex: room.wordLength,
            },
            guess: [],
            committed: false,
        })),
    };
}

export function setHandGuess<T extends BaseStartedPhase>(room: T, playerNumber: PlayerNumber, index: number, guess: Letter | null): T {
    return {
        ...room,
        players: mapNth(room.players, playerNumber - 1, (player) => {
            return {
                ...player,
                hand: {
                    ...player.hand,
                    // TODO: remove fallback (needed for migration)
                    guesses: mapNth(player.hand.guesses || Array.from({length: room.wordLength}, () => null), index, _ => guess),
                },
            }
        })
    }
}

class InvalidLetters extends Error {}

export function lettersForFinalGuess(room: EndgamePhase, playerNumber: PlayerNumber): (EndgameLetterChoice & {available: boolean})[] {
    const player = room.players[playerNumber-1];
    const usedOwnLetters = new Set();
    const bonusesAvailable = new Map();
    for (const letter of room.bonuses) {
        bonusesAvailable.set(letter, (bonusesAvailable.get(letter) ?? 0) + 1);
    }
    let wildcardAvailable = true;
    for (const guess of player.guess) {
        if (guess.sourceType === LetterSources.PLAYER) {
            if (usedOwnLetters.has(guess.index)) throw new InvalidLetters();
            usedOwnLetters.add(guess.index);
        }
    }
    for (const otherPlayer of room.players) {
        for (const guess of otherPlayer.guess) {
            if (guess.sourceType === LetterSources.WILDCARD) {
                if (!wildcardAvailable) throw new InvalidLetters();
                wildcardAvailable = false;
            } else if (guess.sourceType === LetterSources.BONUS) {
                const current = bonusesAvailable.get(guess.letter);
                if (!current) throw new InvalidLetters();
                bonusesAvailable.set(guess.letter, current - 1);
            }
        }
    }

    const choices: (EndgameLetterChoice & {available: boolean})[] = [];
    for (let i = 0; i < room.wordLength; ++i) {
        choices.push({
            sourceType: LetterSources.PLAYER,
            index: i,
            available: !usedOwnLetters.has(i),
        });
    }
    choices.push({
        sourceType: LetterSources.WILDCARD,
        letter: '*',
        available: wildcardAvailable,
    });
    for (const letter of room.bonuses) {
        const current = bonusesAvailable.get(letter);
        const available = !!current;
        if (available) {
            bonusesAvailable.set(letter, current - 1);
        }
        choices.push({
            sourceType: LetterSources.BONUS,
            letter,
            available,
        })
    }
    return choices;
}

export function setFinalGuess(room: EndgamePhase, playerNumber: PlayerNumber, guess: readonly EndgameLetterChoice[]): EndgamePhase | null {
    const newRoom = {
        ...room,
        players: mapNth(room.players, playerNumber-1, (player) => ({
            ...player,
            guess,
        })),
    };
    try {
        lettersForFinalGuess(newRoom, playerNumber);
    } catch (e) {
        if (e instanceof InvalidLetters) {
            return null;
        }
        throw e;
    }
    return newRoom;
}

export function commitFinalGuess(room: EndgamePhase, playerNumber: PlayerNumber): EndgamePhase {
    return {
        ...room,
        players: mapNth(room.players, playerNumber-1, (player) => ({
            ...player,
            committed: true,
        })),
    };
}