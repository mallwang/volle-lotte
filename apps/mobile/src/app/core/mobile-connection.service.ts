import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { PROTOCOL_VERSION } from 'game-rules';
import { io } from 'socket.io-client';

export interface SocketLike {
  connected: boolean;
  on(event: string, handler: () => void): unknown;
}

/** Same-origin Socket.IO endpoint of the existing backend (also served under `/m/`). */
export const MOBILE_SOCKET = new InjectionToken<SocketLike>('MOBILE_SOCKET', {
  providedIn: 'root',
  factory: () => io({ path: '/socket.io' }),
});

/** Connectivity of the mobile shell; game flows follow in later milestones. */
@Injectable({ providedIn: 'root' })
export class MobileConnectionService {
  readonly protocolVersion = PROTOCOL_VERSION;
  readonly online = signal(false);

  constructor() {
    const socket = inject(MOBILE_SOCKET);
    this.online.set(socket.connected);
    socket.on('connect', () => this.online.set(true));
    socket.on('disconnect', () => this.online.set(false));
  }
}
