import { Injectable } from '@nestjs/common';
import { diffView, type GameChange, type GameView } from 'game-rules';
import type { GameRoom } from './game-room';
import { toView } from './view';

interface Entry {
  /** The last view this recipient has (snapshot or applied change); its log is a copy. */
  view: GameView;
  /** The recipient's running number. */
  n: number;
}

export type Outgoing =
  | { playerId: string; event: 'game:change'; payload: GameChange }
  | { playerId: string; event: 'game:snapshot'; payload: { game: GameView } };

/**
 * Remembers per room and recipient what the recipient's view looks like, so a change can be sent
 * as the difference. Numbers are per recipient: a recipient who gets no message for a change
 * keeps its number, so a gap always means a lost message.
 */
@Injectable()
export class ViewSyncService {
  private readonly rooms = new Map<string, Map<string, Entry>>();

  /** The recipient's complete view (for an ack or a `game:snapshot`); later changes continue from it. */
  snapshot(room: GameRoom, playerId: string): GameView {
    const entries = this.entriesOf(room.id);
    const n = entries.get(playerId)?.n ?? 0;
    const view = { ...toView(room, playerId), n };
    entries.set(playerId, { view: remember(view), n });
    return view;
  }

  /**
   * What each of `recipients` with a snapshot has to get after a change of the room. Entries of
   * players who are no longer recipients are dropped.
   */
  changes(room: GameRoom, recipients: ReadonlySet<string>): Outgoing[] {
    const entries = this.entriesOf(room.id);
    const out: Outgoing[] = [];
    for (const [playerId, entry] of entries) {
      if (!recipients.has(playerId)) {
        entries.delete(playerId);
        continue;
      }
      const next = toView(room, playerId);
      const parts = diffView(entry.view, next);
      if (parts === null) continue;
      entry.n++;
      const view = { ...next, n: entry.n };
      entry.view = remember(view);
      if (parts === 'snapshot')
        out.push({ playerId, event: 'game:snapshot', payload: { game: view } });
      else out.push({ playerId, event: 'game:change', payload: { n: entry.n, ...parts } });
    }
    return out;
  }

  forget(room: GameRoom, playerId: string): void {
    this.rooms.get(room.id)?.delete(playerId);
  }

  dispose(roomId: string): void {
    this.rooms.delete(roomId);
  }

  private entriesOf(roomId: string): Map<string, Entry> {
    const entries = this.rooms.get(roomId) ?? new Map<string, Entry>();
    this.rooms.set(roomId, entries);
    return entries;
  }
}

/** The room appends to its log in place, so the copy is needed to know where the log ended. */
const remember = (view: GameView): GameView => ({ ...view, log: view.log.slice() });
