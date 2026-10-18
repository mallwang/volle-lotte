# UI Contract: Scaling, Notice and Hint

No network or API change (`PROTOCOL_VERSION` unchanged).

## Component contract

| Element        | Selector / role                         | Behaviour                                                                                   |
| -------------- | --------------------------------------- | ------------------------------------------------------------------------------------------- |
| Stage          | `.vl-stage` (outer), `.vl-stage-inner`  | Outer size = scaled size, inner is 992x900 with `scale(s)`; only while `TableScale.enabled` |
| Scaling notice | `role="status"`, dismiss `<button>`     | Shown in `scaled` mode if not dismissed; unscaled; does not overlap the stage content       |
| Blocking hint  | `role="alert"`-free region with heading | Shown in `blocked` mode instead of the visible stage; names required and current size       |

## i18n keys (EN and DE, same keys)

| Key                      | EN text                                                                                                         |
| ------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `scale.notice`           | Table scaled to fit your window ({percent}%).                                                                   |
| `scale.dismiss`          | Dismiss                                                                                                         |
| `scale.tooSmall.title`   | Window too small                                                                                                |
| `scale.tooSmall.body`    | Please enlarge the window to at least {width} x {height} px. Current size: {currentWidth} x {currentHeight} px. |
| `scale.tooSmall.running` | The game keeps running in the meantime.                                                                         |

`i18n.spec.ts` already enforces EN/DE key parity.

## Accessibility contract

- Focus: every interactive control shows a visible outline of at least 3 px (rendered size at scale 0.7 at least 2 px) in both themes.
- Tab order: header, table controls, log; seat cards are not focusable.
- The blocking hint is announced politely; the notice is a non-modal status.
