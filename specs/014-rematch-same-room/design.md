# Design: Rematch in the same room

**Mockup**: [mockup.html](mockup.html) (static, clickable, non-functional, local file). Original Artifact (may go stale): https://claude.ai/artifact/NjZQedSxnL71z3HDerSypQ. Controls: viewport (desktop, mobile), screen (host modal, guest waiting, guest rejoin active, guest game started, rematch lobby host, rematch lobby guest), theme button.

## Approved layout

```
Game-over modal (existing, 28rem, over the finished table)
  title, outcome, ranking, [hint line]
  host : [Rematch (primary)] [Back to the lobby]
  guest: [Rejoin (primary, disabled until host decided)] [Back to the lobby]
Rematch lobby (existing lobby column, 48rem)
  title + tag "Rematch · round 2", settings summary, [host: reservation hint]
  seat list: human rejoined | reserved seat (dashed) | computer | free seat
  host: [Start game] + hint what starting drops, [Cancel game]
  guest: "Waiting for <host> to start the game", [Leave lobby]
```

- **Host modal** (FR-001, FR-002, FR-012): "Rematch" only for the host; "Back to the lobby" always available.
- **Guest modal** (FR-005, FR-011): "Rejoin" visible from the start, disabled with a "waiting for host" hint, becomes active without reload with a hint that the seat is reserved.
- **Seat lost** (FR-010, Story 3 scenario 4): after the host started, the guest modal keeps only "Back to the lobby".
- **Rematch lobby** (FR-002, FR-003, FR-004, FR-006 to FR-009): same settings and seat order, no ready marks; reserved seats dashed with "Reserved, not back yet"; "Remove this player" for the host only; the host sees which seats a start would drop.
- **Rejected stale requests** (FR-014, FR-015): no visible UI, nothing to mock up.

## Requirement traceability

| Region                       | Requirements                             |
| ---------------------------- | ---------------------------------------- |
| Host modal buttons           | FR-001, FR-011, FR-012                   |
| Guest modal, Rejoin states   | FR-005, FR-006, FR-011, FR-013           |
| Rematch lobby header, seats  | FR-002, FR-003, FR-004, FR-006, FR-007   |
| Reserved seat, remove button | FR-007, FR-008, FR-009                   |
| Start hint                   | FR-010                                   |
| Texts                        | FR-018 (German texts follow in the plan) |

## Out of scope for this mockup

- German texts, keyboard and focus behaviour, rejection messages, ordering of seats after drops.
- Stale-round handling (FR-014, FR-015) and the protocol change (FR-017); no UI.
- The finished table behind the modal (stand-in, unchanged).

## Fidelity note

Colours are the real Terracotta tokens in light and dark. The real app uses PrimeNG dialog, tags and avatars; spacing and labels may differ in detail.
