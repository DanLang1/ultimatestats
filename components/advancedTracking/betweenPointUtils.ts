import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { getCurrentPoint, getPointScoringSideId } from '@/lib/advancedTracking/trackingUtils';
import type {
  AdvancedTrackedGame,
  Participant,
  PlayerRef,
  PossessionAction,
} from '@/lib/advancedTracking/types';

export interface BetweenPointMetric {
  label: string;
  value: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}

export function getPointDetails(actions: PossessionAction[], focusSideId: string) {
  let passCount = 0;
  let turnCount = 0;

  for (const action of actions) {
    if (action.kind === 'throw') {
      if (
        action.sideId === focusSideId &&
        (action.result === 'complete' || action.result === 'goal')
      ) {
        passCount++;
      }
      if (
        action.result === 'drop' ||
        action.result === 'throwaway' ||
        action.result === 'stall' ||
        action.result === 'block' ||
        action.result === 'pressure' ||
        action.result === 'callahan'
      ) {
        turnCount++;
      }
    } else if (action.kind === 'pull' && action.result === 'dropped') {
      turnCount++;
    }
  }

  return { passCount, turnCount };
}

export function getPointContextStats({
  game,
  pointActions,
  receivingSideId,
  focusSideId,
}: {
  game: AdvancedTrackedGame;
  pointActions: PossessionAction[];
  receivingSideId: string | null;
  focusSideId: string;
}): BetweenPointMetric[] {
  const teamStats = getLiveTeamStats(game, focusSideId);
  const isOPoint = receivingSideId === focusSideId;
  const pullAction = pointActions.find(
    (action) => action.kind === 'pull' && action.sideId === focusSideId,
  );
  const pullHangTimeMs = pullAction?.kind === 'pull' ? pullAction.hangTimeMs : undefined;

  if (isOPoint) {
    return [
      {
        label: 'O efficiency',
        value: `${teamStats.holds}/${teamStats.oPoints}`,
        icon: 'chart-bar',
      },
      {
        label: 'clean holds',
        value: `${teamStats.cleanHolds}/${teamStats.holds}`,
        icon: 'shield-check-outline',
      },
    ];
  }

  if (pullHangTimeMs != null) {
    return [
      {
        label: 'D efficiency',
        value: `${teamStats.breaks}/${teamStats.dPoints}`,
        icon: 'chart-bar',
      },
      {
        label: 'pull hang',
        value: `${(pullHangTimeMs / 1000).toFixed(1)}s`,
        icon: 'timer-outline',
      },
    ];
  }

  return [
    {
      label: 'D efficiency',
      value: `${teamStats.breaks}/${teamStats.dPoints}`,
      icon: 'chart-bar',
    },
    {
      label: 'breaks',
      value: `${teamStats.breaks}/${teamStats.dPoints}`,
      icon: 'link-variant-remove',
    },
  ];
}

export function getHockeyAssistName(
  point: ReturnType<typeof getCurrentPoint>,
  participants: Participant[],
): string | null {
  const scoringPossession = point?.possessions.at(-1) ?? null;
  if (scoringPossession == null) {
    return null;
  }

  for (let i = scoringPossession.actions.length - 1; i >= 0; i--) {
    const action = scoringPossession.actions[i];
    if (action.kind !== 'throw' || action.result !== 'goal') {
      continue;
    }

    for (let previousIndex = i - 1; previousIndex >= 0; previousIndex--) {
      const previousAction = scoringPossession.actions[previousIndex];
      if (previousAction.kind === 'stoppage') {
        continue;
      }
      if (previousAction.kind === 'throw' && previousAction.result === 'complete') {
        return getPlayerRefName(previousAction.thrower, participants);
      }
      return null;
    }
  }

  return null;
}

export function getPointOutcomeLabel({
  focusSideId,
  focusSideLabel,
  opponentSideLabel,
  scoringSideId,
  receivingSideId,
  possessionSideIds,
}: {
  focusSideId: string;
  focusSideLabel: string;
  opponentSideLabel: string;
  scoringSideId: string | null;
  receivingSideId: string | null;
  possessionSideIds: string[];
}) {
  if (scoringSideId == null || receivingSideId == null) {
    return 'Point Complete';
  }

  const focusReceived = receivingSideId === focusSideId;
  const focusScored = scoringSideId === focusSideId;
  if (focusReceived && focusScored) {
    const uniquePossessionSides = new Set(possessionSideIds);
    if (uniquePossessionSides.size === 1) {
      return `${focusSideLabel} Clean Hold`;
    }
    return `${focusSideLabel} Dirty Hold`;
  }
  if (!focusReceived && focusScored) {
    return `${focusSideLabel} Break`;
  }
  if (focusReceived && !focusScored) {
    return `${opponentSideLabel} Break`;
  }
  return `${opponentSideLabel} Hold`;
}

function getPlayerRefName(ref: PlayerRef, participants: Participant[]) {
  if (ref.refType === 'participant') {
    return participants.find((participant) => participant.id === ref.participantId)?.name ?? null;
  }
  if (ref.refType === 'unknown') {
    return 'Unknown';
  }
  return null;
}

function getLiveTeamStats(game: AdvancedTrackedGame, focusSideId: string) {
  let holds = 0;
  let breaks = 0;
  let cleanHolds = 0;
  let oPoints = 0;
  let dPoints = 0;

  for (const trackedPoint of game.points) {
    const scoringSideId = getPointScoringSideId(game, trackedPoint);
    const receivingSideId = trackedPoint.possessions[0]?.sideId ?? null;
    if (scoringSideId == null || receivingSideId == null) {
      continue;
    }

    const focusReceived = receivingSideId === focusSideId;
    const focusScored = scoringSideId === focusSideId;
    if (focusReceived) {
      oPoints++;
    } else {
      dPoints++;
    }

    if (focusReceived && focusScored) {
      holds++;
      const uniquePossessionSides = new Set(
        trackedPoint.possessions.map((possession) => possession.sideId),
      );
      if (uniquePossessionSides.size === 1) {
        cleanHolds++;
      }
    } else if (!focusReceived && focusScored) {
      breaks++;
    }
  }

  return {
    holds,
    breaks,
    oPoints,
    dPoints,
    cleanHolds,
  };
}
