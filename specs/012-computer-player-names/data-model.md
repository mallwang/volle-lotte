# Data Model: Computer Player Names

## Session language

Represents the UI language last reported by one connected or reconnecting anonymous player.

| Field      | Type           | Rules                                                                                                                                                                                                                               |
| ---------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `language` | `'en' \| 'de'` | Required for a new session handshake; validated against supported values. Missing/unknown values from the existing fallback path resolve to English. Updated when the player's UI language changes and when the session reconnects. |

The session language is not a player preference saved beyond the existing session lifetime. It is non-identifying metadata used by the server for name generation.

## Human seat

| Field      | Type           | Rules                                                                                                                      |
| ---------- | -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `nickname` | string         | Existing nickname validation and case-insensitive uniqueness rules.                                                        |
| `language` | `'en' \| 'de'` | Snapshot/latest language associated with this player in the room; retained for host departure, including disconnect grace. |

The seat-level language is distinct from a room-global host locale: when the host leaves, it remains available after the room elects a replacement host.

## Computer seat

| Field                | Type                                    | Rules                                                                                                                                                  |
| -------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `name`               | string                                  | Required display name, generated or host-entered; unique case-insensitively among currently occupied human and computer seats.                         |
| `nameSource`         | generated or host                       | Internal state useful to distinguish default name from explicit host naming; clients need only the display name unless an interaction requires source. |
| `former`             | existing player identifier and nickname | Existing rejoin reservation; remains available independently of computer display identity.                                                             |
| `difficulty`, `risk` | existing values                         | Unchanged by naming.                                                                                                                                   |

`name` persists on the seat through reconnects and is discarded when the computer seat is removed/opened or the former player reclaims the seat.

## Generated name word entries

| Entry             | Fields                            | Rules                                                                                                |
| ----------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------- |
| English adjective | text                              | Curated, family-friendly English adjective.                                                          |
| English noun      | text                              | Curated English animal noun.                                                                         |
| German adjective  | masculine, feminine, neuter forms | Curated German forms; each form is checked against a noun with the corresponding grammatical gender. |
| German noun       | text, gender                      | Curated German animal noun with `masculine`, `feminine`, or `neuter` gender.                         |

The generator is pure: input is language, word lists and injected random indices; output is a two-word display name. The server retries on collision against current occupied names. If the full combination space is exhausted for a game, it appends a deterministic distinguishing suffix rather than returning a duplicate.

## Running game state

The game engine's player at `seatOfEngine[seat]` must have the same `name` as the corresponding room seat. Renaming is lobby-only, so the engine state is created from the final seat names at game start and is never renamed afterwards.

## Transitions

1. **Open/locked -> computer (lobby)**: validate host intent; generate unique name in current host language; create computer seat with that name.
2. **Human -> computer (running takeover)**: capture human name/language/player ID in former-seat data; resolve naming language from current host or departing host as applicable; generate unique name; preserve engine index and score; append replacement event.
3. **Computer -> renamed computer**: validate host authority, normalized nickname constraints and uniqueness; update seat and broadcast. Without a name in the intent, a new unique name is rolled in the host language. Lobby only.
4. **Computer -> former human rejoin**: restore the former player's nickname and latest session language; release computer name and preserve the existing engine player/score continuity.
5. **Computer -> open/locked/removed**: release its name from the game uniqueness set.
6. **Host language changes**: update that player's session and active human seat; existing computer names are unchanged; subsequent generation uses the latest applicable host language.
