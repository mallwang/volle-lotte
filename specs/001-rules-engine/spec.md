# Feature Specification: Rules Engine

**Feature Branch**: `001-rules-engine`

**Created**: 2026-10-15

**Status**: Draft

**Input**: User description: "Feature 1: Rules engine for Volle Lotte. A pure, fully tested library implementing the complete game rules from docs/rules.md: scoring, bust check, one turn (select dice, throw, bank, lost), game state (2-8 players, target score, turn order), card deck and card effects (configurable card counts, reshuffle when empty, Star is the Fireworks card, deck stays at 56 cards). Server-authoritative: dice randomness is injected, no UI, no I/O. Port the Java tests 1:1 and extend them for the new rules. Game state must be serializable as JSON."

## Clarifications

### Session 2026-10-15

- Q: Is Star part of the 5 Fireworks cards or additional? → A: Star is not a separate card; it is the Fireworks card (same type). The default deck stays at 56 cards.
- Q: How does Street count? → A: Cumulatively across throws, one die per value 1-6 is set aside. A bust is a throw without any still-missing value; on a bust the player gets 0 points and the turn points collected before are lost too. Success gives 2,000 points.
- Q: What happens when a Stop card is drawn after a Volle Lotte? → A: The points collected so far in the turn are credited and the next player is up (after a Volle Lotte on a Bonus card the total is at least 6x50 + 200 = 500, so the minimum is always met).
- Q: What do Street, Plus/Minus and Double Lotte do on success? → A: A Volle Lotte can only be continued (new card) on a Bonus card; Fireworks ends the turn on a Volle Lotte. On Street, Plus/Minus and Double Lotte the turn ends directly after the successful attempt and the next player is up (for example a successful Street gives 2,000 points and ends the turn).
- Q: What happens on Plus/Minus with the collected turn points and the scores? → A: On Volle Lotte the player gets only +1,000; the collected turn points are discarded. Every leader (tied leaders all) loses 1,000, a leading player loses nothing, and no score drops below 0.
- Q: What happens after a Volle Lotte on a Bonus card? → A: The player may bank (the minimum is always met) or draw a new card. For a new Bonus card the player must again collect at least the minimum (350) in that run before banking; otherwise the whole turn is lost. If that succeeds and the player banks, all turn points are added. Street, Double Lotte and Clover as the next card count as their own type and the player must succeed, otherwise all turn points are lost. Stop credits the points so far. A Fireworks card needs no minimum (see next answer).
- Q: What does Fireworks do on a Volle Lotte? → A: The turn ends and no new card is drawn. The player throws until a bust and all points of the turn (including earlier Volle Lotte runs) are credited, with no minimum; a bust credits instead of losing them.
- Q: Clover points? → A: Points do not matter; reaching Volle Lotte twice in a row wins the game, a bust loses all turn points as usual and no win.
- Q: Target score reached and ranking? → A: The game ends immediately when a player reaches the target score; the other players are ranked by score (equal scores share a rank). No "finish the round" option.
- Q: What does Double Lotte double? → A: Only the points collected since the Double Lotte card was drawn (the current 6-dice run); earlier turn points count once. The doubled value must reach the minimum (350, always true in practice), then the turn ends and the next player is up.

## User Scenarios & Testing _(mandatory)_

The "users" of the rules engine are the game server (which asks it to validate and apply player intents), the later computer players and simulations (which ask it for legal moves and outcomes), and the maintainers who rely on it as the single, tested source of truth for the rules in [docs/rules.md](../../docs/rules.md).

### User Story 1 - Score a throw (Priority: P1)

Given a set of dice, the engine tells which dice score, how many points each selection is worth, and whether the throw is a bust (no scoring die). This is the foundation of every other rule.

**Why this priority**: Every turn, card effect and computer strategy depends on correct scoring; it is also the part of the Java reference that is complete and testable first.

**Independent Test**: Feed fixed dice sets and selections into the scoring and bust check and compare with the expected points; port of the Java scoring tests passes unchanged.

**Acceptance Scenarios**:

1. **Given** dice 1, 5, 2, 3, 4, 6, **When** the player selects the 1 and the 5, **Then** the selection is worth 150 points.
2. **Given** dice 3, 3, 3, 2, 4, 6 from one throw, **When** the three 3s are selected, **Then** they are worth 300 points.
3. **Given** dice 1, 1, 1, 2, 3, 4, **When** the three 1s are selected, **Then** they are worth 1,000 points.
4. **Given** four-of-a-kind doubling is on, **When** four equal dice are selected, **Then** the three-of-a-kind value is doubled for each further equal die; **When** it is off, **Then** only three of a kind scores.
5. **Given** dice 2, 3, 4, 6, 2, 3, **When** the throw is checked, **Then** it is a bust.
6. **Given** a selection that contains a non-scoring die (for example a lone 2), **When** it is submitted, **Then** it is rejected.

