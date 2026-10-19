# Research: Remembered Settings and Presets

## Decision 1: Frontend only, no protocol change

**Decision**: Everything is stored in the browser. A new game gets remembered computers and speed from the client with the existing intents `seat:set` (per computer) and `game:settings` (`computerSpeed`) right after `game:create` succeeded.

**Rationale**: The data never needs the server (spec FR-015). The host already may call both intents in a lobby, and the server validates them. No protocol bump, no backend change, no outdated-client problem.

**Alternatives considered**: Adding `computers` and `computerSpeed` to `game:create` (one round trip fewer, but a protocol change and backend tests for a convenience); storing presets on the server (needs accounts, out of scope).

## Decision 2: Two storage keys with versioned JSON

**Decision**: `vl-last-setup` holds `{ v: 1, setup }`, `vl-presets` holds `{ v: 1, items: [{ name, setup }] }`. Reading validates every field and replaces invalid parts with defaults; an unreadable value counts as missing. Writes are wrapped in try/catch and report failure. See [contracts/local-storage.md](contracts/local-storage.md).

**Rationale**: Existing code uses one key per concern (`vl-skip-dice`, session key) with try/catch. Two keys keep the last setup independent of the preset list (deleting or resetting one never touches the other). A version field lets R9 and R20 add options later; missing new options fall back to defaults (spec edge case).

**Alternatives considered**: One key with both (a corrupt preset list would take the last setup with it); IndexedDB (overkill for under 10 KB).

## Decision 3: Sanitise on read, per field

**Decision**: `sanitizeSetup(unknown)` returns a valid `Setup`: seats clamped to 2 to 8 else 4; rules built from `defaultRules()` with each known field taken only if it is a finite integer in range, then checked with `rulesError`, falling back to defaults when that fails; speed an integer 1 to 5 else 3; computers filtered to known `difficulty` and `risk`, seat index within the seat count, no duplicates, at most seats minus one. A preset whose name is not a string of 1 to 30 characters is dropped; the list is cut to 10.

**Rationale**: Spec FR-016 asks for per-value fallback and no failing pages. Reusing `defaultRules` and `rulesError` keeps the engine the single source of truth for what valid rules are.

**Alternatives considered**: Rejecting the whole object on any error (loses valid data and surprises users); a schema library (new dependency).

## Decision 4: Computer seats are stored by seat index and placed first-fit

**Decision**: A computer is `{ seat, difficulty, risk }`. `planComputers(seats, computers)` first frees the seats of computers that are replaced, then puts each computer on its stored seat if that seat is open, otherwise on the first open seat, and reports the ones that did not fit. Humans are never touched. Seat 0 is the host and is never a computer.

**Rationale**: Matches "computer seats (skill, risk, seat position)" and "seated humans and their order never change" with one small pure function. In a fresh room every non-host seat is open, so the remembered layout is restored exactly.

**Alternatives considered**: Order only, without seat index (loses the layout, for example a computer deliberately on seat 6); moving humans to make room (forbidden by the spec).

## Decision 5: Applying to the room goes through the existing socket

**Decision**: `setup-apply.ts` takes the current `GameView` and a setup, computes the plan, sends `seat:set` open for computers to remove, `seat:set` computer for each placed one, and `game:settings` for the speed, one after another, and returns `{ placed, skipped }`. A failed intent stops the run and shows the existing error text; what was already applied stays.

**Rationale**: Uses only host intents that exist and are validated; sequential sends keep seat order deterministic and the server state consistent after each step.

**Alternatives considered**: Parallel sends (non-deterministic with first-fit); a batch intent (protocol change).

## Decision 6: "Reference" decides the start question

**Decision**: `SetupStore.reference` is an in-memory `Setup | null`. It is set when a preset is loaded (create page or lobby), when a preset is saved in the lobby, and when the host answers "No, start the game". On "Start game" the lobby builds the current setup from the game view and asks only if it equals neither `reference` nor `last`, and storage is available. After a successful `game:start` the current setup becomes `last`.

**Rationale**: Implements spec FR-022 to FR-027 with two comparisons. It is not persisted, so a reload may cause one extra question, which the spec accepts.

**Alternatives considered**: Comparing with every preset (needs the list and costs more for no real gain); persisting the reference (more state for a rare case).

## Decision 7: Equality ignores names and order of keys

**Decision**: `setupsEqual` compares seat count, rules field by field (including all card counts), speed, and computers as a list sorted by seat with `difficulty` and `risk`. Computer names and which humans sit where are not part of a setup.

**Rationale**: Spec Key Entities and assumptions exclude names; without this a rerolled computer name would trigger the question.

**Alternatives considered**: `JSON.stringify` comparison (fragile on key order and on extra fields).

## Decision 8: Dialogs and bar are shared components

**Decision**: `preset-bar` (two buttons, optional extra slot) owns `preset-list-dialog` and `preset-save-dialog`; create page and lobby pass a `mode` (`create` or `lobby`) and a function that returns the current setup. The start question is a small dialog in the lobby that reuses the save dialog. Dialogs use PrimeNG Dialog like `settings-dialog.ts`.

**Rationale**: One implementation for both pages (the spec requires one shared list and the same behaviour). Keeps each file small and testable.

**Alternatives considered**: Duplicating the dialogs per page; a PrimeNG overlay popover for the list (poor on phones; the mockup uses dialogs).

## Decision 9: Nickname needs no work

**Decision**: The session storage already keeps the nickname and the nickname page prefills it (`storedNickname`). The feature adds a unit test and no code.

**Rationale**: FR-001 is already met; implementing it again would duplicate storage.

**Alternatives considered**: A separate nickname key (two sources of truth).
