import type {
  AdvancedCorrectionContext,
  AdvancedStandaloneCorrectionContext,
  AdvancedTouchCorrectionSegment,
} from './advancedTouchCorrectionUtils';

export interface AdvancedTimelineTouchEditRequest {
  pointId: string;
  possessionId: string;
  actionId: string;
  preselectTouch: boolean;
}

export interface AdvancedTimelineTouchEditingTarget {
  context: AdvancedTouchCorrectionSegment | AdvancedStandaloneCorrectionContext;
  initialTouchId?: string;
}

export function getEditableTouchActionIds(
  contexts: AdvancedCorrectionContext[],
): ReadonlySet<string> {
  const actionIds = new Set<string>();
  for (const context of contexts) {
    if (context.kind !== 'touch') {
      actionIds.add(context.action.id);
      continue;
    }
    for (const touch of context.segment.touches) {
      for (const actionId of touch.mutatedActionIds) actionIds.add(actionId);
    }
  }
  return actionIds;
}

export function findTouchEditingTarget(
  contexts: AdvancedCorrectionContext[],
  request: AdvancedTimelineTouchEditRequest,
): AdvancedTimelineTouchEditingTarget | null {
  const standalone = contexts.find(
    (context): context is AdvancedStandaloneCorrectionContext =>
      context.kind !== 'touch' &&
      context.point.id === request.pointId &&
      context.possession.id === request.possessionId &&
      context.action.id === request.actionId,
  );
  if (standalone != null) return { context: standalone };

  const touchContext = contexts.find(
    (context) =>
      context.kind === 'touch' &&
      context.segment.point.id === request.pointId &&
      context.segment.possession.id === request.possessionId &&
      context.segment.touches.some((touch) => touch.mutatedActionIds.includes(request.actionId)),
  );
  if (touchContext?.kind !== 'touch') return null;

  const selectedTouch = request.preselectTouch
    ? touchContext.segment.touches.find((touch) => touch.incomingActionId === request.actionId)
    : undefined;
  return {
    context: touchContext.segment,
    initialTouchId: selectedTouch?.touchId,
  };
}
