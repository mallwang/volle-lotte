import { TestBed } from '@angular/core/testing';
import { MOBILE_SOCKET } from './mobile-socket.service';

type Handler = (...args: unknown[]) => void;

/** A fake socket: `acks` answers intents by event name, `fire` plays a server push. */
export function fakeSocket(acks: Record<string, object> = {}, connected = true) {
  const handlers: Record<string, Handler> = {};
  const socket = {
    connected,
    on: (e: string, h: Handler) => (handlers[e] = h),
    connect: () => (socket.connected = true),
    emit: (e: string, _payload: unknown, cb?: (ack: object) => void) =>
      cb?.(acks[e] ?? { ok: true }),
  };
  const emit = vi.spyOn(socket, 'emit');
  TestBed.configureTestingModule({ providers: [{ provide: MOBILE_SOCKET, useValue: socket }] });
  return { socket, emit, fire: (e: string, ...args: unknown[]) => handlers[e](...args) };
}

export { gameView } from 'client-core';
