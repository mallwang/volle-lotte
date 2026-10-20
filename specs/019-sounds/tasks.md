---
description: 'Task list for sounds'
---

# Tasks: Sounds

**Input**: Design documents from `/specs/019-sounds/`

**Prerequisites**: plan.md, spec.md, design.md, research.md, data-model.md, contracts/sounds.md

**Tests**: Test work is included: the constitution requires tests for new logic in the same change.

**Organization**: Tasks are grouped by user story. Each story is independently testable; US1 together with US2 is the MVP (a sound must ship with its off switch).

## Phase 1: Setup

**Purpose**: The placeholder files every cue needs (research R9).

- [x] T001 Copy `apps/frontend/public/sounds/victory.mp3` byte for byte to `apps/frontend/public/sounds/game-start.mp3`, `your-turn.mp3`, `countdown.mp3` and `volle-lotte.mp3` (same folder); no other asset changes

---

## Phase 2: Foundational

**Purpose**: The `Sounds` service that every story plays through (research R1, R2, R7; contract [sounds.md](contracts/sounds.md)).

**⚠️ CRITICAL**: Complete this phase before the user stories.

- [x] T002 Create `apps/frontend/src/app/core/sounds.ts`: `export type SoundCue = 'victory' | 'game-start' | 'your-turn' | 'countdown' | 'volle-lotte'`; a constant map cue -> path `sounds/<cue>.mp3` (relative like the current `VICTORY_SOUND` in `celebration.ts`); root service `Sounds` with `muted` signal read once from `localStorage['vl-muted'] === 'true'` (default `false`, read in try/catch like `core/dice-prefs.ts`), `toggle()` (flip, write `'true'`/`'false'` to `vl-muted` in try/catch with the comment style of `DicePrefs`, on muting call `stop` for every cue), `preload()` (create every element once: `new Audio(path)`, `preload = 'auto'`, `load()`; safe to call repeatedly), `play(cue)` (return at once while muted; otherwise get or create the element, `currentTime = 0`, `play().catch(() => undefined)`), `stop(cue)` (if the element exists: `pause()`, `currentTime = 0`)
- [x] T003 [P] Add `apps/frontend/src/app/core/sounds.spec.ts` with a fake `Audio` like `core/celebration.spec.ts`: not muted by default; a stored `'true'` starts muted; `toggle()` writes storage and pauses and rewinds playing cues; a throwing `localStorage` still toggles in memory; `play` while muted creates or plays nothing; a rejected `play()` is swallowed; playing the same cue twice rewinds and reuses one element; each cue uses its own path `sounds/<cue>.mp3`; `preload()` twice creates each element once

**Checkpoint**: Any code can play a cue, and mute applies to all of them.

---

## Phase 3: User Story 1 - Hear when it is my turn (Priority: P1) 🎯 MVP

**Goal**: The "your turn" sound plays once when the turn passes to the player's seat, after the previous turn's roll and notice.

**Independent Test**: One human and one computer: every time the computer's turn ends, the sound plays once on the human's device; never at the start, after a reload or between other players.

- [x] T004 [US1] In `apps/frontend/src/app/table/table.ts`: inject `Sounds`, call `sounds.preload()` in the constructor next to `celebration.preload()`; add an effect on `mine()` that keeps the previous value in a local variable initialised to `undefined` and calls `untracked(() => this.sounds.play('your-turn'))` only on a change from `false` to `true` (the first value is the baseline, research R3)
- [x] T005 [US1] Extend `apps/frontend/src/app/table/table.spec.ts` (provide a `Sounds` spy): the sound plays when the turn passes to me after the other player's notice is over, not on the first value when the table opens on my turn (start and reload), not for a turn change between two other seats, not for a spectator and not for a replaced seat (`you.seat < 0`)

**Checkpoint**: The most useful cue works.

---

## Phase 4: User Story 2 - Turn the sounds off (Priority: P1) 🎯 MVP

**Goal**: One menubar button mutes every sound, including the victory sound; the choice survives a reload.

