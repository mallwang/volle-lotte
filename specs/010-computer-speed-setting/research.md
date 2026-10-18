# Research: Computer Player Speed Setting

## R1. What "speed" scales

**Decision**: The waits between a computer's actions, in four parts, each a column of one table: (a) pause before an action and before applying a pick, (b) margin after a throw (added to the unchanged client roll maximum), (c) pick highlight time (same as (a) today: 2 s), (d) turn-result notice (today 6 s, client and server).
**Rationale**: These are the waits the owner described (long until the computer throws, long until it takes dice). The dice roll animation stays under the existing "fast computer dice" switch (FR-007, FR-008).
**Alternatives**: One multiplier on all constants (rejected: the roll maximum is a client animation and must stay; a multiplier would make high steps unreadable at the notice); per-action sliders (rejected, too many knobs).

## R2. Timing table (ms)

Today's code is step 2 (owner rates today at "2 of 5, higher is faster"). Roll maximum stays 3000 (1500 with fast dice).

| Step        | Pause / highlight | After-throw margin | Turn notice |
| ----------- | ----------------- | ------------------ | ----------- |
| 1           | 3000              | 4500               | 8000        |
| 2 (today)   | 2000              | 3250               | 6000        |
| 3 (default) | 1200              | 1500               | 3500        |
| 4           | 700               | 800                | 2500        |
| 5           | 400               | 400                | 1500        |

Model (draw, throw, select, throw, select, bank after a notice, normal dice): step 2 about 30 s, step 3 about 20 s (35% shorter), step 5 about 11 s, step 1 about 41 s (step 5 is 26% of step 1). Meets SC-001 (25%) and SC-002 (one third). A unit test computes this model from the table so later edits cannot break the targets. Values may be tuned after a play test; only the table changes.

## R3. Who is held back by the notice

**Decision**: The notice length scales for every turn result, not only computer turns, because the next player (human or computer) waits for it on the server and the client shows it as one rule (FR-007 "how long a turn result is shown").
**Rationale**: One rule, no per-seat lookups on the client. At the default step humans read results in 3.5 s instead of 6 s.
**Alternatives**: Scale only after computer turns (rejected: needs seat state at notice time on both sides, edge cases on replacement).

## R4. Human turn limits (FR-013)

**Decision**: `turnDelay` keeps the fixed dice margin (`ROLL_MAX_MS + AFTER_ROLL_MS` after a throw) and uses the same scaled notice as the client. The limit still starts only after the notice and the human's own dice have finished.
**Rationale**: The notice the client shows is the same table value, so the human's limit never starts early.

## R5. Change while a computer step is waiting

**Decision**: Reschedule. `GameRoom` keeps the start time and a function from pacing to delay for the pending computer timer; on a speed change it clears the timer and re-arms with `max(0, newDelay - elapsed)`. A pick highlight in progress is re-armed the same way. Human turn timers are not touched.
**Rationale**: Moving the slider from 1 to 5 should take effect at once, not after an 8 s wait. A step is never skipped or run twice (timer cleared first, `stillMine()` guard stays).
**Alternatives**: Let the pending step finish (rejected: feels broken after a big change).

## R6. Transport of the setting and the toast

**Decision**: Extend `game:settings` to a partial payload `{ fastComputerDice?, computerSpeed? }` and add `computerSpeed` to `GameView`. After a successful change the gateway pushes `game:settingsChanged { by, changes[] }` to every human in the room. `SocketService` turns it into a toast, so it works in the lobby and at the table. Protocol version 4 -> 5.
**Rationale**: A push (not a log entry) is not replayed to players who join or rejoin later (FR-012), is not held back by the dice-roll gating of log toasts, and works in the lobby where the log is not processed. The state itself arrives through the normal `game:state` push.
**Alternatives**: Log entry (rejected: replay on rejoin, roll gating, lobby has no log handling); client diffing `GameView` (rejected: shows nothing to the host's own tab, fires on join/rejoin).

## R7. One toast per settled change (FR-011)

**Decision**: The client slider debounces its model changes (300 ms) before sending; the server ignores a request that changes nothing and emits one push per accepted change.
**Rationale**: Pointer drags and arrow-key bursts give one intent and one toast. The server stays simple.

## R8. UI building blocks

**Decision**: One standalone `HostSettings` component (PrimeNG `p-slider` with five steps, `p-toggleswitch`, host/guest mode, current step name, scale labels) used in the lobby panel and the table settings dialog. The local "skip dice animation" switch stays in the dialog.
**Rationale**: Mockup shows identical controls in both places; one component, one test suite. Check the `p-slider` ARIA and keyboard behaviour with the PrimeNG MCP and axe tests during implementation.

## R9. Toast texts

**Decision**: "{who} set the computer speed to {step} ({name})." and "{who} turned fast computer dice on/off." in EN and DE; severity info, life 4000 ms, like the join/leave toasts. Step names: Very slow, Slow, Medium, Fast, Very fast.
