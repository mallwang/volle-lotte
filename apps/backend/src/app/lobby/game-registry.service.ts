import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { GameSummary, LogEntry } from 'game-rules';
import { GameRoom, type RoomOptions } from './game-room';

export const LOBBY_CLEANUP_MS = 15 * 60_000;
export const RUNNING_CLEANUP_MS = 24 * 3_600_000;

@Injectable()
export class GameRegistryService implements OnModuleDestroy {
  private readonly rooms = new Map<string, GameRoom>();
  private readonly timers = new Map<string, NodeJS.Timeout>();

  /** Set by the gateway: a room changed (also from timers). */
  onChange?: (room: GameRoom, entries: LogEntry[]) => void;
  /** Set by the gateway: a room was removed by cleanup or because it emptied. */
  onClosed?: (room: GameRoom, reason: 'cleanup' | 'empty') => void;

  create(options: Omit<RoomOptions, 'id' | 'onChange'>): GameRoom {
    const room = new GameRoom({
      ...options,
      id: randomBytes(6).toString('hex'),
      onChange: (entries) => {
        this.arm(room);
        this.onChange?.(room, entries);
        this.closeIfEmpty(room);
      },
    });
    this.rooms.set(room.id, room);
    this.arm(room);
    return room;
  }

  get(id: string): GameRoom | undefined {
    return this.rooms.get(id);
  }

  list(): GameSummary[] {
    return [...this.rooms.values()].map((r) => r.summary());
  }

  onModuleDestroy(): void {
    this.rooms.forEach((_, id) => this.remove(id));
  }

  remove(id: string): void {
    const room = this.rooms.get(id);
    if (!room) return;
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
    this.rooms.delete(id);
    room.dispose();
  }

  /** Drops a room when nobody is left in it (lobby or finished game). */
  closeIfEmpty(room: GameRoom): boolean {
    if (room.phase === 'running' || room.humans().length > 0) return false;
    this.remove(room.id);
    this.onClosed?.(room, 'empty');
    return true;
  }

  /** (Re)arms the cleanup timer; any connected human cancels it. */
  private arm(room: GameRoom): void {
    clearTimeout(this.timers.get(room.id));
    this.timers.delete(room.id);
    if (room.hasConnectedHuman()) return;
    const ms = room.phase === 'running' ? RUNNING_CLEANUP_MS : LOBBY_CLEANUP_MS;
    const timer = setTimeout(() => {
      this.remove(room.id);
      this.onClosed?.(room, 'cleanup');
    }, ms);
    timer.unref();
    this.timers.set(room.id, timer);
  }
}
