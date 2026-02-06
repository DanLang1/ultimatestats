export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.4.0',
    date: 'February 5, 2026',
    changes: [
      'Added line management - enable in settings and set lines from the team management screen',
      'Added bulk delete and filters/search for saved games',
    ],
  },
  {
    version: '1.3.0',
    date: 'January 28, 2026',
    changes: [
      'Added timeouts to game events, they now show in game timeline and can be restored by pressing undo',
      'Added popup modal when timeout is taken with timer',
      'Added timeout counter to the floating action bar',
    ],
  },
  {
    version: '1.2.0',
    date: 'January 24, 2026',
    changes: [
      'Added gender ratio tracking for Ratio Rule A (ABBA) format',
      'Added FMP/MMP coloring to players, customizable from settings',
      'Added optional point timer for tracking point duration',
      'Added avg point duration and other timing related stats when point timer is used',
      'Added event timestamps in game timeline, made more events editable',
      'Revamped game info screen to show current point length, gender ratio, and other info',
      'Added custom numeric input for game to, hard cap, and soft cap in Settings',
    ],
  },
  {
    version: '1.1.0',
    date: 'January 17, 2026',
    changes: [
      'Added halftime modal',
      'Added event editing in timeline (long press events with a border)',
      'Game timeline now tracks each event during a point instead of only after a point is scored',
      'Made 50/50 badges longer to show both player names',
      'Team name can now be edited during a game',
      'Added FMP/MMP designation to players, can be set in the roster management screen. Currently no stats attached to this, but allows it in the future',
      'Starting a new game from settings now takes you directly to the begin game modal',
    ],
  },
  {
    version: '1.0.2',
    date: 'January 11, 2026',
    changes: [
      'Added dashboard menu with more pages',
      'Updated team/roster management',
      'Updated begin game modal',
    ],
  },
  {
    version: '1.0.1',
    date: 'January 9, 2026',
    changes: [
      'Added PDF export for game stats (limited details for now, will add more later)',
      'Fixed rapid tap scoring bug',
      'Improved halftime/timeout settings',
    ],
  },
  {
    version: '1.0.0',
    date: 'January 5, 2026',
    changes: [
      'Initial release',
      'Basic scoreboard with customizable colors',
      'Stat tracking with per-player analytics',
      'CSV export functionality',
      'Team roster management',
    ],
  },
];
