import { screen } from '@testing-library/react-native';

import SavedGamesList from '@/components/view-stats/SavedGamesList';
import type { GameListItem } from '@/lib/gameListUtils';
import { renderScreen } from '@/test/render';

const games: GameListItem[] = [
  {
    kind: 'advanced',
    gameType: 'scrimmage',
    id: 'scrimmage',
    timestamp: 2,
    myTeamName: 'Light',
    opponentName: 'Dark',
    myScore: 5,
    opponentScore: 2,
    pointsTracked: 7,
  },
  {
    kind: 'advanced',
    gameType: 'game',
    id: 'advanced',
    timestamp: 1,
    myTeamName: 'Hybrid',
    opponentName: 'Rivals',
    myScore: 1,
    opponentScore: 0,
    pointsTracked: 1,
  },
];

describe('SavedGamesList', () => {
  it('labels scrimmages separately from other advanced games', async () => {
    await renderScreen(<SavedGamesList games={games} onSelectGame={() => {}} />);

    expect(screen.getByText('Scrimmage')).toBeVisible();
    expect(screen.getByText('Advanced')).toBeVisible();
  });
});
