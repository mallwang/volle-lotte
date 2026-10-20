# Research: Finer Socket Diffs and Compact Log

Basis: the recorded 4-player round in `tmp/socket-traffic-single-round` (a card draw is 747 bytes, a throw 768, a select 778, and about 650 bytes of each is the `game` part), the figures of [socket-traffic.md](../../docs/socket-traffic.md) and the code of spec 017 (`view-sync.ts`, `view.ts`, `socket.service.ts`, `table.ts`).

## R1. Shape of the game difference

**Decision**: `GameChange` gets a new key `gameDiff` and keeps `game` for the whole state. `game` is sent only when the recipient has no game (lobby to running, first rematch round) and as `null` when the game goes away. Otherwise `gameDiff` carries:

- `players`: `[index, { name?, score? }][]` for the players whose name or score changed;
- `current`: the new current player;
- `turn`: the changed turn fields (`Partial<Turn>`), or `null` when there is no turn any more; when there was no turn before, the whole turn;
- `result`: the result once, when it appears;
- `deckSize`.

`version` is a constant and travels in snapshots and in `game` only.

**Rationale**: the fields change independently: a draw changes `turn.phase`, `turn.card` and `deckSize`; a bank changes one score, `current` and the reset turn fields. A flat partial with arrays only for the player list is the smallest structure that is still obvious to read. It is what the roadmap asked for (changed scores by index, changed turn fields, pile size, current player).

**Alternatives considered**: a generic JSON patch (RFC 6902 style) - larger per operation (paths as strings), needs a library or a custom parser and gives no type safety; rejected like in spec 017. Sending `game` whole but without default values - still repeats names and scores.

## R2. Equality and the tested guarantee

**Decision**: `diffView` / `applyChange` stay a pair in one file. The round-trip test is extended: for every message of simulated full games (2 to 8 players, all card types through the seeded simulation of spec 017), `applyChange(prev, change)` must equal `next` apart from `n`, and for the encoded log `decodeLog(encodeLog(x))` equals `x`. The sequence test also compares the view reached by the changes with a fresh snapshot (SC-004).

**Rationale**: FR-004 and SC-004 demand 100%; the existing test already has the harness.

## R3. Compact log on the wire

**Decision**: the wire log is `WireLogGroup[]`:

```text
{ at: 1792499224206, seat: 3, e: [ { kind: 'thrown', dice: [6,4] }, { kind: 'bust', lost: 300 }, { kind: 'turnEnded', next: 0 } ] }
```

- Consecutive entries with the same `at` form a group (one action, one time stamp).
- If every entry of the group has the same `seat`, the seat sits on the group, otherwise on the entries.
- The `kind` of a turn entry is the event type (`thrown`, `bust`, ...) and the event fields sit beside it; the other kinds keep `data` as before. The event types and the `LogKind` names do not collide (checked by a type-level test), so the decoder tells them apart.
- The same form is used in snapshots (`GameView.log` on the wire) and in changes (clarification of 2026-10-20). `logBase` stays a plain number.

An entry like `{"at":1792499224206,"kind":"turn","seat":3,"data":{"type":"bust","lost":300}}` (86 bytes) becomes `{"kind":"bust","lost":300}` (26 bytes) inside a group that adds 40 bytes once.

**Rationale**: lossless and trivially invertible, so the UI keeps its `LogEntry[]` (`table.ts` reads `data.type` in many places) and no UI code changes. Grouping by equal `at` is a deterministic rule that needs no extra field from the room.

**Alternatives considered**: changing `LogEntry` itself and the UI with it - large, risky, no extra saving on the wire. Sending log texts - breaks the language independence.

## R4. Derivable log entries (FR-006)

**Decision**: no entry is removed from the wire in this feature. Candidates were checked against "must not change what the log shows":

- `turnEnded` is shown as a log line (“X ended the turn”) and used to count turns (`table.ts`), and its `next` is not always derivable from neighbouring entries (the last entry of a snapshot has no neighbour), so omitting it is not lossless.
- `turnLost` after `bust` and `volleLotte` are shown too.