---

### User Story 2 - Play one turn (Priority: P1)

A player throws, sets aside scoring dice, and either banks the points or throws the remaining dice again. A bust loses the turn's points. If all six dice score (Volle Lotte) the player may continue with six fresh dice.

**Why this priority**: The turn is the core game loop and the most error-prone part (selection rules, bank, bust, Volle Lotte, minimum points).

**Independent Test**: Drive a turn with a scripted dice source through throw, select, bank/bust, and check the resulting turn state and score.

**Acceptance Scenarios**:

1. **Given** a thrown set of dice, **When** the player selects at least one scoring die and banks, **Then** the points are added to the player's score and the turn ends.
2. **Given** a thrown set of dice, **When** the player selects no scoring die, **Then** the selection is rejected.
3. **Given** a thrown set of dice, **When** the player selects scoring dice and throws the rest, **Then** only the remaining dice are rolled and the points so far stay in the turn.
4. **Given** a turn with collected points, **When** a throw is a bust, **Then** the turn ends and the turn's points are lost.
5. **Given** the minimum points to bank is 350, **When** the player tries to bank with fewer points, **Then** banking is rejected; **When** the minimum is 0, **Then** any amount can be banked.
6. **Given** all six dice are selected as scoring (Volle Lotte), **When** the player continues, **Then** six fresh dice are thrown and the collected points stay in the turn.
7. **Given** an action that is not allowed in the current phase (for example banking before any throw), **When** it is submitted, **Then** it is rejected and the state is unchanged.

---

### User Story 3 - Cards and their effects (Priority: P1)

A turn starts by drawing a card. Each card type changes the turn: Bonus cards add points on Volle Lotte, Double Lotte doubles, Stop ends the turn, Fireworks protects against loss, Street is a collection challenge, Plus/Minus shifts scores on Volle Lotte, and Clover wins after two Volle Lottes in a row. The deck is shuffled, and reshuffled when empty.

**Why this priority**: Cards are what distinguishes Volle Lotte from a plain dice game and are part of the complete rules.

**Independent Test**: For each card type, play a scripted turn with a fixed card and dice and verify the effect on turn points and scores; verify deck composition and reshuffle separately.

**Acceptance Scenarios**:

1. **Given** a Bonus card of N points, **When** the player reaches Volle Lotte, **Then** N points are added to the turn.
2. **Given** a Double Lotte card, **When** the player reaches Volle Lotte, **Then** the points collected since this card are doubled (earlier turn points count once), credited (the doubled value must reach the minimum), and the turn ends with the next player up.
3. **Given** a Stop card is drawn, **When** the turn starts, **Then** the turn ends immediately and the next player is up.
4. **Given** a Fireworks card, **When** the player busts, **Then** the points are credited instead of lost; **When** the player must select, **Then** all scoring dice and combinations must be set aside; **When** Volle Lotte is reached, **Then** no new card is drawn, all points of the turn are credited without a minimum, and the turn ends with the next player up.
5. **Given** a Street card, **When** the player sets aside one die per value 1 to 6 (cumulatively across throws), **Then** the player receives 2,000 points; **When** a throw shows no still-missing value, **Then** it is a bust and the player gets 0 points, including the turn points collected before; **When** Street succeeds, **Then** the turn ends with the next player up.
6. **Given** a Plus/Minus card, **When** the player reaches Volle Lotte, **Then** the player gains only 1,000 (the collected turn points are discarded) and every leader loses 1,000 (a leading player loses nothing, no score drops below 0), and the turn ends with the next player up.
7. **Given** a Clover card, **When** the player reaches Volle Lotte twice in a row, **Then** the player wins the game immediately.
8. **Given** a Volle Lotte on a Bonus card, **When** the player continues, **Then** a new card is drawn; **When** that card is Stop, **Then** the points so far are credited and the next player is up; **When** that card is a Bonus card, **Then** the player must collect at least 350 in that run before banking (all turn points are then added), otherwise the whole turn is lost; **When** that card is Street, Double Lotte or Clover, **Then** the player must succeed at it, otherwise all turn points are lost.
9. **Given** the deck is empty at a draw, **When** a card is drawn, **Then** the deck is reshuffled with the full card set and drawing continues.
10. **Given** a configured count per card type, **When** the deck is created, **Then** it contains exactly those counts (default set: 56 cards).

---

### User Story 4 - Run a game (Priority: P2)

A game is created with 2 to 8 players, a target score and the configurable rules. The engine tracks scores and whose turn it is, advances the turn order after each turn, and ends the game when a player reaches the target score or wins with Clover.

