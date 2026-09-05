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

## Extend the design language with purpose

- Reuse the existing component, hook, layout, navigation, and styling patterns when they satisfy the
  requirement.
- Extend an existing primitive before creating a parallel component family.
- Keep the app's font family, semantic palette, and interaction language. Improve sizing,
  spacing, contrast, and composition when the current presentation is hard to read or feels flat;
  existing density is not a requirement to preserve.
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
- Follow the outlined-secondary-action convention in `docs/ui-patterns.md`: default to a
  transparent background, reserving tinted fills for meaningful selected, toggled, or active
  state.
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

## Readable hierarchy and card depth

The advanced stats refresh is a preferred starting point for analytics and other information-heavy
surfaces. Apply these principles to the content; do not force every screen into the same card layout.

- **Make labels readable, not merely the numbers.** Prefer larger, semibold labels and meaningful
  section titles over tiny uppercase captions. In the current analytics summary, base sizes are
  26 for values, 13 for labels/supporting text, and 15 for section headings, scaled through
  `scaleBySizeClass`. These are starting points, not universal sizes. Allow wrapping rather than
  shrinking important text to fit.
- **Group with surfaces and alignment.** Use one outer card for a coherent topic, a visibly distinct
  header band when a section needs an anchor, and consistent alignment between labels and values.
  Left-aligned metrics work well for scanning a dense summary; centered rings remain useful for
  visual comparisons. Avoid making every metric its own inset card.
- **Use restrained depth that is actually visible.** A subtle outer border, rounded container,
  contrasting header surface, and soft shadow can establish a card's shape without competing with
  its data. Use `statsCardBg` and `statsHeaderBg` for analytics surfaces and semantic palette tokens
  for borders and shadows. Check the result against the surrounding screen in both themes.
- **Do not use faint internal grids as the default cure for floating numbers.** Repeated hairline
  dividers and small decorative accent ticks add marks without necessarily clarifying hierarchy.
  Prefer spacing, readable typography, and surface contrast; add a separator only when it makes a
  specific boundary easier to understand. Subtle outer borders and internal grid lines serve
  different purposes.
- **Keep the useful summary visible; disclose secondary detail on demand.** For example, the flip
  card shows flips won and game results by starting possession up front, with choice breakdowns
  behind a collapsed Details expander. Preserve meaningful data rather than removing it to reduce
  clutter. Use a labeled chevron control with at least a 44-point-high tap target, expanded
  accessibility state, and pressed feedback. Hide the expander when there is no detail to reveal.
  Keep information required for a live tracking decision immediately accessible.
- **Separate surface styles from text styles.** Put a header row's background, padding, and rounded
  corners on its containing `View`; keep the inner title's style typographic. Reusing a rounded
  surface style on unpadded `Text` clipped the first letter of Efficiency and Throw Types on both
  platforms. Do not carry container geometry into an inner label through style overrides.

Implementation examples: `components/advancedTracking/AdvancedStatsContent.tsx` for section bands,
`components/view-stats/StatsGrid.tsx` (`summary`) for larger unboxed metrics, and
`components/advancedTracking/OpeningSetupStats.tsx` for progressive disclosure. Extend these only
when the new consumer needs it; do not add unused variants for hypothetical layouts.

## Verify

1. Run the smallest relevant tests.
2. Run `npm run check`.
3. For advanced-tracker flow changes, use `$maestro-advanced-tracker`.
4. Inspect portrait and landscape behavior at the supported size classes.
5. Check both light and dark themes and avoid platform-specific regressions.
