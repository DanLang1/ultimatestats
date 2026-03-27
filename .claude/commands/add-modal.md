Create or modify a modal following this project's patterns. Read the relevant reference implementations before writing any code.

## File Structure

- Route files go in `app/(modals)/` with a `Modal` suffix (e.g. `MyFeatureModal.tsx`)
- Most modals need no extra registration — `presentation: 'transparentModal'` and `gestureEnabled: false` are applied globally in `app/_layout.tsx`
- Add a `Stack.Screen` entry to `app/(modals)/_layout.tsx` only if you need a non-default animation (e.g. `'fade'`)

## Theming Tokens

Use these in modals — they're correct in both light and dark mode:

| Token                    | Usage                            |
| ------------------------ | -------------------------------- |
| `palette.overlayDark40`  | Backdrop overlay                 |
| `palette.modalBg`        | Modal content background         |
| `palette.modalText`      | Primary text color               |
| `palette.modalTextMuted` | Secondary/muted text color       |
| `palette.overlay15`      | Border color                     |
| `palette.overlay05`      | Input background                 |
| `palette.accent`         | Primary action button background |
| `palette.textOnAccent`   | Primary action button text       |

Do NOT use in modals: `palette.surface`, `palette.textPrimary`, `palette.textInverse`, `palette.textMuted`

## Navigation Rules

- Use `router.dismissTo('/')` not `router.back()` for exits
- When opened from a non-root screen, use the explicit parent path: `router.dismissTo('/GameInfo')`
- For conditional redirects when data becomes unavailable, use `<Redirect href="..." />` — never imperative navigation during render

## Safe Area

- `BottomSheet` handles insets automatically — do not call `useSafeAreaInsets()` manually in bottom sheet modals
- Centered modals may need horizontal insets in landscape — check existing examples

## Reference Implementations

Read these before writing — they are the pattern:

| Pattern | File |
| ------- | ---- |
| Bottom sheet | `app/(modals)/TeamManagementModal.tsx` |
| Bottom sheet (scrollable) | `app/(modals)/EditEventModal.tsx` |
| Centered modal | `app/(modals)/HalftimeModal.tsx` |
| Conditional redirect | `app/(modals)/EditPlayerModal.tsx` |
| Inline dialog (AlertModal) | `app/(main)/(hub)/(team)/EditRoster.tsx` |

## Existing Modals

| File                      | Description                          |
| ------------------------- | ------------------------------------ |
| `StatEntryModal.tsx`      | Goal/assist entry after scoring      |
| `TurnoverEntryModal.tsx`  | Turnover type selection              |
| `HalftimeModal.tsx`       | Halftime break screen                |
| `TimeoutModal.tsx`        | Timeout timer UI                     |
| `PointSummaryModal.tsx`   | Point outcome summary                |
| `GameSelectorModal.tsx`   | Game picker sheet (from PlayerStats) |
| `EditEventModal.tsx`      | Edit a timeline event                |
| `EditPlayerModal.tsx`     | Edit player details                  |
| `EditDurationModal.tsx`   | Edit game/period duration            |
| `NumberPickerModal.tsx`   | Generic number picker                |
| `TeamManagementModal.tsx` | Team management sheet                |
