# Unscaled Font and Icon Sizes Report

Status (updated): all listed items have been converted to size-class-aware scaling except `components/ui/ScoreBadge.tsx`, which intentionally uses a size-variant base font map (`small`/`medium`/`large`) and then applies `scaleBySizeClass(...)` at render time.

## `app/(main)/GameInfo.tsx`
- Line 648 (fontSize): `fontSize: 12,`

## `app/(main)/PointTransition.tsx`
- Line 253 (iconSize): `<MaterialCommunityIcons name="check" size={18} color={palette.textOnAccent} />`
- Line 272 (iconSize): `<MaterialCommunityIcons name="alert" size={14} color={palette.warning} />`

## `app/(main)/PreGameConfirm.tsx`
- Line 185 (iconSize): `<MaterialCommunityIcons name="lock-outline" size={16} color={palette.danger} />`

## `components/GameLockedOverlay.tsx`
- Line 17 (iconSize): `<MaterialCommunityIcons name="lock" size={64} color={palette.lockScreenText} />`
- Line 49 (iconSize): `<MaterialCommunityIcons name="home" size={20} color={palette.lockScreenText} />`
- Line 64 (iconSize): `<MaterialCommunityIcons name="chart-bar" size={20} color={palette.lockScreenText} />`
- Line 79 (iconSize): `<MaterialCommunityIcons name="undo" size={20} color={palette.lockScreenText} />`
- Line 104 (fontSize): `fontSize: 28,`
- Line 109 (fontSize): `fontSize: 16,`
- Line 134 (fontSize): `fontSize: 16,`

## `components/SettingsBar.tsx`
- Line 184 (fontSize): `fontSize: 14,`
- Line 189 (fontSize): `fontSize: 12,`

## `components/TeamText.tsx`
- Line 41 (fontSize): `<ThemedText style={{ fontSize: 24, lineHeight }}>🥏</ThemedText>`

## `components/lines/PresetPickerModal.tsx`
- Line 50 (iconSize): `<MaterialCommunityIcons name="pencil" size={14} color={palette.modalTextMuted} />`
- Line 84 (iconSize): `<MaterialCommunityIcons name="check" size={16} color={palette.accent} />`
- Line 128 (fontSize): `fontSize: 16,`
- Line 139 (fontSize): `fontSize: 13,`
- Line 162 (fontSize): `fontSize: 15,`

## `components/lines/DraggablePresetItem.tsx`
- Line 113 (iconSize): `<MaterialCommunityIcons name="drag" size={22} color={palette.textMuted} />`
- Line 134 (iconSize): `<MaterialCommunityIcons name="pencil-outline" size={16} color={palette.textMuted} />`
- Line 144 (iconSize): `<MaterialCommunityIcons name="delete-outline" size={16} color={palette.danger} />`
- Line 174 (fontSize): `fontSize: 12,`
- Line 184 (fontSize): `fontSize: 15,`
- Line 188 (fontSize): `fontSize: 12,`

## `components/ui/AlertProvider.tsx`
- Line 83 (iconSize): `<MaterialCommunityIcons name="close" size={18} color={palette.textMuted} />`
- Line 196 (fontSize): `fontSize: 18,`
- Line 202 (fontSize): `fontSize: 14,`
- Line 212 (fontSize): `fontSize: 16,`
- Line 239 (fontSize): `fontSize: 15,`

## `components/ui/ScoreBadge.tsx`
- Line 105 (fontSize): `small: { fontSize: 13 },`
- Line 106 (fontSize): `medium: { fontSize: 16 },`
- Line 107 (fontSize): `large: { fontSize: 19 },`

## `components/ui/ShareConfirmModal.tsx`
- Line 75 (fontSize): `fontSize: 14,`
- Line 96 (fontSize): `fontSize: 15,`

## `components/stat-entry/StatEntryRoster.tsx`
- Line 62 (fontSize): `fontSize: 14,`

## `components/stat-entry/StatEntryHeader.tsx`
- Line 55 (fontSize): `fontSize: 12,`
- Line 62 (fontSize): `fontSize: 22,`
- Line 76 (fontSize): `fontSize: 10,`
- Line 82 (fontSize): `fontSize: 14,`

