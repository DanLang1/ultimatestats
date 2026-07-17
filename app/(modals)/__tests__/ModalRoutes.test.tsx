import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import AdvancedGameSelectorModal from '@/app/(modals)/AdvancedGameSelectorModal';
import EditDurationModal from '@/app/(modals)/EditDurationModal';
import EditEventModal from '@/app/(modals)/EditEventModal';
import EditPlayerModal from '@/app/(modals)/EditPlayerModal';
import GameSelectorModal from '@/app/(modals)/GameSelectorModal';
import HalftimeModal from '@/app/(modals)/HalftimeModal';
import NumberPickerModal from '@/app/(modals)/NumberPickerModal';
import PointSummaryModal from '@/app/(modals)/PointSummaryModal';
import StatEntryModal from '@/app/(modals)/StatEntryModal';
import TeamManagementModal from '@/app/(modals)/TeamManagementModal';
import TimeoutModal from '@/app/(modals)/TimeoutModal';
import TurnoverEntryModal from '@/app/(modals)/TurnoverEntryModal';
import { useGameStore } from '@/store/basic/gameStore';
import { useNumberPickerStore } from '@/store/numberPickerStore';
import { usePlayerStatsStore } from '@/store/playerStatsStore';
import {
  arrangeAdvancedGame,
  arrangeBasicGame,
  cacheCurrentAdvancedGame,
  createSavedBasicGame,
  testTeam,
} from '@/test/fixtures/domain';
import { resetAllStores } from '@/test/fixtures/resetStores';
import { resetMockRouter, setMockSearchParams } from '@/test/mocks/expoRouter';
import { renderScreen } from '@/test/render';

