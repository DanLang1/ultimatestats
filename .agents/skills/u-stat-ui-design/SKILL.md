---
name: u-stat-ui-design
description: Design, implement, or review U-Stat React Native and Expo user interfaces by extending the app's established UI conventions, especially current advanced-tracking patterns. Use for screens, modals, tracker controls, analytics views, responsive layouts, styling, interaction design, and visual polish. Prefer existing project patterns and alert the user with evidence before introducing a new UI architecture, library, or platform convention.
---

# U-Stat UI Design

Build polished mobile UI that feels native to the existing U-Stat product.

## Start from the current product

1. Read `docs/README.md` and the domain docs it routes to.
2. For screen or modal work, read:
   - `docs/ui-patterns.md`
   - `docs/navigation-map.md`
   - `docs/responsive-layout.md`
   - `docs/theming.md`
   - `docs/platform-support.md`
3. Inspect the target file and nearby components before designing the change.
4. For newer implementation examples, consult
   [references/current-patterns.md](references/current-patterns.md) and the relevant
   `advancedTracking` folders.

Treat `AGENTS.md` and domain docs as contracts. Treat existing code as evidence of convention, not
as permission to copy every historical detail.

## Prefer convention over novelty

- Reuse the existing component, hook, layout, navigation, and styling patterns when they satisfy the
  requirement.
- Extend an existing primitive before creating a parallel component family.
- Keep the app's established typography, semantic palette, density, shapes, and interaction
  language unless the user explicitly requests a redesign.
- Avoid introducing a new abstraction merely because it is fashionable or personally preferable.
- Keep a feature change focused; do not silently turn it into a design-system migration.

Introduce a new pattern only when there is a concrete reason, such as:

- the existing pattern cannot satisfy a stated requirement;
- current official React Native, Expo, or library documentation deprecates or replaces it;
- the existing pattern causes a demonstrated correctness, accessibility, performance, or
  maintainability problem;
- a new dependency or platform capability was explicitly approved and changes the best approach.

When one of these applies, tell the user what is outdated or insufficient, cite the evidence, and
describe the migration impact. If the broader migration is not required for the requested change,
keep it separate.

## Implementation conventions

- Target iOS and Android. Web support is deferred.
- Use `ThemedText`, `ThemedView`, `useTheme()`, semantic palette tokens, and `Fonts`.
- Add missing theme values to `theme/theme.ts`; do not branch styles on `themeMode`.
- Use `useLayout()`, size-class helpers, and the responsive style-factory conventions from
  `docs/responsive-layout.md`.
- Keep substantial style definitions in `StyleSheet.create`, normally through a `createStyles`
  function below the component when styles depend on layout or palette inputs.
- Derive render state directly. Use effects only for synchronization with an external system, and
  extract substantial effects into focused hooks.
- Keep route files focused on route state and composition. Move reusable UI and substantial
  interaction logic into components or hooks.
- Use `<Redirect href="..." />` for render-time routing. Put imperative navigation in event handlers
  or lifecycle callbacks.
- Prefer exported, named domain types across storage, analytics, state, and UI boundaries.
- Preserve existing accessibility labels, test IDs, touch targets, and gesture semantics. Add stable
  test IDs when a user-facing flow needs device automation.
- Await persistence before dismissing, navigating, or invalidating saved state.

## Design quality

- Establish purpose, hierarchy, primary action, information density, and interaction feedback before
  styling.
- Add visual distinction through composition and refinement within the existing design language,
  not through arbitrary fonts, palettes, gradients, or motion.
- Use motion when it clarifies state, confirms an action, or supports spatial continuity. Avoid
  decorative motion that slows live tracking.
- Optimize tracker surfaces for fast, repeatable use under game conditions. Optimize analytics
  surfaces for scanability and comparison.
- Check empty, loading, error, disabled, pressed, and long-content states.

## Verify

1. Run the smallest relevant tests.
2. Run `npm run check`.
3. For advanced-tracker flow changes, use `$maestro-advanced-tracker`.
4. Inspect portrait and landscape behavior at the supported size classes.
5. Check both light and dark themes and avoid platform-specific regressions.
