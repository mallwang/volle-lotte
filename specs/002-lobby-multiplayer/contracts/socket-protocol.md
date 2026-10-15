# Socket.IO protocol (version 1)

Namespace `/`, path `/socket.io`. Types live in `libs/game-rules/src/lib/protocol.ts` (`PROTOCOL_VERSION = 1`). Payloads are JSON; `GameView`, `GameSummary`, `LogEntry` are defined in [data-model.md](../data-model.md).

## Conventions

- Client to server: an event with one payload and an **acknowledgement** callback receiving `Ack<T>`.
- `Ack<T> = { ok: true } & T | { ok: false, reason: ErrorReason, ... }`.
- The first event on a connection must be `session:start`; every other event before it gets `noSession`.
- Tokens and passwords appear only in `session:start` (request and ack) and `game:create`/`game:join` (request); never in server pushes, logs or errors.

## Client to server

| Event           | Payload                                                                                                   | Ack on success                                                    | Who / when                                        |
| --------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------- |
| `session:start` | `{ nickname: string, token?: string, protocolVersion: 1 }`                                                | `{ token, playerId, nickname, protocolVersion, game?: GameView }` | any; resumes the game if the token is seated      |
| `lobby:list`    | none                                                                                                      | `{ games: GameSummary[] }`                                        | session; also pushed on change                    |
| `game:create`   | `{ name, password, seats: 2-8, rules: Rules }`                                                            | `{ game: GameView }`                                              | session not in a game; creator becomes host       |
| `game:join`     | `{ gameId, password, seat?: number }`                                                                     | `{ game: GameView }`                                              | game in `lobby` phase; first free seat if omitted |
| `game:leave`    | none                                                                                                      | `{}`                                                              | seated player; deliberate leave (FR-021)          |
| `seat:set`      | `{ seat, mode: 'open' \| 'locked' \| 'computer', difficulty?: 'easy' \| 'medium' \| 'hard' \| 'random' }` | `{}`                                                              | host, phase `lobby`                               |
| `seat:ready`    | `{ ready: boolean }`                                                                                      | `{}`                                                              | human, phase `lobby`                              |
| `game:start`    | none                                                                                                      | `{}`                                                              | host, >= 2 occupied seats, all humans ready       |
| `host:decide`   | `{ seat, decision: 'computer' \| 'free', difficulty? }`                                                   | `{}`                                                              | host, seat in `pending` (FR-021)                  |
| `turn:action`   | `{ action: Action }` (engine `Action`: draw, select with dice indices, throw, bank)                       | `{}`                                                              | active human, phase `running`, not paused         |

## Server to client

| Event              | Payload                    | When                                                                              |
| ------------------ | -------------------------- | --------------------------------------------------------------------------------- |
| `lobby:games`      | `{ games: GameSummary[] }` | any list change, to sessions not in a game                                        |
| `game:state`       | `{ game: GameView }`       | after every accepted change, to every connected seat of the game (FR-016)         |
| `game:log`         | `{ entries: LogEntry[] }`  | log appends (also contained in the next `game:state`)                             |
| `session:replaced` | none                       | a newer connection took over this token (FR-023); the socket is then disconnected |
| `game:closed`      | `{ reason: 'cleanup' }`    | the game was removed (15 min / 24 h cleanup)                                      |

`game:state` is a full snapshot (idempotent), so a client that reconnects only needs the ack of `session:start` (which carries `game`) or the next push.

## ErrorReason

| Reason             | Meaning                                                                                 |
| ------------------ | --------------------------------------------------------------------------------------- |
| `noSession`        | `session:start` not done                                                                |
| `versionMismatch`  | `protocolVersion` differs from the server's                                             |
| `invalidRequest`   | payload failed structural validation                                                    |
| `invalidNickname`  | length or characters wrong                                                              |
| `nicknameTaken`    | already used in this game, case-insensitive                                             |
| `invalidPassword`  | password length outside 4-64 on create                                                  |
| `wrongPassword`    | join failed; ack also has `attemptsLeft: number`                                        |
| `locked`           | too many failures; ack also has `retryAfterMs: number`                                  |
| `gameNotFound`     | unknown, removed or not joinable                                                        |
| `gameStarted`      | joining or seat changes after start                                                     |
| `gameFull`         | no free seat                                                                            |
| `seatNotFree`      | chosen seat is not open                                                                 |
| `seatOccupied`     | tried to lock an occupied seat                                                          |
| `alreadyInGame`    | session is already seated                                                               |
| `notInGame`        | session is not seated                                                                   |
| `notHost`          | host-only event from another player                                                     |
| `notReady`         | start while a human is not ready                                                        |
| `notEnoughPlayers` | start with fewer than 2 occupied seats                                                  |
| `nothingPending`   | `host:decide` for a seat that is not waiting                                            |
| `notYourTurn`      | `turn:action` from a player who is not active (FR-017)                                  |
| `paused`           | game waits for a host decision                                                          |
| `rejected`         | engine refused the action; ack also has `engine: RejectionReason` (e.g. `belowMinimum`) |

Every rejected intent leaves the state unchanged and pushes nothing (SC-003).

## Behaviour notes

- Disconnect: seat stays, `connected = false`, `disconnected` log entry, `game:state` to the others. Reconnect with the same token within 60 s restores the seat (`reconnected` log entry); after that the seat is `pending` and the host sees the decision UI.
- Host leaves or is disconnected past grace: host role moves to the next connected human by seat order (`hostChanged` log entry).
- Computer turns: after 700-1400 ms the server calls `chooseAction` then `applyAction` and pushes `game:state`; clients cannot send `turn:action` for a computer seat.
- Randomness: dice and deck come only from `crypto.randomInt` on the server; no event carries a seed or the deck.
