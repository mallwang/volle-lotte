# Feature Specification: Computer Player AI Rework

**Feature Branch**: `011-computer-ai-rework`

**Created**: 2026-10-18

**Status**: Draft

**Input**: User description: "Computer player AI rework (roadmap R7). Computer players decide by expected value instead of fixed thresholds. Skill levels per computer seat: easy, medium, hard, random; plus an independent risk setting: none, medium, high, random. Random is resolved fresh for every single decision. The draw decision after a Volle Lotte weighs the chance of further gain against the points that would be lost, using the configured card counts. Special cards always take all possible dice. The score situation shifts the risk. Needs a risk selection per computer seat (English and German UI, docs). Quality is checked by seeded bot tournaments and invariant tests."

## Scope

In scope: how computer players decide (which dice to set aside, whether to bank or throw again, whether to draw another card after a Volle Lotte on a Bonus card), a new risk setting next to the existing skill level for every computer seat, the "random" variants of both, English and German UI text and documentation for the new setting.

Out of scope: changing the game rules, the speed or pacing of computer players (feature 010), per-turn memory of a computer (every decision stands alone), changing the risk or skill of a seat during a running game (as today, seats are configured in the lobby), computers that read the real card order or the dice before they are thrown.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Computer opponents that play sensibly (Priority: P1)

A human player plays against computers. A strong computer sets aside the dice a good human would, stops when further throwing is not worth the risk and does not make moves that look silly: it never leaves dice on the table when taking them all is clearly right, and it does not throw on with 1,000 points and two dice left. A weak computer plays visibly simpler and makes more mistakes.

**Why this priority**: This is the core of the rework. Without better decisions, nothing else in the feature matters.

**Independent Test**: Play seeded games of computers against each other (hard against medium against easy) and compare win rates; replay fixed situations (e.g. 3×4 with three dice left, 4×1 with two dice left) and check the chosen action.

**Acceptance Scenarios**:

1. **Given** a first throw with 400 points (three 4s) and three dice left on a Bonus card, **When** a hard computer decides, **Then** it banks (if the minimum is reached).
2. **Given** a first throw with 1,000 points (four 1s) and two dice left, **When** a hard computer decides, **Then** it banks.
3. **Given** a throw with three of a kind and additional scoring singles, **When** a hard computer sets dice aside, **Then** its choice is the one with the best expected result, not a fixed pattern. The same holds for several 1s together with a 5.
4. **Given** the same situations, **When** an easy computer decides, **Then** it uses a simple rule of thumb and is allowed to choose worse than the hard computer.
5. **Given** many seeded games, **When** hard, medium and easy computers play against each other, **Then** hard wins clearly more often than medium, and medium clearly more often than easy.

---

### User Story 2 - Host sets skill and risk per computer seat (Priority: P1)

When the host sets a seat to "computer" in the lobby, they pick the skill (easy, medium, hard, random) and, independently, the risk (none, medium, high, random). Every seat shows both choices. Computers that replace a leaving player act with random skill and random risk.

**Why this priority**: The new behaviour is only reachable through this choice.

**Independent Test**: In the lobby, set three computer seats to different skill and risk combinations, start the game and verify through the displayed settings and the computers' behaviour that each seat plays with its own combination.

**Acceptance Scenarios**:

1. **Given** the host sets a seat to computer, **When** they look at the seat, **Then** they can choose skill (easy, medium, hard, random) and risk (none, medium, high, random) independently, with defaults preselected.
2. **Given** the lobby is shown in English or German, **When** the host views the options, **Then** all labels and explanations are in that language.
3. **Given** a human leaves a running game, **When** a computer takes over the seat, **Then** that computer uses random skill and random risk.
4. **Given** a client or server running an older version, **When** it connects, **Then** it is told that the versions do not match, as for earlier changes.

---

### User Story 3 - Risk shapes the draw decision after a Volle Lotte (Priority: P1)

After a Volle Lotte on a Bonus card the computer may bank or draw a new card. The risk setting decides how willingly it draws. "None" never draws. "Medium" draws with a probability that is 50 % when banking and drawing are equally good, and moves towards drawing or banking as the odds change. "High" strongly leans towards drawing but is not blind: a very high amount of carried points together with many Stop and Plus/Minus cards still discourages it.

**Why this priority**: This is the most visible risk decision in the game and the reason for the setting.

**Independent Test**: Run the same Volle Lotte situations many times with each risk setting and compare the share of "draw" decisions.

**Acceptance Scenarios**:

