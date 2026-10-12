import { screen } from '@testing-library/react-native';

import AdvancedImpactTimeline, {
  formatImpactChartLabel,
} from '@/components/advancedTracking/AdvancedImpactTimeline';
import type {
  AdvancedImpactPoint,
  ImpactPart,
  ImpactPartCode,
} from '@/lib/advancedTracking/advancedImpactUtils';
import { renderScreen } from '@/test/render';

describe('AdvancedImpactTimeline', () => {
  it('names the split fault in the event log for each 50/50 role', async () => {
    const data: AdvancedImpactPoint[] = [
      {
        pointIndex: 0,
        onField: true,
        state: 'broken',
        plusMinusDelta: -0.5,
        cumulativePlusMinus: -0.5,
        parts: [{ code: 'FfT', count: 1, plusMinus: -0.5 }],
        score: '0-1',
      },
      {
        pointIndex: 1,
        onField: true,
        state: 'broken',
        plusMinusDelta: -0.5,
        cumulativePlusMinus: -1,
        parts: [{ code: 'FfD', count: 1, plusMinus: -0.5 }],
        score: '0-2',
      },
    ];

    await renderScreen(<AdvancedImpactTimeline data={data} />);

    expect(screen.getByText('50/50 Throw')).toBeVisible();
    expect(screen.getByText('50/50 Drop')).toBeVisible();
  });

  describe('formatImpactChartLabel', () => {
    const part = (code: ImpactPartCode, plusMinus: number, count = 1): ImpactPart => ({
      code,
      count,
      plusMinus,
    });

    it('returns null without impact events', () => {
      expect(formatImpactChartLabel([], 0)).toBeNull();
    });

    it('abbreviates a single event and keeps its count', () => {
      expect(formatImpactChartLabel([part('B', 1)], 1)).toBe('B');
      expect(formatImpactChartLabel([part('B', 2, 2)], 2)).toBe('2B');
      expect(formatImpactChartLabel([part('StlC', -1)], -1)).toBe('Stld');
      expect(formatImpactChartLabel([part('FfS', -1)], -1)).toBe('FF');
    });

    it('labels a multi-event point by its driving event with a + marker', () => {
      expect(formatImpactChartLabel([part('HA', 0), part('B', 1)], 1)).toBe('B+');
      expect(formatImpactChartLabel([part('A', 1), part('B', 2, 2)], 3)).toBe('2B+');
      expect(formatImpactChartLabel([part('HA', 0), part('T', -1)], -1)).toBe('T+');
    });
  });
});
