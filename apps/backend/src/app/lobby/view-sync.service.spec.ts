import { defaultRules, seededRandomInt, applyChange, type GameChange } from 'game-rules';
import { GameRoom } from './game-room';
import { ViewSyncService, type Outgoing } from './view-sync.service';
import { toView } from './view';

const lobbyRoom = () => {
  const room = new GameRoom({
    id: 'r1',
    name: 'Sync',
    passwordHash: '',
    rules: defaultRules(),
    seatCount: 3,
    host: { playerId: 'h', nickname: 'Host' },
    rng: seededRandomInt(1),
    nameRng: seededRandomInt(2),
  });
  room.join('p', 'Pia');
  return room;
};
const everyone = (...ids: string[]) => new Set(ids);

describe('ViewSyncService', () => {
  let room: GameRoom;
  let service: ViewSyncService;
  beforeEach(() => {
    room = lobbyRoom();
    service = new ViewSyncService();
  });
  afterEach(() => room.dispose());

  it('starts counting at 0 with the first snapshot and registers the recipient', () => {
    const view = service.snapshot(room, 'h');
    expect(view).toEqual({ ...toView(room, 'h'), n: 0 });
    expect(service.changes(room, everyone('h', 'p'))).toEqual([]);
  });

  it('sends nothing when nothing changed and keeps the number', () => {
    service.snapshot(room, 'h');
    expect(service.changes(room, everyone('h'))).toEqual([]);
    expect(service.changes(room, everyone('h'))).toEqual([]);
    room.setReady('h', true);
    const [out] = service.changes(room, everyone('h'));
    expect((out.payload as GameChange).n).toBe(1);
  });

  it('sends one change with the next number, which applied to the snapshot gives the new view', () => {
    const snapshot = service.snapshot(room, 'h');
    room.setReady('h', true);
    const out = service.changes(room, everyone('h'));
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ playerId: 'h', event: 'game:change' });
    const change = out[0].payload as GameChange;
    expect(change).toMatchObject({ n: 1, seats: [[0, { ready: true }]] });
    expect(Object.keys(change)).toEqual(['n', 'seats']);
    expect(applyChange(snapshot, change)).toEqual({ ...toView(room, 'h'), n: 1 });
  });

  it('counts every recipient on its own and sends nobody without a snapshot', () => {
    service.snapshot(room, 'h');
    room.setReady('h', true);
    service.changes(room, everyone('h', 'p'));
    service.snapshot(room, 'p');
    room.setReady('p', true);
    const out = service.changes(room, everyone('h', 'p', 'nobody'));
    const numbers = Object.fromEntries(
      out.map((o: Outgoing) => [o.playerId, (o.payload as GameChange).n]),
    );
    expect(numbers).toEqual({ h: 2, p: 1 });
  });

  it('keeps the number across a new snapshot of the same recipient', () => {
    service.snapshot(room, 'h');
    room.setReady('h', true);
    service.changes(room, everyone('h'));
    const again = service.snapshot(room, 'h');
    expect(again.n).toBe(1);
    room.setReady('h', false);
    const [out] = service.changes(room, everyone('h'));
    expect((out.payload as GameChange).n).toBe(2);
  });

  it('forgets a recipient and drops everybody who is no longer one', () => {
    service.snapshot(room, 'h');
    service.snapshot(room, 'p');
    service.forget(room, 'h');
    room.setReady('h', true);
    expect(service.changes(room, everyone('h', 'p')).map((o) => o.playerId)).toEqual(['p']);
    // 'p' is left out of the next round of recipients
    room.setReady('p', true);
    expect(service.changes(room, everyone('h'))).toEqual([]);
    room.setReady('p', false);
    expect(service.changes(room, everyone('h', 'p'))).toEqual([]);
  });

  it('forgets a whole room on dispose', () => {
    service.snapshot(room, 'h');
    service.dispose(room.id);
    room.setReady('h', true);
    expect(service.changes(room, everyone('h'))).toEqual([]);
    expect(service.snapshot(room, 'h').n).toBe(0);
  });

  it('sends the log entries the room appended in place, one batch per change', () => {
    service.snapshot(room, 'h');
    room.join('q', 'Quin');
    const [first] = service.changes(room, everyone('h'));
    expect((first.payload as GameChange).log).toMatchObject([{ kind: 'joined' }]);
    room.leave('q');
    const [second] = service.changes(room, everyone('h'));
    expect((second.payload as GameChange).log).toMatchObject([{ kind: 'left' }]);
    expect((second.payload as GameChange).n).toBe(2);
  });

  it('answers a rematch with a snapshot for everybody who stays', () => {
    const running = lobbyRoom();
    running.join('q', 'Quin');
    for (const id of ['h', 'p', 'q']) running.setReady(id, true);
    running.start('h');
    running.phase = 'finished';
    for (const id of ['h', 'p', 'q']) service.snapshot(running, id);
    running.rematch('h', 1);
    const out = service.changes(running, everyone('h', 'p', 'q'));
    const host = out.find((o) => o.playerId === 'h');
    expect(host).toMatchObject({ event: 'game:snapshot', payload: { game: { round: 2, n: 1 } } });
    // waiting players keep looking at the finished table: they get a snapshot, then small changes
    expect(out.find((o) => o.playerId === 'p')?.event).toBe('game:snapshot');
    running.dispose();
  });
});
