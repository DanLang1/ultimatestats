/** Maximum character length for team names (inputs + import truncation). */
export const MAX_TEAM_NAME_LENGTH = 30;

/** Maximum character length for player names (inputs + import truncation). */
export const MAX_PLAYER_NAME_LENGTH = 20;

/** Duration for transient "event recorded" toast visibility. */
export const EVENT_RECORDED_TOAST_DURATION_MS = 2000;

/** Maximum minutes allowed when editing a point duration. */
export const MAX_POINT_DURATION_MINUTES = 50;

// ── Layout breakpoints (dp) ───────────────────────────────────────────
// Used by useLayout() for size class and narrow/large-screen detection.

/** Smallest dimension >= this → `medium` size class (foldables, small tablets). */
export const SIZE_CLASS_MEDIUM_THRESHOLD = 600;

/** Smallest dimension >= this → `large` size class (tablets, desktop). */
export const SIZE_CLASS_LARGE_THRESHOLD = 790;