**Independent Test**: Press the speaker in the menubar, win a game: no sound; reload: still muted; press again: sounds play.

- [x] T006 [P] [US2] Add the texts in `apps/frontend/src/app/i18n/en.ts` and `apps/frontend/src/app/i18n/de.ts` next to the `theme.*` keys: `sound.on` "Sounds: on" / "Töne: an", `sound.off` "Sounds: off" / "Töne: aus", `sound.mute` "Mute sounds" / "Töne stummschalten", `sound.unmute` "Turn sounds on" / "Töne einschalten"
- [x] T007 [US2] Add the button in `apps/frontend/src/app/app.html` between the `p-select` language control and the theme `p-button`: `p-button` with `[rounded]="true"`, `[text]="true"`, `severity="secondary"`, icon `pi pi-volume-off` while `sounds.muted()` else `pi pi-volume-up`, `(onClick)="sounds.toggle()"`, `[ariaLabel]="soundLabel()"`, `[pTooltip]="soundAction()"` and `[attr.aria-pressed]` bound to `sounds.muted()` (check that PrimeNG forwards it to the native button; otherwise use the `pt` pass-through for the root element); in `apps/frontend/src/app/app.ts` inject `Sounds` as `protected readonly sounds` and add `soundAction` (`sound.unmute` while muted, else `sound.mute`) and `soundLabel` (`sound.off` or `sound.on` + `'. '` + action) computed like `themeAction`/`themeLabel`
- [x] T008 [US2] Route the victory sound through `Sounds` in `apps/frontend/src/app/core/celebration.ts`: remove `VICTORY_SOUND`, the `sound` field and `audio()`; `preload()` calls `sounds.preload()` (keep the lazy `party-js` import), `start()` calls `sounds.play('victory')`, `stop()` calls `sounds.stop('victory')`; update the class comment
- [x] T009 [P] [US2] Adjust `apps/frontend/src/app/core/celebration.spec.ts`: the audio assertions now go through `Sounds` (fake `Audio` still stubbed globally, or a `Sounds` spy); add: while muted, `start()` plays no sound but still bursts confetti; confetti and reduced-motion tests unchanged
- [x] T010 [US2] Extend `apps/frontend/src/app/app.spec.ts`: the sound button exists next to the theme button, shows `pi-volume-up` and the label "Sounds: on. Mute sounds" by default, a click mutes (`pi-volume-off`, `aria-pressed="true"`, "Sounds: off. Turn sounds on"), a second click unmutes; German labels after switching the language

**Checkpoint**: MVP complete: a useful cue with an off switch that covers every sound.

---

## Phase 5: User Story 3 - Countdown beeps at the end of my timer (Priority: P2)

**Goal**: One beep per second during the last 5 seconds of the player's own turn timer, stopping as soon as the timer changes.

**Independent Test**: Game with a turn timer, do nothing on your turn: 5 beeps, then the automatic move; act after 3 beeps: they stop.

- [x] T011 [US3] Add `export function countdownDelays(at: number, now: number): number[]` to `apps/frontend/src/app/core/sounds.ts`: for `s` from 5 down to 1, `at - s * 1000 - now`, keeping only values `>= 0`, ascending (contract examples: `(30_000, 0)` gives `20_000 ... 29_000`, `(7_500, 0)` gives `500 ... 6_500`, `(0, 1)` gives `[]`)
- [x] T012 [P] [US3] Add `countdownDelays` cases to `apps/frontend/src/app/core/sounds.spec.ts`: the three contract examples, a deadline exactly 5 s ahead (5 values, the first `0`), and a deadline in the past (`[]`)
- [x] T013 [US3] In `apps/frontend/src/app/table/table.ts` add an effect that reads `mine()` and `deadlineAt()`; when both are set, schedule one `setTimeout` per value of `countdownDelays(at, Date.now())` that calls `this.sounds.play('countdown')`; use `onCleanup` to clear all of them, so a new deadline, the end of my turn, a pause (deadline `null`, spec 018) or the table's destruction cancels the remaining beeps
- [x] T014 [US3] Extend `apps/frontend/src/app/table/table.spec.ts` with fake timers: a full 30 s timer on my turn gives 5 `countdown` plays in the last 5 s; acting (a new `turnDeadline.at`) after 3 beeps cancels the rest and arms the new timer's own countdown; deadline cleared (pause) plays nothing more; another player's deadline plays nothing; a game without `turnDeadline` plays nothing; destroying the table cancels pending beeps

