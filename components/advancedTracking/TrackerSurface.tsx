import { BetweenPointDisplay } from '@/components/advancedTracking/BetweenPointDisplay';
import { GameClockPauseOverlay } from '@/components/advancedTracking/GameClockPauseOverlay';
import { HalftimeBetweenPointDisplay } from '@/components/advancedTracking/HalftimeBetweenPointDisplay';
import { StoppageOverlay } from '@/components/advancedTracking/StoppageOverlay';
import {
  TrackerPlayerGrid,
  TrackerPlayerGridHandlers,
} from '@/components/advancedTracking/TrackerPlayerGrid';
import type {
  AdvancedTrackedGame,
  GameClockPause,
  Participant,
  PassModifier,
  PlayerRef,
  StoppageAction,
} from '@/lib/advancedTracking/types';

export type TrackerSurfaceState =
  | { kind: 'game-clock-pause'; pause: GameClockPause }
  | { kind: 'stoppage'; game: AdvancedTrackedGame; stoppage: StoppageAction }
  | { kind: 'between-points'; game: AdvancedTrackedGame }
  | { kind: 'live-point' };

interface GetTrackerSurfaceStateInput {
  game: AdvancedTrackedGame;
  activeGameClockPause: GameClockPause | null;
  activeStoppage: StoppageAction | null;
  pointIsOver: boolean;
}

export function getTrackerSurfaceState({
  game,
  activeGameClockPause,
  activeStoppage,
  pointIsOver,
}: GetTrackerSurfaceStateInput): TrackerSurfaceState {
  if (activeGameClockPause) {
    return { kind: 'game-clock-pause', pause: activeGameClockPause };
  }
  if (activeStoppage) {
    return { kind: 'stoppage', game, stoppage: activeStoppage };
  }
  if (pointIsOver) {
    return { kind: 'between-points', game };
  }
  return { kind: 'live-point' };
}

interface TrackerSurfaceProps {
  state: TrackerSurfaceState;
  participants: Participant[];
  isHalftimeBreakActive: boolean;
  activeParticipants: Participant[];
  discHolderRef: PlayerRef | null;
  oppHasDisc: boolean;
  canDropOpeningPull: boolean;
  passModifier: PassModifier;
  handlers: TrackerPlayerGridHandlers;
  onStartNextPoint: () => void;
  onLineChangePress: () => void;
  canChangeLine: boolean;
  availableHeight: number | null;
}

export const TrackerSurface = ({
  state,
  participants,
  activeParticipants,
  discHolderRef,
  oppHasDisc,
  canDropOpeningPull,
  passModifier,
  handlers,
  onStartNextPoint,
  isHalftimeBreakActive,
  onLineChangePress,
  canChangeLine,
  availableHeight,
}: TrackerSurfaceProps) => {
  switch (state.kind) {
    case 'game-clock-pause':
      return <GameClockPauseOverlay pause={state.pause} />;
    case 'stoppage':
      return <StoppageOverlay game={state.game} />;
    case 'between-points':
      if (isHalftimeBreakActive) {
        return (
          <HalftimeBetweenPointDisplay game={state.game} onStartNextPoint={onStartNextPoint} />
        );
      }
      return (
        <BetweenPointDisplay
          game={state.game}
          participants={participants}
          onStartNextPoint={onStartNextPoint}
        />
      );
    case 'live-point':
      return (
        <TrackerPlayerGrid
          activeParticipants={activeParticipants}
          discHolderRef={discHolderRef}
          oppHasDisc={oppHasDisc}
          canDropOpeningPull={canDropOpeningPull}
          passModifier={passModifier}
          handlers={handlers}
          onLineChangePress={onLineChangePress}
          canChangeLine={canChangeLine}
          availableHeight={availableHeight}
        />
      );
  }

  throw new Error('Unsupported tracker surface state');
};
