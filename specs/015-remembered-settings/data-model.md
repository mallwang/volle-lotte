# Data Model: Remembered Settings and Presets

All types live in `apps/frontend/src/app/core/setup.ts`. Nothing is sent to the server.

## Setup

The complete, device-local description of how a game is set up.

| Field       | Type                 | Rules                                                                                  |
| ----------- | -------------------- | -------------------------------------------------------------------------------------- |
| `seats`     | integer              | 2 to 8, default 4                                                                      |
| `rules`     | `Rules` (game-rules) | built on `defaultRules()`; every field in range; must pass `rulesError`, else defaults |
| `computers` | `ComputerSeat[]`     | at most `seats - 1`; unique `seat` in 1 to `seats - 1`; default empty                  |
| `speed`     | integer              | 1 to 5, default 3 (`computerSpeed`)                                                    |

Never part of a setup: game name, password, computer names, humans, ready marks.

## ComputerSeat

| Field        | Type                                  |
| ------------ | ------------------------------------- |
| `seat`       | integer, index in the room, host is 0 |
| `difficulty` | `Difficulty` from game-rules          |
| `risk`       | `Risk` from game-rules                |

## Preset

| Field   | Type   | Rules                                                             |
| ------- | ------ | ----------------------------------------------------------------- |
| `name`  | string | trimmed, 1 to 30 characters, unique ignoring case within the list |
| `setup` | Setup  | snapshot at the time of saving                                    |

## Store state (`SetupStore`)

| State       | Persisted | Meaning                                                                       |
| ----------- | --------- | ----------------------------------------------------------------------------- |
| `last`      | yes       | Setup of the last started game, or none                                       |
| `presets`   | yes       | Ordered list, at most 10, newest last                                         |
| `reference` | no        | Setup last loaded, saved or declined in this tab; used for the start question |
| `available` | no        | false when `localStorage` cannot be read or written                           |

## Transitions

- **Start succeeded** (`game:start` ack ok): `last := current setup`.
- **Load preset** (create page): form, pending computers and speed := preset; `reference := preset.setup`.
- **Load preset** (lobby): computers and speed applied; `reference := preset.setup` (the room's seats and rules stay, so a differing seat count or rules keeps the question on, which is correct).
- **Save preset**: add, or replace after confirmation on the same name; list at most 10; `reference := saved setup` when saved in the lobby.
- **Delete preset**: remove by name; `last` and `reference` unchanged.
- **Reset to defaults**: form := defaults, pending computers and speed := none; `last` removed.
- **"No, start the game"**: `reference := current setup`, then start.

## Derived

- `current setup` in the lobby: seats from `game.seats.length`, `rules` from the game view, `computers` from seats in state `computer` (seat index, difficulty, risk), `speed` from `computerSpeed`.
- `askToSave(current)`: `available && !equals(current, reference) && !equals(current, last)`.
