# Saved Game Fixtures

These fixtures are raw persisted saved-game shapes grouped by schema version.

Conventions:

- Keep fixtures as close as possible to real stored/imported data.
- Do not rewrite older fixture files when a new schema is introduced.
- Add new fixtures under a new `vN/` directory instead.
- Use migration tests and snapshots to assert how each legacy fixture upgrades.

Current fixture coverage:

- `v2/halftime-by-math.json`
- `v2/softcap-final-target.json`
- `v3/already-stamped-halftime.json`
