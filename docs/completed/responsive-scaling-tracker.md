# Responsive Scaling Tracker

## Status

This rollout is complete and this document is now archived for historical reference in `docs/completed/`.

Track progress for size-class scaling (`small` / `medium` / `large`) across screens and shared components.

## Status Legend

- `[x]` Complete (implemented and verified)
- `[~]` In progress
- `[ ]` Not started

## Rollout Notes

- Scope for this tracker is **font + icon scaling** first.
- Apply project pattern: `useLayout()` + `createStyles()` + shared scale helpers.
- Verify each item in portrait + landscape before marking complete.

## Screen Routes

### Main Routes (`app/(main)`)

- `[x]` `app/(main)/index.tsx` (user-confirmed complete)
- `[x]` `app/(main)/Dashboard.tsx`
- `[x]` `app/(main)/Settings.tsx`
- `[x]` `app/(main)/Help.tsx`
- `[x]` `app/(main)/About.tsx`
- `[x]` `app/(main)/Import.tsx`
- `[x]` `app/(main)/ImportTeam.tsx`
- `[x]` `app/(main)/EditRoster.tsx`
- `[x]` `app/(main)/GameInfo.tsx`
- `[x]` `app/(main)/PreGameConfirm.tsx`
- `[x]` `app/(main)/PointTransition.tsx`
- `[x]` `app/(main)/ViewStats.tsx`
- `[x]` `app/(main)/PlayerStats.tsx`
- `[x]` `app/(main)/SavedGameStats.tsx`
- `[x]` `app/(main)/LinePresetEditor.tsx`
- `[x]` `app/(main)/saved-games/[gameId].tsx`

### Modal Routes (`app/(modals)`)

- `[x]` `app/(modals)/StatEntryModal.tsx`
- `[x]` `app/(modals)/TurnoverEntryModal.tsx`
- `[x]` `app/(modals)/LinePromptModal.tsx`
- `[x]` `app/(modals)/NumberPickerModal.tsx`
- `[x]` `app/(modals)/TimeoutModal.tsx`
- `[x]` `app/(modals)/HalftimeModal.tsx`
- `[x]` `app/(modals)/WinModal.tsx`
- `[x]` `app/(modals)/PointSummaryModal.tsx`
- `[x]` `app/(modals)/EditDurationModal.tsx`
- `[x]` `app/(modals)/EditPlayerModal.tsx`
- `[x]` `app/(modals)/EditEventModal.tsx`
- `[x]` `app/(modals)/GameTimeline.tsx`
- `[x]` `app/(modals)/GameSelectorModal.tsx`
- `[x]` `app/(modals)/TeamManagementModal.tsx`

### Other Routes

- `[x]` `app/s/[kind]/[shareId].tsx`
- `[x]` `app/+not-found.tsx`

## Shared Components

### Index/Scoreboard Flow Components

- `[x]` `components/ScoreDisplay.tsx` (user-confirmed complete)
- `[x]` `components/TeamScoreSection.tsx` (user-confirmed complete)
- `[x]` `components/TeamText.tsx` (user-confirmed complete)
- `[x]` `components/ScoreboardActionBar.tsx` (user-confirmed complete)
- `[x]` `components/SettingsBar.tsx` (user-confirmed complete)
- `[x]` `components/GameLockedOverlay.tsx` (user-confirmed complete)

### Global UI Primitives

- `[x]` `components/ui/ScreenHeader.tsx`
- `[x]` `components/ui/ResponsiveHeaderActions.tsx`
- `[x]` `components/ThemedText.tsx`
- `[x]` `components/ui/icon-symbol.tsx` / `components/ui/icon-symbol.ios.tsx`
- `[x]` `components/ui/AlertModal.tsx`
- `[x]` `components/ui/PlayerChip.tsx`
- `[x]` `components/ui/ScoreBadge.tsx`
- `[x]` `components/ui/SegmentedControl.tsx`
- `[x]` `components/ui/Switch.tsx`
- `[x]` `components/ui/NumberPicker.tsx`
- `[x]` `components/ui/TeamDropdown.tsx`
- `[x]` `components/ui/ColorPicker.tsx`

## Verification Checklist (Per Item)

- `[x]` Fonts scale correctly for `medium` and `large`
- `[x]` Icons scale correctly for `medium` and `large`
- `[x]` No clipping/truncation regressions
- `[x]` Tap targets remain usable
- `[x]` Portrait + landscape sanity check completed
