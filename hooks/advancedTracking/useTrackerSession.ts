import {
  getTrackerSessionView,
  TrackerSessionView,
} from '@/lib/advancedTracking/trackerSessionView';
import { PassModifier } from '@/lib/advancedTracking/types';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';

/** The live tracker's derived session state, or null when no advanced game is loaded. */
export function useTrackerSession(passModifier: PassModifier): TrackerSessionView | null {
  const game = useAdvancedTrackingStore((state) => state.currentGame);
  return game ? getTrackerSessionView(game, { passModifier }) : null;
}
