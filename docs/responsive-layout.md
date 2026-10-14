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

## Sizing by Size Class

- Default to `scaleBySizeClass(phoneValue, sizeClass)` for fonts, spacing, and icons.
- Use a `getSizeClassValue({ small, medium, large })` table only when a value differs by design
  rather than by scale (layout widths, column counts, a deliberately larger tablet jump), and say
  why in a comment.
- Derive dependent sizes from the same scaled value instead of fixed numbers: a circle's radius is
  half its scaled size, and a spacer that balances a scaled icon uses that icon's scaled width. A
  fixed `maxWidth` around scaled text truncates it on tablets.

## Layout Gotchas

- **`flex: 1` on a child of an auto-height column hides its height.** The child gets a zero flex
  basis, so the parent is laid out as if the child had no height and the child overflows. A footer
  measured this way pushed its buttons off small screens. Give such children their natural height
  (no `flex: 1`); use `flex: 1` only where the parent has a constrained height.

## Rotation Gotchas

- **`transform: undefined` crashes on rotation.** React Native iterates the transform array, so omit
  the property with a conditional spread instead of setting it to `undefined`:
  `...(isLandscape ? {} : { transform: [{ translateY: -25 }] })`.
- **Flex layouts can keep stale values after rotation.** First count which flex properties differ
  between orientations:
  - Only `flexDirection`: remount the container with `key={isLandscape ? 'landscape' : 'portrait'}`.
  - Several (`flex`, `flexBasis`, `flexWrap`, ...): a key remount does not reliably fix it. Share one
    base style and let a single property differ (for example `minWidth: '45%'` in portrait).
