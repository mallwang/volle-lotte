import type { Ack, ErrorAck, Intents } from 'game-rules';
import { planComputers, type ComputerSeat, type Setup } from 'client-core';
import type { SocketService } from './socket.service';
import type { GameView } from 'game-rules';

export type ApplyResult =
  { ok: true; placed: number; skipped: number } | { ok: false; ack: ErrorAck };

/**
 * Makes the computers and the computer speed of a room match a setup, with the host's own intents so the
 * server validates every step. Stops at the first failure; what was already applied stays.
 */
export async function applySetup(
  socket: Pick<SocketService, 'send'>,
  game: Pick<GameView, 'seats' | 'computerSpeed' | 'fastComputerDice' | 'showBustProbability'>,
  computers: readonly ComputerSeat[],
  settings: Partial<Pick<Setup, 'speed' | 'fastComputerDice' | 'showBustProbability'>> = {},
): Promise<ApplyResult> {
  const plan = planComputers(game.seats, computers);
  const run = async (p: Promise<Ack>): Promise<ErrorAck | null> => {
    const ack = await p;
    return ack.ok ? null : ack;
  };
  for (const seat of plan.clear) {
    if (plan.place.some((c) => c.seat === seat)) continue;
    const failed = await run(socket.send('seat:set', { seat, mode: 'open' }));
    if (failed) return { ok: false, ack: failed };
  }
  for (const c of plan.place) {
    const failed = await run(
      socket.send('seat:set', {
        seat: c.seat,
        mode: 'computer',
        difficulty: c.difficulty,
        risk: c.risk,
      }),
    );
    if (failed) return { ok: false, ack: failed };
  }
  const patch = settingsPatch(game, settings);
  if (Object.keys(patch).length > 0) {
    const failed = await run(socket.send('game:settings', patch));
    if (failed) return { ok: false, ack: failed };
  }
  return { ok: true, placed: plan.place.length, skipped: plan.skipped };
}

/** Only the settings that differ from the room, so an unchanged setup sends nothing. */
function settingsPatch(
  game: Pick<GameView, 'computerSpeed' | 'fastComputerDice' | 'showBustProbability'>,
  settings: Partial<Pick<Setup, 'speed' | 'fastComputerDice' | 'showBustProbability'>>,
): Intents['game:settings'][0] {
  const patch: Intents['game:settings'][0] = {};
  const { speed, fastComputerDice, showBustProbability } = settings;
  if (speed !== undefined && speed !== game.computerSpeed) patch.computerSpeed = speed;
  if (fastComputerDice !== undefined && fastComputerDice !== game.fastComputerDice)
    patch.fastComputerDice = fastComputerDice;
  if (showBustProbability !== undefined && showBustProbability !== game.showBustProbability)
    patch.showBustProbability = showBustProbability;
  return patch;
}
