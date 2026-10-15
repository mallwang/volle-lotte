import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';

const NICKNAME = /^[A-Za-z0-9 _-]{2,20}$/;
const IDLE_MS = 24 * 3_600_000;

export interface Session {
  token: string;
  playerId: string;
  nickname: string;
  socketId?: string;
  gameId?: string;
  lastSeen: number;
}

/** Returns the trimmed nickname, or null if it is not allowed. */
export function validNickname(nickname: unknown): string | null {
  if (typeof nickname !== 'string') return null;
  const trimmed = nickname.trim();
  return NICKNAME.test(trimmed) ? trimmed : null;
}

@Injectable()
export class SessionsService {
  private readonly byToken = new Map<string, Session>();
  private readonly bySocket = new Map<string, Session>();
  private readonly byPlayer = new Map<string, Session>();

  constructor(private readonly now: () => number = Date.now) {}

  create(nickname: string): Session {
    const session: Session = {
      token: randomBytes(32).toString('hex'),
      playerId: randomBytes(8).toString('hex'),
      nickname,
      lastSeen: this.now(),
    };
    this.byToken.set(session.token, session);
    this.byPlayer.set(session.playerId, session);
    return session;
  }

  byTokenValue(token: string): Session | undefined {
    return this.byToken.get(token);
  }

  bySocketId(socketId: string): Session | undefined {
    return this.bySocket.get(socketId);
  }

  byPlayerId(playerId: string): Session | undefined {
    return this.byPlayer.get(playerId);
  }

  /**
   * Binds the session to a socket (one active socket per token).
   * Returns the previous socket id if it was replaced.
   */
  attach(session: Session, socketId: string): string | undefined {
    const previous = session.socketId !== socketId ? session.socketId : undefined;
    if (previous) this.bySocket.delete(previous);
    session.socketId = socketId;
    session.lastSeen = this.now();
    this.bySocket.set(socketId, session);
    return previous;
  }

  /** Unbinds a closed socket; false if it was already replaced. */
  detach(socketId: string): Session | undefined {
    const session = this.bySocket.get(socketId);
    if (!session) return undefined;
    this.bySocket.delete(socketId);
    session.socketId = undefined;
    session.lastSeen = this.now();
    return session;
  }

  /** Removes sessions without game and connection that were idle for 24 h. */
  sweep(): number {
    let removed = 0;
    for (const s of this.byToken.values()) {
      if (!s.gameId && !s.socketId && this.now() - s.lastSeen >= IDLE_MS) {
        this.byToken.delete(s.token);
        this.byPlayer.delete(s.playerId);
        removed++;
      }
    }
    return removed;
  }
}
