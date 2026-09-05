import { screen } from '@testing-library/react-native';

import { ThemedText } from '@/components/ThemedText';
import PlayerSummaryCard from '@/components/view-stats/PlayerSummaryCard';
import { renderScreen } from '@/test/render';

it('keeps totals, game scope, and player profile visible side by side', async () => {
  await renderScreen(
    <PlayerSummaryCard
      name="Hayes"
      scope="4 combined games"
      plusMinus={5.5}
      badges={['1 Callahan']}
      stats={[{ label: 'Assists', value: 5 }]}
      profile={<ThemedText>Profile chart detail</ThemedText>}
    />,
  );
  expect(screen.getByText('4 combined games')).toBeTruthy();
  expect(screen.getByText('+5.5')).toBeTruthy();
  expect(screen.getByText('Net impact')).toBeTruthy();
  expect(screen.getByText('Assists')).toBeTruthy();
  expect(screen.getByText('Profile chart detail')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Player profile' })).toBeNull();
});
