# Data Model: App Shell Navbar and Leave-Game Confirmation

No persisted or server-side data. Client state only.

## Leave situation (`core/leave-game.ts`)

| Value        | When                                               | Dialog title (en)         | Confirm button |
| ------------ | -------------------------------------------------- | ------------------------- | -------------- |
| `running`    | Phase `running`, player has a seat                 | Leave the running game?   | Leave game     |
| `lobbyHost`  | Phase `lobby`, player is the host                  | Cancel your planned game? | Cancel game    |
| `lobbyGuest` | Phase `lobby`, player is not the host              | Leave the lobby?          | Leave lobby    |
| `none`       | No game, phase `finished`, or seat `< 0` (removed) | no dialog                 | -              |

All dialogs have the reject button "Stay" (default focus, Escape). Texts live in `i18n/en.ts` and `de.ts`.

## LeaveGame service state

| Field       | Type                        | Rules                                                                  |
| ----------- | --------------------------- | ---------------------------------------------------------------------- |
| `situation` | computed of the table above | From `socket.game()` only                                              |
| `leaving`   | boolean signal              | True while the guard runs `socket.leave()`; mutes the `Game` redirect  |
| pending     | promise or none (private)   | At most one open dialog; a second `confirm()` returns the same promise |

## Navigation entries (`App`)

| Entry        | Target         | Available when         | Active when                     |
| ------------ | -------------- | ---------------------- | ------------------------------- |
| Games        | `/lobby`       | signed in              | URL is `/lobby`                 |
| Create game  | `/create-game` | signed in              | URL is `/create-game`           |
| Current game | status only    | `socket.game()` is set | always (it is on the game page) |

Without a session the first two entries are disabled; brand, language and theme stay usable.

## Theme

| Field  | Type                | Rules                                                                               |
| ------ | ------------------- | ----------------------------------------------------------------------------------- |
| `mode` | `'light' \| 'dark'` | Stored value if valid, else the device preference once; `toggle()` flips and stores |

Storage key `vl-theme` is unchanged; other stored values (including legacy `system`) are ignored.
