# Storage Checkpoints

A checkpoint is a frozen copy of everything the app persisted to AsyncStorage at one moment.
`store/__tests__/storageCheckpoint.test.ts` loads a checkpoint, simulates a cold app start with
`test/storageCheckpoint.ts`, and proves the stores hydrate it and write it back.

## Format

One JSON object mapping each `ultimatestats*` storage key to its value. JSON objects and arrays are
stored parsed, so a Zustand entry reads as `{ "state": { ... }, "version": N }`. Every other value
(the last-seen version, the theme mode) is the exact stored string.

## Layout

- `<appVersion>/<scenario>.json`: storage in that app version's format, captured from a device or
  composed as noted below.
- `expected/`: storage a test expects after a cold start of a checkpoint.

Current checkpoints:

- `2.6.0/mid-game.json`: captured from a development simulator, with player names outside the
  Maestro seed roster replaced by `Player N` and three team and opponent names replaced, then
  driven through a game in progress with the 2.6.0 store. Eleven saved basic games (schema v6), one
  saved team, tournaments with game links, and a live game with three goals, a block, recorded
  lines, a running game clock, and an open timeout.
- `2.6.0/legacy-saved-games.json`: hand-composed. Default basic-store state whose `savedGames` are
  the v2 and v3 fixtures from `lib/storage/__fixtures__/games/`.

## Conventions

- Never rewrite a checkpoint. It records what a released version really stored; a test that stops
  passing against it has found a storage change that needs a migration.
- When the storage format changes, add a checkpoint under the new app version instead.
- Files under `expected/` may change, but only together with the migration that changes the result.

## Capturing a checkpoint

With the app installed on a booted iOS simulator:

```bash
npm run capture:storage-checkpoint -- <simulator-udid> <bundle-id> \
  test/fixtures/storage-checkpoints/<appVersion>/<scenario>.json
```

The script only reads the simulator's files. Check the result for personal data before keeping it.
