import {
  getTrackerSessionView,
  TrackerSessionView,
} from '@/lib/advancedTracking/trackerSessionView';
import { getLiveInProgressGame } from '@/lib/advancedTracking/trackingUtils';
import { PassModifier } from '@/lib/advancedTracking/types';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';

/**
 * The live tracker's derived session state, or null when no in-progress game is active. A finished
 * game stays in `currentGame` for the completion flow but must never be tracked again.
 */
export function useTrackerSession(passModifier: PassModifier): TrackerSessionView | null {
  const game = useAdvancedTrackingStore(getLiveInProgressGame);
  return game ? getTrackerSessionView(game, { passModifier }) : null;
}
