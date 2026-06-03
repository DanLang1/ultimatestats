import type { AnalyticsGame } from './analyticsTypes';
import { getFinalScores } from './buildAnalyticsGame';

export interface AdvancedInitialPullWinBucket {
  games: number;
  wins: number;
  losses: number;
  winPercentage: number | null;
}

export interface AdvancedInitialPullWinStats {
  receivingFirst: AdvancedInitialPullWinBucket;
  pullingFirst: AdvancedInitialPullWinBucket;
}

function createEmptyBucket(): AdvancedInitialPullWinBucket {
  return {
    games: 0,
    wins: 0,
    losses: 0,
    winPercentage: null,
  };
}

function recordGame(bucket: AdvancedInitialPullWinBucket, didWin: boolean): void {
  bucket.games += 1;
  if (didWin) {
    bucket.wins += 1;
  } else {
    bucket.losses += 1;
  }
  bucket.winPercentage = bucket.wins / bucket.games;
}

export function computeInitialPullWinStats(games: AnalyticsGame[]): AdvancedInitialPullWinStats {
  const stats: AdvancedInitialPullWinStats = {
    receivingFirst: createEmptyBucket(),
    pullingFirst: createEmptyBucket(),
  };

  for (const game of games) {
    const finalScores = getFinalScores(game);
    const focusScore = finalScores[game.focusSideId] ?? 0;
    const opponentScore = finalScores[game.oppSideId] ?? 0;
    if (focusScore === opponentScore) continue;

    const focusReceivedFirst = game.initialReceivingSideId === game.focusSideId;
    const bucket = focusReceivedFirst ? stats.receivingFirst : stats.pullingFirst;
    recordGame(bucket, focusScore > opponentScore);
  }

  return stats;
}
