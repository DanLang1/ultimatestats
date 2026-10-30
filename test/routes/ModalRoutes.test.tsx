import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import AdvancedGameSelectorModal from '@/app/(modals)/advanced-game-selector-modal';
import EditEventModal from '@/app/(modals)/edit-event-modal';
import EditPlayerModal from '@/app/(modals)/edit-player-modal';
import EditPointLineModal from '@/app/(modals)/edit-point-line-modal';
import GameSelectorModal from '@/app/(modals)/game-selector-modal';
import HalftimeModal from '@/app/(modals)/halftime-modal';
import PointSummaryModal from '@/app/(modals)/point-summary-modal';
import TeamManagementModal from '@/app/(modals)/team-management-modal';
import TimeoutModal from '@/app/(modals)/timeout-modal';
import { useGameStore } from '@/store/basic/gameStore';
import { useLinePresetsStore } from '@/store/linePresetsStore';
import { usePlayerStatsStore } from '@/store/playerStatsStore';
import { useSettingsStore } from '@/store/settingsStore';
import {
  arrangeAdvancedGame,
  arrangeBasicGame,
  cacheCurrentAdvancedGame,
  createSavedBasicGame,
  recordOpeningPull,
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

    expect(router.replace).toHaveBeenCalledWith('/edit-roster', {
      relativeToDirectory: undefined,
      withAnchor: undefined,
    });
    expect(screen.queryByText('EDIT PLAYER')).not.toBeOnTheScreen();
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

  it('replaces a completed live point line', async () => {
    const user = userEvent.setup();
    const roster = [
      ...testTeam.roster,
      {
        id: 'player-cara',
        name: 'Cara',
        number: '18',
        isActive: false,
        matchingType: 'fmp' as const,
        role: 'hybrid' as const,
      },
    ];
    arrangeBasicGame({ statTrackingEnabled: true });
    useGameStore.setState({
      currentTeam: { ...testTeam, roster },
      currentPoint: 2,
      pointLines: [
        {
          pointNumber: 1,
          playerIds: ['player-alex', 'player-blair'],
          timestamp: 1,
        },
      ],
    });
    setMockSearchParams({ pointNumber: '1', gameId: 'current' });

    await renderScreen(<EditPointLineModal />);

    expect(screen.getByText('Edit Point 1 Line')).toBeVisible();
    expect(screen.getByText('2 / 2 selected')).toBeVisible();
    expect(screen.getByTestId('player-chip-Cara')).toBeVisible();

    await user.press(screen.getByTestId('player-chip-Blair'));
    await user.press(screen.getByTestId('player-chip-Cara'));
    await user.press(screen.getByText('Save Line'));

    expect(useGameStore.getState().pointLines[0]?.playerIds).toEqual([
      'player-alex',
      'player-cara',
    ]);
    expect(router.back).toHaveBeenCalled();
  });

  it('replaces a saved point line using the saved roster snapshot', async () => {
    const user = userEvent.setup();
    const game = createSavedBasicGame();
    const savedRoster = [
      ...game.team1.roster,
      {
        id: 'player-cara',
        name: 'Cara',
        number: '18',
        isActive: false,
        matchingType: 'fmp' as const,
        role: 'hybrid' as const,
      },
    ];
    const savedGame = {
      ...game,
      team1: { ...game.team1, roster: savedRoster },
      pointLines: [
        {
          pointNumber: 1,
          playerIds: ['player-alex', 'player-blair'],
          timestamp: 1,
        },
      ],
    };
    useGameStore.setState({ savedGames: [savedGame] });
    setMockSearchParams({ pointNumber: '1', gameId: savedGame.id });

    await renderScreen(<EditPointLineModal />);

    expect(screen.getByTestId('player-chip-Cara')).toBeVisible();

    await user.press(screen.getByTestId('player-chip-Blair'));
    await user.press(screen.getByTestId('player-chip-Cara'));
    await user.press(screen.getByText('Save Line'));

    expect(useGameStore.getState().savedGames[0].pointLines?.[0]?.playerIds).toEqual([
      'player-alex',
      'player-cara',
    ]);
    expect(router.back).toHaveBeenCalled();
  });

  it('redirects an invalid point-line edit instead of leaving an empty modal route', async () => {
    arrangeBasicGame({ statTrackingEnabled: true });
    useGameStore.setState({ currentPoint: 2, pointLines: [] });
    setMockSearchParams({ pointNumber: '1', gameId: 'current' });

    await renderScreen(<EditPointLineModal />);

    expect(screen.queryByTestId('edit-point-line-modal')).not.toBeOnTheScreen();
    expect(router.replace).toHaveBeenCalledWith('/live-stats/timeline', {
      relativeToDirectory: undefined,
      withAnchor: undefined,
    });
  });

  it('deactivates a player from the edit-player modal', async () => {
    const user = userEvent.setup();
    useGameStore.setState({ currentTeam: testTeam });
    setMockSearchParams({ playerId: 'player-alex' });

    await renderScreen(<EditPlayerModal />);

    expect(screen.getByText('Edit Player')).toBeVisible();
    expect(screen.getByDisplayValue('Alex')).toBeVisible();
    expect(screen.getByDisplayValue('7')).toBeVisible();
    void fireEvent(screen.getByTestId('edit-player-active-toggle'), 'valueChange', false);
    await user.press(screen.getByTestId('edit-player-save'));

    expect(
      useGameStore.getState().currentTeam.roster.find((player) => player.id === 'player-alex')
        ?.isActive,
    ).toBe(false);
    expect(router.back).toHaveBeenCalled();
  });

  it('reactivates a player from the edit-player modal', async () => {
    const user = userEvent.setup();
    useGameStore.setState({
      currentTeam: {
        ...testTeam,
        roster: testTeam.roster.map((player) =>
          player.id === 'player-alex' ? { ...player, isActive: false } : player,
        ),
      },
    });
    setMockSearchParams({ playerId: 'player-alex' });

    await renderScreen(<EditPlayerModal />);

    void fireEvent(screen.getByTestId('edit-player-active-toggle'), 'valueChange', true);
    await user.press(screen.getByTestId('edit-player-save'));

    expect(
      useGameStore.getState().currentTeam.roster.find((player) => player.id === 'player-alex')
        ?.isActive,
    ).toBe(true);
    expect(router.back).toHaveBeenCalled();
  });

  it('shows an inline error when advanced-game participation blocks deactivation', async () => {
    const user = userEvent.setup();
    useGameStore.setState({ currentTeam: testTeam });
    arrangeAdvancedGame();
    setMockSearchParams({ playerId: 'player-alex' });

    await renderScreen(<EditPlayerModal />);

    recordOpeningPull();
    void fireEvent(screen.getByTestId('edit-player-active-toggle'), 'valueChange', false);
    await user.press(screen.getByTestId('edit-player-save'));

    expect(screen.getByTestId('edit-player-save-error')).toHaveTextContent(
      /cannot be set inactive until the game is over/,
    );
    expect(screen.queryByTestId('edit-player-active-toggle')).not.toBeOnTheScreen();
    expect(useGameStore.getState().currentTeam.roster[0].isActive).toBe(true);
    expect(router.back).not.toHaveBeenCalled();
  });

  it('hides deletion for a player who participated in the advanced game', async () => {
    useGameStore.setState({ currentTeam: testTeam });
    arrangeAdvancedGame();
    recordOpeningPull();
    setMockSearchParams({ playerId: 'player-alex' });

    await renderScreen(<EditPlayerModal />);

    expect(screen.queryByTestId('edit-player-active-toggle')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('edit-player-delete')).not.toBeOnTheScreen();
  });

  it('blocks deletion if advanced-game participation starts after the modal renders', async () => {
    const user = userEvent.setup();
    useGameStore.setState({ currentTeam: testTeam });
    arrangeAdvancedGame();
    setMockSearchParams({ playerId: 'player-alex' });

    await renderScreen(<EditPlayerModal />);

    await user.press(screen.getByTestId('edit-player-delete'));
    recordOpeningPull();
    await user.press(screen.getByText('Delete'));

    expect(screen.getByTestId('edit-player-save-error')).toHaveTextContent(
      /cannot be deleted until the game is over/,
    );
    expect(screen.getByText('Edit Player')).toBeVisible();
    expect(useGameStore.getState().currentTeam.roster).toHaveLength(testTeam.roster.length);
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

  it('renders team management from the real saved-team collection', async () => {
    useGameStore.setState({ currentTeam: testTeam, savedTeams: [testTeam] });

    await renderScreen(<TeamManagementModal />);

    expect(screen.getByText('Switch Team')).toBeVisible();
    expect(screen.getByText('No other teams saved yet')).toBeVisible();
  });

  it('loads a selected team before dismissing the management modal', async () => {
    const user = userEvent.setup();
    const otherTeam = { id: 'team-zoboomafoo', name: 'Zoboomafoo', roster: [] };
    useGameStore.setState({ currentTeam: testTeam, savedTeams: [testTeam, otherTeam] });

    await renderScreen(<TeamManagementModal />);
    await user.press(screen.getByText('Zoboomafoo'));

    expect(useGameStore.getState().currentTeam.id).toBe(otherTeam.id);
    expect(router.back).toHaveBeenCalled();
  });

  it.each(['basic', 'advanced'] as const)(
    'switches the %s pregame roster and clears the old line',
    async (mode) => {
      const user = userEvent.setup();
      const otherTeam = { ...testTeam, id: 'other-team', name: 'Other Team' };
      setMockSearchParams({ pregame: mode });
      useGameStore.setState({
        currentTeam: testTeam,
        savedTeams: [otherTeam],
        currentLine: ['old-player'],
      });
      useLinePresetsStore.setState({ lineConfirmedForNextPoint: true });
      await renderScreen(<TeamManagementModal />);
      expect(screen.queryByTestId('team-delete-other-team')).not.toBeOnTheScreen();
      await user.press(screen.getByTestId('team-select-other-team'));
      expect(useGameStore.getState().currentTeam).toEqual(otherTeam);
      expect(useGameStore.getState().savedTeams).toContainEqual(testTeam);
      expect(useGameStore.getState().currentLine).toEqual([]);
      expect(useLinePresetsStore.getState().lineConfirmedForNextPoint).toBe(false);
      expect(router.back).toHaveBeenCalled();
    },
  );

  it('cancels deletion inside the switcher without changing teams', async () => {
    const user = userEvent.setup();
    const otherTeam = { id: 'other-team', name: 'Other Team', roster: [] };
    useGameStore.setState({ currentTeam: testTeam, savedTeams: [testTeam, otherTeam] });

    await renderScreen(<TeamManagementModal />);
    await user.press(screen.getByTestId('team-delete-other-team'));
    expect(screen.queryByText('Switch Team')).toBeNull();
    await user.press(screen.getByTestId('team-delete-cancel'));

    expect(screen.getByText('Switch Team')).toBeVisible();
    expect(useGameStore.getState().savedTeams).toContainEqual(otherTeam);
    expect(useGameStore.getState().currentTeam.id).toBe(testTeam.id);
    expect(router.back).not.toHaveBeenCalled();
  });

  it('opens team deletion confirmation without switching teams', async () => {
    const user = userEvent.setup();
    const otherTeam = { id: 'team-zoboomafoo', name: 'Zoboomafoo', roster: [] };
    useGameStore.setState({ currentTeam: testTeam, savedTeams: [testTeam, otherTeam] });

    await renderScreen(<TeamManagementModal />);
    await user.press(screen.getByTestId('team-delete-team-zoboomafoo'));

    expect(screen.getByText('Delete Team')).toBeVisible();
    expect(useGameStore.getState().currentTeam.id).toBe(testTeam.id);
    expect(router.back).not.toHaveBeenCalled();

    await user.press(screen.getByText('Delete', { exact: true }));

    await waitFor(() => {
      expect(useGameStore.getState().savedTeams).not.toContainEqual(otherTeam);
    });
  });
});

describe('event correction controls', () => {
  beforeEach(() => {
    resetAllStores();
    resetMockRouter();
    arrangeBasicGame({ statTrackingEnabled: true });
  });

  it.each([
    ['team1', 'throwaway', ['Throwaway', 'Drop', '50/50', 'OPP BLOCK'], ['Block', 'OPP TURN']],
    ['team1', 'block', ['Block', 'OPP TURN'], ['Throwaway', 'Drop', '50/50', 'OPP BLOCK']],
    ['team2', 'throwaway', ['Block', 'OPP TURN'], ['Throwaway', 'Drop', '50/50', 'OPP BLOCK']],
    ['team2', 'block', ['Throwaway', 'Drop', '50/50', 'OPP BLOCK'], ['Block', 'OPP TURN']],
  ] as const)(
    'limits corrections for %s %s to the same possession change',
    async (team, subtype, available, forbidden) => {
      useGameStore.setState({
        events: [{ type: 'turnover', team, subtype, playerId: null, pointNumber: 1 }],
      });
      setMockSearchParams({
        eventIndex: '0',
        eventType: 'turnover',
        subtype,
        originalTeam: team,
        gameId: 'current',
      });
      await renderScreen(<EditEventModal />);
      for (const label of available) expect(screen.getByText(label)).toBeVisible();
      for (const label of forbidden) expect(screen.queryByText(label)).not.toBeOnTheScreen();
      if (team === 'team2')
        expect(screen.queryByRole('button', { name: 'Alex' })).not.toBeOnTheScreen();
    },
  );

  it('restricts a saved correction to the point line while retaining the original attributed player', async () => {
    const game = createSavedBasicGame();
    game.team1 = {
      ...testTeam,
      roster: [
        ...testTeam.roster,
        { id: 'casey', name: 'Casey', isActive: true, matchingType: null, role: null },
      ],
    };
    game.events = [
      {
        type: 'turnover',
        team: 'team1',
        subtype: 'drop',
        playerId: 'player-blair',
        pointNumber: 1,
      },
    ];
    game.pointLines = [{ pointNumber: 1, playerIds: ['player-alex'], timestamp: 1 }];
    useGameStore.setState({ savedGames: [game] });
    setMockSearchParams({
      eventIndex: '0',
      eventType: 'turnover',
      subtype: 'drop',
      originalTeam: 'team1',
      playerId: 'player-blair',
      gameId: game.id,
    });
    await renderScreen(<EditEventModal />);
    expect(screen.getByRole('button', { name: 'Alex' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Blair', selected: true })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Casey' })).not.toBeOnTheScreen();
  });

  it('confirms turnover deletion inside the sheet and can cancel back to the editor', async () => {
    useGameStore.setState({
      events: [
        {
          type: 'turnover',
          team: 'team1',
          subtype: 'block',
          playerId: 'player-alex',
          pointNumber: 1,
        },
      ],
    });
    setMockSearchParams({
      eventIndex: '0',
      eventType: 'turnover',
      playerId: 'player-alex',
      subtype: 'block',
      originalTeam: 'team1',
      gameId: 'current',
    });
    const user = userEvent.setup();
    await renderScreen(<EditEventModal />);

    await user.press(screen.getByRole('button', { name: 'Delete event' }));
    expect(screen.getByText('Delete Event?')).toBeVisible();
    expect(screen.getByText('Delete this block by Alex?')).toBeVisible();
    await user.press(screen.getByTestId('edit-event-delete-cancel'));
    expect(screen.getByText('Edit Event')).toBeVisible();
    expect(useGameStore.getState().events).toHaveLength(1);

    await user.press(screen.getByRole('button', { name: 'Delete event' }));
    await user.press(screen.getByTestId('edit-event-delete-confirm'));
    expect(useGameStore.getState().events).toHaveLength(0);
    expect(router.back).toHaveBeenCalled();
  });

  it('deletes a saved-game turnover from the inline confirmation', async () => {
    const game = createSavedBasicGame();
    game.events = [
      {
        type: 'turnover',
        team: 'team1',
        subtype: 'drop',
        playerId: null,
        pointNumber: 1,
      },
    ];
    useGameStore.setState({ savedGames: [game] });
    setMockSearchParams({
      eventIndex: '0',
      eventType: 'turnover',
      subtype: 'drop',
      originalTeam: 'team1',
      gameId: game.id,
    });
    const user = userEvent.setup();
    await renderScreen(<EditEventModal />);

    await user.press(screen.getByRole('button', { name: 'Delete event' }));
    expect(screen.getByText('Delete this drop?')).toBeVisible();
    await user.press(screen.getByTestId('edit-event-delete-confirm'));

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(useGameStore.getState().savedGames[0].events).toHaveLength(0);
  });

  it.each(['Alex', 'Unknown'])(
    'reviews the thrower %s before selecting a 50/50 receiver',
    async (thrower) => {
      useGameStore.setState({
        events: [
          { type: 'turnover', team: 'team1', subtype: 'throwaway', playerId: null, pointNumber: 1 },
        ],
      });
      setMockSearchParams({
        eventIndex: '0',
        eventType: 'turnover',
        subtype: 'throwaway',
        gameId: 'current',
      });
      const user = userEvent.setup();
      await renderScreen(<EditEventModal />);
      await user.press(screen.getByText('50/50'));
      expect(screen.getByText('STEP 1: THROWER (Who threw it?)')).toBeVisible();
      await user.press(screen.getByRole('button', { name: thrower }));
      expect(screen.getByText('STEP 2: RECEIVER (Who dropped it?)')).toBeVisible();
      await user.press(screen.getByRole('button', { name: 'Blair' }));
      expect(screen.getByText('RECEIVER')).toBeVisible();
      expect(screen.getByRole('button', { name: 'Blair', selected: true })).toBeVisible();
      await user.press(screen.getByRole('button', { name: 'Unknown' }));
      expect(screen.queryByText('RECEIVER')).not.toBeOnTheScreen();
    },
  );
});

describe('continuing game breaks', () => {
  beforeEach(() => {
    resetAllStores();
    resetMockRouter();
    arrangeBasicGame({ statTrackingEnabled: true });
  });

  it.each([
    [true, false, '/line-editor'],
    [true, true, '/scoreboard'],
    [false, false, '/scoreboard'],
  ] as const)(
    'continues halftime with line calling %s and confirmation %s',
    async (lineCallingEnabled, lineConfirmedForNextPoint, destination) => {
      useSettingsStore.setState({ lineCallingEnabled });
      useLinePresetsStore.setState({ lineConfirmedForNextPoint });
      useGameStore.setState({
        isHalftimeBreak: true,
        halftimeEndTime: null,
        startingPossession: 'team2',
      });
      const user = userEvent.setup();
      await renderScreen(<HalftimeModal />);
      expect(screen.getByText('YOU RECEIVE')).toBeVisible();
      if (lineCallingEnabled) {
        await user.press(screen.getByText('SET LINE'));
        expect(router.push).toHaveBeenCalledWith('/line-editor');
      }
      await user.press(screen.getByText('CONTINUE'));
      expect(useGameStore.getState().isHalftimeBreak).toBe(false);
      if (destination === '/line-editor') expect(router.replace).toHaveBeenCalledWith(destination);
      else expect(router.dismissTo).toHaveBeenCalledWith(destination);
    },
  );

  it('shows halftime impact and continues with the next line from the stats layout', async () => {
    useSettingsStore.setState({ lineCallingEnabled: true });
    useGameStore.setState({
      isHalftimeBreak: true,
      halftimeEndTime: null,
      events: [
        {
          type: 'goal',
          team: 'team1',
          goalPlayerId: 'player-alex',
          assistPlayerId: null,
          pointNumber: 1,
        },
        {
          type: 'turnover',
          team: 'team1',
          subtype: 'drop',
          playerId: 'player-blair',
          pointNumber: 2,
        },
      ],
    });
    const user = userEvent.setup();
    await renderScreen(<HalftimeModal />);
    expect(screen.getByText('HOLD')).toBeVisible();
    expect(screen.getByText('Alex')).toBeVisible();
    expect(screen.getByText('+1')).toBeVisible();
    expect(screen.getByText('-1')).toBeVisible();
    await user.press(screen.getByText('SET LINE'));
    expect(router.push).toHaveBeenCalledWith('/line-editor');
    await user.press(screen.getByText('CONTINUE'));
    expect(useGameStore.getState().isHalftimeBreak).toBe(false);
    expect(router.replace).toHaveBeenCalledWith('/line-editor');
  });

  it('ends an opponent timeout and resumes the paused point timer', async () => {
    useGameStore.setState({
      pendingTimeoutModal: true,
      timeoutEndTime: null,
      pointTimerEnabled: true,
      currentPointStartTime: Date.now() - 20000,
      pointTimerPausedElapsed: 12000,
      events: [{ type: 'timeout', team: 'team2', index: 0, isFloater: false }],
    });
    await renderScreen(<TimeoutModal />);
    expect(screen.getByText('Team 2')).toBeVisible();
    await userEvent.setup().press(screen.getByText('END TIMEOUT'));
    expect(useGameStore.getState()).toMatchObject({
      pendingTimeoutModal: false,
      pointTimerPausedElapsed: null,
    });
    expect(router.back).toHaveBeenCalled();
  });
});
