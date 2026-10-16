# Quickstart: Validate the Active Game Table UI

1. `npm run typecheck && npm run lint && npm run test` — all green, coverage ≥ 80%.
2. `npm run dev`, create a game with the computer players, start it.
3. Check against [mockup.html](mockup.html):
   - Own seat bottom centre and highlighted; seats run clockwise; 8 players = 3 top, 3 bottom, 1 left, 1 right.
   - Active seat is highlighted and shows the timer; computer and offline seats are marked by icon/text.
   - Draw pile count falls and the level changes many → medium → few → empty; discard pile grows without jumping on re-render.
   - Draw, throw, select, bank, bust notice and dice animation behave as before.
4. Switch light/dark and EN/DE; tab through the table with the keyboard (clockwise seat order, visible focus).
