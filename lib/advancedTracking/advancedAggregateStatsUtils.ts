import type { AnalyticsGame } from './analyticsTypes';
import { getFinalScores, getFocusGameOutcome } from './buildAnalyticsGame';
import type { FlipChoice } from './types';

export interface AdvancedInitialPullWinBucket {
  games: number;
  wins: number;
  losses: number;
  winPercentage: number | null;
}

export interface AdvancedFlipChoiceBucket extends AdvancedInitialPullWinBucket {
  ties: number;
}

export interface AdvancedInitialPullWinStats {
  receivingFirst: AdvancedInitialPullWinBucket;
  pullingFirst: AdvancedInitialPullWinBucket;
}

export interface AdvancedFlipStats {
  recorded: number;
  wins: number;
  losses: number;
  winPercentage: number | null;
  byChoice: Record<FlipChoice, AdvancedFlipChoiceBucket>;
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

function createEmptyFlipChoiceBucket(): AdvancedFlipChoiceBucket {
  return {
    ...createEmptyBucket(),
    ties: 0,
  };
}

function recordChoiceGame(bucket: AdvancedFlipChoiceBucket, outcome: 'win' | 'loss' | 'tie'): void {
  bucket.games += 1;
  if (outcome === 'win') {
    bucket.wins += 1;
  } else if (outcome === 'loss') {
    bucket.losses += 1;
  } else {
    bucket.ties += 1;
  }

  // Ties count toward choice frequency, but the win rate only uses decisive games.
  const decisiveGames = bucket.wins + bucket.losses;
  bucket.winPercentage = decisiveGames > 0 ? bucket.wins / decisiveGames : null;
}

export function computeInitialPullWinStats(games: AnalyticsGame[]): AdvancedInitialPullWinStats {
  const stats: AdvancedInitialPullWinStats = {
    receivingFirst: createEmptyBucket(),
    pullingFirst: createEmptyBucket(),
  };

  for (const game of games) {
    const outcome = getFocusGameOutcome(getFinalScores(game), game.focusSideId, game.oppSideId);
    if (outcome === 'tie') continue;

    const focusReceivedFirst = game.initialReceivingSideId === game.focusSideId;
    const bucket = focusReceivedFirst ? stats.receivingFirst : stats.pullingFirst;
    recordGame(bucket, outcome === 'win');
  }

  return stats;
}

export function computeFlipStats(games: AnalyticsGame[]): AdvancedFlipStats {
  const stats: AdvancedFlipStats = {
    recorded: 0,
    wins: 0,
    losses: 0,
    winPercentage: null,
    byChoice: {
      offense: createEmptyFlipChoiceBucket(),
      defense: createEmptyFlipChoiceBucket(),
      side: createEmptyFlipChoiceBucket(),
    },
  };

  for (const game of games) {
    if (game.flip == null) continue;

    stats.recorded += 1;
    if (game.flip.result === 'won') {
      stats.wins += 1;
    } else {
      stats.losses += 1;
    }

    if (game.flip.result !== 'won' || game.flip.choice == null) continue;

    const bucket = stats.byChoice[game.flip.choice];
    recordChoiceGame(
      bucket,
      getFocusGameOutcome(getFinalScores(game), game.focusSideId, game.oppSideId),
    );
  }

  if (stats.recorded > 0) {
    stats.winPercentage = stats.wins / stats.recorded;
  }

  return stats;
}
