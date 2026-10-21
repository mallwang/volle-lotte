# Quickstart: validating the mobile lobby

## Prerequisites

`npm install`; Chrome with device emulation (or a phone on the same network / the test instance).

## Run

1. `npm run dev` (backend plus both frontends) and open `http://localhost:<port>/m/`.
2. Emulate 320x568, 390x844 and 480x800 (portrait) and 568x320, 844x390 and 932x430 (landscape).

## Scenarios

1. **Nickname and list (US1)**: enter a nickname, see the list; reload and stay signed in; a long nickname and the German language keep all actions visible.
2. **Create and ready (US2)**: create a game, set seats and computers, lock a seat, change a setting, become ready, start with a desktop player in the second window.
3. **Join (US3)**: host on desktop, join from the phone view (password game too), become ready, leave and withdraw.
4. **Touch and layout (US4)**: at every viewport above there is no horizontal scrolling or zoom, and the bottom action bar stays visible.
5. **Started notice**: when the host starts, the phone shows the game-started notice.
6. **Desktop regression (SC-005)**: `npm run test` and `npm run lint`, `npm run typecheck`, `npm run build` pass; desktop specs are unchanged except for import paths.
7. **Test instance**: push a candidate image with the `push-test-image` skill and repeat 2 and 3 on a real phone.
