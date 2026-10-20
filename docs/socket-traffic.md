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
