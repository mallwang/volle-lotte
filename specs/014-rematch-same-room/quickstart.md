# Quickstart: Validating the Rematch

## Prerequisites

- `npm install` done; Node >= 24, npm >= 11.
- Dev servers: `npm run dev` (frontend and backend).

## Automated checks

```bash
npx nx test backend
npx nx test frontend
npx nx test game-rules
npx nx run-many -t lint typecheck build
```

Expected: all pass. New or changed tests:

- Backend `game-room.spec.ts`: `rematch` keeps id, password, rules, settings, seat order, host computers; frees seats of leavers and replaced humans; turns other humans into `reserved`; clears ready marks, log and engine state; increments `round`; `rematchJoin` seats the player, resets ready marks, rejects wrong round, missing or dropped reservation; `start` ignores reserved seats, opens them and fails with fewer than two players; `leave`, `removeSeat` and name checks handle `reserved`; a second rematch works.
- Backend `view.spec.ts` (new or existing view tests): snapshot view for reserved (`finished`, `rematch: 'open'`, old `you.seat`, old `round`) and dropped players (`rematch: 'closed'`); normal views carry `round`; `reserved` seats are visible to everybody.
- Backend `lobby.gateway.spec.ts`: payload validation, host-only `rematch:start`, `staleRound` for a late start and a late join (no push), pushes reach reserved players, `session:start` releases a reservation, `game:closed` for reserved players when the room closes, `seat:remove` of a reserved seat bans and notifies.
- Backend `lobby.gateway.e2e.spec.ts`: full flow with two clients: finish, rematch, rejoin, ready, start.
- Frontend `game-over.spec.ts`: host sees Rematch; guest sees disabled Rejoin; active with `rematch: 'open'`; disabled again with `'closed'`; each button calls the matching socket method.
- Frontend `socket.service.spec.ts`: `rematch()` and `rejoinRematch()` send the round of the shown game and apply the returned view.
- Frontend `game-lobby.spec.ts`: reserved seat row with tag and host-only remove; round tag.
- Frontend `i18n.spec.ts`: every new key exists in English and German.

## Manual scenarios (use the `verify-ui` skill for a scripted run)

1. **Host-first rematch**: three humans and one computer, low target score, play to the end. The host clicks "Rematch": the host sees the lobby with the same name, password, computer and seat order. The others still see the modal, with "Rejoin" now active.
2. **Rejoin**: a guest clicks "Rejoin": they are on their old seat, not ready. The host sees "Rejoined". Both press Ready and the host starts: a new game with zero scores.
3. **Absent player**: one guest never rejoins. The host starts: the game runs without that seat, the guest's modal shows "Rejoin" disabled and only "Back to the lobby".
4. **Remove**: the host removes a waiting guest: their modal disappears with the "removed" notice and the seat is open.
5. **Leavers**: one guest uses "Back to the lobby" before the rematch: no seat and no Rejoin for them in the rematch; the seat is open.
6. **Stale request**: two tabs of the same guest; rematch twice in a row. A click on the old tab's "Rejoin" shows an error toast and changes nothing.
7. **Reload**: a waiting guest reloads: games list, no reservation (the seat is open); they can join the lobby like a newcomer.
8. **No rematch**: the host leaves via "Back to the lobby": no rematch, behaviour as in spec 013.
