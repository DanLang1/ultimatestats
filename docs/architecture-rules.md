# Architecture Rules & Patterns

> Additional coding rules and patterns learned from iterative development.

## Game Logic Rules

- **Game-over detection** lives in `lib/gameUtils.ts` - use `checkGameOver()` instead of duplicating logic across components
- When updating game end logic, also update `lib/__tests__/gameUtils.test.ts`
- **Halftime possession**: team that started with disc (`startingPossession`) pulls at halftime
- Always consider **soft cap** and **hard cap** scenarios when modifying game scoring

## Data Integrity Rules

- Player names must be unique **case-insensitively** across the roster
- Before deleting a player, check for stats in BOTH current game `events` AND all `savedGames`
- When adding new persisted data, consider adding `schemaVersion` for future migrations

## Navigation & Layout Rules

- **App is locked to landscape mode** - all screens designed for horizontal orientation
- Use `router.dismissTo('/')` not `router.back()` in modals (avoids "action not handled" errors)
- Single `SafeAreaProvider` at root only - don't add `SafeAreaView` in individual screens
- Apply consistent `contentStyle` background in `_layout.tsx` to prevent screen flickering
- For modals, set `gestureEnabled: false` and handle dismissal explicitly

## Dev/Build Rules

- App variants are configured in `app.config.js` (dev/preview/production)
- Use `npm run dev` for development builds with distinct package suffix
- OTA updates via `eas update` only work when JS bundle changes - native changes require new build

## Component Architecture

- **No sub-components in files** - each component should be in its own file
- **No raw colors** - everything abstracted into `theme/theme.ts`
- **Early return** in logic whenever possible
- Use `AlertProvider` for alerts - do NOT use native `Alert.alert()`

## State Management

- **Prefer derived state** over `useEffect` when possible
- If you must use `useEffect`, abstract it into a custom hook
- Never use `useCallback` or `useMemo` - using React Compiler
- Use **Immer** when updating object state for simplicity (already configured in store)

## Reanimated

- Do NOT use `runOnJs`, it's deprecated - use `scheduleOnRn` instead
- Follow existing animation patterns in `components/tutorial/` for gesture-based interactions
