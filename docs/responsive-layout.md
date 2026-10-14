# Responsive Layout & Orientation

Every screen must work in both portrait and landscape. Orientation is locked only app-wide, from
Settings; screens never lock or unlock orientation themselves.

## Choose the Support Tier

1. **No special handling:** single-column scrollable or `maxWidth` card layouts adapt on their own.
2. **`createStyles(isLandscape)`:** multi-column layouts, flex-direction switches, or
   orientation-dependent spacing. This is the default for most screens.
3. **Inline `isLandscape` rendering:** only when a screen renders different UI per orientation, not
   just different styles.

## Style Factory Rules

- Bake orientation and size class into a `createStyles(...)` factory placed below the component, with
  one stylesheet per file.
- Do not use conditional style arrays or `*Portrait` / `*Landscape` variants for orientation.
  Conditional arrays remain fine for non-orientation state such as pressed or selected.
- Exception: when the rendering approach itself differs (for example `StatsTable` uses flex columns in
  landscape and a horizontal `ScrollView` in portrait), separate style sets and render paths are
  acceptable. Discuss with the engineer when the right approach is unclear.

## Rotation Gotchas

- **`transform: undefined` crashes on rotation.** React Native iterates the transform array, so omit
  the property with a conditional spread instead of setting it to `undefined`:
  `...(isLandscape ? {} : { transform: [{ translateY: -25 }] })`.
- **Flex layouts can keep stale values after rotation.** First count which flex properties differ
  between orientations:
  - Only `flexDirection`: remount the container with `key={isLandscape ? 'landscape' : 'portrait'}`.
  - Several (`flex`, `flexBasis`, `flexWrap`, ...): a key remount does not reliably fix it. Share one
    base style and let a single property differ (for example `minWidth: '45%'` in portrait).
