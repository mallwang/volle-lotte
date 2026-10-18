# Research: Computer Player AI Rework

## R1. Where do the computer decisions run?

**Decision**: On the server, in the game room, as today. The pure decision code lives in `libs/game-rules`.

**Rationale**:

- The concern behind the question was backend CPU and websocket traffic with many parallel games. Both are small: a computer move already produces one state push to every client, so computing on the server adds no traffic; computing on a client would _add_ one client-to-server message per computer action. CPU: exact odds are a one-time ~4 ms, a value table 2-14 ms, then each decision is a lookup over at most 63 subsets (sub-millisecond). A prototype measured this (odds 4.0 ms, first table 14.2 ms, further tables ~2.5 ms each).
- Constitution Principle II allows the frontend engine use only for display hints, never for decisions; Principle I makes the server the only authority. A client-side computer would need a constitution amendment, a rule for which client computes (host? next human?), a fallback when that client leaves or loses connection, and a way to keep the pacing/timer logic that lives in the room today in sync.
- The game must not stall when the host closes the tab. With server-side decisions nothing changes for reconnect, rejoin and timeouts.

**Alternatives considered**: host-browser computing, next-human computing, every client computing with first-wins. All rejected for the reasons above; they trade a negligible server cost for a more complex and less robust design.

## R2. Exact odds per number of free dice

**Decision**: Enumerate the outcomes of throwing n = 1..6 dice as multisets of face counts (462 for n = 6, 923 sets in total over n = 1..6) with their exact probability, and precompute for each outcome the legal picks (sub-multisets that score, with points and dice used). The data depends on the four-of-a-kind-doubling rule only (two variants). Bust probabilities fall out: n=1 0.667, 2 0.444, 3 0.278, 4 0.157, 5 0.077, 6 0.031.

**Rationale**: Small, exact, deterministic, and the same data answers "which dice" and "bust chance".

**Alternatives considered**: Monte Carlo simulation (slower, noisy), full 6^n enumeration (46,656 for n = 6, wasteful).

## R3. Value function for bank-or-throw and the choice of dice

**Decision**: Backward induction over (free dice n, run points bucketed in steps of 50 up to a cap) for a given carried amount, rule key (minimum points, doubling) and kappa:

`V(n, run) = max(bank(run) if allowed, throw(n, run))` where `throw` averages over the outcomes, taking for each outcome the best pick `points + V(n - dice, run + points)` and valuing a bust as `-kappa * (carried + run)`; a pick that uses all dice is valued as Volle Lotte on the current card (bank for Bonus; the next-card value for the draw decision).

The same table drives "which dice to set aside" (argmax of `points + continuation`) and "bank or throw". Carried points are bucketed (steps of 250 up to a cap, above the cap the computer banks when allowed), so the number of tables stays small.

**Rationale**: One mechanism answers all open questions of the request (three of a kind vs singles, several 1s with a 5, stopping with 400 vs 1000) and responds to the minimum-points rule. Prototype cost above.

**Alternatives considered**: thresholds per number of dice (cannot reflect points vs risk), a closed-form heuristic (does not cover the rule variants).

## R4. Value of drawing after a Volle Lotte on a Bonus card

**Decision**: `EV(draw) = sum over card types t of share(t) * outcome(t, C)`, with `share` taken from `rules.cardCounts` (never the real deck) and `C` the carried points:

| Card         | Outcome value                                                                                             |
| ------------ | --------------------------------------------------------------------------------------------------------- |
| Stop         | `-kappa * C` (carried points lost)                                                                        |
| Bonus        | `V(6, 0                                                                                                   | carried C)` from R3 (the run needs the minimum, bust loses all) |
| Star         | `C + E[star run]` (no loss)                                                                               |
| Double Lotte | `P(VL) * (C + 2 * run_VL) - (1 - P(VL)) * kappa * C` (min-check inside)                                   |
| Street       | `P(street) * 2000 - (1 - P(street)) * kappa * C`; `P(street)` by a small DP over the 64 subsets of {1..6} |
| Plus/Minus   | `P(VL) * 1000 - (1 - P(VL)) * kappa * C`                                                                  |
| Clover       | `P(2 VL) * win - (1 - P(2 VL)) * kappa * C`, win valued as the remaining distance to the target           |

`P(VL)`, `P(street)`, `E[star run]` come from the same odds tables under the "take all dice that score" policy those cards force.

**Decision rule**: advantage `A = EV(draw) - C`. Risk none: never draw. Risk medium: draw with probability `logistic(A / scale)` (50 % at `A = 0`). Risk high: same logistic with a positive shift and a smaller loss weight, so it draws almost always but a large negative `A` (very high `C`, many Stop and Plus/Minus cards) still pulls the probability down.

**Rationale**: matches the table in `docs/rules.md` card by card and uses only public information.

**Alternatives considered**: a fixed coin flip for medium (does not react to odds), "always draw" for high (the spec requires it to react to danger).

## R5. Risk, skill and score situation

**Decision**:

- `kappa` (loss weight for a bust/loss) per risk: none = large, medium = 0 (risk neutral), high = negative. Final value used = `kappa_risk + shift(situation)`.
- Score situation shift: deficit to the leading opponent (in units of the target score) lowers `kappa`, closeness of the own score to the target raises it. A bank that reaches or exceeds the target is always chosen first (before any evaluation).
- Skill: hard = argmax; medium = softmax over option values with a temperature, so mostly good choices and occasional worse ones; easy = the old simple heuristic (fewest dice / fixed bank threshold) with the all-dice rule for the special cards applied on top.
- All-dice rule: a filter before evaluation on Street, Double Lotte, Plus/Minus, Clover and Star, for every skill.
- Numeric constants (kappa values, scale, temperature, shift strength) are named constants in one file and are tuned with the tournaments (spec: only orderings are fixed).

**Rationale**: one knob for risk, one for skill, both orthogonal; `random` simply draws a concrete value per decision.

## R6. Cache bounds and cold start

**Decision**: A single module-level memo keyed by `(minimumPoints, doubling, carried bucket, kappa id)`, with a fixed maximum number of entries (LRU eviction), so a client choosing unusual `minimumPoints` cannot grow memory without bound. Odds tables are built lazily on first use and again only for the other doubling variant. The server warms the default rules once at start so the first real game does not pay the cold cost.

**Rationale**: `minimumPoints`, `targetScore` and card counts are client-chosen at game creation (`rulesError` only checks types), so keys must be bounded. The event loop is shared, so cold work stays in the low tens of milliseconds.

**Alternatives considered**: worker thread (overkill for these costs), per-room caches (more memory and more cold starts).

## R7. Deterministic `random`

**Decision**: `chooseAction(state, profile, rng)` resolves a `random` skill or risk with `rng(3)` at the start of every call (skill first, then risk), using the injected RNG; the backend passes its `crypto` based RNG, tests pass a seeded one.

**Rationale**: stateless per decision (spec decision), reproducible with a seed, removes `levelFor('random')` from the room.
