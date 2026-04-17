export type GenderRatio = 'more-women' | 'more-men';

export function getExpectedRatio(pointNumber: number, firstPointRatio: GenderRatio): GenderRatio {
  // Points 2-3 → pair 1 (reverse)
  // Points 4-5 → pair 2 (same)
  // Points 6-7 → pair 3 (reverse)
  const pairIndex = Math.floor((pointNumber - 2) / 2) + 1;
  const isReverse = pairIndex % 2 === 1;

  if (isReverse) {
    return firstPointRatio === 'more-women' ? 'more-men' : 'more-women';
  }
  return firstPointRatio;
}

/**
 * Get the sequence number (1 or 2) within the current ratio pair.
 * ABBA pattern: Point 1 is considered "2" of the initial pair,
 * then points 2-3 are 1,2 of reversed pair, points 4-5 are 1,2, etc.
 */
export function getSequenceNumber(pointNumber: number): 1 | 2 {
  if (pointNumber === 1) return 2;
  return pointNumber % 2 === 0 ? 1 : 2;
}

export function formatRatio(ratio: GenderRatio, sequenceNumber: 1 | 2): string {
  const letter = ratio === 'more-women' ? 'F' : 'M';
  return `${letter}${sequenceNumber}`;
}

export function formatRatioFull(ratio: GenderRatio, sequenceNumber?: 1 | 2): string {
  const abbrev = ratio === 'more-women' ? 'FMP' : 'MMP';
  if (sequenceNumber !== undefined) {
    const ordinal = sequenceNumber === 1 ? '1st' : '2nd';
    return `${ordinal} ${abbrev} POINT`;
  }
  return `${abbrev} Majority`;
}

export type RatioCheckResult = {
  isCorrect: boolean;
  fmpCount: number;
  mmpCount: number;
  expectedRatio: GenderRatio;
};

/**
 * Check if a line of players has the correct gender ratio.
 * Returns null if ratio can't be determined (e.g., players missing matchingType).
 */
export function checkLineRatio(
  playerIds: string[],
  roster: { id: string; matchingType: 'fmp' | 'mmp' | null }[],
  expectedRatio: GenderRatio,
): RatioCheckResult | null {
  let fmpCount = 0;
  let mmpCount = 0;

  for (const id of playerIds) {
    const player = roster.find((p) => p.id === id);
    if (player?.matchingType === 'fmp') {
      fmpCount++;
    } else if (player?.matchingType === 'mmp') {
      mmpCount++;
    }
  }

  // Can't determine if we don't have enough data
  if (fmpCount + mmpCount === 0) {
    return null;
  }

  const isCorrect = expectedRatio === 'more-women' ? fmpCount > mmpCount : mmpCount > fmpCount;

  return { isCorrect, fmpCount, mmpCount, expectedRatio };
}
