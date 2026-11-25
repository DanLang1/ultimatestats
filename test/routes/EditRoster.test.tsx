import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import EditRosterScreen from '@/app/(main)/(hub)/(team)/edit-roster';
import type { SharedPayload } from '@/lib/sharing/types';
import { useGameStore } from '@/store/basic/gameStore';
import { useLinePresetsStore } from '@/store/linePresetsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { getCurrentTeam, useTeamStore } from '@/store/teamStore';
import {
  arrangeBasicGame,
  arrangeCurrentTeam,
  arrangeOtherTeams,
  testTeam,
} from '@/test/fixtures/domain';
import { resetAllStores } from '@/test/fixtures/resetStores';
import { resetMockRouter } from '@/test/mocks/expoRouter';
import { renderScreen } from '@/test/render';
import { setWindow } from '@/test/window';

jest.mock('@/lib/supabase', () => jest.requireActual('@/test/mocks/supabase'));

beforeEach(async () => {
  resetAllStores();
  resetMockRouter();
  await AsyncStorage.clear();
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe('<EditRosterScreen />', () => {
  it('waits for native actions dismissal before opening the team switcher', async () => {
    await setWindow('portrait');
    const user = userEvent.setup();
    arrangeCurrentTeam(testTeam);
    arrangeOtherTeams([{ id: 'other-team', name: 'Other Team', roster: [] }]);
    await renderScreen(<EditRosterScreen />);
    await user.press(screen.getByTestId('roster-actions-button'));
    const actionsModal = screen.getByTestId('team-actions-modal');

    await user.press(screen.getByTestId('team-actions-switch'));
    expect(router.push).not.toHaveBeenCalled();

    await act(() => actionsModal.props.onDismiss());
    expect(router.push).toHaveBeenCalledWith('/team-management-modal');
    await act(() => actionsModal.props.onDismiss());
    expect(router.push).toHaveBeenCalledTimes(1);
  });

  it('offers USAU import from the empty roster state', async () => {
    const user = userEvent.setup();
    arrangeCurrentTeam({ ...testTeam, roster: [] });

    await renderScreen(<EditRosterScreen />);

    expect(screen.getByTestId('empty-roster-import-usau')).toBeVisible();
    await user.press(screen.getByTestId('empty-roster-import-usau'));

    expect(router.push).toHaveBeenCalledWith('/import-team');
  });

  it('loads a sample team from the empty roster state', async () => {
    const user = userEvent.setup();
    arrangeCurrentTeam({ ...testTeam, roster: [] });
    useLinePresetsStore.setState({
      presets: [
        {
          id: 'current-team-preset',
          name: 'Current team line',
          playerIds: ['old-player'],
          teamId: testTeam.id,
        },
        {
          id: 'other-team-preset',
          name: 'Other team line',
          playerIds: ['other-player'],
          teamId: 'other-team',
        },
      ],
    });

    await renderScreen(<EditRosterScreen />);
    await user.press(screen.getByTestId('empty-roster-load-test-team'));

    expect(getCurrentTeam().name).toBe('Windchill');
    expect(useLinePresetsStore.getState().presets).toEqual([
      {
        id: 'other-team-preset',
        name: 'Other team line',
        playerIds: ['other-player'],
        teamId: 'other-team',
      },
    ]);
    expect(getCurrentTeam().roster).toHaveLength(14);
    expect(getCurrentTeam().roster.filter((player) => player.matchingType === 'fmp')).toHaveLength(
      7,
    );
    expect(getCurrentTeam().roster.filter((player) => player.matchingType === 'mmp')).toHaveLength(
      7,
    );
  });
  it('saves and clears matching and role choices from quick-edit cards', async () => {
    await setWindow('portrait');
    useSettingsStore.setState({ rosterViewMode: 'cards' });
    arrangeCurrentTeam({ ...testTeam, roster: [testTeam.roster[0]] });
    const user = userEvent.setup();
    await renderScreen(<EditRosterScreen />);

    // The first press selects a value; pressing the same value again clears it.
    await user.press(screen.getAllByText('MMP').at(-1)!);
    expect(getCurrentTeam().roster[0].matchingType).toBe('mmp');
    await user.press(screen.getAllByText('MMP').at(-1)!);
    expect(getCurrentTeam().roster[0].matchingType).toBeNull();

    await user.press(screen.getAllByText('Hybrid').at(-1)!);
    expect(getCurrentTeam().roster[0].role).toBe('hybrid');
    await user.press(screen.getAllByText('Hybrid').at(-1)!);
    expect(getCurrentTeam().roster[0].role).toBeNull();

    await user.press(screen.getByText('Alex'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/edit-player-modal',
      params: { playerId: 'player-alex' },
    });
  });

  it('saves a jersey number on blur and rejects a duplicate without changing either player', async () => {
    await setWindow('landscape');
    useSettingsStore.setState({ rosterViewMode: 'cards' });
    arrangeCurrentTeam(testTeam);
    const user = userEvent.setup();
    await renderScreen(<EditRosterScreen />);
    await user.clear(screen.getAllByPlaceholderText('#')[0]);
    await user.type(screen.getAllByPlaceholderText('#')[0], '9');
    await waitFor(() => {
      expect(getCurrentTeam().roster[0].number).toBe('9');
    });
    await user.clear(screen.getAllByPlaceholderText('#')[0]);
    await user.type(screen.getAllByPlaceholderText('#')[0], '12');
    expect(screen.getByText('Duplicate Number')).toBeVisible();
    expect(screen.getByText('Another player already has #12.')).toBeVisible();
    expect(getCurrentTeam().roster.map((player) => player.number)).toEqual([undefined, '12']);
    expect(screen.getAllByPlaceholderText('#')[0]).toHaveDisplayValue('');
  });
});

describe('roster management', () => {
  beforeEach(async () => {
    await setWindow('tablet');
    arrangeCurrentTeam(testTeam);
    useSettingsStore.setState({ rosterViewMode: 'chips' });
  });

  it('applies bulk matching and roles only to selected players, and clears the selection on exit', async () => {
    arrangeCurrentTeam({
      ...testTeam,
      roster: [
        ...testTeam.roster,
        {
          id: 'bench',
          name: 'Bench',
          isActive: false,
          matchingType: null,
          role: null,
        },
      ],
    });
    const user = userEvent.setup();
    await renderScreen(<EditRosterScreen />);
    await user.press(screen.getByText('Bulk'));
    await user.press(screen.getByText('Alex'));
    await user.press(screen.getByText('Alex'));
    expect(screen.getByText('0 selected')).toBeVisible();
    await user.press(screen.getByText('Select All'));
    expect(screen.getByText('2 selected')).toBeVisible();
    await user.press(screen.getAllByText('MMP').at(-1)!);
    expect(
      getCurrentTeam()
        .roster.slice(0, 2)
        .map((player) => player.matchingType),
    ).toEqual(['mmp', 'mmp']);
    await user.press(screen.getByText('Hybrid'));
    expect(
      getCurrentTeam()
        .roster.slice(0, 2)
        .map((player) => player.role),
    ).toEqual(['hybrid', 'hybrid']);
    expect(getCurrentTeam().roster[2]).toMatchObject({
      matchingType: null,
      role: null,
    });
    await user.press(screen.getByText('Deselect All'));
    expect(screen.queryByText('FMP')).not.toBeOnTheScreen();
    await user.press(screen.getByText('Done'));
    await user.press(screen.getByText('Bulk'));
    expect(screen.getByText('0 selected')).toBeVisible();
  });

  it('keeps the filtered selection visible when a bulk role change moves it out of the filter', async () => {
    const user = userEvent.setup();
    await renderScreen(<EditRosterScreen />);
    await user.press(screen.getByText('Handler'));
    expect(screen.queryByText('Blair')).not.toBeOnTheScreen();
    await user.press(screen.getByText('Bulk'));
    await user.press(screen.getByText('Select All'));
    await user.press(screen.getByText('Cutter'));
    expect(screen.getByText('Alex')).toBeVisible();
    expect(screen.getByText('1 selected')).toBeVisible();
    await user.press(screen.getByText('Done'));
    expect(screen.getByText('No players match this filter')).toBeVisible();
    await user.press(screen.getByText('Handler'));
    expect(screen.getByText('Alex')).toBeVisible();
    await user.press(screen.getByText('Unset'));
    expect(screen.getByText('No players match this filter')).toBeVisible();
  });

  it('adds a trimmed name and rejects an existing name without duplicating the roster', async () => {
    const user = userEvent.setup();
    await renderScreen(<EditRosterScreen />);
    expect(screen.getByText('WINDCHILL')).toBeVisible();
    expect(screen.getByText('Alex')).toBeVisible();
    expect(screen.getByText('Blair')).toBeVisible();
    const input = screen.getByPlaceholderText('Add player...');
    await user.type(input, '  Casey  ');
    await user.press(screen.getByTestId('roster-add-player-button'));
    expect(screen.getByText('Casey')).toBeVisible();
    expect(input).toHaveDisplayValue('');
    await user.type(input, 'alex');
    expect(screen.getByText('alex is already on your team')).toBeVisible();
    await user.press(screen.getByTestId('roster-add-player-button'));
    expect(getCurrentTeam().roster).toHaveLength(3);
  });

  it('renames the current team while rejecting another team name and allowing cancellation', async () => {
    arrangeOtherTeams([{ id: 'other', name: 'Visitors', roster: [] }]);
    const user = userEvent.setup();
    await renderScreen(<EditRosterScreen />);
    await user.press(screen.getByText('Rename'));
    await user.clear(screen.getByPlaceholderText('Team name'));
    await user.type(screen.getByPlaceholderText('Team name'), 'visitors');
    expect(screen.getByText('A team with this name already exists')).toBeVisible();
    await user.press(screen.getByText('Save'));
    expect(getCurrentTeam().name).toBe('Windchill');
    await user.clear(screen.getByPlaceholderText('Team name'));
    await user.type(screen.getByPlaceholderText('Team name'), '  Lake Effect  ');
    await user.press(screen.getByText('Save'));
    expect(screen.getByText('LAKE EFFECT')).toBeVisible();
    expect(getCurrentTeam().name).toBe('Lake Effect');
    await user.press(screen.getByText('Rename'));
    await user.clear(screen.getByPlaceholderText('Team name'));
    await user.press(screen.getByText('Save'));
    expect(screen.queryByPlaceholderText('Team name')).not.toBeOnTheScreen();
    await user.press(screen.getByText('Rename'));
    await user.type(screen.getByPlaceholderText('Team name'), ' abandoned');
    await user.press(screen.getByText('Cancel'));
    expect(screen.getByText('LAKE EFFECT')).toBeVisible();
  });

  it.each([false, true])(
    'creates a team while retaining the old team (empty roster: %s)',
    async (empty) => {
      if (empty) arrangeCurrentTeam({ ...testTeam, roster: [] });
      const user = userEvent.setup();
      await renderScreen(<EditRosterScreen />);
      await user.press(screen.getByText('New Team'));
      await user.type(screen.getByPlaceholderText('Team name'), 'windchill');
      expect(screen.getByText('A team with this name already exists')).toBeVisible();
      await user.press(screen.getByText('Create'));
      expect(getCurrentTeam().id).toBe(testTeam.id);
      await user.clear(screen.getByPlaceholderText('Team name'));
      await user.type(screen.getByPlaceholderText('Team name'), '  New Squad  ');
      await user.press(screen.getByText('Create'));
      expect(screen.getByText('NEW SQUAD')).toBeVisible();
      expect(getCurrentTeam()).toMatchObject({ name: 'New Squad', roster: [] });
      expect(useTeamStore.getState().teams.map((team) => team.name)).toEqual([
        'Windchill',
        'New Squad',
      ]);
    },
  );

  it('keeps the roster on cancellation, then clears it after confirmation', async () => {
    const user = userEvent.setup();
    await renderScreen(<EditRosterScreen />);
    await user.press(screen.getByText('Clear'));
    await user.press(screen.getByText('Cancel'));
    expect(screen.getByText('Alex')).toBeVisible();
    await user.press(screen.getByText('Clear'));
    await user.press(screen.getByText('Clear All'));
    expect(screen.getByText('No players yet')).toBeVisible();
    expect(getCurrentTeam().roster).toHaveLength(0);
  });

  it('offers no Clear action while a game is active', async () => {
    arrangeBasicGame();
    await renderScreen(<EditRosterScreen />);
    expect(screen.getByText('Alex')).toBeVisible();
    expect(screen.queryByText('Clear')).not.toBeOnTheScreen();
  });

  it('toggles the roster view and requests team-switch and back navigation', async () => {
    arrangeOtherTeams([{ id: 'other', name: 'Other', roster: [] }]);
    const user = userEvent.setup();
    await renderScreen(<EditRosterScreen />);
    await user.press(screen.getByText('Cards'));
    expect(screen.getByTestId('quick-edit-active-player-alex')).toBeVisible();
    await user.press(screen.getByText('Chips'));
    expect(screen.queryByTestId('quick-edit-active-player-alex')).not.toBeOnTheScreen();
    await user.press(screen.getByText('Switch'));
    expect(router.push).toHaveBeenCalledWith('/team-management-modal');
    await user.press(screen.getByTestId('screen-header-back'));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('blocks deactivation of a player who participated in the current game', async () => {
    arrangeBasicGame({ statTrackingEnabled: true });
    useGameStore.setState({
      pointLines: [{ pointNumber: 1, playerIds: ['player-alex'], timestamp: 1 }],
    });
    useSettingsStore.setState({ rosterViewMode: 'cards' });
    await renderScreen(<EditRosterScreen />);
    // RNTL 14 fireEvent returns a promise; the lint plugin still assumes the synchronous API.
    // eslint-disable-next-line testing-library/no-await-sync-events
    await fireEvent(screen.getByTestId('quick-edit-active-player-alex'), 'valueChange', false);
    expect(await screen.findByText('Player Already Participated')).toBeVisible();
    expect(getCurrentTeam().roster[0].isActive).toBe(true);
  });

  it('shares the current team only after confirmation', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockImplementation(async () => new Response(null, { status: 201 }));
    const user = userEvent.setup();
    await renderScreen(<EditRosterScreen />);
    await user.press(screen.getByText('Share'));
    await user.press(screen.getByText('Cancel'));
    expect(fetchSpy).not.toHaveBeenCalled();
    await user.press(screen.getByText('Share'));
    await user.press(screen.getByText('Proceed'));
    expect(await screen.findByText('Share Link Ready')).toBeVisible();
    const upload = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string) as {
      id: string;
      payload: SharedPayload;
    };
    expect(upload.payload.type).toBe('team');
    if (upload.payload.type !== 'team') throw new Error('Expected a team share');
    expect(upload.payload.data.id).toBe(testTeam.id);
    await user.press(screen.getByText('Close'));
    expect(screen.queryByText('Share Link Ready')).not.toBeOnTheScreen();
  });

  it('runs an Android team action after closing its actions sheet', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    await setWindow('portrait');
    const user = userEvent.setup();
    await renderScreen(<EditRosterScreen />);
    await user.press(screen.getByTestId('roster-actions-button'));
    await user.press(screen.getByTestId('team-actions-new'));
    expect(screen.getByPlaceholderText('Team name')).toHaveDisplayValue('');
    await user.press(screen.getByText('Cancel'));
    expect(screen.queryByPlaceholderText('Team name')).not.toBeOnTheScreen();
  });
});
