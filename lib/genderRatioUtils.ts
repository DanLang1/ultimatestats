export type GenderRatio = 'more-women' | 'more-men';

export function getExpectedRatio(pointNumber: number, firstPointRatio: GenderRatio): GenderRatio {
  if (pointNumber === 1) return firstPointRatio;

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
  return ((pointNumber % 2) + 1) as 1 | 2;
}

export function formatRatio(ratio: GenderRatio, sequenceNumber: 1 | 2): string {
  const letter = ratio === 'more-women' ? 'F' : 'M';
  return `${letter}${sequenceNumber}`;
}

export function formatRatioFull(ratio: GenderRatio, sequenceNumber?: 1 | 2): string {
  const abbrev = ratio === 'more-women' ? 'FMP' : 'MMP';
  if (sequenceNumber !== undefined) {
    return `${abbrev} (${sequenceNumber})`;
  }
  return `${abbrev} Majority`;
}
