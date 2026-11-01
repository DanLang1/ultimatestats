import { useActiveGameSession } from '@/hooks/useActiveGameSession';
import {
  getLiveInProgressGame,
  getOtherSideId,
  getSideScore,
} from '@/lib/advancedTracking/trackingUtils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { useGameStore } from '@/store/basic/gameStore';

export interface LiveGameScore {
  myTeamName: string;
  opponentName: string;
  myScore: number;
  opponentScore: number;
  isScrimmage: boolean;
  /** The point being played, or the next one between points. */
  pointNumber: number;
}

/** Score of the game in progress, read from the same session that Resume returns to. */
export function useLiveGameScore(): LiveGameScore {
  const { kind } = useActiveGameSession();
  const liveAdvancedGame = useAdvancedTrackingStore(getLiveInProgressGame);
  const basicTeam1Name = useGameStore((state) => state.currentTeam.name);
  const basicTeam2Name = useGameStore((state) => state.team2Name);
  const basicTeam1Score = useGameStore((state) => state.team1Score);
  const basicTeam2Score = useGameStore((state) => state.team2Score);

  if (kind === 'none') throw new Error('No game in progress.');
  if (kind === 'basic') {
    return {
      myTeamName: basicTeam1Name,
      opponentName: basicTeam2Name,
      myScore: basicTeam1Score,
      opponentScore: basicTeam2Score,
      isScrimmage: false,
      pointNumber: basicTeam1Score + basicTeam2Score + 1,
    };
  }

  // An advanced session exists only while its game is in progress.
  if (liveAdvancedGame == null) throw new Error('Advanced session has no live game.');
  const focusSide = liveAdvancedGame.sides.find((side) => side.id === liveAdvancedGame.focusSideId);
  const otherSideId = getOtherSideId(liveAdvancedGame, liveAdvancedGame.focusSideId);
  const otherSide = liveAdvancedGame.sides.find((side) => side.id === otherSideId);
  if (!focusSide || !otherSide) throw new Error('Live advanced game is missing a side.');
  const myScore = getSideScore(liveAdvancedGame, focusSide.id);
  const opponentScore = getSideScore(liveAdvancedGame, otherSide.id);
  return {
    myTeamName: focusSide.label,
    opponentName: otherSide.label,
    myScore,
    opponentScore,
    isScrimmage: liveAdvancedGame.gameType === 'scrimmage',
    pointNumber: myScore + opponentScore + 1,
  };
}
