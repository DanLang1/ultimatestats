/** Shared height for footer action rows, so swapping row content never resizes the player grid. */
const FOOTER_ACTION_HEIGHT = 62;
/** Short screens give the footer's height to the player grid instead. */
const COMPACT_FOOTER_ACTION_HEIGHT = 48;

export function getFooterActionHeight(isCompactHeight: boolean): number {
  return isCompactHeight ? COMPACT_FOOTER_ACTION_HEIGHT : FOOTER_ACTION_HEIGHT;
}

/** One phrasing for every "nobody holds the disc yet" prompt (point start and mid-point pickup). */
export const PICKUP_PROMPT_TEXT = 'TAP WHO HAS THE DISC';
