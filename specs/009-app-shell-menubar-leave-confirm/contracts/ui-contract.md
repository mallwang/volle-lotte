# UI Contract: Menubar, Leave Dialog, Theme Button

No network or API change (`PROTOCOL_VERSION` unchanged). The existing `game:leave` intent is reused.

## Component contract

| Element       | Selector / role                                   | Behaviour                                                                                                |
| ------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Menubar       | `p-menubar`, label `nav.main`                     | Never switches to the hamburger layout; content limited to 1200 px; entries as in the data model         |
| Page entry    | link with `routerLink`                            | Active entry has `aria-current="page"` plus fill, underline and bold; disabled entries without a session |
| Status entry  | non-link item, `aria-current="page"`              | Only with a game; shows the phase tag "Lobby" or "Running"                                               |
| Leave dialog  | `p-confirmdialog` (alertdialog, modal)            | One instance in `App`; buttons "Stay" (default focus, Escape) and the situation's action                 |
| Leave buttons | table "Leave game", lobby "Leave game"/"Withdraw" | Call `LeaveGame.request()`; no other dialog in the app asks about leaving                                |
| Theme button  | text `p-button`, `pi-sun` / `pi-moon`             | Toggles light and dark; accessible name states the current theme and the action                          |

## Leave flow

| Trigger                           | Situation `none`      | Situation other                                                            |
| --------------------------------- | --------------------- | -------------------------------------------------------------------------- |
| Navbar link, browser back/forward | navigates immediately | dialog; "Stay" cancels the navigation; confirm leaves, then navigates once |
| In-page leave button              | leaves immediately    | dialog; confirm leaves, then the games page opens (existing redirect)      |
| Server rejects the leave          | -                     | error toast, player stays, navigation cancelled                            |

## i18n keys (EN and DE, same keys; parity is enforced by `i18n.spec.ts`)

| Key                                             | EN text                                                                                     |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `leave.running.title` / `.body` / `.confirm`    | Leave the running game? / You are removed from the game ... / Leave game                    |
| `leave.lobbyHost.title` / `.body` / `.confirm`  | Cancel your planned game? / You are the host. If you leave, the game is cancelled ...       |
| `leave.lobbyGuest.title` / `.body` / `.confirm` | Leave the lobby? / You give up your seat. The game stays open for the others. / Leave lobby |
| `leave.cancel`                                  | Stay (existing)                                                                             |
| `nav.current`, `nav.current.lobby`, `.running`  | Current game, Lobby, Running                                                                |
| `theme.switchToLight`, `theme.switchToDark`     | Switch to light theme, Switch to dark theme                                                 |
| removed                                         | `theme.system`, `leave.title`, `leave.body`, `leave.confirm` (old single dialog)            |

The final EN/DE wording of the running-game body must match the real consequence (a computer takes the seat after leaving; check the backend behaviour while implementing).

## Accessibility contract

- Menubar entries reachable and operable by keyboard; visible focus ring (3 px, both themes).
- Dialog traps focus, returns it to the trigger on close, Escape means "Stay".
- Highlight and status are never colour-only.