## `components/timeline/EventTimeline.tsx`
- Line 639 (fontSize): `fontSize: 28,`
- Line 643 (fontSize): `fontSize: 20,`
- Line 647 (fontSize): `fontSize: 11,`
- Line 685 (fontSize): `fontSize: 12,`
- Line 689 (fontSize): `fontSize: 16,`
- Line 698 (fontSize): `fontSize: 10,`
- Line 716 (fontSize): `fontSize: 11,`
- Line 735 (fontSize): `fontSize: 14,`
- Line 738 (fontSize): `fontSize: 11,`
- Line 743 (fontSize): `fontSize: 12,`
- Line 749 (fontSize): `fontSize: 10,`
- Line 755 (fontSize): `fontSize: 14,`
- Line 764 (fontSize): `fontSize: 11,`

## `components/view-stats/PlayerStatsSummary.tsx`
- Line 123 (fontSize): `fontSize: 14,`
- Line 127 (fontSize): `fontSize: 11,`

## `components/view-stats/StatsContent.tsx`
- Line 246 (fontSize): `fontSize: 12,`
- Line 260 (fontSize): `fontSize: 12,`

## `components/view-stats/AggregateBottomBar.tsx`
- Line 29 (iconSize): `<MaterialCommunityIcons name="chart-box" size={20} color={palette.textOnAccent} />`
- Line 62 (fontSize): `fontSize: 15, // Slightly smaller`

## `components/view-stats/ImpactTimeline.tsx`
- Line 228 (fontSize): `fontSize: 12,`
- Line 239 (fontSize): `fontSize: 32,`
- Line 243 (fontSize): `fontSize: 11,`
- Line 260 (fontSize): `fontSize: 10,`
- Line 279 (fontSize): `fontSize: 10,`
- Line 293 (fontSize): `fontSize: 11,`
- Line 307 (fontSize): `fontSize: 9,`
- Line 325 (fontSize): `fontSize: 10,`
- Line 329 (fontSize): `fontSize: 12,`

## `components/view-stats/SavedGamesBulkActions.tsx`
- Line 42 (iconSize): `<MaterialCommunityIcons name="close" size={20} color={palette.textOnAccent} />`
- Line 54 (iconSize): `<MaterialCommunityIcons name="share-variant" size={20} color={palette.textOnAccent} />`
- Line 67 (iconSize): `<MaterialCommunityIcons name="delete" size={20} color={palette.textOnAccent} />`
- Line 117 (fontSize): `fontSize: 15,`

## `components/view-stats/ChemistryMap.tsx`
- Line 258 (fontSize): `fontSize: 13,`
- Line 269 (fontSize): `fontSize: 32,`
- Line 273 (fontSize): `fontSize: 11,`
- Line 288 (fontSize): `fontSize: 10,`
- Line 309 (fontSize): `fontSize: 10,`

## `components/view-stats/RoleDiamond.tsx`
- Line 119 (fontSize): `fontSize: 12,`
- Line 137 (fontSize): `fontSize: 9,`
- Line 153 (fontSize): `fontSize: 9,`
- Line 163 (fontSize): `fontSize: 9,`

## `components/view-stats/PlayingTimeSection.tsx`
- Line 188 (fontSize): `fontSize: 10,`
- Line 203 (fontSize): `fontSize: 9,`
- Line 221 (fontSize): `fontSize: 14,`
- Line 225 (fontSize): `fontSize: 8,`

## `components/game-info/TimeoutCounter.tsx`
- Line 63 (fontSize): `fontSize: 28,`
- Line 71 (fontSize): `fontSize: 16,`
- Line 75 (fontSize): `fontSize: 11,`

## `components/tutorial/StatsTrackingTutorial.tsx`
- Line 194 (fontSize): `fontSize: 14,`
- Line 243 (fontSize): `fontSize: 16,`
- Line 254 (fontSize): `fontSize: 16,`

## `components/tutorial/TutorialOverlay.tsx`
- Line 206 (fontSize): `fontSize: 14,`
- Line 253 (fontSize): `fontSize: 16,`
- Line 264 (fontSize): `fontSize: 16,`
- Line 272 (fontSize): `fontSize: 12,`

## `components/tutorial/TutorialStep.tsx`
- Line 18 (iconSize): `<MaterialCommunityIcons name={icon} size={40} color={palette.accent} />`
- Line 41 (fontSize): `fontSize: 20,`
- Line 47 (fontSize): `fontSize: 15,`

## `components/toast/EventToast.tsx`
- Line 129 (fontSize): `fontSize: 15,`
