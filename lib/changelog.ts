export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.6.0',
    date: 'February 16, 2026',
    changes: [
      'Portrait Mode Support for entire app',
      'Can now import a team directly from a USAU link',
      'Revamped game start modals into a single page',
      'Updated team page to allow bulk editing',
      'Added toasts after recording turnover events',
      'Added point length editing via Game Timeline',
    ],
  },
  {
    version: '1.5.1',
    date: 'February 9, 2026',
    changes: [
      'Fixing line preset bugs',
      'Editing a line now has option for injury sub (appends player to line), or replace (line was set incorrectly, replace all players)',
      'Halftime continue button no longer starts point timer automatically, making point timer more consistent',
      'Adjusted thresholds for defensive efficiency to show success color',
      'Added a reset point timer in Game Info',
      'Portrait mode available in Dashboard (easiest screen to support). Will look into migrating other screens, especially Scoreboard in the future',
    ],
  },
  {
    version: '1.5.0',
    date: 'February 8, 2026',
    changes: [
      'Added game and team sharing via links',
      'Added playing time stats when line calling is enabled',
      'Added handling to keep screen on while on scoreboard',
      'Added setting to allow recording assists first',
      'Added an "Unknown" option for stat entry in case you didnt see who scored',
      'Added a "Cancel" option during stat entry in case score/turn was unintended',
      'Fixed a soft cap bug allowing game to score to reach over the original value',
      'Fixed a bug where canceling out of stat entry was not appending to game events',
      'Misc bug fixes with line presets',
    ],
  },
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
