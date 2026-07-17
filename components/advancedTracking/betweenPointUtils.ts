import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { getGoalInfo } from '@/lib/advancedTracking/trackingDisplayHelpers';
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
}: {
  game: AdvancedTrackedGame;
  pointActions: PossessionAction[];
  receivingSideId: string | null;
}): BetweenPointMetric[] {
  const teamStats = getLiveTeamStats(game);
  const isOPoint = receivingSideId === game.focusSideId;
  const pullAction = pointActions.find(
    (action) => action.kind === 'pull' && action.sideId === game.focusSideId,
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
  scoringSideId,
  receivingSideId,
  possessionSideIds,
}: {
  focusSideId: string;
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
      return 'Clean Hold';
    }
    return 'Dirty Hold';
  }
  if (!focusReceived && focusScored) {
    return 'Break';
  }
  if (focusReceived && !focusScored) {
    return 'Broken';
  }
  return 'Opp Hold';
}

export function getLastEventLabel({
  goalInfo,
  focusSideLabel,
  opponentSideLabel,
}: {
  goalInfo: ReturnType<typeof getGoalInfo>;
  focusSideLabel: string;
  opponentSideLabel: string;
}) {
  if (goalInfo?.isFocusGoal === true) {
    if (goalInfo.isCallahan) {
      return `${focusSideLabel} CALLAHAN`;
    }
    return `${focusSideLabel} GOAL`;
  }
  if (goalInfo?.isCallahan === true) {
    return `${opponentSideLabel} CALLAHAN`;
  }
  return `${opponentSideLabel} GOAL`;
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

function getLiveTeamStats(game: AdvancedTrackedGame) {
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

    const focusReceived = receivingSideId === game.focusSideId;
    const focusScored = scoringSideId === game.focusSideId;
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
