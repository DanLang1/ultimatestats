import { screen } from '@testing-library/react-native';

import AdvancedImpactTimeline from '@/components/advancedTracking/AdvancedImpactTimeline';
import type { AdvancedImpactPoint } from '@/lib/advancedTracking/advancedImpactUtils';
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
        description: 'FfT',
        score: '0-1',
      },
      {
        pointIndex: 1,
        onField: true,
        state: 'broken',
        plusMinusDelta: -0.5,
        cumulativePlusMinus: -1,
        description: 'FfD',
        score: '0-2',
      },
    ];

    await renderScreen(<AdvancedImpactTimeline data={data} />);

    expect(screen.getByText('50/50 Throw')).toBeVisible();
    expect(screen.getByText('50/50 Drop')).toBeVisible();
  });
});