**Why this priority**: Needed for a playable game, but depends on the turn and card rules above.

**Independent Test**: Create games with various player counts and rule options, play scripted turns, and verify turn order, scores, and the winner.

**Acceptance Scenarios**:

1. **Given** a game with 2 to 8 players, **When** it is created, **Then** it starts with all scores at 0 and the first player to move; **When** the player count is outside 2 to 8, **Then** creation is rejected.
2. **Given** a finished turn, **When** the next turn begins, **Then** the next player in order is up and wraps around after the last.
3. **Given** a player banks and reaches the target score, **When** the game state is evaluated, **Then** the game is over and that player is the winner.
4. **Given** a finished game, **When** any further action is submitted, **Then** it is rejected.
5. **Given** invalid rule options (for example a target score of 0 or a negative card count), **When** a game is created, **Then** creation is rejected with a clear reason.

---

### User Story 5 - Save and restore a game state (Priority: P2)

At any point the game state, including the deck order and the turn in progress, can be turned into plain data and restored losslessly, so a server can persist it after every turn and continue after a restart.

**Why this priority**: Required by the "games survive restarts" principle, but the engine is useful without it.

**Independent Test**: Serialize a state at several points (mid-turn, after a card draw, game over), restore it, then apply the same scripted actions to the original and the restored state and compare the results.

**Acceptance Scenarios**:

1. **Given** any valid game state, **When** it is converted to plain data and back, **Then** the restored state is identical and behaves identically for all further actions.
2. **Given** plain data that is malformed or inconsistent, **When** it is restored, **Then** it is rejected rather than producing an invalid state.

---

### Edge Cases

- A throw of all six dice that is a bust (no scoring die) at the start of a turn or after a Volle Lotte.
- Several scoring combinations in one throw (for example three 2s plus a 1 and a 5) and the player selecting only part of them.
- Six of a kind and five of a kind with doubling on and off.
- The turn points reaching or exceeding the target score mid-turn (the points count only on banking).
- Banking directly after a Volle Lotte on a Bonus card (always at least 500) versus drawing a Bonus card and busting or staying below the minimum in that run.
- Two players tied at the top for Plus/Minus (both lose) and the drawing player being the leader (loses nothing).
- A score that would drop below zero through Plus/Minus.
- The deck running empty in the middle of a game, repeatedly.
- A player count of exactly 2 and exactly 8.
- Actions submitted by a player who is not on turn, in the wrong phase, or after the game ended.
- Restoring a state saved mid-turn, including a pending card effect.

## Requirements _(mandatory)_

### Functional Requirements

**Scoring**

- **FR-001**: The engine MUST score a single 1 as 100 and a single 5 as 50; other single dice score 0.
- **FR-002**: The engine MUST score three of a kind within one throw as 1,000 for 1s and face value × 100 for 2s to 6s; combinations across throws MUST NOT be formed.
- **FR-003**: When "four or more of a kind doubles" is on, each further equal die beyond three MUST double the three-of-a-kind value; when off, only three of a kind MUST score.
- **FR-004**: The engine MUST detect a bust (a throw with no scoring die) and MUST tell which subset of a throw is a valid selection (every selected die belongs to a scoring combination).

**Turn**

- **FR-005**: The engine MUST require at least one scoring die to be set aside after every throw before the player can bank or throw again.
- **FR-006**: The engine MUST let the player bank the turn's points (adding them to the score and ending the turn) or throw the remaining dice again.
- **FR-007**: On a bust the engine MUST end the turn and discard the turn's points, except where a card rule says otherwise (Fireworks).
- **FR-008**: The engine MUST detect Volle Lotte (all six dice score); on a Bonus card the player may bank or draw a new card, keeping the points collected so far in the turn and getting six fresh dice.
- **FR-009**: The engine MUST reject banking when the points collected since the current card was drawn are below the configured minimum (default 350; 0 disables it), except after a Volle Lotte, on Stop and on Fireworks.
- **FR-010**: The engine MUST reject any action that is invalid in the current phase, for the wrong player, or after the game ended, and MUST leave the state unchanged in that case.

**Cards**