**Checkpoint**: Players hear their timer running out.

---

## Phase 6: User Story 4 - Game start and Volle Lotte sounds (Priority: P3)

**Goal**: Start sound for every seated human at the start (and rematch); applause for the player's own Volle Lotte after the roll.

**Independent Test**: Two humans start a game: both hear the start sound once; reload: none; throw a Volle Lotte: applause only on the thrower's device after the dice stop.

- [x] T015 [US4] In `apps/frontend/src/app/game/game.ts` inject `Sounds` and add an effect that keeps the previously seen `socket.game()?.phase` in a local variable and calls `untracked(() => sounds.play('game-start'))` when it changes from `'lobby'` to `'running'` (research R5); the first phase seen is only a baseline
- [x] T016 [P] [US4] Create `apps/frontend/src/app/game/game.spec.ts` (use `stubSocket` and `gameView` from `core/testing.ts`, a `Sounds` spy; stub the child components if needed): `lobby` then `running` plays `game-start` once; a first state of `running` plays nothing; `finished` -> `lobby` -> `running` (rematch) plays it again; `running` -> `finished` plays nothing
- [x] T017 [US4] In `Table.process()` in `apps/frontend/src/app/table/table.ts`, call `this.sounds.play('volle-lotte')` when `data?.type === 'volleLotte'` and `e.seat === g.you.seat` (research R6), before the existing announce logic so the toast is unchanged
- [x] T018 [US4] Extend `apps/frontend/src/app/table/table.spec.ts`: my own Volle Lotte plays `volle-lotte` once after the roll animation (not while `roll.rolling()`), immediately with the dice animation skipped, not for another seat's Volle Lotte and not for entries that were already in the log when the table opened

**Checkpoint**: All five cues play.

---

## Phase 7: User Story 5 - Replaceable sound files, texts and documentation (Priority: P3)

**Goal**: One file per cue, user guide in both languages, roadmap.

**Independent Test**: Replace one file with another mp3 of the same name: only that cue changes; read the user guide section in both languages.

- [x] T019 [P] [US5] Update `docs/user-guide.md` and `docs/user-guide.de.md` (German without gender-inclusive forms, see `CLAUDE.md`): a short "Sounds" section listing the five sounds and when they play, the speaker button in the menubar (remembered on this device), and that browsers may stay silent until the first click on the page; adjust the existing victory sound sentence to mention the mute button
- [x] T020 [P] [US5] Add a short note to `apps/frontend/public/sounds/README.md` (new): one line per cue with its file name and trigger, that each file can be replaced by another mp3 of the same name without a code change, the 100 KB limit for new files, and that the four new files are placeholders (copies of `victory.mp3`)
- [x] T021 [US5] Run quickstart scenario 10 (`specs/019-sounds/quickstart.md`): copy another short mp3 over `apps/frontend/public/sounds/your-turn.mp3`, confirm only that cue changes, then restore the placeholder with `git checkout -- apps/frontend/public/sounds/your-turn.mp3`

**Checkpoint**: The real files can be dropped in later.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T022 Run `npx nx run-many -t lint typecheck test build -p frontend` and fix failures; run the coverage guard from `.specify/memory/test-coverage-guide.md` for `core/sounds.ts`
- [x] T023 Run the manual scenarios 1-9 from `specs/019-sounds/quickstart.md` with the `verify-ui` skill where possible (sound itself is checked by spying on `HTMLMediaElement.prototype.play`); check the sound button's focus ring, tooltip and contrast in light and dark theme at desktop and the 695x630 minimum; remove temporary scripts
- [x] T024 Update `docs/roadmap.md`: move R11 to Done as spec 019 with a one-line result (five cues, menubar mute, placeholder files until the real ones arrive), remove R11 from Next, update the R23 note if it names sound types, and bump "Last updated"

