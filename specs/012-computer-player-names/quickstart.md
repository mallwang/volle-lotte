# Quickstart: Computer Player Names

## Prerequisites

- Install dependencies with the repository's supported npm version.
- Run commands from the repository root.

## Focused automated validation

1. Run the shared generator and game-rules tests:

   ```sh
   npx nx test game-rules
   npx nx test computer-names
   ```

   Expected: deterministic generation tests verify German gender agreement, English/German word membership, collision retries and injected randomness; game tests verify immutable name updates preserve scores, turn state and results.

2. Run backend lobby tests:

   ```sh
   npx nx test backend
   ```

   Expected: gateway and room tests cover host-only rename, invalid/duplicate names, locale resolution, host departure before host election, delayed disconnect takeover, rejoin, and authoritative broadcast.

3. Run frontend tests:

   ```sh
   npx nx test frontend
   ```

   Expected: session start/resume/live language change transmits the active language; lobby/table rename controls and translated validation states behave as specified.

4. Check affected types and production builds:

   ```sh
   npm run typecheck
   npm run build
   ```

   Expected: all workspace targets pass and the new shared library respects module-boundary tags.

## End-to-end manual checks

1. Start a lobby with UI language English; set two seats to computer. Confirm both have distinct English adjective/noun names and the same names appear for a second client.
2. Repeat in German. Confirm generated phrases are German and adjective forms agree with noun gender.
3. Rename a computer in the lobby; verify the update on a second client and in the started game. Attempt an empty, too-long and duplicate name; verify each rejection preserves the prior name.
4. Rename a computer during a running game. Verify the seat/table and subsequent log/result display use the new name while score and turn progression remain unchanged.
5. With a German host and English guest, let the guest leave and verify a German computer name. Then let the German host leave and verify the replacement computer name is still German even if the English guest becomes host. Let the English host leave in a subsequent flow and verify its replacement is English.
6. Rejoin a former player and verify the player's nickname is restored, the computer name disappears, and the score/seat remain intact.
7. Change a connected host's UI language, then create a later computer/takeover. Verify generation uses the latest host language while existing computer names stay unchanged.
