# Socket traffic

How much data the server pushes during a game, and what the protocol changes did to it. Specs: [017-leaner-socket-messages](../specs/017-leaner-socket-messages/spec.md) and [018-finer-socket-diffs](../specs/018-finer-socket-diffs/spec.md).

## How to measure

```bash
npm run measure:socket -- --label <name>
```

The script (`apps/backend/src/app/lobby/measure/socket-traffic.measure.ts`) starts the lobby module in process, connects real Socket.IO clients and plays four full games to the end: 2 and 8 players, each without and with 2 spectators. All players are scripted humans that play the computer strategy (`testing/autoplay.ts`); the spectators join after the third turn, and one of them reloads once (same token, new socket). Dice and computer names use a fixed seed, and the server waits run 50 times faster; the bytes are not affected.

Every client counts what it receives (`testing/traffic.ts`): per event name the number and the bytes of the Socket.IO text frame body (`JSON.stringify([event, payload])`) and of every ack (`ack:<event>`). The counter does not know any event name, so it measures every protocol version. The output is one table per scenario, and `tmp/socket-traffic/<name>.json` (git-ignored) has the rows, the size series and the totals.

Sizes are the encoded JSON before any compression. Run the script again with a new label after a protocol change and compare the tables.

## Baseline (protocol 11, before spec 017)

Every accepted change sends the complete `game:state` (all seats, rules, game, the capped log) to every player and spectator. Players also get `game:log` with the new entries.

Bytes received per person over one game:

| Scenario            | Per player | Per spectator |
| ------------------- | ---------: | ------------: |
| 2 players           |  3,009,094 |             - |
| 2 players + 2 spec. |  3,017,207 |     2,974,013 |
| 8 players           | 18,202,194 |             - |
| 8 players + 2 spec. | 18,215,340 |    18,093,023 |

Size of one `game:state` message over the game (first message to last, in 10% steps):

| Scenario  | Series (bytes)                                                           |
| --------- | ------------------------------------------------------------------------ |
| 2 players | 922, 3752, 6076, 8292, 11091, 13559, 16165, 19001, 21384, 23685, 26313   |
| 8 players | 910, 7686, 14202, 21338, 27925, 35125, 41802, 45828, 45787, 45754, 45994 |

The message grows with the log until the log cap (500 entries) is reached; with 8 players that is about 46 KB per message, and a game sends 586 of them to every player. The `game:log` events are small (about 143 bytes on average) and not the problem.

### 2 players

| event           | role   | count |   total |   avg |   max |
| --------------- | ------ | ----: | ------: | ----: | ----: |
| game:state      | player |   436 | 5955064 | 13658 | 26313 |
| game:log        | player |   432 |   61140 |   142 |   411 |
| ack:game:join   | player |     1 |     919 |   919 |   919 |
| ack:game:create | player |     1 |     791 |   791 |   791 |
| lobby:games     | player |     1 |     235 |   235 |   235 |

### 2 players + 2 spectators

| event             | role      | count |   total |   avg |   max |
| ----------------- | --------- | ----: | ------: | ----: | ----: |
| game:state        | player    |   444 | 5972914 | 13453 | 26313 |
| game:log          | player    |   432 |   61140 |   142 |   411 |
| game:state        | spectator |   417 | 5933283 | 14228 | 26331 |
| ack:game:spectate | spectator |     2 |    4122 |  2061 |  2150 |

### 8 players

| event           | role   | count |     total |   avg |   max |
| --------------- | ------ | ----: | --------: | ----: | ----: |
| game:state      | player |  4667 | 144938863 | 31056 | 45994 |
| game:log        | player |  4603 |    656248 |   143 |   476 |
| lobby:games     | player |    19 |     12483 |   657 |   657 |
| ack:game:join   | player |     7 |      9058 |  1294 |  1681 |
| ack:game:create | player |     1 |       779 |   779 |   779 |

### 8 players + 2 spectators

| event             | role      | count |     total |   avg |   max |
| ----------------- | --------- | ----: | --------: | ----: | ----: |
| game:state        | player    |  4699 | 145040023 | 30866 | 45994 |
| game:log          | player    |  4603 |    656248 |   143 |   476 |
| game:state        | spectator |  1130 |  36183659 | 32021 | 46012 |
| ack:game:spectate | spectator |     2 |      5982 |  2991 |  3080 |

(Rows with a few bytes - `seat:ready`, `game:start` acks - are left out; the rows of the two spectators and the reload add up in the spectator figures.)

## Result (protocol 12, spec 017)

A client gets a snapshot when it enters (the ack of join, rejoin, spectate, reload, rematch, or `game:sync`) and after that only `game:change` messages: the recipient's running number `n` plus the parts that changed (see [the protocol contract](../specs/017-leaner-socket-messages/contracts/protocol.md)). The log travels once, as the new entries of a change; the rules are sent once, not with every state.