- **FR-011**: Each turn MUST start by drawing a card from the deck; an empty deck MUST be reshuffled from the full configured card set.
- **FR-012**: The engine MUST implement the card effects Bonus 200/300/400/500/600, Double Lotte, Stop, Fireworks, Street, Plus/Minus and Clover as described in [docs/rules.md](../../docs/rules.md).
- **FR-013**: The number of cards per type MUST be configurable at game creation; the default set is the 56-card set from rules.md.
- **FR-014**: Star is not a separate card type; the Fireworks card is the only card with this effect, and the default set stays at 56 cards (5 Fireworks).
- **FR-015**: On a Street card the engine MUST count dice cumulatively across throws (one die per value 1 to 6); a throw without any still-missing value is a bust (0 points, earlier turn points lost); completing all six values awards 2,000 points.
- **FR-016**: When a Stop card is drawn after a Volle Lotte, the engine MUST credit the points collected so far and end the turn.
- **FR-016a**: On Street, Plus/Minus and Double Lotte the turn MUST end directly after the successful attempt; no new card is drawn and the next player is up.
- **FR-016b**: On a Volle Lotte with a Double Lotte card the engine MUST double only the points collected since that card was drawn.
- **FR-016c**: On a Volle Lotte with a Plus/Minus card the engine MUST add 1,000 to the player and discard the turn points, and subtract 1,000 from each leader (never below 0), unless the player leads.
- **FR-016d**: After a Volle Lotte on a Bonus card the engine MUST let the player bank or draw a new card; if the new card is a Bonus card, banking requires at least the minimum in that run, otherwise (bust or abandoned) the whole turn is lost.
- **FR-016e**: If the card drawn after a Volle Lotte is Street, Double Lotte or Clover, the engine MUST apply that card's rules and discard all turn points on failure.
- **FR-016f**: On Fireworks the engine MUST end the turn on a Volle Lotte (no new card) and credit all turn points with no minimum, also on a bust.

**Game**

- **FR-017**: A game MUST be created with 2 to 8 players, a target score (default 6,000, any positive value allowed) and the configurable rules; invalid options MUST be rejected.
- **FR-018**: The engine MUST track each player's score and the player on turn, advance the turn order after every finished turn, and wrap around after the last player.
- **FR-019**: The game MUST end immediately when a player's score reaches the target score or a player wins via Clover; remaining players are ranked by score (equal scores share a rank).
- **FR-020**: Scores MUST NOT become negative through Plus/Minus.

**Randomness and purity**

- **FR-021**: All randomness (dice and deck shuffling) MUST come from a random source supplied by the caller, so that identical inputs and an identical random sequence always produce identical results.
- **FR-022**: The engine MUST have no user interface, no I/O, no clock access and no dependency on the server or client frameworks.
- **FR-023**: Every state-changing operation MUST leave the previous state untouched and return a new state (or a rejection with a reason), so callers can safely keep history.

**Persistence**

- **FR-024**: The full game state (scores, turn order, turn in progress, deck and discard order, rules) MUST be convertible to plain data and restored without loss; malformed or inconsistent data MUST be rejected on restore.

**Tests**

- **FR-025**: The scoring, turn and game tests of the Java reference MUST be ported one-to-one and pass; each additional rule and card effect MUST have its own tests.

### Key Entities

- **Rules / Game Options**: target score, minimum points to bank, four-of-a-kind doubling on/off, number of cards per type, and the number of players.
- **Dice Selection**: a subset of the thrown dice the player sets aside, with its point value.
- **Turn**: the player on turn, the current card, the dice still available, the dice set aside, the points collected, the phase (before throw, selecting, deciding), and Volle Lotte count in a row.
- **Card / Deck**: card types and counts, the draw order, and the reshuffle behaviour.
- **Player**: identity within the game, score, and seat order.
- **Game State**: all players, rules, deck, current turn, and result (running or finished with a winner).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: All ported Java scoring, turn and game tests pass without changes to their expectations, except where docs/rules.md deliberately differs (each such difference is documented).
- **SC-002**: Every rule and card effect listed in docs/rules.md has at least one test that fails when the rule is broken.
- **SC-003**: Line coverage of the rules library is at least 95% and never below the project-wide 80% target.
- **SC-004**: Playing a complete game with 2 to 8 players from a seeded random sequence produces the same final scores and winner on every run.
- **SC-005**: A game state saved and restored at any point, followed by the same actions, produces exactly the same results as the unsaved game, in 100% of randomized test runs.
- **SC-006**: 10,000 simulated complete games with random legal actions finish without any invalid state, crash or rejection of a legal action.

## Assumptions

- The rules in [docs/rules.md](../../docs/rules.md) take precedence over the Java reference; where they differ, the difference is documented in the tests.
- The engine only validates and applies rules; authentication, who a connection belongs to, timing limits for throwing, and the 20 s dice timer belong to later features (lobby, dice UI).
- Computer-player strategies are out of scope; the engine only has to make legal moves and their outcomes queryable for them later.
- Dice animation, card images and anything visual are out of scope.
- Game ends immediately when the target score is reached; there is no "finish the round" option.
- Setting up the Nx workspace and the library project itself is part of this feature's plan, not of the spec.
