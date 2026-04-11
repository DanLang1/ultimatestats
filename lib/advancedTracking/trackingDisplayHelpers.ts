import { hasItems } from '@/lib/utils';
import { getOtherSideId, isPossessionOver } from './trackingUtils';
import { AdvancedTrackedGame, Participant, PointPossession, ThrowAction } from './types';

/** Returns the side ID that currently has (or will next pick up) the disc. */
export function getActiveSideId(
  possession: PointPossession | null,
  game: AdvancedTrackedGame,
): string {
  if (possession == null) {
    return game.focusSideId;
  }
  return isPossessionOver(possession) ? getOtherSideId(game, possession.sideId) : possession.sideId;
}

/** Returns the ID of the player currently holding the disc, if it's our possession. */
export function getDiscHolderId(
  possession: PointPossession | null,
  focusSideId: string,
): string | null {
  if (!possession || isPossessionOver(possession) || possession.sideId !== focusSideId) {
    return null;
  }
  const actions = possession.actions;
  for (let i = actions.length - 1; i >= 0; i--) {
    const action = actions[i];
    if (action.kind === 'disc_pickup' && action.player.refType === 'participant') {
      return action.player.participantId;
    } else if (action.kind === 'throw' && action.toPlayer?.refType === 'participant') {
      return action.toPlayer.participantId;
    }
  }
  return null;
}

/** Generates the pass chain text (e.g., "... → Alice → Bob"). */
export function getPassChainText(
  possession: PointPossession | null,
  participants: Participant[],
): string {
  if (!possession || !hasItems(possession.actions)) {
    return '';
  }

  const chain = possession.actions
    .filter((a) => a.kind === 'throw')
    .map((a) => {
      const t = a as ThrowAction;
      const toPlayer = t.toPlayer;
      return toPlayer?.refType === 'participant'
        ? participants.find((p) => p.id === toPlayer.participantId)?.name
        : '?';
    })
    .filter(Boolean)
    .slice(-3)
    .join(' → ');

  return chain ? `... → ${chain}` : '';
}

/** Calculates how many timeouts a side has used in the game. */
export function getSideTimeoutsUsed(game: AdvancedTrackedGame, sideId: string): number {
  return game.points.reduce(
    (n, pt) =>
      n +
      (pt.transitionsAfter?.filter((t) => t.transitionType === 'timeout' && t.sideId === sideId)
        .length ?? 0),
    0,
  );
}