1. **Given** a Volle Lotte on a Bonus card and risk "none", **When** the computer decides, **Then** it banks every time, whatever the carried points and the cards.
2. **Given** a situation in which banking and drawing are equally good, **When** a "medium" computer decides many times, **Then** it draws in about half of the cases.
3. **Given** the same situation with more Stop cards in the deck or more carried points, **When** a "medium" computer decides many times, **Then** it draws less often than before.
4. **Given** a normal situation, **When** a "high" computer decides many times, **Then** it draws clearly more often than "medium" (almost always).
5. **Given** very high carried points and many Stop and Plus/Minus cards, **When** a "high" computer decides, **Then** it draws noticeably less often than in a normal situation.
6. **Given** any situation, **When** a computer weighs drawing, **Then** it uses the share of each card type from the configured card counts and never the actual order of the draw pile.

---

### User Story 4 - Score situation changes the risk (Priority: P2)

A computer that is far behind the leader accepts more risk, a computer close to the target score plays safer. A move that reaches the target score is always taken.

**Why this priority**: It makes the computers feel human, but the game is playable without it.

**Independent Test**: Compare the share of risky decisions of the same computer in the same turn situation with different score situations (far behind, level, almost at the target).

**Acceptance Scenarios**:

1. **Given** an identical turn situation, **When** the computer is far behind the leader, **Then** it takes the risky option more often than when it is level.
2. **Given** an identical turn situation, **When** the computer is close to the target score, **Then** it takes the risky option less often than when it is level.
3. **Given** banking would reach or exceed the target score, **When** the computer decides, **Then** it banks, whatever the skill and the risk.

---

### User Story 5 - Random computers change their mind every decision (Priority: P2)

A computer with skill "random" picks easy, medium or hard fresh for every single decision, a computer with risk "random" picks none, medium or high fresh for every single decision. The two are drawn independently, so a random computer looks erratic: it may take few dice, then all, bank early, then draw on.

**Why this priority**: It is a wanted game mode, but only an extension of the other stories.

**Independent Test**: Let a random computer decide the same situation many times and check that the chosen actions vary and that all three skill levels and all three risks occur with similar frequency.

**Acceptance Scenarios**:

1. **Given** a computer with skill "random", **When** it decides many times in the same situation, **Then** the results show the behaviour of all three skill levels in about equal shares.
2. **Given** a computer with risk "random", **When** it decides many times, **Then** all three risks occur in about equal shares.
3. **Given** skill "random" and risk "medium", **When** it plays, **Then** only the skill varies and the risk stays "medium".

---

### User Story 6 - Always all dice on special cards (Priority: P1)

On Street, Double Lotte, Plus/Minus, Clover and Star, every computer, whatever its skill, sets aside all dice it can. Taking fewer would look to the human players as if the computer acted on purpose irrationally, which spoils the fun.

**Why this priority**: It is an explicit fairness and enjoyment rule and independent of the other decisions.

**Independent Test**: Offer every computer skill all throws on these cards in seeded games and check that no legal selection with more dice exists than the one chosen.

**Acceptance Scenarios**:

1. **Given** the card is Street, Double Lotte, Plus/Minus, Clover or Star, **When** a computer of any skill sets dice aside, **Then** no other legal selection has more dice.
2. **Given** a Street, **When** the throw shows several still-missing values, **Then** the computer takes one die of every still-missing value.

---

### Edge Cases

