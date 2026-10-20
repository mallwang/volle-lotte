# Socket traffic

How much data the server pushes during a game, and what the protocol changes did to it. Spec: [017-leaner-socket-messages](../specs/017-leaner-socket-messages/spec.md).

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

Over a game, 8 players receive 4660 `game:change` messages of 625 bytes on average. Most of every message is the `game` part: all players with name and score, the current turn with dice and card, the deck size. It is sent whole whenever any of it changes (design decision D3). `lobby:games` is the biggest push outside a game (about 660 to 870 bytes, 19 times per game of 8 players, because every join changes the list).

### Decisions

| Option                                                   | Decision  | Why                                                                                                                                                                                                                                                                         |
| -------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Compression (`perMessageDeflate`)                        | Postponed | A game of 8 players now costs a player about 0.37 MB, a message about 0.6 KB. Deflate on such short messages would likely save little unless context takeover is on, and that costs memory for every socket. Measure again if traffic ever matters; the script is reusable. |
| Binary encoding (MessagePack)                            | Dropped   | It needs a custom parser on both sides and makes the traffic unreadable in the browser tools, for a gain that is small after this change.                                                                                                                                   |
| Finer or generic diffs (for example only changed scores) | Postponed | The `game` part is about 300 to 400 bytes. Sub-diffs could save perhaps another third of the traffic, with more code and more states to test. The round-trip test (`view-sync.spec.ts`) makes it possible later without changing the protocol rules.                        |
