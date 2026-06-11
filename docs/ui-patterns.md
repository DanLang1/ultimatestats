# UI Patterns

Reusable UI conventions for screens and modals.

## Responsive Layout

- For any new screen, start with [responsive-layout.md](responsive-layout.md) first.
- Use `useLayout()` for layout info.
- Prefer `createStyles(...)` style factories for orientation-aware styles.
- Keep orientation logic in style definitions, not ad-hoc inline conditionals.
- Reference: [responsive-layout.md](responsive-layout.md).

## Screen Header Pattern

- Keep headers consistent:
  `paddingTop: 8`
  `paddingHorizontal: 16-20`
  `paddingBottom: 10-12`
- Prefer the shared header component for main screens: `components/ui/ScreenHeader.tsx`.
- In portrait, keep the title visually centered using an absolute, non-interactive title layer:
  `...StyleSheet.absoluteFillObject`, `justifyContent: 'center'`, `alignItems: 'center'`, `pointerEvents="none"`.
- Keep interactive controls in left/right slots and cap right-side actions in portrait (use overflow when needed) to avoid title drift.
- **Tablet portrait rule**: use `showInlineHeaderActions = isLandscape || sizeClass !== 'small'` to decide between inline icons vs. overflow `...` menu. Tablets (`medium`/`large`) always get inline icons; phones (`small`) get the overflow menu in portrait.
  ```tsx
  const { isLandscape, sizeClass } = useLayout();
  const showInlineHeaderActions = isLandscape || sizeClass !== 'small';
  ```
- Prefer `components/ui/ResponsiveHeaderActions.tsx` for composed right-slot actions so screens reuse one inline-vs-overflow implementation.
- Use explicit back/dismiss action and avoid render-time imperative navigation.
- Reference: `AGENTS.md`.

Example:

```tsx
<ScreenHeader
  title="SETTINGS"
  onBack={() => router.back()}
  titleColor={palette.textMuted}
  backButtonBackgroundColor={palette.overlay10}
  rightSlot={<ResponsiveHeaderActions actions={headerActions} />}
/>
```

## Modal Shell Pattern

For transparent modal routes:

1. Wrap with `StyleSheet.absoluteFill`.
2. Use overlay backdrop + centered/bottom sheet content.
3. Set modal route options in `_layout.tsx`:
   `presentation: 'transparentModal'`
   `contentStyle: { backgroundColor: 'transparent' }`
4. Use `router.dismissTo(...)` for deterministic exits.

## Safe Area Pattern

- Keep one root `SafeAreaProvider` only (`app/_layout.tsx`).
- Rely on root safe area for top/bottom.
- Use per-screen/per-modal insets only when specifically needed (commonly left/right padding).

## Theming Pattern

- Do not hardcode colors.
- Use tokens from `theme/theme.ts` and theme palette via `useTheme()`.
- For modal content, prefer `modalBg`, `modalText`, and `modalTextMuted`.

## Required Field Attention Pattern

- Default pattern for required segmented inputs:
  - Add a `Required` chip next to the label.
  - Use a highlighted border until the user selects a value.
  - Trigger a one-shot confirmation pulse after first selection.
- For side-specific choices (team/player split), use side highlight colors:
  - `highlightLeftColor` for left option cue.
  - `highlightRightColor` for right option cue.
- Current implementation:
  - `components/ui/SegmentedControl.tsx`
  - `app/(main)/PreGameConfirm.tsx`

## Orbit Attention Pattern (Optional)

- Orbit runners are preserved as an optional, higher-attention variant for segmented controls.
- Use when a temporary motion cue is preferred over static required affordances.
- Primary implementation:
  - Hook: `components/ui/hooks/useAttentionBorderRunner.ts`
  - Rendering integration: `components/ui/SegmentedControl.tsx` via
    `attentionEnabled`, `attentionColor`, and `attentionSecondaryColor`.
- Recommendation: use sparingly and only for short onboarding moments to avoid persistent visual noise.

## Component Placement

- One component per file.
- Avoid creating local subcomponents in the same file unless there is a strong reason.
- Prefer early returns for empty/error branches.