- A situation in which several options are equally good: the computer picks one without a bias, and the result stays reproducible with the same seed.
- A turn in which banking is not allowed (below the minimum, special cards): the computer only chooses among the legal actions and never makes an illegal move.
- Minimum points of 0 and very high minimum points, four-of-a-kind doubling on or off, decks without Stop cards, without Bonus cards or with a single card type: the decisions still work and make sense.
- The deck holds so many Stop cards that drawing is clearly bad: even "high" does not draw blindly.
- The deck holds no Bonus card at all: no Volle Lotte on a Bonus card occurs, so no draw decision arises.
- The computer is far ahead of everyone (no pressure) or behind with a large gap and a game that is nearly over.
- Starting a game or taking over a seat of a leaving player must not change the behaviour of the other seats.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Every computer seat MUST have a skill (easy, medium, hard, random) and an independent risk (none, medium, high, random).
- **FR-002**: The host MUST be able to choose skill and risk for each computer seat in the lobby; default skill and default risk are preselected.
- **FR-003**: A computer taking over the seat of a leaving player MUST use random skill and random risk.
- **FR-004**: Skill "random" and risk "random" MUST be resolved anew for every single decision, independently of each other, with equal chances for each concrete value.
- **FR-005**: A hard computer MUST pick, among the legal choices, the one with the best expected result given the number of free dice, the points at stake and the rules in force (minimum points, four-of-a-kind doubling, card counts).
- **FR-006**: A medium computer MUST usually pick a good choice but sometimes a worse one; an easy computer MUST play with a simple rule of thumb that is clearly weaker than medium.
- **FR-007**: The choice of dice to set aside (including three of a kind against single dice, several 1s with a 5, and four or more of a kind) MUST follow the expected result of the whole remaining turn, not fixed patterns.
- **FR-008**: The decision to bank or throw again MUST weigh the points already at stake against the chance of further points and the chance of losing everything, for the number of dice that are still free.
- **FR-009**: After a Volle Lotte on a Bonus card, the decision to bank or draw MUST weigh the chance of further gain against the points that would be lost per card type: Stop loses the carried points, a bust after Bonus, Double Lotte, Street, Plus/Minus or Clover loses everything, Plus/Minus yields only +1,000, Star cannot lose, Clover can win the game.
- **FR-010**: The card shares used in that weighing MUST come from the configured card counts and MUST NOT depend on the real order of the draw pile.
- **FR-011**: Risk "none" MUST never draw another card after a Volle Lotte on a Bonus card.
- **FR-012**: Risk "medium" MUST draw with a probability that is 50 % at indifference and rises or falls smoothly with the advantage of drawing.
- **FR-013**: Risk "high" MUST lean strongly towards drawing, but with very high carried points and many Stop and Plus/Minus cards it MUST draw less than in a normal situation.
- **FR-014**: The risk setting MUST also shape the bank-or-throw decision within a run: lower risk banks earlier, higher risk throws on longer.
- **FR-015**: The score situation (distance to the leading opponent, distance to the target score) MUST shift risk-taking: more risk when far behind, less when close to the target.
- **FR-016**: When banking reaches or exceeds the target score, the computer MUST bank, whatever skill and risk.
- **FR-017**: On Street, Double Lotte, Plus/Minus, Clover and Star, every computer of every skill MUST set aside all dice it legally can.
- **FR-018**: A computer MUST always choose a legal action and MUST NOT use hidden information (real card order, future dice).
- **FR-019**: With the same game state and the same random numbers, a computer MUST make the same decision.
- **FR-020**: A computer's decision MUST not noticeably delay the game on the server, also on the first decision after a server start.
- **FR-021**: All new labels and explanations MUST exist in English and German; the rules and user documentation MUST describe skill and risk.
- **FR-022**: The protocol version MUST change, so clients and servers of different versions are told they do not match.

### Key Entities

- **Computer profile**: the skill and the risk of one computer seat; each is a concrete value or "random".
- **Decision situation**: everything a computer may know when it decides — its own turn state (dice, free dice, points, card), the rules, the configured card counts, the scores and the target.
- **Risk appetite**: how strongly a computer weighs possible losses against possible gains in a decision; set by the risk setting and shifted by the score situation.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: In at least 1,000 seeded games with equal conditions, hard computers win clearly more often than medium (at least 5 percentage points above an even share), and medium clearly more often than easy.
- **SC-002**: In fixed situations, the share of "draw" decisions is 0 % for risk none, about 50 % (between 40 % and 60 %) at indifference for risk medium, and higher for risk high than for medium; the order stays the same when more Stop cards are in the deck or more points are carried.
- **SC-003**: On Street, Double Lotte, Plus/Minus, Clover and Star, 100 % of the throws in simulated games get all possible dice set aside, for every skill.
- **SC-004**: In 10,000 simulated games with random rules, computers of all skill and risk combinations never make an illegal move and every game ends.
- **SC-005**: Random skill and random risk show all three concrete values in shares between 30 % and 37 % over at least 3,000 decisions each.
- **SC-006**: A computer's decision does not add a perceivable delay: the time between a computer's pacing wait ending and its action being applied stays below 50 ms for 99 % of decisions, including the first one after server start.
- **SC-007**: A host can choose skill and risk for a seat in the lobby in the same number of steps as the skill alone today plus one additional choice, in both languages.

## Assumptions

- The existing skill names easy, medium, hard and random stay; the risk names are none, medium and high plus random. Their defaults are medium skill and medium risk.
- Computers know what a careful human also knows: the rules, the card counts, the scores, their own turn. They do not count cards drawn in earlier turns.
- The existing "random" difficulty behaviour (fixed once per player) is replaced by per-decision resolution.
- Seats are only configured in the lobby; changing skill or risk of a seat in a running game is out of scope, as it is today for the difficulty.
- The exact numbers (risk strengths, noise of the medium level, score-situation shifts) are tuned by seeded bot tournaments during implementation; the spec fixes only the observable orderings and limits above.
- This feature overlaps the planned end-to-end bot suite (R2), but does not depend on it; its own simulation tests are part of this feature.
