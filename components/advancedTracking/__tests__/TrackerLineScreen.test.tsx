import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen, userEvent } from '@testing-library/react-native';
import { useState } from 'react';

import { TrackerLineScreen } from '@/components/advancedTracking/TrackerLineScreen';
import type { Participant } from '@/lib/advancedTracking/types';
import { useGameStore } from '@/store/basic/gameStore';
import { useLinePresetsStore } from '@/store/linePresetsStore';
import { resetAllStores } from '@/test/fixtures/resetStores';
import { renderScreen } from '@/test/render';

const makeParticipant = (id: string, name: string): Participant => ({
  id,
  name,
});

function ReactiveInitialSelectionHarness({ participants }: { participants: Participant[] }) {
  const [selectedIds, setSelectedIds] = useState(
    participants.slice(0, 7).map((participant) => participant.id),
  );

  return (
    <TrackerLineScreen
      participants={participants}
      initialSelectedIds={selectedIds}
      title="Reactive Selection"
      requireChanges
      onSelectionChange={setSelectedIds}
      onConfirm={() => {}}
    />
  );
}

describe('TrackerLineScreen', () => {
  beforeEach(async () => {
    resetAllStores();
    await AsyncStorage.clear();
  });

  it('shows the expanded roster on demand and labels an opposite-side player', async () => {
    const user = userEvent.setup();
    const lightPlayer = makeParticipant('light-player', 'Light Player');
    const darkPlayer = makeParticipant('dark-player', 'Dark Player');

    await renderScreen(
      <TrackerLineScreen
        participants={[lightPlayer]}
        allParticipants={[lightPlayer, darkPlayer]}
        rosterParticipants={[lightPlayer, darkPlayer]}
        playerStatusLabels={new Map([[darkPlayer.id, 'Dark']])}
        title="Light Line"
        onConfirm={() => {}}
      />,
    );

    expect(screen.getByText('Light Player')).toBeVisible();
    expect(screen.queryByText('Dark Player')).not.toBeOnTheScreen();

    await user.press(screen.getByTestId('line-select-show-all-players'));

    expect(screen.getByText('Dark Player')).toBeVisible();
    expect(screen.getByLabelText('Dark Player, Dark')).toBeVisible();
  });

  it('resolves history names from the full roster and drops unavailable players when loaded', async () => {
    const user = userEvent.setup();
    const joe = makeParticipant('joe', 'Joe Crossover');
    const available = Array.from({ length: 6 }, (_, index) =>
      makeParticipant(`available-${index + 1}`, `Available ${index + 1}`),
    );

    await renderScreen(
      <TrackerLineScreen
        participants={available}
        allParticipants={available}
        rosterParticipants={[joe, ...available]}
        title="Dark Line"
        recentLines={[
          {
            pointNumber: 1,
            playerIds: [joe.id, ...available.map((participant) => participant.id)],
          },
        ]}
        onConfirm={() => {}}
      />,
    );

    await user.press(screen.getByTestId('line-select-load-line'));

    expect(screen.getByText(/Joe/)).toBeVisible();
    expect(screen.queryByText(/\?/)).not.toBeOnTheScreen();

    await user.press(screen.getByText('Pt 1'));

    expect(screen.getByText('6/7')).toBeVisible();
    expect(screen.getByTestId('line-select-confirm')).toBeDisabled();
  });

  it('keeps all players visible when a recent line loads a crossover player', async () => {
    const user = userEvent.setup();
    const crossover = makeParticipant('crossover', 'Dark Crossover');
    const defaults = Array.from({ length: 6 }, (_, index) =>
      makeParticipant(`default-${index + 1}`, `Default ${index + 1}`),
    );

    await renderScreen(
      <TrackerLineScreen
        participants={defaults}
        allParticipants={[...defaults, crossover]}
        rosterParticipants={[...defaults, crossover]}
        title="Light Line"
        recentLines={[
          {
            pointNumber: 2,
            playerIds: [...defaults.map((participant) => participant.id), crossover.id],
          },
        ]}
        onConfirm={() => {}}
      />,
    );

    await user.press(screen.getByTestId('line-select-load-line'));
    await user.press(screen.getByText('Pt 2'));

    expect(screen.getByTestId('line-select-show-all-players')).toHaveProp('accessibilityState', {
      expanded: true,
    });
    await user.press(screen.getByText(crossover.name));
    expect(screen.getByText(crossover.name)).toBeVisible();
  });

  it('keeps all players visible when a preset loads a crossover player', async () => {
    const user = userEvent.setup();
    const crossover = makeParticipant('preset-crossover', 'Preset Crossover');
    const defaults = Array.from({ length: 6 }, (_, index) =>
      makeParticipant(`preset-default-${index + 1}`, `Preset Default ${index + 1}`),
    );
    useLinePresetsStore.setState({
      presets: [
        {
          id: 'crossover-preset',
          name: 'Crossover Preset',
          playerIds: [...defaults.map((participant) => participant.id), crossover.id],
          teamId: useGameStore.getState().currentTeam.id,
        },
      ],
    });

    await renderScreen(
      <TrackerLineScreen
        participants={defaults}
        allParticipants={[...defaults, crossover]}
        rosterParticipants={[...defaults, crossover]}
        title="Light Line"
        onConfirm={() => {}}
      />,
    );

    await user.press(screen.getByTestId('line-select-load-line'));
    await user.press(screen.getByText('Crossover Preset'));

    expect(screen.queryByTestId('line-select-show-all-players')).not.toBeOnTheScreen();
    await user.press(screen.getByText(crossover.name));
    expect(screen.getByText(crossover.name)).toBeVisible();
  });

  it('compares required changes against the selection from mount', async () => {
    const user = userEvent.setup();
    const participants = Array.from({ length: 8 }, (_, index) =>
      makeParticipant(`reactive-${index + 1}`, `Reactive ${index + 1}`),
    );

    await renderScreen(<ReactiveInitialSelectionHarness participants={participants} />);

    expect(screen.getByTestId('line-select-confirm')).toBeDisabled();
    await user.press(screen.getByText(participants[0].name));
    await user.press(screen.getByText(participants[7].name));

    expect(screen.getByTestId('line-select-confirm')).toBeEnabled();
  });

  it('merges a preset with locked and current active players while skipping restrictions', async () => {
    const user = userEvent.setup();
    const participants = Array.from({ length: 9 }, (_, index) =>
      makeParticipant(`merge-${index + 1}`, `Merge ${index + 1}`),
    );
    useLinePresetsStore.setState({
      presets: [
        {
          id: 'restricted-preset',
          name: 'Restricted Preset',
          playerIds: [participants[7].id, participants[8].id],
          teamId: useGameStore.getState().currentTeam.id,
        },
      ],
    });

    await renderScreen(
      <TrackerLineScreen
        participants={participants}
        initialSelectedIds={participants.slice(0, 7).map((participant) => participant.id)}
        title="Correct Current Lineup"
        participantRestrictions={{
          lockedIds: [participants[0].id],
          restrictedIds: [participants[8].id],
          onPress: () => {},
        }}
        onConfirm={() => {}}
      />,
    );

    await user.press(screen.getByTestId('line-select-load-line'));
    await user.press(screen.getByText('Restricted Preset'));

    expect(screen.getByTestId(`player-chip-${participants[0].name}`)).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ selected: true }),
    );
    expect(screen.getByTestId(`player-chip-${participants[7].name}`)).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ selected: true }),
    );
    expect(screen.getByTestId(`player-chip-${participants[8].name}`)).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ selected: false }),
    );
    expect(screen.getByTestId('line-select-confirm')).toBeEnabled();
  });
  it('loads all preset players, keeps deselected members visible, and confirms only seven', async () => {
    const user = userEvent.setup();
    const participants = Array.from({ length: 10 }, (_, index) =>
      makeParticipant(`p-${index}`, `Player ${index}`),
    );
    const playerIds = participants.slice(0, 9).map((p) => p.id);
    useLinePresetsStore.setState({
      presets: [
        {
          id: 'large',
          name: 'Large preset',
          playerIds,
          teamId: useGameStore.getState().currentTeam.id,
        },
      ],
    });
    const onConfirm = jest.fn();
    await renderScreen(
      <TrackerLineScreen participants={participants} title="Set line" onConfirm={onConfirm} />,
    );
    await user.press(screen.getByTestId('line-select-load-line'));
    await user.press(screen.getByText('Large preset'));
    expect(screen.getByText('9/7')).toBeVisible();
    await user.press(screen.getByTestId('header-action-clear-line'));
    expect(screen.getByText('0/7')).toBeVisible();
    expect(screen.getByText('Player 8')).toBeVisible();
    expect(screen.queryByText('Player 9')).not.toBeOnTheScreen();
    await user.press(screen.getByTestId('header-action-reload-line'));
    expect(screen.getByText('9/7')).toBeVisible();
    expect(screen.getByText('Deselect 2 to continue')).toBeVisible();
    expect(screen.getByTestId('line-select-confirm')).toBeDisabled();
    expect(screen.queryByText('Player 9')).not.toBeOnTheScreen();
    await user.press(screen.getByText('Player 8'));
    expect(screen.getByText('Player 8')).toBeVisible();
    await user.press(screen.getByText('Player 7'));
    expect(screen.getByTestId('line-select-confirm')).toBeEnabled();
    await user.press(screen.getByTestId('line-select-confirm'));
    expect(onConfirm).toHaveBeenCalledWith(playerIds.slice(0, 7));
    expect(useLinePresetsStore.getState().presets[0].playerIds).toEqual(playerIds);
    await user.press(screen.getByTestId('line-select-show-all-players'));
    await user.press(screen.getByText('Player 9'));
    await user.press(screen.getByTestId('line-select-show-all-players'));
    expect(screen.getByText('Other players · 1 · 1 selected')).toBeVisible();
    expect(screen.getByText('8/7')).toBeVisible();
    expect(screen.getByTestId('line-select-confirm')).toBeDisabled();
  });

  it('restores an oversized draft without dropping players', async () => {
    const participants = Array.from({ length: 9 }, (_, index) =>
      makeParticipant(`p-${index}`, `Player ${index}`),
    );
    await renderScreen(
      <TrackerLineScreen
        participants={participants}
        initialSelectedIds={participants.map((p) => p.id)}
        title="Restored"
        onConfirm={() => {}}
      />,
    );
    expect(screen.getByText('9/7')).toBeVisible();
    expect(screen.getByTestId('line-select-confirm')).toBeDisabled();
    expect(screen.getByTestId('player-chip-Player 8')).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ selected: true }),
    );
  });

  it('does not fill a short preset from the initial lineup and reports unavailable members', async () => {
    const user = userEvent.setup();
    const participants = Array.from({ length: 8 }, (_, index) =>
      makeParticipant(`p-${index}`, `Player ${index}`),
    );
    useLinePresetsStore.setState({
      presets: [
        {
          id: 'short',
          name: 'Short preset',
          playerIds: ['p-7', 'missing'],
          teamId: useGameStore.getState().currentTeam.id,
        },
      ],
    });
    await renderScreen(
      <TrackerLineScreen
        participants={participants}
        rosterParticipants={[...participants, makeParticipant('missing', 'Absent player')]}
        initialSelectedIds={participants.slice(0, 7).map((p) => p.id)}
        title="Set line"
        onConfirm={() => {}}
      />,
    );
    await user.press(screen.getByTestId('line-select-load-line'));
    await user.press(screen.getByText('Short preset'));
    expect(screen.getByText('1/7')).toBeVisible();
    expect(screen.getByText('Unavailable for this line: Absent player')).toBeVisible();
  });

  it('keeps every role group visible after deselecting its last preset player', async () => {
    const user = userEvent.setup();
    const handler = { ...makeParticipant('handler', 'Handler One'), role: 'handler' as const };
    const cutter = { ...makeParticipant('cutter', 'Cutter One'), role: 'cutter' as const };
    const hybrid = { ...makeParticipant('hybrid', 'Hybrid One'), role: 'hybrid' as const };
    useLinePresetsStore.setState({
      presets: [
        {
          id: 'mixed-role-preset',
          name: 'Mixed Role Preset',
          playerIds: [handler.id, cutter.id, hybrid.id],
          teamId: useGameStore.getState().currentTeam.id,
        },
      ],
    });

    await renderScreen(
      <TrackerLineScreen
        participants={[handler, cutter, hybrid]}
        title="Set line"
        onConfirm={() => {}}
      />,
    );

    await user.press(screen.getByTestId('line-select-load-line'));
    await user.press(screen.getByText('Mixed Role Preset'));
    expect(screen.getByText('Handler')).toBeVisible();
    expect(screen.getByText('Cutter')).toBeVisible();
    expect(screen.getByText('Hybrid')).toBeVisible();

    await user.press(screen.getByText(handler.name));

    expect(screen.getByText('Handler')).toBeVisible();
    expect(screen.getByText('Cutter')).toBeVisible();
    expect(screen.getByText('Hybrid')).toBeVisible();
    expect(screen.getByText(handler.name)).toBeVisible();
  });

  it('sorts FMP players before MMP', async () => {
    const user = userEvent.setup();
    const mmpHandler = {
      ...makeParticipant('mmp-handler', 'Andy'),
      role: 'handler' as const,
      matchingType: 'mmp' as const,
    };
    const fmpHandler = {
      ...makeParticipant('fmp-handler', 'Beth'),
      role: 'handler' as const,
      matchingType: 'fmp' as const,
    };
    const mmpCutter = {
      ...makeParticipant('mmp-cutter', 'Carl'),
      role: 'cutter' as const,
      matchingType: 'mmp' as const,
    };

    await renderScreen(
      <TrackerLineScreen
        participants={[mmpHandler, fmpHandler, mmpCutter]}
        title="Set line"
        onConfirm={() => {}}
      />,
    );

    expect(screen.getByText('Handler')).toBeVisible();

    expect(screen.getByText('Andy')).toBeVisible();
    expect(screen.getByText('Beth')).toBeVisible();

    await user.press(screen.getByText('Andy'));
    expect(screen.getByTestId('player-chip-Andy')).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ selected: true }),
    );
    expect(screen.getByText('Handler')).toBeVisible();
  });

  it('renders single-gender role sections without matching-type subgroups', async () => {
    const mmpHandler = {
      ...makeParticipant('mmp-handler', 'Andy'),
      role: 'handler' as const,
      matchingType: 'mmp' as const,
    };
    const mmpCutter = {
      ...makeParticipant('mmp-cutter', 'Carl'),
      role: 'cutter' as const,
      matchingType: 'mmp' as const,
    };

    await renderScreen(
      <TrackerLineScreen
        participants={[mmpHandler, mmpCutter]}
        title="Set line"
        onConfirm={() => {}}
      />,
    );

    expect(screen.getByText('Handler')).toBeVisible();
    expect(screen.queryByText('MMP')).not.toBeOnTheScreen();
    expect(screen.queryByText('FMP')).not.toBeOnTheScreen();
  });
});
