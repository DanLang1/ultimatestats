import {
  clamp01,
  formatRawValue,
  getContextLabel,
  getMetricTone,
  getRelativeLabel,
  getSampleWarningLabel,
  RelativeEventRow,
  RelativePlayingTimeRow,
} from '../relativeStatsViewUtils';

function makeEventMetric(overrides: Partial<RelativeEventRow> = {}): RelativeEventRow {
  return {
    category: 'event',
    key: 'goals',
    label: 'Goals',
    raw: 2,
    teamAvg: 1,
    teamMax: 3,
    teamMin: 0,
    deltaFromAvg: 1,
    ratioToAvg: 2,
    pctOfMax: 2 / 3,
    higherIsBetter: true,
    rank: 1,
    teamPoolSize: 3,
    ...overrides,
  };
}

function makePlayingTimeMetric(
  overrides: Partial<RelativePlayingTimeRow> = {},
): RelativePlayingTimeRow {
  return {
    category: 'playingTime',
    key: 'pointWinRate',
    label: 'Point Win Rate',
    raw: 67,
    teamAvg: 50,
    teamMax: 100,
    teamMin: 0,
    deltaFromAvg: 17,
    ratioToAvg: 1.34,
    pctOfMax: 0.67,
    higherIsBetter: true,
    rank: 1,
    format: 'percent',
    detail: '2/3',
    teamPoolSize: 3,
    ...overrides,
  };
}

describe('relativeStatsViewUtils', () => {
  describe('getMetricTone', () => {
    it('uses rounded displayed percentages for percentage playing-time tone', () => {
      expect(
        getMetricTone(makePlayingTimeMetric({ raw: 50.4, teamAvg: 50, deltaFromAvg: 0.4 })),
      ).toBe('neutral');
      expect(
        getMetricTone(makePlayingTimeMetric({ raw: 50.6, teamAvg: 50, deltaFromAvg: 0.6 })),
      ).toBe('good');
    });

    it('treats rounded-equal percentage metrics as neutral', () => {
      expect(
        getMetricTone(
          makePlayingTimeMetric({
            raw: 42.6,
            teamAvg: 43.4,
            deltaFromAvg: -0.8,
          }),
        ),
      ).toBe('neutral');
    });

    it('respects lower-is-better event metrics', () => {
      const turnoverMetric = makeEventMetric({
        key: 'throwaways',
        label: 'Throwaways',
        higherIsBetter: false,
        raw: 1,
        teamAvg: 2,
        teamMax: 4,
        teamMin: 0,
        deltaFromAvg: -1,
      });
      expect(getMetricTone(turnoverMetric)).toBe('good');
    });
  });

  describe('getRelativeLabel', () => {
    it('formats event metrics in avg mode', () => {
      expect(getRelativeLabel(makeEventMetric(), 'avg')).toBe('2x avg');
      expect(
        getRelativeLabel(
          makeEventMetric({
            key: 'plusMinus',
            label: 'Plus/Minus',
            raw: 3,
            teamAvg: 1.5,
            teamMax: 5,
            teamMin: -1,
            deltaFromAvg: 1.5,
            ratioToAvg: 2,
            pctOfMax: null,
          }),
          'avg',
        ),
      ).toBe('+1.5 vs avg');
    });

    it('formats playing-time percent deltas as whole numbers without % suffix', () => {
      expect(
        getRelativeLabel(
          makePlayingTimeMetric({ raw: 62.6, teamAvg: 50, deltaFromAvg: 12.6 }),
          'avg',
        ),
      ).toBe('+13 vs avg');
      expect(
        getRelativeLabel(
          makePlayingTimeMetric({ raw: 41.8, teamAvg: 50, deltaFromAvg: -8.2 }),
          'avg',
        ),
      ).toBe('-8 vs avg');
    });

    it('uses displayed rounded percentages for avg diff labels', () => {
      expect(
        getRelativeLabel(
          makePlayingTimeMetric({
            raw: 42.6,
            teamAvg: 43.4,
            deltaFromAvg: -0.8,
          }),
          'avg',
        ),
      ).toBe('even with avg');
    });

    it('formats playing-time duration and max-mode usage labels', () => {
      const minutesMetric = makePlayingTimeMetric({
        key: 'minutesPlayed',
        label: 'Minutes Played',
        format: 'duration',
        raw: 5.5,
        teamAvg: 4,
        teamMax: 7.25,
        teamMin: 1,
        deltaFromAvg: 1.5,
        ratioToAvg: 1.375,
        pctOfMax: 5.5 / 7.25,
        detail: undefined,
      });
      expect(getRelativeLabel(minutesMetric, 'avg')).toBe('+1:30 vs avg');
      expect(getRelativeLabel(minutesMetric, 'max')).toBe('76% of high');
    });
  });

  describe('getSampleWarningLabel', () => {
    it('shows warnings only for 1-sample playing-time rate metrics', () => {
      expect(
        getSampleWarningLabel(makePlayingTimeMetric({ key: 'pointWinRate', detail: '1/1' })),
      ).toBe('1 pt sample');
      expect(
        getSampleWarningLabel(
          makePlayingTimeMetric({ key: 'oEfficiency', label: 'O-Eff', detail: '1/1' }),
        ),
      ).toBe('1 O-pt sample');
      expect(
        getSampleWarningLabel(
          makePlayingTimeMetric({ key: 'dEfficiency', label: 'D-Eff', detail: '0/1' }),
        ),
      ).toBe('1 D-pt sample');

      expect(getSampleWarningLabel(makePlayingTimeMetric({ detail: '2/3' }))).toBeNull();
      expect(
        getSampleWarningLabel(
          makePlayingTimeMetric({ key: 'pointsPlayed', label: 'Points Played', detail: undefined }),
        ),
      ).toBeNull();
      expect(getSampleWarningLabel(makeEventMetric())).toBeNull();
    });
  });

  describe('getContextLabel / formatRawValue', () => {
    it('formats context and raw values by metric type', () => {
      expect(getContextLabel(makeEventMetric(), 'avg')).toBe('Team avg 1');
      expect(formatRawValue(makeEventMetric({ key: 'plusMinus', raw: 3 }))).toBe('+3');
      expect(
        formatRawValue(
          makePlayingTimeMetric({
            key: 'playingTimePercent',
            label: 'Playing Time %',
            format: 'percent',
            raw: 42.2,
            detail: undefined,
          }),
        ),
      ).toBe('42%');
    });
  });

  describe('clamp01', () => {
    it('clamps values to the 0..1 range', () => {
      expect(clamp01(-1)).toBe(0);
      expect(clamp01(0.25)).toBe(0.25);
      expect(clamp01(2)).toBe(1);
    });
  });
});
