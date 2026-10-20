# Quickstart: Validating Sounds

## Prerequisites

- `npm install` done; Node >= 24, npm >= 11. No new dependency.
- Dev servers: `npm run dev` (frontend and backend).
- Speakers or headphones; click once on the page after loading so the browser allows sound.

## Automated checks

```bash
npx nx test frontend
npx nx run-many -t lint typecheck build
```

Expected: all pass. New or changed tests (see [contracts/sounds.md](contracts/sounds.md)):

- `core/sounds.spec.ts`: default not muted; stored `vl-muted` read; toggle writes storage and stops playing cues; storage that throws still toggles; `play` while muted touches no audio; a rejected `play` is swallowed; replay rewinds; one element per cue with the right path; `countdownDelays` examples.
- `core/celebration.spec.ts`: the victory sound goes through `Sounds` (muted = silent); confetti tests unchanged.
- `table/table.spec.ts`: `your-turn` plays when the turn passes to me after a notice, not on the first value, not for turns between others, not for spectators or replaced seats; countdown schedules 10 beeps for a full timer, stops when I act, when paused (deadline cleared) and on destroy; `volle-lotte` plays after the roll for my own Volle Lotte only, also with skipped dice animation.
- `game/game.spec.ts` (new): `game-start` plays on `lobby` to `running`, not when the first state is `running`, again after a rematch.
- `app.spec.ts`: the sound button toggles, shows the right icon, `aria-pressed`, label and tooltip in both languages.

## Manual scenarios (use the `verify-ui` skill for a scripted run)

1. **Your turn**: one human and two computers, turn timer on. Each time the turn comes back to you, the sound plays once; nothing plays between the computers' turns.
2. **Countdown**: on your turn, wait: 10 beeps in the last 10 seconds, then the automatic move. Next turn, act after 3 beeps: they stop at once.
3. **Pause**: as host, pause during the countdown: beeps stop; resume: beeps continue for the remaining seconds.
4. **Start and rematch**: two humans in two browsers; start: both hear the start sound once, the starting player hears no extra "your turn". Reload one tab: no start sound. Finish, rematch, start again: start sound again.
5. **Volle Lotte**: throw a Volle Lotte (or play until one happens): applause after the dice stop, only on your device. Repeat with "Skip dice animation" on.
6. **Mute**: press the speaker in the menubar: icon changes, no sound plays during a full game including a win; reload: still muted; press again: sounds back. In a private window with storage blocked the button still works for that visit.
7. **Spectator**: watch a running game from a third browser: no sounds at all.
8. **Replace a file**: copy any other short mp3 over `apps/frontend/public/sounds/your-turn.mp3`, reload: only the "your turn" cue sounds different. Revert.
