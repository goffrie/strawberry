import { StartingPhase } from './gameState';
import { newStartingPhase, addPlayerToRoom } from './gameLogic';
import { callCommit, callMakeRoom } from './gameAPI';

export async function createNewRoom(playerName: string, wordLength: number): Promise<string> {
    const initial = newStartingPhase(playerName, wordLength);
    const reply = await callMakeRoom(initial);
    return reply.room;
}

export async function joinRoom(roomName: string, state: { gameState: StartingPhase, stateVersion: number }, playerName: string): Promise<boolean> {
    if (state.gameState.players.some((player) => player.name == playerName)) {
        // already in the game
        return true;
    }
    const reply = await callCommit(roomName, state.stateVersion, addPlayerToRoom(state.gameState, playerName));
    return reply.success;
}
