import type { Player, SavedGame, SavedTeam } from '@/lib/storage/types';
import { CURRENT_SCHEMA_VERSION } from '@/lib/storage/types';
import { useSavedAdvancedGamesStore } from '@/store/advancedTracking/savedGamesStore';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { useGameStore } from '@/store/basic/gameStore';
import { useGameSessionStore } from '@/store/gameSessionStore';

export const testPlayers: Player[] = [
  {
    id: 'player-alex',
    name: 'Alex',
    number: '7',
    isActive: true,
    matchingType: 'fmp',
    role: 'handler',
  },
  {
    id: 'player-blair',
    name: 'Blair',
    number: '12',
    isActive: true,
    matchingType: 'mmp',
    role: 'cutter',
  },
];

export const testTeam: SavedTeam = {
  id: 'team-windchill',
  name: 'Windchill',
  roster: testPlayers,
};

export function arrangeBasicGame(options?: {
  statTrackingEnabled?: boolean;
  status?: 'fresh' | 'inProgress' | 'finished';
}) {
  useGameStore.setState({
    currentTeam: testTeam,
    team2Name: 'Rivals',
    statTrackingEnabled: options?.statTrackingEnabled ?? false,
    currentGameStatus: options?.status ?? 'inProgress',
    currentGameId: 'basic-game-1',
    possession: options?.statTrackingEnabled ? 'team1' : null,
    startingPossession: options?.statTrackingEnabled ? 'team1' : null,
  });
  useGameSessionStore.getState().setActiveGameType('basic');
}

export function createSavedBasicGame(): SavedGame {
  return {
    id: 'saved-basic-game-1',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: Date.UTC(2026, 0, 2),
    team1: testTeam,
    team2Name: 'Rivals',
    team1Score: 15,
    team2Score: 12,
    events: [
      {
        type: 'goal',
        team: 'team1',
        goalPlayerId: 'player-alex',
        assistPlayerId: 'player-blair',
        pointNumber: 1,
      },
    ],
    gameTo: 15,
    startingPossession: 'team1',
  };
}

export function arrangeAdvancedGame() {
  useGameSessionStore.getState().setActiveGameType('advanced');
  return useAdvancedTrackingStore.getState().createGame({
    id: 'advanced-game-1',
    focusSideId: 'windchill',
    initialReceivingSideId: 'windchill',
    sides: [
      { id: 'windchill', label: 'Windchill', trackingMode: 'full-roster' },
      { id: 'rivals', label: 'Rivals', trackingMode: 'anonymous' },
    ],
    participants: testPlayers.map((player) => ({ id: player.id, name: player.name })),
    format: { gameTo: 15 },
    metadata: { title: 'Windchill vs Rivals' },
  });
}

export function cacheCurrentAdvancedGame() {
  const game = useAdvancedTrackingStore.getState().currentGame;
  if (!game) {
    throw new Error('Expected an active advanced game fixture.');
  }
  useSavedAdvancedGamesStore.setState((state) => ({
    gamesById: { ...state.gamesById, [game.id]: game },
    summariesLoaded: true,
  }));
  return game;
}

export function recordOpeningPull() {
  useAdvancedTrackingStore.getState().recordPull({
    lines: [
      {
        sideId: 'windchill',
        participantIds: testPlayers.map((player) => player.id),
      },
    ],
    puller: { refType: 'untracked' },
    receiver: { refType: 'participant', participantId: 'player-alex' },
    result: 'inbound',
  });
}
