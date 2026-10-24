import {
  getActiveGameClockPause,
  getActiveSideId,
  getActiveStoppage,
  getSafeDiscHolderRef,
} from './trackingDisplayHelpers';
import { getCurrentPoint, getCurrentPossession, hasPointEnded } from './trackingUtils';
import {
  AdvancedTrackedGame,
  GameClockPause,
  PlayerRef,
  PointPossession,
  StoppageAction,
  TrackedPoint,
} from './types';

/** Live-play facts shared by the tracker screen, score bar, and capture planning. */
export interface LivePlayState {
  /** The latest point, or null before the first point starts. */
  point: TrackedPoint | null;
  /** The latest possession of the current point, which may already be over. */
  possession: PointPossession | null;
  /** A side has scored the current point. */
  pointIsOver: boolean;
  /** The side that has (or will next pick up) the disc. */
  activeSideId: string;
  /** The current possession's last action when it is an unresumed stoppage. */
  activeStoppage: StoppageAction | null;
  /** The unresumed game-clock pause, if any. */
  activeGameClockPause: GameClockPause | null;
  /** A stoppage or game-clock pause is open. */
  isPlayPaused: boolean;
  /**
   * The disc holder when `sideId` has the disc; null when it doesn't or a post-injury pickup is
   * pending. Callers pass different sides on purpose: the session view passes the perspective side
   * (what the screen shows), `planCaptureIntent` the active side when both sides are tracked and
   * the focus side otherwise (who the capture is attributed to), and `canSetRedZone` the active
   * side (whose possession enters Red Zone).
   */
  holderFor: (sideId: string) => PlayerRef | null;
}

export function getLivePlayState(game: AdvancedTrackedGame): LivePlayState {
  const point = getCurrentPoint(game);
  const possession = getCurrentPossession(game);
  const activeStoppage = getActiveStoppage(possession);
  const activeGameClockPause = getActiveGameClockPause(game);
  return {
    point,
    possession,
    pointIsOver: hasPointEnded(point),
    activeSideId: getActiveSideId(possession, game),
    activeStoppage,
    activeGameClockPause,
    isPlayPaused: activeStoppage !== null || activeGameClockPause !== null,
    holderFor: (sideId) => getSafeDiscHolderRef(possession, sideId, point),
  };
}
