# UI Contract

The wire protocol is unchanged (`PROTOCOL_VERSION = 1`). This contract fixes the internal UI seams that must stay
stable so the follow-up "dice UI" feature can replace visuals without touching the turn flow (FR-017).

## Routes (unchanged)

`/nickname`, `/lobby`, `/create`, `/game/:id` (child: game lobby or table or result by game phase). Guard:
`session.guard.ts`.

## Component seams

| Component      | Contract                                                                              |
| -------------- | ------------------------------------------------------------------------------------- |
| `DiceTile`     | `value`, `selected`, `disabled` in; `toggled` out. Keyboard: Space/Enter toggles.     |
| `CardTile`     | `card` in. Shows the card label as text.                                              |
| `Table`        | Owns selection state and `socket.send('turn:action', ...)`; tiles are presentational. |
| `ThemeService` | `mode` signal, `set(mode)`; sets `app-dark` on `<html>`; storage key `vl-theme`.      |

## Accessibility contract

- Dice tile: `button` with `aria-pressed`; label "Die {n}, selected|not selected".
- Active player: `aria-current="true"` plus visible icon/text.
- Log: container `role="log"` with `aria-live="polite"`, never takes focus.
- Dialogs (join password, host decision): modal, focus moves in and returns to the trigger.
- Toasts: `role="status"` for info/warn, `role="alert"` for errors (PrimeNG default).
- Touch targets >= 44x44 px; status never colour-only.
