# UI Patterns

Reusable UI conventions for screens and modals.

## Responsive Layout

- Use `useLayout()` for layout info.
- Prefer `createStyles(...)` style factories for orientation-aware styles.
- Keep orientation logic in style definitions, not ad-hoc inline conditionals.
- Reference: `docs/responsive-layout.md`.

## Screen Header Pattern

- Keep headers consistent:
`paddingTop: 8`
`paddingHorizontal: 16-20`
`paddingBottom: 10-12`
- Use explicit back/dismiss action and avoid render-time imperative navigation.
- Reference: `docs/architecture-rules.md`.

## Modal Shell Pattern

For transparent modal routes:

1. Wrap with `StyleSheet.absoluteFill`.
2. Use overlay backdrop + centered/bottom sheet content.
3. Set modal route options in `_layout.tsx`:
`presentation: 'transparentModal'`
`gestureEnabled: false`
`contentStyle: { backgroundColor: 'transparent' }`
4. Use `router.dismissTo(...)` for deterministic exits.

Reference: `docs/modals.md`.

## Safe Area Pattern

- Keep one root `SafeAreaProvider` only (`app/_layout.tsx`).
- Rely on root safe area for top/bottom.
- Use per-screen/per-modal insets only when specifically needed (commonly left/right padding).

## Theming Pattern

- Do not hardcode colors.
- Use tokens from `theme/theme.ts` and theme palette via `useTheme()`.
- For modals, follow modal token guidance in `docs/modals.md`.

## Component Placement

- One component per file.
- Avoid creating local subcomponents in the same file unless there is a strong reason.
- Prefer early returns for empty/error branches.

