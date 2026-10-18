# Contract: settings protocol (version 5)

Source of truth: `libs/game-rules/src/lib/protocol.ts`. `PROTOCOL_VERSION` 4 -> 5; clients on 4 get `versionMismatch` at `session:start` as before.

## Intent `game:settings` (client -> server)

```ts
'game:settings': [{ fastComputerDice?: boolean; computerSpeed?: number }, { }];
```

- At least one field must be present; a field with the wrong type, or `computerSpeed` outside the integers 1..5, gives `invalidRequest`. Unknown fields are ignored.
- Errors: `noSession`, `notInGame` (no room, or room finished), `notHost`, `invalidRequest`.
- Success `{ ok: true }` also when nothing changed (no push, no state change).
- Allowed in phases `lobby` and `running`.

## View `GameView` (server -> client, `game:state`)

```ts
fastComputerDice: boolean; // unchanged
computerSpeed: number; // new, 1..5
```

## Push `game:settingsChanged` (server -> client)

```ts
'game:settingsChanged': {
  by: string;   // nickname of the host
  changes: { setting: 'computerSpeed' | 'fastComputerDice'; value: number | boolean }[];
};
```

- Sent after each accepted change that altered a value, to every human currently seated in the room (host included).
- Not sent to players who join or rejoin later; they get the current values through `game:state` only.
- Always follows or accompanies the `game:state` push of the same change.

## Client behaviour

- `SocketService` shows one toast per change entry (info, 4 s), texts from i18n.
- The slider sends after 300 ms without further input and shows the local value meanwhile; it follows `computerSpeed` from the view when the server value differs and no send is pending.
