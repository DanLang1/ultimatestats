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

export function formatRatio(ratio: GenderRatio): string {
  return ratio === 'more-women' ? 'FMP+' : 'MMP+';
}

export function formatRatioFull(ratio: GenderRatio): string {
  return ratio === 'more-women' ? 'FMP Majority' : 'MMP Majority';
}