Bytes received per person over one game:

| Scenario            | Baseline (v11) | Result (v12) | Saved |
| ------------------- | -------------: | -----------: | ----: |
| 2 players           |      3,009,094 |       98,121 | 96.7% |
| 2 players + 2 spec. |      3,017,207 |       98,386 | 96.7% |
| 8 players           |     18,202,194 |      369,458 | 98.0% |
| 8 players + 2 spec. |     18,215,340 |      370,119 | 98.0% |

Per spectator:

| Scenario            | Baseline (v11) | Result (v12) | Saved |
| ------------------- | -------------: | -----------: | ----: |
| 2 players + 2 spec. |      2,974,013 |       95,355 | 96.8% |
| 8 players + 2 spec. |     18,093,023 |      362,886 | 98.0% |

Size of one `game:change` over the game (first message to last, in 10% steps):

| Scenario  | Series (bytes)                                         |
| --------- | ------------------------------------------------------ |
| 2 players | 191, 560, 433, 419, 435, 437, 429, 422, 422, 428, 699  |
| 8 players | 191, 608, 610, 613, 621, 606, 621, 619, 625, 753, 1105 |

(The first message is a seat change in the lobby, the last one carries the game result.)

### Success criteria

- **SC-001** (message size independent of the log length): met. In the 8-player game the turn messages stay between 606 and 625 bytes from the 10% mark to the 80% mark, although the log grows to its cap of 500 entries (the old message grew from 7.7 KB to 46 KB). The gateway test "keeps a turn message the same size however long the log is" checks it with 0 and 400 earlier log entries (within 10%).
- **SC-002** (at least 70% less data per player over an 8-player game): met, 98.0% less (18.2 MB to 0.37 MB).
- **SC-003** (spectators at least as much): met, 96.8% and 98.0% less.

### What is left