---

---

## Phase 9: User Story 6 - Points sound (Priority: P3)

**Goal**: A sound for the player's own credited points, silent for the winning bank (FR-018, research R6a).

**Independent Test**: Bank on your turn: one sound with the result notice; winning bank: only victory.

- [x] T025 [US6] Copy `apps/frontend/public/sounds/victory.mp3` byte for byte to `apps/frontend/public/sounds/points.mp3`; add `'points'` to `SoundCue` in `apps/frontend/src/app/core/sounds.ts` and its path to the cue map (check `core/sounds.spec.ts` for hard-coded cue lists)
- [x] T026 [US6] In `Table.process()` in `apps/frontend/src/app/table/table.ts` play `points` for a `banked` turn entry with `e.seat === g.you.seat` and no `g.game?.result`, next to `cheerOwnVolleLotte` (rename the helper to cover both cues if it reads better)
- [x] T027 [US6] Extend `apps/frontend/src/app/table/table.spec.ts`: own bank plays `points` once after the roll animation (not while `roll.rolling()`), at once with skipped dice animation; not for another seat, a bust, a timeout or old log entries; not for the game-ending bank; Volle Lotte plus bank plays both cues
- [x] T028 [P] [US6] Docs already updated with the spec (`user-guide.md`, `user-guide.de.md`, `sounds/README.md`, `roadmap.md`); re-read them once against the final behaviour
- [x] T029 [US6] Run `npx nx run-many -t lint typecheck test build -p frontend` and quickstart scenarios 6 (points) and 7 (game over) with the `verify-ui` skill

---

## Phase 10: User Story 7 - Defeat sound (Priority: P3)

**Goal**: A sound with the game-over window for players who did not win (FR-019, research R6b).

- [x] T030 [US7] Copy `victory.mp3` to `apps/frontend/public/sounds/defeat.mp3`; add `'defeat'` to `SoundCue` and the cue list in `core/sounds.ts` (and the cue counts in `sounds.spec.ts` and `celebration.spec.ts`)
- [x] T031 [US7] In `table/table.ts` add the `lost` computed and the effect that plays/stops `defeat`; stop it on destroy
- [x] T032 [US7] Extend `table/table-game-over.spec.ts` (provide a `Sounds` spy): defeat once for a loser and not again after a later log entry; none for the winner, spectator and taken-over seat
- [x] T033 [P] [US7] Docs: user guides, `sounds/README.md`, roadmap
- [x] T034 [US7] Run lint, typecheck, test, build and quickstart scenario 7 with `verify-ui`

---

## Dependencies & Execution Order

- Phase 1 (T001) and Phase 2 (T002, then T003) first.
- US1 (T004 -> T005) and US2 (T006 -> T007 -> T010; T008 -> T009) need Phase 2; they are independent of each other.
- US3 needs Phase 2 and the `Sounds` injection in the table from T004 (T011 -> T012; T011 -> T013 -> T014).
- US4 needs Phase 2; T017 needs the injection from T004; T015 -> T016, T017 -> T018.
- US5 can start after T001 (T019, T020); T021 needs US1.
- Polish last; T024 only when the feature ships.

### Parallel Opportunities

- T003 next to T004 once T002 exists.
- T006 and T008 next to each other (different files); T009 next to T010.
- T012 next to T013; T016 next to T017.
- T019 and T020 together, any time after T001.

## Implementation Strategy

- **MVP**: Phases 1-4 (service, "your turn", mute button, victory sound behind mute).
- Then US3 (countdown), US4 (start and Volle Lotte), US5 (docs and replaceable files), polish.
- The real sound files were delivered by the user and copied to `apps/frontend/public/sounds/`; the UI scenarios (T021, T023, T029, T034) were checked manually by the user, the automated checks (lint, typecheck, test, build) ran green locally and in CI.
- Commit per phase through the Spec Kit hooks; run the affected tests before each commit.
