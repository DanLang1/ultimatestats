import { router } from 'expo-router';

/**
 * Which copy of a stats screen a link opens. Live-game screens sit on the main stack, above the
 * screen that opened them; saved-game screens sit in the hub's Stats tab. Pushed links from a live
 * screen must stay on live routes, because pushing a hub route from outside the hub stacks a
 * second hub. The end-of-game screens deliberately `replace` into the saved hub routes instead.
 */
export type StatsRouteScope = 'live' | 'saved';

export const BASIC_PLAYER_STATS_PATHNAME = {
  live: '/live-stats/player-stats',
  saved: '/player-stats',
} as const satisfies Record<StatsRouteScope, string>;

export const ADVANCED_PLAYER_STATS_PATHNAME = {
  live: '/live-stats/advanced-player-stats',
  saved: '/advanced-tracking/analytics/player-stats',
} as const satisfies Record<StatsRouteScope, string>;

export const ADVANCED_TIMELINE_PATHNAME = {
  live: '/live-stats/advanced-timeline/[gameId]',
  saved: '/advanced-tracking/analytics/timeline/[gameId]',
} as const satisfies Record<StatsRouteScope, string>;

export function isStatsRouteScope(value: string | undefined): value is StatsRouteScope {
  return value === 'live' || value === 'saved';
}

/**
 * Where a saved stats screen was opened from outside the Stats tab. The tab keeps Saved Games
 * beneath every screen in it, so Back from one of these origins returns to the Dashboard instead.
 */
export type StatsScreenOrigin = 'gameComplete' | 'dashboard';

export function leaveStatsScreen(from: StatsScreenOrigin | undefined) {
  if (!from) {
    router.back();
    return;
  }
  // Reset the tab to Saved Games first, or its next visit reopens this screen.
  router.dismissTo('/stats');
  router.navigate('/dashboard');
}
