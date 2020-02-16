import { newStartingPhase } from './gameLogic';
import { callMakeRoom } from './gameAPI';

export async function createNewRoom(playerName: string, wordLength: number): Promise<string> {
    const initial = newStartingPhase(playerName, wordLength);
    const reply = await callMakeRoom(initial);
    return reply.room;
}
