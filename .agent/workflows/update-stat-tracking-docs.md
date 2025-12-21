---
description: Update stat-tracking.md documentation to match actual implementation
---

# Update Stat Tracking Documentation

This workflow syncs `docs/stat-tracking.md` with the actual code implementation.

## Steps

1. **Review Current Documentation**
   - Open `docs/stat-tracking.md`
   - Note any sections that may be outdated

2. **Check Data Model**
   - View `store/gameStore.ts` for current interfaces:
     - `StatRecord` interface
     - `TurnoverRecord` interface (if documented)
     - State properties: `statTrackingEnabled`, `pendingStatEntry`, etc.
   - Update the Data Model section if interfaces have changed
   - **Note**: `StatTrackingMode` enum was replaced with `statTrackingEnabled: boolean`

3. **Check State Table**
   - Compare the State table in docs with actual state in `gameStore.ts`
   - Ensure all properties, types, and descriptions are accurate

4. **Check Components Section**
   - Verify component descriptions match actual implementation:
     - `components/StatEntrySheet.tsx`
     - `components/stat-entry/StatEntryHeader.tsx`
     - `components/stat-entry/StatEntryRoster.tsx`
     - `components/ui/PlayerChip.tsx`

5. **Check Settings Section**
   - View `app/Settings.tsx` for stat tracking UI
   - Update Settings section to reflect current controls
   - **Note**: Segmented control was replaced with a simple Toggle switch

6. **Check Flow Diagram**
   - Verify the mermaid sequence diagram still accurately represents the flow
   - Update if behavior has changed

7. **Update Documentation**
   - Make edits to `docs/stat-tracking.md` to reflect actual implementation
   - Keep documentation concise and accurate

## Key Files to Reference

- `store/gameStore.ts` — State and actions
- `components/StatEntrySheet.tsx` — Main entry sheet
- `components/stat-entry/StatEntryHeader.tsx` — Header component
- `components/stat-entry/StatEntryRoster.tsx` — Roster display
- `components/ui/PlayerChip.tsx` — Player chip component
- `app/Settings.tsx` — Settings UI for stat tracking toggle
