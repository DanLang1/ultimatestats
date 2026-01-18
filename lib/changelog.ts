export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
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