The group time stamp, the flat kind and the shared seat already cut the entry by about 70%. If the measurement shows the log is still a large share, the next candidate is `turnEnded.next` derived from `gameDiff.current`; it would be a separate decision with its own test.

**Rationale**: FR-006 only allows omission when the display stays identical; none of the candidates qualifies without a risk. Recorded here so the decision is visible.

## R5. Turn deadline and pause (FR-007)

**Decision**: the deadline belongs to the turn state it was set for. The client (`applyChange`) clears `turnDeadline` when a change contains `gameDiff.current`, a changed `gameDiff.turn.phase`, `gameDiff.result`, `game: null`, or `paused: true`, unless the same change sets a new one. `diffView` omits a `turnDeadline: null` that this rule already produces, and still sends `null` when nothing else in the change explains it (for example a turn timer that is switched off).

**Rationale**: in the recording a bust, a timeout or the pause each carry a `"turnDeadline": null` that the client can infer. Because the rule is part of `applyChange`, the round-trip test checks that it is exact.

**Alternatives considered**: always sending `null` (today); moving the deadline into `gameDiff` (it also changes while the game state stays the same, for example on `game:settings`).

## R6. Partial `you` and silent changes (FR-008)

**Decision**: `GameChange.you` becomes `Partial<GameView['you']>`: only the changed keys (the timeout warning, the own seat, `reserved`). A flip of `spectator` stays structural. `applyChange` merges. A change that, for a recipient, differs in no part is not sent (already true, `diffView` returns `null`) and does not raise the running number.

## R7. Where to encode and decode

**Decision**: the room and `toView` keep working with the rich `GameView` and `LogEntry` (the per-recipient cache of spec 017 holds rich views, `diffView` compares rich views). Encoding happens at the send boundary: `view-sync.service.ts` encodes the log of every snapshot (`snapshot()` for the acks, `game:snapshot`) and of every change before it is emitted. The frontend decodes in one helper `adopt(wireView)` that replaces the `this.game.set(ack.game)` sites (one per ack); changes are decoded inside `applyChange`.

**Rationale**: one wire type (`WireView`) and one conversion on each side keep the rest of both programs unchanged. This is the one added concept of the feature (Constitution VII), justified by the log saving and the untouched UI.

**Alternatives considered**: sending rich entries and shortening the JSON by a generic key table only - saves less (the time stamp repeats) and is the optional Story 4.

## R8. Old clients (FR-014 and clarification)

**Decision**: `PROTOCOL_VERSION` 13. `session:start` already compares the version and answers `versionMismatch`, and the frontend already maps it to “This app version does not match the server. Please reload the page.” (`error.versionMismatch`, English and German). A client that reconnects after a server update starts with `session:start`, so it never receives v13 pushes. The plan adds a gateway test (a client announcing 12 gets `versionMismatch` and no `game:change`) and checks that the frontend does not keep a stale table after that error (task: verify, fix only if needed). The running game stays on the server; the reloaded client rejoins with the existing session replay.

## R9. Gate for short keys (Story 4)

**Decision**: the measurement script gets an estimate mode that re-serialises every received frame with a throw-away key table (`playerId` to `pid`, `seats` to `s`, `players` to `p`, `score` to `sc`, and so on) and prints the saving per player in the 8-player game. Story 4 is built only if the saving is at least 25% of the figure after Stories 1 to 3 (FR-012); otherwise the estimate and the decision go into the docs. Expectation from the recording: after Stories 1 to 3 a change is mostly numbers and short keys, so the saving is likely below the gate; the estimate decides, not this guess.

## R10. Measurement and documentation

**Decision**: run `npm run measure:socket -- --label v13` unchanged and add the v13 columns to `docs/socket-traffic.md` next to v11 and v12, with the saving per story (game diff, log, deadline and `you`) measured by the intermediate steps of the implementation (label per step). Decisions to record: CSV-formatted strings rejected (escaping of names, lost types, little gain for the frequent messages), compression postponed, binary encoding dropped, host receives its own change (no optimistic client state), Engine.IO heartbeat unchanged, short keys per the gate.
