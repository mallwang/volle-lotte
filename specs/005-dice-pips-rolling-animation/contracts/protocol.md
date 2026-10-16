# Contract: protocol v2 changes

Source: `libs/game-rules/src/lib/protocol.ts`.

- `PROTOCOL_VERSION`: `1` → `2`.
- `GameView.fastComputerDice: boolean` (new, always present).
- New intent:

```ts
'game:settings': [{ fastComputerDice: boolean }, object];
```

- Host only (`notHost` otherwise), game must exist and not be `finished` (`notInGame`/`gameStarted` are not used); payload validated (`invalidRequest`). Success pushes `game:state` to the room. Applies from the next computer throw.
- Unchanged: dice values, `Action`s, `Event`s, `turn:preview`, `game:log`.
- Behavioural change (no schema change): a computer `select` is preceded by a `game:state` with `preview` = the chosen dice, 2 s before the `select` event is logged.
