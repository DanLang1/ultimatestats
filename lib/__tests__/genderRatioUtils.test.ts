import {
  checkLineRatio,
  formatRatio,
  formatRatioFull,
  GenderRatio,
  getExpectedRatio,
  getSequenceNumber,
} from '../genderRatioUtils';

describe('getExpectedRatio', () => {
  describe('when first point ratio is more-women (FMP+)', () => {
    const firstRatio: GenderRatio = 'more-women';

    it('point 1 is more-women', () => {
      expect(getExpectedRatio(1, firstRatio)).toBe('more-women');
    });

    it('points 2-3 are more-men (reverse)', () => {
      expect(getExpectedRatio(2, firstRatio)).toBe('more-men');
      expect(getExpectedRatio(3, firstRatio)).toBe('more-men');
    });

    it('points 4-5 are more-women (same as first)', () => {
      expect(getExpectedRatio(4, firstRatio)).toBe('more-women');
      expect(getExpectedRatio(5, firstRatio)).toBe('more-women');
    });

    it('points 6-7 are more-men (reverse)', () => {
      expect(getExpectedRatio(6, firstRatio)).toBe('more-men');
      expect(getExpectedRatio(7, firstRatio)).toBe('more-men');
    });

    it('continues pattern for later points', () => {
      // Points 8-9: same as first
      expect(getExpectedRatio(8, firstRatio)).toBe('more-women');
      expect(getExpectedRatio(9, firstRatio)).toBe('more-women');
      // Points 10-11: reverse
      expect(getExpectedRatio(10, firstRatio)).toBe('more-men');
      expect(getExpectedRatio(11, firstRatio)).toBe('more-men');
    });
  });

  describe('when first point ratio is more-men (MMP+)', () => {
    const firstRatio: GenderRatio = 'more-men';

    it('point 1 is more-men', () => {
      expect(getExpectedRatio(1, firstRatio)).toBe('more-men');
    });

    it('points 2-3 are more-women (reverse)', () => {
      expect(getExpectedRatio(2, firstRatio)).toBe('more-women');
      expect(getExpectedRatio(3, firstRatio)).toBe('more-women');
    });

    it('points 4-5 are more-men (same as first)', () => {
      expect(getExpectedRatio(4, firstRatio)).toBe('more-men');
      expect(getExpectedRatio(5, firstRatio)).toBe('more-men');
    });

    it('points 6-7 are more-women (reverse)', () => {
      expect(getExpectedRatio(6, firstRatio)).toBe('more-women');
      expect(getExpectedRatio(7, firstRatio)).toBe('more-women');
    });
  });
});

describe('getSequenceNumber', () => {
  it('returns 2 for point 1 (second of initial pair)', () => {
    expect(getSequenceNumber(1)).toBe(2);
  });

  it('returns 1, 2 for points 2-3', () => {
    expect(getSequenceNumber(2)).toBe(1);
    expect(getSequenceNumber(3)).toBe(2);
  });

  it('returns 1, 2 for points 4-5', () => {
    expect(getSequenceNumber(4)).toBe(1);
    expect(getSequenceNumber(5)).toBe(2);
  });

  it('returns 1, 2 for points 6-7', () => {
    expect(getSequenceNumber(6)).toBe(1);
    expect(getSequenceNumber(7)).toBe(2);
  });

  it('continues pattern for later points', () => {
    expect(getSequenceNumber(8)).toBe(1);
    expect(getSequenceNumber(9)).toBe(2);
    expect(getSequenceNumber(10)).toBe(1);
    expect(getSequenceNumber(11)).toBe(2);
  });
});

describe('formatRatio', () => {
  it('formats more-women with sequence as F1 or F2', () => {
    expect(formatRatio('more-women', 1)).toBe('F1');
    expect(formatRatio('more-women', 2)).toBe('F2');
  });

  it('formats more-men with sequence as M1 or M2', () => {
    expect(formatRatio('more-men', 1)).toBe('M1');
    expect(formatRatio('more-men', 2)).toBe('M2');
  });
});

