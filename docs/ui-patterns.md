# UI Patterns

Reusable UI conventions for screens and modals. For orientation and sizing, see
[responsive-layout.md](responsive-layout.md).

## Headers

Use `components/ui/ScreenHeader.tsx` for main screens and `components/ui/ResponsiveHeaderActions.tsx`
for right-slot actions, so every screen shares one inline-vs-overflow implementation.

## Modals

- Exit with `router.back()`. Use `router.dismissTo(...)` only when the target may not be directly
  underneath (the modal can be reached by `<Redirect>`, as `HalftimeModal` is) or the exit must
  change the target's params (`AdvancedGameSelectorModal` game selection).
- Never call `showAlert` (`components/ui/AlertProvider.tsx`) from a modal route. Its root RN
  `<Modal>` cannot present over an Expo Router modal on iOS; it stays invisible and keeps swallowing
  touches after the route closes. Confirm inside the sheet instead (a `confirmingDelete` state that
  swaps the sheet body). oxlint rejects importing `useAlert` in `app/(modals)/`, but it cannot see
  indirect calls, so keep `showAlert` out of hooks and components that modal routes render.
- Prefer the `modalBg`, `modalText`, and `modalTextMuted` palette tokens for modal content.

## Keyboard

For screens and sheets with text input, use `KeyboardAvoidingView` from
`react-native-keyboard-controller` with `automaticOffset`. Use `behavior="height"` when lower content
must remain reachable above the keyboard, and `behavior="padding"` for top-aligned inputs that
should stay anchored while their scrollable area gains keyboard space. For a long or dynamically
changing form, use `KeyboardAwareScrollView` with a small `bottomOffset` so the focused input stays
visible throughout the keyboard animation.

## Safe Areas

Rely on the root safe area for top and bottom insets. Use per-screen or per-modal insets only when
specifically needed, commonly for left/right padding.

## Error Boundaries

- Every screen already gets `ScreenErrorBoundary` through the root layout's
  `unstable_settings.screenErrorBoundary`. Do not export per-screen or per-layout `ErrorBoundary`s.
- `RootErrorBoundary` is the last resort for errors thrown by layouts themselves. Keep layouts thin
  so screen errors stay screen-scoped.
- Use the dev-only `/__dev_crash__` route to exercise the screen boundary. Do not add crash triggers
  to real screens.

## Controls

- Outlined secondary actions use a transparent background by default; the semantic border, icon,
  and label colors carry the affordance. Add a tinted fill only for meaningful state such as
  selected, toggled, or active.
- Required segmented inputs show a `Required` chip and highlighted border until a value is chosen,
  then a one-shot confirmation pulse (`SegmentedControl`).

## Component Placement

- One component per file; avoid local subcomponents unless there is a strong reason.
- Prefer early returns for empty and error branches.