Over a game (protocol 12), 8 players receive 4660 `game:change` messages of 625 bytes on average. Most of every message is the `game` part: all players with name and score, the current turn with dice and card, the deck size. It is sent whole whenever any of it changes (design decision D3). [Spec 018](#result-protocol-13-spec-018) removes this. `lobby:games` is the biggest push outside a game (about 660 to 870 bytes, 19 times per game of 8 players, because every join changes the list).

### Decisions

| Option                                                   | Decision                                         | Why                                                                                                                                                                                                                                                                         |
| -------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Compression (`perMessageDeflate`)                        | Postponed                                        | A game of 8 players now costs a player about 0.37 MB, a message about 0.6 KB. Deflate on such short messages would likely save little unless context takeover is on, and that costs memory for every socket. Measure again if traffic ever matters; the script is reusable. |
| Binary encoding (MessagePack)                            | Dropped                                          | It needs a custom parser on both sides and makes the traffic unreadable in the browser tools, for a gain that is small after this change.                                                                                                                                   |
| Finer or generic diffs (for example only changed scores) | Done in [spec 018](#result-protocol-13-spec-018) | The `game` part is about 300 to 400 bytes. Sub-diffs saved 61% of the traffic of an 8-player game (see the result of protocol 13), with the round-trip test (`view-sync.spec.ts`) as the safety net.                                                                        |

## Result (protocol 13, spec 018)

Three changes on top of protocol 12 (see [the protocol contract](../specs/018-finer-socket-diffs/contracts/protocol.md)):

- **Game difference.** `game:change` carries `gameDiff` (changed player names and scores by index, the current player, the changed turn fields, the result, the pile size) instead of the whole `game` part. The whole `game` goes out only to a recipient who has none.
- **Compact log.** On the wire the log is a list of groups `{ at, seat?, e: [...] }`: entries with the same time stamp share one group (and their seat), the kind is flat (`thrown`, not `turn` plus `data.type`). `decodeLog` restores the entries, so the table and the log text are unchanged.
- **No redundant values.** `you` carries only the flags that changed; the client drops `turnDeadline` itself when a change moves the turn, ends or removes the game, or pauses it (rule D), so the server does not send `turnDeadline: null` for it.

Bytes received per person over one game:

| Scenario            | v11 (baseline) | v12 (spec 017) | v13 (spec 018) | Saved vs v12 |
| ------------------- | -------------: | -------------: | -------------: | -----------: |
| 2 players           |      3,009,094 |         98,121 |         53,104 |        45.9% |
| 2 players + 2 spec. |      3,017,207 |         98,386 |         53,369 |        45.8% |
| 8 players           |     18,202,194 |        369,458 |        142,121 |        61.5% |
| 8 players + 2 spec. |     18,215,340 |        370,119 |        142,782 |        61.4% |

Per spectator:

| Scenario            | v11 (baseline) | v12 (spec 017) | v13 (spec 018) | Saved vs v12 |
| ------------------- | -------------: | -------------: | -------------: | -----------: |
| 2 players + 2 spec. |      2,974,013 |         95,355 |         51,034 |        46.5% |
| 8 players + 2 spec. |     18,093,023 |        362,886 |        137,588 |        62.1% |

(The v12 figures are those of spec 017. Measured again on the unchanged code before this change, players were identical and spectators within 1.3% of them.)

Size of one `game:change` over the game (first message to last, in 10% steps):

| Scenario  | Series (bytes)                                        |
| --------- | ----------------------------------------------------- |
| 2 players | 199, 285, 220, 204, 239, 240, 213, 239, 239, 245, 482 |
| 8 players | 199, 220, 236, 213, 242, 234, 217, 234, 221, 322, 739 |

The average `game:change` of a player shrank from 629 to 239 bytes in the 8-player game. A card draw in a 4-player game is 237 bytes in the gateway test (747 in the recording of spec 017).

### Saving per story

Bytes per player over one game, measured after each story with the same script and seed (`v13-us1` to `v13-us3`):

| Scenario  |     v12 | After Story 1 (game difference) | After Story 2 (compact log) | After Story 3 (no redundant values) |
| --------- | ------: | ------------------------------: | --------------------------: | ----------------------------------: |
| 2 players |  98,121 |                          59,787 |                      53,124 |                              53,104 |
| 8 players | 369,458 |                         160,370 |                     142,105 |                             142,121 |

Story 1 brings most of the saving (57% in the 8-player game), Story 2 another 11%. Story 3 saves almost nothing in this script: the players are scripted and the turn limits of the server do not fire, so there is no timeout warning and almost no `turnDeadline` to clear. In real games the clearing of a turn limit and the warning flag are what it saves.

### Success criteria

- **SC-001** (card draw in a 4-player game at least 60% smaller): met, 237 instead of 747 bytes (68% less). The gateway test "a card draw change in a 4-player game stays small" holds the bound at 300 bytes.
- **SC-002** (at least 50% less data per player over an 8-player game than the 0.37 MB of spec 017, without short keys): met, 61.5% less (0.37 MB to 0.14 MB).
- **SC-003** (the same for spectators): met, 62.1% less (0.36 MB to 0.14 MB).
- **SC-004** (a client that applies every change holds the view of a fresh snapshot): met. `view-sync.spec.ts` replays seeded full games of 2, 4 and 8 players (also with a turn limit that restarts with every action); the gateway test compares the view built from the changes with a `game:sync` snapshot at the end of a played game.
- **SC-005** (log text unchanged): met. `game-view.spec.ts` shows that the text of every log kind and every event type is identical in English and German before and after the trip over the wire.
- **SC-006** (player, spectator and rematch flows work): the gateway and end-to-end specs run unchanged apart from the wire form of the log.
- **SC-007** (the figures and the decisions are recorded): this section.

### Short keys: not built

The measurement script computes a throw-away estimate: every object key that occurs in the received frames (77 to 79 of them) gets a unique one or two letter name, and the frames are measured again. In the 8-player game this gives 109,262 bytes per player instead of 142,121 (-23.1%) and 105,993 instead of 137,588 per spectator (-23.0%), below the 25% gate of the spec (FR-012). A shared key table, with the test that fails for a key without an entry, would cost more in code and readability than the 33 KB per game are worth. Story 4 is dropped; the estimate stays in the script (`keyTableEstimate` in `testing/traffic.ts`) and can be run again.

### Decisions

| Option                                            | Decision  | Why                                                                                                                                                  |
| ------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Game difference by index                          | Done      | The biggest part of a change was the repeated `game` part. The round-trip tests over seeded games keep it safe.                                      |
| Compact log groups, decoded in one place          | Done      | The client holds the same `LogEntry[]` as before; only `decodeLog` knows the wire form.                                                              |
| CSV-formatted strings instead of objects          | Rejected  | Names need escaping, the types of the values are lost, and the gain for the frequent messages is small once the diff is in place.                    |
| Short keys (shared key table)                     | Dropped   | The estimate saves 23.1% per player, below the 25% gate (see above).                                                                                 |
| Compression (`perMessageDeflate`)                 | Postponed | A message is now about 240 bytes. Deflate on such short messages saves little unless context takeover is on, and that costs memory for every socket. |
| Binary encoding (MessagePack)                     | Dropped   | A custom parser on both sides and unreadable traffic in the browser tools, for a small gain.                                                         |
| Optimistic client state for the host's own change | Rejected  | The host receives its own change like everybody else. The server stays the only authority (constitution I), and a change is small enough.            |
| Engine.IO heartbeat                               | Unchanged | The ping interval is part of Socket.IO's keep-alive, a few bytes every 25 seconds; not worth tuning.                                                 |
