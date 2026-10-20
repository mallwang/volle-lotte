# Data Model: Finer Socket Diffs and Compact Log

Types live in `libs/game-rules/src/lib/protocol.ts`. `GameView`, `LogEntry`, `SeatView`, `Turn` and the engine types do not change; what changes is what travels. Changes to spec 017 are marked **new** or **changed**.

## GameChange (changed)

```text
GameChange {
  n: number
  you?: Partial<GameView['you']>            changed: only the keys that differ
  hostId?, phase?, rematch?, seats?,        unchanged
  settings?, spectators?, paused?, preview?
  game?: GameStateView | null               changed: whole state only when the recipient has none; null = no game
  gameDiff?: GameStateDiff                  new
  turnDeadline?: {...} | null               changed: null is omitted when the client clears it itself (rule D)
  log?: WireLogGroup[]                      changed: compact form
}
```

`game` and `gameDiff` are never both present.

## GameStateDiff (new)

| Field      | Type                           | Meaning                                                                                |
| ---------- | ------------------------------ | -------------------------------------------------------------------------------------- |
| `players`  | `[index, { name?, score? }][]` | Only players whose name or score changed (rename, replacement, banked or lost points). |
| `current`  | `number`                       | New current player.                                                                    |
| `turn`     | `Partial<Turn> \| null`        | Changed turn fields; `null` = no turn; the whole turn when there was none before.      |
| `result`   | `Result \| null`               | Set when the game ends; `null` when a result disappears (rematch is a snapshot).       |
| `deckSize` | `number`                       | New size of the draw pile.                                                             |

Validation: the object has at least one key; `players` indices are inside the player list; a `Partial<Turn>` contains no key whose value equals the previous one. `applyGameDiff(prev, diff)` is pure and returns a new `GameStateView`. A change of the number of players is structural (snapshot), as today.

## WireLogGroup (new)

```text
WireLogGroup {
  at: number                 time stamp shared by the group
  seat?: number              set only if every entry of the group has this seat
  e: WireLogEntry[]          at least one entry
}
WireLogEntry {
  kind: LogKind | Event['type']     flat: the event type for turn entries
  seat?: number                      only when the group has no common seat
  data?: number | string             non-turn kinds, as before
  ...event fields                    turn entries: dice, lost, points, card, next, player, result
}
```

Rules:

- Grouping: consecutive log entries with equal `at` form one group.
- `encodeLog(entries)` and `decodeLog(groups)` are exact inverses: `decodeLog(encodeLog(x))` deep-equals `x` for every log of a simulated game. The `kind` values of `LogKind` and `Event['type']` are disjoint (type-level test), so a wire entry of an event type decodes to `{ kind: 'turn', data: { type, ...fields } }`.
- Snapshot: `WireView = Omit<GameView, 'log'> & { log: WireLogGroup[] }` is what acks and `game:snapshot` carry. `logBase` is a plain number as before.
- Trimming at `LOG_CAP` happens on decoded entries, identically for everybody (spec scenario 3 of Story 2).

## Rule D: turn deadline (new, in `applyChange`)

`applyChange` removes `turnDeadline` from the view when the change has `gameDiff.current`, a `gameDiff.turn.phase`, `gameDiff.result`, `game: null` or `paused: true`, unless the same change carries a `turnDeadline`. `diffView` leaves out a `turnDeadline: null` when this rule already yields it.

## Partial `you` (changed)

`you` in a change contains only the changed keys of `{ playerId, seat, timeoutWarning, reserved, spectator }`. `applyChange` merges: `{ ...view.you, ...change.you }`. Because JSON has no `undefined`, a removed `reserved` is sent as `reserved: null` and `applyChange` deletes the key (the partial's type is `reserved?: number | null`). A flip of `spectator` stays a snapshot.

## State transitions

Unchanged from spec 017: snapshot on entering (ack, `game:snapshot`, `game:sync`), changes with `n = lastN + 1`, a gap leads to `game:sync`. Structural differences (another round or id, other seat count, other rules, spectator flip, a log that got shorter) still produce a snapshot.
