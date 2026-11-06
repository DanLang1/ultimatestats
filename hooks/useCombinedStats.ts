import { useAlert } from '@/components/ui/AlertProvider';
import {
  useAdvancedGames,
  useCompletedAdvancedGameSummaries,
} from '@/hooks/advancedTracking/useAdvancedGameQueries';
import {
  AdvancedFlipStats,
  AdvancedInitialPullWinStats,
  computeFlipStats,
  computeInitialPullWinStats,
} from '@/lib/advancedTracking/advancedAggregateStatsUtils';
import { generateAggregateAdvancedCSV } from '@/lib/advancedTracking/advancedCSVUtils';
import { aggregateAnalyticsGames } from '@/lib/advancedTracking/aggregateAnalyticsGames';
import type { AnalyticsGame } from '@/lib/advancedTracking/analyticsTypes';
import { buildAnalyticsGame } from '@/lib/advancedTracking/buildAnalyticsGame';
import type { AdvancedTrackedGame } from '@/lib/advancedTracking/types';
import { generateAggregateCSV } from '@/lib/basic/statsUtils';
import { advancedGameSummaryToTeamListItem, GameListItem } from '@/lib/gameListUtils';
import { resolveTeamName } from '@/lib/playerUtils';
import { shareCsvExport } from '@/lib/shareCsvExport';
import { GameEvent, Player, SavedGame, SavedTeam } from '@/lib/storage';
import { GameKind } from '@/lib/storage/types';
import { useGameStore } from '@/store/basic/gameStore';

export interface BasicCombinedStats {
  kind: 'basic';
  teamName: string;
  gameCount: number;
  events: GameEvent[];
  games: SavedGame[];
  roster: Player[];
}

export interface AdvancedCombinedStats {
  kind: 'advanced';
  teamName: string;
  aggregatedGame: AnalyticsGame;
  analyticsGames: AnalyticsGame[];
  /** The combined games' full records, sorted by id. */
  games: AdvancedTrackedGame[];
  gameItems: GameListItem[];
  initialPullWinStats: AdvancedInitialPullWinStats;
  flipStats: AdvancedFlipStats | null;
}

export type CombinedStatsState =
  | { status: 'loading' }
  | { status: 'unavailable'; message: string }
  /** Some of the basic games don't exist any more. */
  | { status: 'notFound' }
  | { status: 'ready'; stats: BasicCombinedStats | AdvancedCombinedStats };

function getAdvancedAggregateErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.includes('same focus side')) {
    return 'These games cannot be combined because they use incompatible advanced team records.';
  }
  return 'Could not combine the selected advanced games.';
}

function getRecordedFlipStats(games: AnalyticsGame[]): AdvancedFlipStats | null {
  const stats = computeFlipStats(games);
  if (stats.recorded === 0) return null;
  return stats;
}

function toFilename(teamName: string): string {
  return teamName.replace(/[^a-zA-Z0-9]/g, '_');
}

function combineBasicGames(
  savedGames: SavedGame[],
  gameIds: Set<string>,
  savedTeams: SavedTeam[],
): BasicCombinedStats | null {
  const games = savedGames.filter((game) => gameIds.has(game.id));
  if (games.length !== gameIds.size) return null;

  const rosterMap = new Map<string, Player>();
  games.forEach((game) => game.team1.roster.forEach((player) => rosterMap.set(player.id, player)));
  // Saved Games only combines one team's games.
  const firstGame = games[0];

  return {
    kind: 'basic',
    teamName: resolveTeamName(firstGame.team1.id, firstGame.team1.name, savedTeams),
    gameCount: games.length,
    events: games.flatMap((game) => game.events),
    games,
    roster: Array.from(rosterMap.values()),
  };
}

/** Combined results for one team's games of one kind, plus their CSV export. */
export function useCombinedStats(kind: GameKind, gameIds: string[]) {
  const { showAlert } = useAlert();
  const { savedGames, savedTeams } = useGameStore();
  const { data: completedAdvancedSavedGameSummaries } = useCompletedAdvancedGameSummaries();
  const gameIdSet = new Set(gameIds);

  const advancedGameIds = kind === 'advanced' ? [...gameIds].sort() : [];
  const {
    data: advancedGames,
    isLoading: advancedGamesLoading,
    isError: advancedGamesError,
    isComplete: advancedGamesComplete,
  } = useAdvancedGames(advancedGameIds);

  const getState = (): CombinedStatsState => {
    if (kind === 'basic') {
      const stats = combineBasicGames(savedGames, gameIdSet, savedTeams);
      return stats ? { status: 'ready', stats } : { status: 'notFound' };
    }

    if (!advancedGamesComplete && advancedGamesLoading) return { status: 'loading' };
    if (advancedGamesError) {
      return { status: 'unavailable', message: 'Could not load the selected advanced games.' };
    }
    if (!advancedGamesComplete) {
      return {
        status: 'unavailable',
        message: 'Some selected advanced games could not be loaded.',
      };
    }

    try {
      const analyticsGames = advancedGames.map(buildAnalyticsGame);
      const aggregatedGame = aggregateAnalyticsGames(analyticsGames);
      if (!aggregatedGame) throw new Error('useCombinedStats needs at least one game.');
      return {
        status: 'ready',
        stats: {
          kind: 'advanced',
          teamName: aggregatedGame.sideLabels[aggregatedGame.focusSideId],
          aggregatedGame,
          analyticsGames,
          games: advancedGames,
          gameItems: completedAdvancedSavedGameSummaries
            .filter((game) => gameIdSet.has(game.id))
            .map((game) => advancedGameSummaryToTeamListItem(game, savedTeams)),
          initialPullWinStats: computeInitialPullWinStats(analyticsGames),
          flipStats: getRecordedFlipStats(analyticsGames),
        },
      };
    } catch (error) {
      return { status: 'unavailable', message: getAdvancedAggregateErrorMessage(error) };
    }
  };

  const state = getState();

  const exportCSV = async () => {
    if (state.status !== 'ready') return;
    const { stats } = state;

    if (stats.kind === 'advanced') {
      await shareCsvExport(
        () => ({
          csv: generateAggregateAdvancedCSV(
            stats.analyticsGames,
            stats.aggregatedGame,
            stats.teamName,
          ),
          filename: `${toFilename(stats.teamName)}_${stats.games.length}_games_advanced`,
        }),
        showAlert,
      );
      return;
    }

    await shareCsvExport(
      () => ({
        csv: generateAggregateCSV(stats.games, stats.teamName, stats.roster),
        filename: `${toFilename(stats.teamName)}_${stats.gameCount}_games`,
      }),
      showAlert,
    );
  };

  return { state, exportCSV };
}
