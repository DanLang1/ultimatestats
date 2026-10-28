import { useNavigation } from 'expo-router';

// Route names, not hrefs, so typed routes don't check them: '(analytics)' is the hub tab in
// app/(main)/(hub)/_layout.tsx and 'live-stats' is app/(main)/(hub)/(analytics)/live-stats.tsx.
// .maestro/tests/basic-scoreboard-live-stats.yml fails if a rename breaks them.
type OpenLiveStatsNavigation = {
  navigate: (
    name: '(analytics)',
    params: { screen: 'live-stats'; initial: false; pop: true },
  ) => void;
};

/**
 * Opens live stats in the Stats tab from another hub tab. `initial: false` puts the Stats list
 * under it when the tab's stack is first created, so back lands on the list. `pop` returns to the
 * tab's existing live-stats screen, closing anything opened over it;
 * `router.navigate('/live-stats')` would stack a second live-stats screen on top instead, which
 * expo-router's `router` cannot avoid.
 *
 * TODO: Revisit on Expo Router upgrades and replace this hook with `router` or navigator config.
 * As of expo-router 57: `router.navigate`/`replace`/`dismissTo` become a tab `JUMP_TO` that drops
 * `pop`, and the `(analytics)` tab's `popToTopOnBlur` never reset the stack because its tab
 * transition is restarted before it reports finished
 */
export function useOpenLiveStats(): () => void {
  const navigation = useNavigation<OpenLiveStatsNavigation>();

  return () =>
    navigation.navigate('(analytics)', { screen: 'live-stats', initial: false, pop: true });
}
