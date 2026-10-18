# Contract: computer seat protocol (version 6)

Source of truth: `libs/game-rules/src/lib/protocol.ts`. `PROTOCOL_VERSION` 5 -> 6; clients on 5 get `versionMismatch` at `session:start` as before. No new events and no extra websocket traffic: computer moves are computed on the server and pushed as the usual `game:state`.

## Types

```ts
export type Difficulty = 'easy' | 'medium' | 'hard' | 'random'; // unchanged
export type Risk = 'none' | 'medium' | 'high' | 'random'; // new
```

## Intent `seat:set` (client -> server)

```ts
'seat:set': [
  { seat: number; mode: 'open' | 'locked' | 'computer'; difficulty?: Difficulty; risk?: Risk },
  { },
];
```

- `risk` is only used with `mode: 'computer'`; it defaults to `'medium'` when absent (like `difficulty`).
- A `risk` that is present but not one of the four values gives `invalidRequest` (same check as `difficulty`). It is ignored for `open` and `locked`.
- Errors unchanged: `noSession`, `notInGame`, `notHost`, `gameStarted`, `seatOccupied`, `invalidRequest`.
- Allowed only in phase `lobby` (unchanged).

## View `SeatView` (server -> client)

```ts
{
  state: 'open' | 'locked' | 'human' | 'computer';
  // ...
  difficulty?: Difficulty; // computer seats
  risk?: Risk;             // new, computer seats
}
```

- A computer that replaced a human reports `difficulty: 'random'`, `risk: 'random'`.
- The log entry `seatChanged` for a computer seat carries the difficulty as before; the UI reads the risk from the seat view.

## Client behaviour

- Lobby seat row: a second select next to the difficulty select, labels `risk.none|medium|high|random` (en/de), per-seat aria label `gameLobby.riskSeat`.
- Table seat columns keep showing only the computer label (no change).