describe('formatRatioFull', () => {
  describe('without sequence number', () => {
    it('formats more-women as FMP Majority', () => {
      expect(formatRatioFull('more-women')).toBe('FMP Majority');
    });

    it('formats more-men as MMP Majority', () => {
      expect(formatRatioFull('more-men')).toBe('MMP Majority');
    });
  });

  describe('with sequence number', () => {
    it('formats more-women with sequence', () => {
      expect(formatRatioFull('more-women', 1)).toBe('1st FMP POINT');
      expect(formatRatioFull('more-women', 2)).toBe('2nd FMP POINT');
    });

    it('formats more-men with sequence', () => {
      expect(formatRatioFull('more-men', 1)).toBe('1st MMP POINT');
      expect(formatRatioFull('more-men', 2)).toBe('2nd MMP POINT');
    });
  });
});

describe('integration: full ABBA sequence with MMP first', () => {
  const firstRatio: GenderRatio = 'more-men';

  it('produces correct sequence M2, F1, F2, M1, M2, F1, F2...', () => {
    const expected = [
      { point: 1, display: 'M2' },
      { point: 2, display: 'F1' },
      { point: 3, display: 'F2' },
      { point: 4, display: 'M1' },
      { point: 5, display: 'M2' },
      { point: 6, display: 'F1' },
      { point: 7, display: 'F2' },
      { point: 8, display: 'M1' },
      { point: 9, display: 'M2' },
    ];

    expected.forEach(({ point, display }) => {
      const ratio = getExpectedRatio(point, firstRatio);
      const seq = getSequenceNumber(point);
      expect(formatRatio(ratio, seq)).toBe(display);
    });
  });
});

describe('integration: full ABBA sequence with FMP first', () => {
  const firstRatio: GenderRatio = 'more-women';

  it('produces correct sequence F2, M1, M2, F1, F2, M1, M2...', () => {
    const expected = [
      { point: 1, display: 'F2' },
      { point: 2, display: 'M1' },
      { point: 3, display: 'M2' },
      { point: 4, display: 'F1' },
      { point: 5, display: 'F2' },
      { point: 6, display: 'M1' },
      { point: 7, display: 'M2' },
      { point: 8, display: 'F1' },
      { point: 9, display: 'F2' },
    ];

    expected.forEach(({ point, display }) => {
      const ratio = getExpectedRatio(point, firstRatio);
      const seq = getSequenceNumber(point);
      expect(formatRatio(ratio, seq)).toBe(display);
    });
  });
});

