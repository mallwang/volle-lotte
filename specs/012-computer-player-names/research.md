# Research: Computer Player Names

## Decision 1: Build a small shared name generator rather than use `unique-names-generator`

**Decision**: Add a pure, dependency-free shared Nx library with curated English adjectives/animal nouns and German adjectives plus gendered animal nouns. Generate a random pair from the requested language; German entries provide the matching adjective form for each noun gender.

**Rationale**: The user explicitly wants English and German, and German adjective endings must agree with noun gender. Inspection of `unique-names-generator` v4.7.1 showed dictionaries for adjectives, animals, colors, countries, languages, names, numbers and Star Wars, but no German dictionary. The package's sample adjective/animal output was English (e.g. “colonial firefly”). It cannot meet German word-list and agreement requirements.

**Alternatives considered**:

- Use the package's `languages` list as a purported German source: rejected; it contains language names, not translated adjectives/nouns.
- Generate German text by translating random English words: rejected; yields poor language quality and requires translation infrastructure.
- Add a package for localized names: rejected; the reviewed package has no German dictionaries or grammatical agreement support, and no alternative dependency is needed for two small curated lists.

## Decision 2: Keep random selection server-authoritative

**Decision**: The pure generator accepts an injected random-index source; the NestJS backend supplies a source backed by `crypto.randomInt`. Tests supply deterministic indices.

**Rationale**: Constitution Principle I requires the server to own random outcomes. Pure generation remains testable and reusable, while no browser can choose or forge its own computer identity.

**Alternatives considered**:

- Generate a random name separately in each client: rejected; clients could disagree, and generated identity belongs to the authoritative room.
- Depend directly on Node randomness from the shared library: rejected; it would make the library impure and less portable/testable.

## Decision 3: Treat names and language as room/session state, not client presentation

**Decision**: Keep each computer's name on its server-side room seat; serialize it in every seat view. Keep each participant's latest UI language on their session and human seat. Generate on computer-seat creation and takeover, resolving language from the current host except that a departing host's locale is captured before host election.

**Rationale**: Current computer seats have no name; `GameRoom.start()` synthesizes `Computer ${i + 1}` only while building engine player names. Host election may happen after a disconnect grace period, so the locale must remain attached to the departing host's seat/session rather than only a room-global current-host value. The existing room seat is also the source for lobby/table seat views and replacement/rejoin identity.

**Alternatives considered**:

- Generate only at game start: rejected; lobby computers need names and renaming there must persist into the game.
- Store only a current-host locale on the room: rejected; on departure it can be overwritten by a new host, and abrupt disconnect host election is delayed.
- Derive locale from each viewer: rejected; all clients must see the same generated name.

## Decision 4: Make running-game rename a synchronized immutable state change

**Decision**: Host rename is a validated server intent. Update the computer seat name and, when a game has started, replace the mapped engine player's `name` in a new immutable `GameState`; emit authoritative state and a rename event/log entry. Preserve existing log entries rather than rewriting history.

**Rationale**: `GameState.players` owns the names used by game/table/result rendering; room seats own lobby seat presentation. Both must agree after rename. The game engine's state updates are immutable; result ranking refers to player indices, so final result names come from the final player list. Existing game logs are append-only and keyed by seat/index.

**Alternatives considered**:

- Update only the seat view: rejected; running table/result continues to show stale engine player name.
- Rewrite old log entries: rejected; logs are incremental and capped; append a rename event while preserving historical events.
- Allow rename after game finish: excluded for version one; the active-game requirement is satisfied without changing completed-game history.

## Decision 5: Version the Socket.IO contract and report language changes

**Decision**: Add the supported language to the initial/resumed session handshake and synchronize subsequent UI language changes through a small session-language intent. Include computer names in seat views and add a host-only rename intent; increment `PROTOCOL_VERSION`.

**Rationale**: The frontend's current `I18nService` exposes `'en' | 'de'`, and `SocketService.start()` sends `session:start`; resume also replays that message. Without a language update after a user changes UI language in an active session, later host takeovers could use stale language. Protocol version checks already reject incompatible clients.

**Alternatives considered**:

- Send language only in game creation: rejected; it misses reconnects, games joined after session creation, and live UI-language changes.
- Send language only at initial session start: rejected; it does not support latest-language semantics during a session.
- Add a compatibility fallback for old clients: rejected; current protocol version enforcement is the existing compatibility contract, and silent partial support is undesirable.

## Codebase evidence

- Frontend locale is represented by `I18nService.lang` as `'en' | 'de'`; it persists under `vl-language`. `SocketService.start()` and the reconnect path send `session:start`.
- Shared `Intents` defines the socket contract; `SessionsService` holds anonymous session data; `LobbyGateway.start()` creates/resumes sessions.
- `GameRoom` stores human and computer seats; host election follows deliberate leave immediately, but abrupt disconnect keeps a seat during its grace period and only later performs replacement/election.
- At start, `GameRoom` currently creates `Computer N` engine names. Engine `GameState.players` holds `{name, score}`; room seat indices map to engine-player indices through `seatOfEngine`.
- Logs identify seats rather than embedding player names. Renaming should append a rename event and update new views, not mutate historical logs.
- The feature directory and new shared library must use Nx's existing workspace/project conventions and scope tags.
