import { getSafeDiscHolderRef } from './trackingDisplayHelpers';
import { areBothSidesFullyTracked } from './trackingModeUtils';
import {
  getCurrentPoint,
  getCurrentPossession,
  getOtherSideId,
  hasPointEnded,
  isPossessionOver,
} from './trackingUtils';
import type { AdvancedTrackedGame, PlayerRef, ThrowResult } from './types';

/** A coach-facing description of an advanced-tracker capture, independent of stored actions. */
export type CaptureIntent =
  | { kind: 'pickup'; player: PlayerRef }
  | { kind: 'pass'; receiver: PlayerRef }
  | { kind: 'goal'; scorer: PlayerRef }
  | { kind: 'drop'; receiver: PlayerRef }
  | { kind: 'fifty-fifty'; receiver: PlayerRef }
  | { kind: 'throwaway' }
  | { kind: 'block'; defender?: PlayerRef }
  | { kind: 'pressure'; defender: PlayerRef }
  | { kind: 'stall'; defender?: PlayerRef }
  | { kind: 'callahan'; scorer: PlayerRef }
  | { kind: 'anonymous-opponent-goal' }
  | { kind: 'anonymous-opponent-turnover' };

export type CaptureIntentRejection =
  | 'point-not-started'
  | 'point-over'
  | 'possession-over'
  | 'holder-required';

export type CaptureIntentResult =
  | { ok: true; actionId: string }
  | { ok: false; reason: CaptureIntentRejection };

export interface PlannedCapture {
  pickup?: { sideId: string; player: PlayerRef };
  throw?: {
    result: ThrowResult;
    thrower: PlayerRef;
    toPlayer?: PlayerRef;
    defender?: PlayerRef;
    splitAttribution?: boolean;
  };
}

export type CapturePlanResult =
  | { ok: true; plan: PlannedCapture }
  | { ok: false; reason: CaptureIntentRejection };

/**
 * Converts semantic capture input to the canonical action payloads. It deliberately has no
 * IDs, timestamps, Draft, undo, or persistence concerns; the tracking store owns those.
 */
export function planCaptureIntent(
  game: AdvancedTrackedGame,
  intent: CaptureIntent,
): CapturePlanResult {
  const point = getCurrentPoint(game);
  if (point == null) return { ok: false, reason: 'point-not-started' };
  if (hasPointEnded(point)) return { ok: false, reason: 'point-over' };

  const possession = getCurrentPossession(game);
  const bothSidesTracked = areBothSidesFullyTracked(game);
  let activeSideId = game.focusSideId;
  if (possession != null) {
    activeSideId = isPossessionOver(possession)
      ? getOtherSideId(game, possession.sideId)
      : possession.sideId;
  }
  const holder = getSafeDiscHolderRef(
    possession,
    bothSidesTracked ? activeSideId : game.focusSideId,
    point,
  );
  const opponentSideId = getOtherSideId(game, game.focusSideId);
  const needsOpponentPickup =
    !bothSidesTracked &&
    activeSideId === opponentSideId &&
    (!possession || isPossessionOver(possession));

  if (intent.kind === 'pickup') {
    if (possession != null && !isPossessionOver(possession) && holder != null) {
      return { ok: false, reason: 'holder-required' };
    }
    return { ok: true, plan: { pickup: { sideId: activeSideId, player: intent.player } } };
  }

  if (intent.kind === 'anonymous-opponent-goal' || intent.kind === 'anonymous-opponent-turnover') {
    if (bothSidesTracked) return { ok: false, reason: 'holder-required' };
    const pickup = needsOpponentPickup
      ? { sideId: opponentSideId, player: { refType: 'untracked' as const } }
      : undefined;
    if (
      !pickup &&
      (possession == null || possession.sideId !== opponentSideId || isPossessionOver(possession))
    ) {
      return { ok: false, reason: 'possession-over' };
    }
    return {
      ok: true,
      plan: {
        pickup,
        throw: {
          thrower: { refType: 'untracked' },
          result: intent.kind === 'anonymous-opponent-goal' ? 'goal' : 'throwaway',
        },
      },
    };
  }

  // In single-team mode opponent outcomes synthesize only the anonymous possession scaffold.
  const isAnonymousOpponentPossession = !bothSidesTracked && activeSideId === opponentSideId;
  const pickup =
    isAnonymousOpponentPossession && needsOpponentPickup
      ? { sideId: opponentSideId, player: { refType: 'untracked' as const } }
      : undefined;
  const thrower = isAnonymousOpponentPossession ? ({ refType: 'untracked' } as PlayerRef) : holder;
  if (thrower == null) return { ok: false, reason: 'holder-required' };

  if (
    isAnonymousOpponentPossession &&
    (intent.kind === 'pass' ||
      intent.kind === 'goal' ||
      intent.kind === 'drop' ||
      intent.kind === 'fifty-fifty' ||
      intent.kind === 'throwaway')
  ) {
    return { ok: false, reason: 'holder-required' };
  }

  switch (intent.kind) {
    case 'pass':
      return {
        ok: true,
        plan: { throw: { thrower, result: 'complete', toPlayer: intent.receiver } },
      };
    case 'goal':
      return { ok: true, plan: { throw: { thrower, result: 'goal', toPlayer: intent.scorer } } };
    case 'drop':
      return { ok: true, plan: { throw: { thrower, result: 'drop', toPlayer: intent.receiver } } };
    case 'fifty-fifty':
      return {
        ok: true,
        plan: {
          throw: { thrower, result: 'drop', toPlayer: intent.receiver, splitAttribution: true },
        },
      };
    case 'throwaway':
      return { ok: true, plan: { throw: { thrower, result: 'throwaway' } } };
    case 'block':
      return {
        ok: true,
        plan: { pickup, throw: { thrower, result: 'block', defender: intent.defender } },
      };
    case 'pressure':
      return {
        ok: true,
        plan: { pickup, throw: { thrower, result: 'pressure', defender: intent.defender } },
      };
    case 'stall':
      return {
        ok: true,
        plan: { pickup, throw: { thrower, result: 'stall', defender: intent.defender } },
      };
    case 'callahan':
      // An anonymous opponent Callahan stores the selected scorer as toPlayer, matching the
      // existing single-team payload. A tracked possession stores that scorer as defender.
      return {
        ok: true,
        plan: {
          pickup,
          throw: {
            thrower,
            result: 'callahan',
            ...(isAnonymousOpponentPossession
              ? { toPlayer: intent.scorer }
              : { defender: intent.scorer }),
          },
        },
      };
    default:
      throw new Error(`Unsupported capture intent ${(intent as { kind: string }).kind}.`);
  }
}