describe('checkLineRatio', () => {
  // Helper to create a roster with specific gender composition
  const createRoster = (fmpIds: string[], mmpIds: string[], unassignedIds: string[] = []) => [
    ...fmpIds.map((id) => ({ id, matchingType: 'fmp' as const })),
    ...mmpIds.map((id) => ({ id, matchingType: 'mmp' as const })),
    ...unassignedIds.map((id) => ({ id, matchingType: null })),
  ];

  describe('when expected ratio is more-women (FMP)', () => {
    const expectedRatio: GenderRatio = 'more-women';

    it('returns isCorrect: true when FMP > MMP (4F/3M)', () => {
      const roster = createRoster(['f1', 'f2', 'f3', 'f4'], ['m1', 'm2', 'm3']);
      const playerIds = ['f1', 'f2', 'f3', 'f4', 'm1', 'm2', 'm3'];

      const result = checkLineRatio(playerIds, roster, expectedRatio);

      expect(result).not.toBeNull();
      expect(result!.isCorrect).toBe(true);
      expect(result!.fmpCount).toBe(4);
      expect(result!.mmpCount).toBe(3);
      expect(result!.expectedRatio).toBe('more-women');
    });

    it('returns isCorrect: false when MMP > FMP (3F/4M)', () => {
      const roster = createRoster(['f1', 'f2', 'f3'], ['m1', 'm2', 'm3', 'm4']);
      const playerIds = ['f1', 'f2', 'f3', 'm1', 'm2', 'm3', 'm4'];

      const result = checkLineRatio(playerIds, roster, expectedRatio);

      expect(result).not.toBeNull();
      expect(result!.isCorrect).toBe(false);
      expect(result!.fmpCount).toBe(3);
      expect(result!.mmpCount).toBe(4);
    });

    it('returns isCorrect: false when equal (3F/3M)', () => {
      const roster = createRoster(['f1', 'f2', 'f3'], ['m1', 'm2', 'm3']);
      const playerIds = ['f1', 'f2', 'f3', 'm1', 'm2', 'm3'];

      const result = checkLineRatio(playerIds, roster, expectedRatio);

      expect(result).not.toBeNull();
      expect(result!.isCorrect).toBe(false); // equal is not "more women"
    });
  });

  describe('when expected ratio is more-men (MMP)', () => {
    const expectedRatio: GenderRatio = 'more-men';

    it('returns isCorrect: true when MMP > FMP (4M/3F)', () => {
      const roster = createRoster(['f1', 'f2', 'f3'], ['m1', 'm2', 'm3', 'm4']);
      const playerIds = ['f1', 'f2', 'f3', 'm1', 'm2', 'm3', 'm4'];

      const result = checkLineRatio(playerIds, roster, expectedRatio);

      expect(result).not.toBeNull();
      expect(result!.isCorrect).toBe(true);
      expect(result!.fmpCount).toBe(3);
      expect(result!.mmpCount).toBe(4);
      expect(result!.expectedRatio).toBe('more-men');
    });

    it('returns isCorrect: false when FMP > MMP (4F/3M)', () => {
      const roster = createRoster(['f1', 'f2', 'f3', 'f4'], ['m1', 'm2', 'm3']);
      const playerIds = ['f1', 'f2', 'f3', 'f4', 'm1', 'm2', 'm3'];

      const result = checkLineRatio(playerIds, roster, expectedRatio);

      expect(result).not.toBeNull();
      expect(result!.isCorrect).toBe(false);
    });

    it('returns isCorrect: false when equal (3F/3M)', () => {
      const roster = createRoster(['f1', 'f2', 'f3'], ['m1', 'm2', 'm3']);
      const playerIds = ['f1', 'f2', 'f3', 'm1', 'm2', 'm3'];

      const result = checkLineRatio(playerIds, roster, expectedRatio);

      expect(result).not.toBeNull();
      expect(result!.isCorrect).toBe(false); // equal is not "more men"
    });
  });

  describe('edge cases', () => {
    it('returns null when no players have matching type set', () => {
      const roster = createRoster([], [], ['u1', 'u2', 'u3']);
      const playerIds = ['u1', 'u2', 'u3'];

      const result = checkLineRatio(playerIds, roster, 'more-women');

      expect(result).toBeNull();
    });

    it('returns null for empty player list', () => {
      const roster = createRoster(['f1', 'f2'], ['m1', 'm2']);
      const playerIds: string[] = [];

      const result = checkLineRatio(playerIds, roster, 'more-women');

      expect(result).toBeNull();
    });

    it('ignores players with null matching type in count', () => {
      const roster = createRoster(['f1', 'f2', 'f3', 'f4'], ['m1', 'm2'], ['u1']);
      const playerIds = ['f1', 'f2', 'f3', 'f4', 'm1', 'm2', 'u1'];

      const result = checkLineRatio(playerIds, roster, 'more-women');

      expect(result).not.toBeNull();
      expect(result!.fmpCount).toBe(4);
      expect(result!.mmpCount).toBe(2);
      expect(result!.isCorrect).toBe(true); // 4F > 2M
    });

    it('handles players not in roster gracefully', () => {
      const roster = createRoster(['f1'], ['m1']);
      const playerIds = ['f1', 'm1', 'unknown1', 'unknown2'];

      const result = checkLineRatio(playerIds, roster, 'more-women');

      expect(result).not.toBeNull();
      expect(result!.fmpCount).toBe(1);
      expect(result!.mmpCount).toBe(1);
      expect(result!.isCorrect).toBe(false); // 1F not > 1M
    });

    it('works with partial line selection', () => {
      const roster = createRoster(['f1', 'f2', 'f3'], ['m1', 'm2']);
      const playerIds = ['f1', 'f2', 'm1']; // Only 3 players selected

      const result = checkLineRatio(playerIds, roster, 'more-women');

      expect(result).not.toBeNull();
      expect(result!.fmpCount).toBe(2);
      expect(result!.mmpCount).toBe(1);
      expect(result!.isCorrect).toBe(true); // 2F > 1M
    });
  });
});
