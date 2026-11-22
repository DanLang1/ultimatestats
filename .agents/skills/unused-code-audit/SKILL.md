---
name: unused-code-audit
description: Audit U-Stat for unused files, exports, functions, props, and dependencies with knip and a props and test-only script, report them in tiers, and remove the tiers the user picks. Use for a periodic dead-code sweep, a cleanup after a feature or refactor, or when asked to find unused or dead code, props, components, or methods.
---

# Unused Code Audit

`tsc` already rejects unused locals and parameters (`noUnusedLocals`, `noUnusedParameters`). This
audit covers what it cannot see: code that is exported or declared but that nothing in the app uses.

## Run knip

`npm run knip` (configured in `knip.json`, run by `npm run check:all`) fails on unused files,
exports, types, and dependencies, and on dependencies used without being listed. It takes under a
second. Exports used only in their own file are mechanical to fix: run
`npx knip --fix --fix-type exports,types`, then `npm run format`, before reporting. Report knip's
unused files and dependencies as candidates instead of deleting them.

Knip counts test files as real code and never checks props, so it misses production code that only
tests use and props nobody passes. The script covers those.

## Run the script

From the repo root:

```bash
node .agents/skills/unused-code-audit/scripts/find-unused.ts > <scratchpad>/unused.txt
```

Write the output outside the repo. The script uses the project's TypeScript language service, takes
about 30 seconds, and changes nothing. It lists files that only tests import, exports that only tests
reference, `*Props` members that no caller passes, and `*Props` members the component never reads.

## Verify every hit

Both tools give a lead list. Before reporting a candidate, read the code and grep for the name.
Known false positives:

- **Props passed through a spread** (`<Inner {...props} />`): the script cannot see these.
- **Test-reset helpers** such as `reset…ForTests`, called from `test/fixtures`: these are on purpose.
- **Names that appear only in strings**, such as fixture code in `scripts/oxlint-plugin/__tests__`.
- **Files loaded by configuration**: add them to `knip.json` `entry` or the script's
  `CONFIG_LOADED` instead of deleting them.

Blind spots, where the script reports nothing:

- **Props types that are not plain object types**, such as intersections
  (`ThemedTextProps = TextProps & {...}`) or aliases of another type. Check those props by hand.
- **Exports that tests reach through a barrel file** such as `lib/sharing/index.ts`: the barrel's
  re-export counts as a production use.

Follow chains. A dead reader can leave its writer dead too: for example, a field that is populated
but whose only reader is an unused function.

## Report in tiers

1. **Dead:** knip's unused files and dependencies, props no caller passes, and data that is only
   written.
2. **Production code only tests use:** removing it also removes its tests.

For each item give file:line, the evidence, and the false positives you ruled out. Also list the
`export` keywords knip removed. Then ask which tiers to remove. Do not delete anything before the
user answers.

## Remove

- Delete the code, its tests, and helpers, types, and imports that become unused because of the
  deletion. Leave `docs/` alone unless a sentence becomes false.
- Change no behavior. If a removal would change a default or a test setup (for example, a prop that
  only `test/` passes), say so in the report before removing it.
- Run `npm run check:all`.
- Do not commit, stash, checkout, or reset.

## Report back

What was removed per tier, the line counts from `git diff --stat`, check results, and any candidates
left in place, with the reason.
