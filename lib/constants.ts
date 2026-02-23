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
