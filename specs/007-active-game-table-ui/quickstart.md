# Quickstart: Validate the Active Game Table UI

1. `npm run typecheck && npm run lint && npm run test` — all green, coverage ≥ 80%.
2. `npm run dev`, create a game with the computer players, start it.
3. Check against [mockup.html](mockup.html):
   - Own seat top left and highlighted; seats follow in turn order alternating right and left from top to bottom; 8 players = 4 per column; no seat is cut off at 1024 px.
   - Active seat is highlighted and shows the timer; computer and offline seats are marked by icon/text.
   - Draw pile count falls and the level changes many → medium → few → empty; discard pile grows without jumping on re-render.
   - Draw, throw, select, bank, bust notice and dice animation behave as before.
4. Switch light/dark and EN/DE; tab through the table with the keyboard (turn order, visible focus).