describe('modal routes', () => {
  beforeEach(async () => {
    resetAllStores();
    resetMockRouter();
    await AsyncStorage.clear();
  });

  it('redirects before rendering player controls when the requested player is missing', async () => {
    useGameStore.setState({ currentTeam: testTeam });
    setMockSearchParams({ playerId: 'missing-player' });

    await renderScreen(<EditPlayerModal />);

    expect(router.replace).toHaveBeenCalledWith('/EditRoster', {
      relativeToDirectory: undefined,
      withAnchor: undefined,
    });
    expect(screen.queryByText('EDIT PLAYER')).not.toBeOnTheScreen();
  });

  it('saves a value through the real number-picker store callback', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    useNumberPickerStore.getState().open({
      value: 5,
      min: 1,
      max: 30,
      label: 'Game To',
      quickOptions: [15],
      onChange,
    });
    await renderScreen(<NumberPickerModal />);

    expect(screen.getByText('Game To')).toBeVisible();

    await user.press(screen.getByText('15'));
    await user.press(screen.getByText('Save'));

    expect(onChange).toHaveBeenCalledWith(15);
    expect(useNumberPickerStore.getState().isActive).toBe(false);
  });

  it('renders duration editing for a real current-game event', async () => {
    arrangeBasicGame({ statTrackingEnabled: true });
    useGameStore.setState({
      events: [
        {
          type: 'goal',
          team: 'team1',
          goalPlayerId: 'player-alex',
          assistPlayerId: 'player-blair',
          pointNumber: 1,
          elapsedMs: 30_000,
        },
      ],
    });
    setMockSearchParams({
      eventIndex: '0',
      gameId: 'current',
      currentDurationMs: '30000',
      editorType: 'event',
    });

    await renderScreen(<EditDurationModal />);

    expect(screen.getByText('Edit Event Time')).toBeVisible();
    expect(screen.getByText('sec')).toBeVisible();
    expect(screen.getByText('Save')).toBeVisible();
  });

  it('renders event editing from a real turnover event and roster', async () => {
    arrangeBasicGame({ statTrackingEnabled: true });
    useGameStore.setState({
      events: [
        {
          type: 'turnover',
          team: 'team1',
          subtype: 'throwaway',
          playerId: 'player-alex',
          pointNumber: 1,
        },
      ],
    });
    setMockSearchParams({
      eventIndex: '0',
      eventType: 'turnover',
      playerId: 'player-alex',
      player2Id: 'null',
      subtype: 'throwaway',
      originalTeam: 'team1',
      gameId: 'current',
    });

    await renderScreen(<EditEventModal />);

    expect(screen.getByText('Edit Event')).toBeVisible();
    expect(screen.getByText('Throwaway')).toBeVisible();
    expect(screen.getByText('Alex')).toBeVisible();
  });

  it('renders player editing from the real roster store', async () => {
    useGameStore.setState({ currentTeam: testTeam });
    setMockSearchParams({ playerId: 'player-alex' });

    await renderScreen(<EditPlayerModal />);

    expect(screen.getByText('EDIT PLAYER')).toBeVisible();
    expect(screen.getByDisplayValue('Alex')).toBeVisible();
    expect(screen.getByDisplayValue('7')).toBeVisible();
    expect(screen.getByText('Save')).toBeVisible();
  });

  it('renders the basic player game selector from real player-stat data', async () => {
    const game = createSavedBasicGame();
    usePlayerStatsStore
      .getState()
      .openPlayerStats('player-alex', game.events, 'team1', testTeam.roster, [game]);

    await renderScreen(<GameSelectorModal />);

    expect(screen.getByText('SELECT GAME')).toBeVisible();
    expect(screen.getByText('vs Rivals')).toBeVisible();
  });

  it('renders the advanced game selector through the real advanced query hook', async () => {
    arrangeAdvancedGame();
    const game = cacheCurrentAdvancedGame();
    setMockSearchParams({
      participantId: 'player-alex',
      aggregateGameIds: game.id,
    });

    await renderScreen(<AdvancedGameSelectorModal />);

    expect(screen.getByText('SELECT GAME')).toBeVisible();
  });

  it('renders halftime from real game and timer state', async () => {
    arrangeBasicGame({ statTrackingEnabled: true });
    useGameStore.setState({ isHalftimeBreak: true, team1Score: 8, team2Score: 6 });

    await renderScreen(<HalftimeModal />);

    expect(screen.getByText('HALFTIME')).toBeVisible();
    expect(screen.getByText('Windchill')).toBeVisible();
    expect(screen.getByText('Rivals')).toBeVisible();
  });

  it('renders a timeout from real pending timeout state', async () => {
    arrangeBasicGame();
    useGameStore.setState({
      pendingTimeoutModal: true,
      events: [{ type: 'timeout', team: 'team1', index: 0, isFloater: false }],
    });

    await renderScreen(<TimeoutModal />);

    expect(screen.getByText('TIMEOUT')).toBeVisible();
    expect(screen.getByText('Team 1')).toBeVisible();
    expect(screen.getByText('END TIMEOUT')).toBeVisible();
  });

  it('renders a completed-point summary derived from real events', async () => {
    arrangeBasicGame({ statTrackingEnabled: true });
    useGameStore.setState({
      pointTimerEnabled: true,
      team1Score: 1,
      currentPoint: 2,
      pointStartTimestamps: { 1: Date.now() - 30_000 },
      events: [
        {
          type: 'goal',
          team: 'team1',
          goalPlayerId: 'player-alex',
          assistPlayerId: 'player-blair',
          pointNumber: 1,
          elapsedMs: 30_000,
        },
      ],
    });

    await renderScreen(<PointSummaryModal />);

    expect(screen.getByText('Point 1 Complete')).toBeVisible();
    expect(screen.getByText('CLEAN HOLD')).toBeVisible();
    expect(screen.getByText('START TIMER')).toBeVisible();
  });

  it('renders stat entry from the real pending-goal state and roster', async () => {
    arrangeBasicGame({ statTrackingEnabled: true });
    useGameStore.setState({ pendingStatEntry: { team: 'team1', pointNumber: 1 } });

    await renderScreen(<StatEntryModal />);

    expect(screen.getByText('Windchill')).toBeVisible();
    expect(screen.getByText('Alex')).toBeVisible();
    expect(screen.getByText('Cancel')).toBeVisible();
  });

  it('renders turnover entry from the real pending-turnover state', async () => {
    arrangeBasicGame({ statTrackingEnabled: true });
    useGameStore.setState({
      possession: 'team1',
      pendingTurnoverEntry: { receivingTeam: 'team2' },
    });
    setMockSearchParams({ type: 'drop' });

    await renderScreen(<TurnoverEntryModal />);

    expect(screen.getByText('Windchill')).toBeVisible();
    expect(screen.getByText('Drop')).toBeVisible();
    expect(screen.getByText('Who dropped it?')).toBeVisible();
  });

  it('renders team management from the real saved-team collection', async () => {
    useGameStore.setState({ currentTeam: testTeam, savedTeams: [testTeam] });

    await renderScreen(<TeamManagementModal />);

    expect(screen.getByText('Switch Team')).toBeVisible();
    expect(screen.getByText('No other teams saved yet')).toBeVisible();
  });
});
