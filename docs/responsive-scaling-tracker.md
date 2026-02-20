# Responsive Scaling Tracker

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
- `[ ]` `app/(main)/GameInfo.tsx`
- `[ ]` `app/(main)/PreGameConfirm.tsx`
- `[ ]` `app/(main)/PointTransition.tsx`
- `[ ]` `app/(main)/ViewStats.tsx`
- `[ ]` `app/(main)/PlayerStats.tsx`
- `[ ]` `app/(main)/SavedGameStats.tsx`
- `[ ]` `app/(main)/LinePresetEditor.tsx`
- `[ ]` `app/(main)/saved-games/[gameId].tsx`

### Modal Routes (`app/(modals)`)

- `[ ]` `app/(modals)/StatEntryModal.tsx`
- `[ ]` `app/(modals)/TurnoverEntryModal.tsx`
- `[ ]` `app/(modals)/LinePromptModal.tsx`
- `[ ]` `app/(modals)/NumberPickerModal.tsx`
- `[ ]` `app/(modals)/TimeoutModal.tsx`
- `[ ]` `app/(modals)/HalftimeModal.tsx`
- `[ ]` `app/(modals)/WinModal.tsx`
- `[ ]` `app/(modals)/PointSummaryModal.tsx`
- `[ ]` `app/(modals)/EditDurationModal.tsx`
- `[ ]` `app/(modals)/EditPlayerModal.tsx`
- `[ ]` `app/(modals)/EditEventModal.tsx`
- `[ ]` `app/(modals)/GameTimeline.tsx`
- `[ ]` `app/(modals)/GameSelectorModal.tsx`
- `[ ]` `app/(modals)/TeamManagementModal.tsx`

### Other Routes

- `[ ]` `app/s/[kind]/[shareId].tsx`
- `[ ]` `app/+not-found.tsx`

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
- `[ ]` `components/ui/ResponsiveHeaderActions.tsx`
- `[ ]` `components/ThemedText.tsx`
- `[ ]` `components/ui/icon-symbol.tsx` / `components/ui/icon-symbol.ios.tsx`
- `[ ]` `components/ui/AlertModal.tsx`
- `[x]` `components/ui/PlayerChip.tsx`
- `[ ]` `components/ui/ScoreBadge.tsx`
- `[x]` `components/ui/SegmentedControl.tsx`
- `[x]` `components/ui/Switch.tsx`
- `[x]` `components/ui/NumberPicker.tsx`
- `[ ]` `components/ui/TeamDropdown.tsx`
- `[x]` `components/ui/ColorPicker.tsx`

## Verification Checklist (Per Item)

- `[ ]` Fonts scale correctly for `medium` and `large`
- `[ ]` Icons scale correctly for `medium` and `large`
- `[ ]` No clipping/truncation regressions
- `[ ]` Tap targets remain usable
- `[ ]` Portrait + landscape sanity check completed
