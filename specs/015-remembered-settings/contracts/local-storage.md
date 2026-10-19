# Contract: Local Storage

The only interface of this feature is the browser storage format. It is read and written only by `SetupStore`.

## `vl-last-setup`

```json
{
  "v": 1,
  "setup": {
    "seats": 6,
    "rules": {
      "targetScore": 4000,
      "minimumPoints": 350,
      "fourOfAKindDoubling": true,
      "cardCounts": { "bonus200": 5 }
    },
    "computers": [{ "seat": 3, "difficulty": "medium", "risk": "none" }],
    "speed": 3
  }
}
```

## `vl-presets`

```json
{
  "v": 1,
  "items": [
    { "name": "Friday round", "setup": { "seats": 8, "rules": {}, "computers": [], "speed": 4 } }
  ]
}
```

## Rules for reading

- Missing key, invalid JSON, wrong `v` or wrong shape: treated as no data; nothing is thrown.
- `setup` is passed through `sanitizeSetup`: every invalid or missing value becomes its default, valid values are kept. New option fields added later default when absent.
- `items`: entries with an invalid name are dropped, duplicates (ignoring case) keep the first, the list is cut to 10.
- The password and the game name are never read from or written to either key.

## Rules for writing

- Writes use `try`/`catch`. On failure the store keeps the value in memory for this page load, sets `available` to false and returns a failure to the caller, which tells the host once that settings cannot be saved on this device.
- Both keys are written as a whole; there is no partial update.

## Compatibility

- A higher `v` than known is ignored (treated as missing) so an older client never overwrites newer data with a lossy copy.
- Other keys (`vl-skip-dice`, the session key, language, theme) are untouched.
