---
trigger: always_on
---

- Prefer not to use useEffect, try to derive state when possible
- If have to use a useEffect, abstract it into a hook
- Refer to https://docs.expo.dev/llms.txt for expo documentation. Prefer this when possible over outside sources
- NEVER use useCallback or useMemo, already using React Compiler
- When updating anything regarding StatEntrySheet, also update stat-tracking.md
- When updating anything regarding ViewStats, also update view-stats.md
- For quick documentation reference, see the docs folder
- Never run rm command without explicit user permission
- No sub components in files. Each component should be in its own file
- No raw colors - everything should be abstracted into theme.ts
- Early return in logic whenever possible
- See AlertProvider when making alerts - do NOT use native alert
- Do NOT use `runOnJs`, it's deprecated - use `scheduleOnRn` instead
- For modals, follow the patterns in docs/modals.md
- Use Immer when updating object state for simplicity
- App is locked to Landscape orientation
