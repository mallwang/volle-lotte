# Data Model: Desktop Minimum Size and Table Polish

No persisted or server-side data. Client state only.

## Constants (`table-scale.ts`)

| Name             | Value     | Meaning                                      |
| ---------------- | --------- | -------------------------------------------- |
| `STAGE_WIDTH`    | 992       | Reference width in px                        |
| `STAGE_HEIGHT`   | 900       | Reference height in px (header + board)      |
| `MIN_SCALE`      | 0.7       | Below it the table is not shown              |
| derived min size | 695 x 630 | `ceil(STAGE * MIN_SCALE)`, named in the hint |

## TableScale service state

| Field       | Type                                       | Rules                                                                     |
| ----------- | ------------------------------------------ | ------------------------------------------------------------------------- |
| `viewport`  | `{width, height}`                          | From `window.inner*`, updated on resize                                   |
| `enabled`   | boolean signal                             | True only while the running table is mounted; other screens unscaled      |
| `scale`     | computed number                            | `enabled ? min(1, w/992, h/900) : 1`                                      |
| `mode`      | computed `'full' \| 'scaled' \| 'blocked'` | `scale >= 1` full; `MIN_SCALE <= scale < 1` scaled; `< MIN_SCALE` blocked |
| `dismissed` | boolean signal                             | Set by the notice; never reset during the visit; not persisted            |

## State transitions

```
full  <-> scaled   (scale crosses 1.0)          notice visible iff scaled && !dismissed
scaled <-> blocked (scale crosses MIN_SCALE)    table hidden (not unmounted) while blocked
```
