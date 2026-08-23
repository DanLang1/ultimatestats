import { screen } from '@testing-library/react-native';

import LineupBlock from '@/components/advancedTracking/timeline/LineupBlock';
import { renderScreen } from '@/test/render';

describe('LineupBlock', () => {
  it('omits final-state badges when every player remains active', async () => {
    await renderScreen(
      <LineupBlock
        players={[
          { participantId: 'one', name: 'One', isActiveAtEnd: true },
          { participantId: 'two', name: 'Two', isActiveAtEnd: true },
        ]}
      />,
    );

    expect(screen.getByText('One')).toBeVisible();
    expect(screen.getByText('Two')).toBeVisible();
    expect(screen.queryByText('IN')).not.toBeOnTheScreen();
    expect(screen.queryByText('OUT')).not.toBeOnTheScreen();
  });

  it('shows every final state when a player finished out', async () => {
    await renderScreen(
      <LineupBlock
        players={[
          { participantId: 'one', name: 'One', isActiveAtEnd: true },
          { participantId: 'two', name: 'Two', isActiveAtEnd: false },
        ]}
      />,
    );

    expect(screen.getByText('IN')).toBeVisible();
    expect(screen.getByText('OUT')).toBeVisible();
  });
});
