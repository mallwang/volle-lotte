# Quickstart: validating dice pips and rolling

Prerequisites: `npm ci`, Node 24; run `npm run dev`; open two browser windows (host + guest) and add one computer seat.

Automated: `npm run typecheck && npm run test && npm run lint`.

## Scenarios (manual)

1. **Pips (US1)**: throw; table and log show pips only, no digits; screen reader announces "Die N, …" ([data-model.md](data-model.md)). Check phone width, light and dark.
2. **Rolling (US2)**: throw 6 dice; they stop at different times within 5 s on the logged values; buttons and selection are disabled until the last stops; the guest sees the same final values.
3. **Reveal (US3)**: the "threw …" log line and bust/Volle Lotte toast appear only after the last die stops.
4. **Computer (US4)**: after its dice stop, ~3 s later its picks are highlighted on both windows; ~2 s later the next action. Host enables "Fast computer dice": computer dice stop within 2.5 s; guest sees the option read-only.
5. **Skip**: enable "Skip dice animation" in one window; its dice show instantly while the other window still rolls; reload keeps the setting.
6. **Reduced motion**: enable OS/browser reduced motion; no tumbling, static "Dice are rolling…" text, pips appear per die at its deadline.
7. **Reload mid-roll**: values appear immediately, state matches the server.

Contract details: [contracts/protocol.md](contracts/protocol.md).
