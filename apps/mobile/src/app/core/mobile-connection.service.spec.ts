import { TestBed } from '@angular/core/testing';
import { PROTOCOL_VERSION } from 'game-rules';
import { MOBILE_SOCKET, MobileConnectionService } from './mobile-connection.service';

describe('MobileConnectionService', () => {
  it('tracks connect and disconnect and exposes the shared protocol version', () => {
    const handlers: Record<string, () => void> = {};
    TestBed.configureTestingModule({
      providers: [
        {
          provide: MOBILE_SOCKET,
          useValue: { connected: false, on: (e: string, h: () => void) => (handlers[e] = h) },
        },
      ],
    });
    const service = TestBed.inject(MobileConnectionService);
    expect(service.protocolVersion).toBe(PROTOCOL_VERSION);
    expect(service.online()).toBe(false);
    handlers['connect']();
    expect(service.online()).toBe(true);
    handlers['disconnect']();
    expect(service.online()).toBe(false);
  });
});
