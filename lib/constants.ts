/** Maximum character length for team names (inputs + import truncation). */
export const MAX_TEAM_NAME_LENGTH = 30;

/** Maximum character length for player names (inputs + import truncation). */
export const MAX_PLAYER_NAME_LENGTH = 20;

/** Maximum character length for player jersey numbers. */
export const MAX_PLAYER_NUMBER_LENGTH = 3;

/** Duration for transient "event recorded" toast visibility. */
export const EVENT_RECORDED_TOAST_DURATION_MS = 2000;

/** Maximum minutes allowed when editing a point duration. */
export const MAX_POINT_DURATION_MINUTES = 50;

/** Default halftime break length in seconds. */
export const DEFAULT_HALFTIME_BREAK_SECONDS = 7 * 60;

/** Default timeout length in seconds. */
export const DEFAULT_TIMEOUT_SECONDS = 70;

/** Cap progress bar turns red when time remaining drops below this (ms). */
export const CAP_WARNING_THRESHOLD_MS = 5 * 60 * 1000;

/** Earliest valid year for recorded Ultimate games in the played-at editor. */
export const MIN_PLAYED_AT_YEAR = 1968;

/** Maximum number of games that can be shared at once. */
export const MAX_SHARE_GAMES = 10;

/** Default React Query stale time in milliseconds. */
export const DEFAULT_QUERY_STALE_TIME_MS = 2 * 60 * 1000;

/** Maximum character length for tournament names. */
export const MAX_TOURNAMENT_NAME_LENGTH = 30;

export const LATEST_VERSION_JSON_URL = 'https://u-stat.app/latest-version.json';
export const APP_STORE_URL = 'https://apps.apple.com/us/app/u-stat/id6760956387';
export const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.langdk.ultimatestats';

// ── Layout breakpoints (dp) ───────────────────────────────────────────
// Used by useLayout() for size class and narrow/large-screen detection.

/** Smallest dimension >= this → `medium` size class (foldables, small tablets). */
export const SIZE_CLASS_MEDIUM_THRESHOLD = 600;

/** Smallest dimension >= this → `large` size class (tablets, desktop). */
export const SIZE_CLASS_LARGE_THRESHOLD = 790;

// ── Modal max widths by size class (dp) ──────────────────────────────
// Use with getSizeClassValue() for responsive modal sheet sizing.

/** Compact modal card (e.g. WinModal). */
export const MODAL_MAX_WIDTH_COMPACT = { small: 320, medium: 440, large: 520 } as const;

/** Standard info/alert modal (e.g. TimeoutModal, PointSummaryModal). */
export const MODAL_MAX_WIDTH_INFO = { small: 400, medium: 520, large: 600 } as const;

/** Simple form/edit modal (e.g. EditPlayerModal). */
export const MODAL_MAX_WIDTH_FORM = { small: 340, medium: 480, large: 560 } as const;

/** Picker/number-input modal (e.g. EditDurationModal, NumberPickerModal). */
export const MODAL_MAX_WIDTH_PICKER = { small: 420, medium: 520, large: 580 } as const;

/** Large content modal (e.g. HalftimeModal). */
export const MODAL_MAX_WIDTH_LARGE = { small: 680, medium: 780, large: 880 } as const;
