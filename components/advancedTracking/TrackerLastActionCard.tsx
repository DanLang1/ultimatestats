import React, { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { PICKUP_PROMPT_TEXT } from '@/components/advancedTracking/bottomCard/constants';
import { GoalHeader } from '@/components/advancedTracking/bottomCard/GoalHeader';
import {
  LAST_ACTION_EYEBROW_LINE_HEIGHT,
  LastActionCardFrame,
} from '@/components/advancedTracking/bottomCard/LastActionCardFrame';
import { ModifierPrompt } from '@/components/advancedTracking/bottomCard/ModifierPrompt';
import { PassChainHeader } from '@/components/advancedTracking/bottomCard/PassChainHeader';
import { ThrowTypePrompt } from '@/components/advancedTracking/bottomCard/ThrowTypePrompt';
import { TurnoverHeader } from '@/components/advancedTracking/bottomCard/TurnoverHeader';
import { PASS_MODIFIER_TONES } from '@/components/advancedTracking/types';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { TrackerSessionView } from '@/lib/advancedTracking/trackerSessionView';
import {
  getGoalInfo,
  getLastTurnoverEvent,
  getLatestThrowDetailsTarget,
  getPassChainEvents,
  ThrowDetailsTarget,
  TurnoverEventInfo,
} from '@/lib/advancedTracking/trackingDisplayHelpers';
import {
  getEligibleThrowTypes,
  Participant,
  PassModifier,
  PointPossession,
  ThrowType,
  TrackedPoint,
} from '@/lib/advancedTracking/types';
import { isUndoOfPointEndingAction } from '@/lib/advancedTracking/undoOperations';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { Fonts, Palette } from '@/theme/theme';

const EXPANDED_TURNOVER_TEXT_LIMIT = 12;

type TrackerLastActionCardProps = {
  session: TrackerSessionView;
  passModifier: PassModifier;
  onCancelModifier: () => void;
  onMorePress: () => void;
  /** Fill the parent's height, as in the tablet landscape header row. */
  fillHeight?: boolean;
};

type BottomCardButtonMode = React.ComponentProps<typeof LastActionCardFrame>['buttonMode'];

interface TrackerLastActionCardState {
  passModifier: PassModifier;
  pointIsOver: boolean;
  point: TrackedPoint | null;
  focusSideId: string;
  tracksBothSides: boolean;
  participants: Participant[];
  oppHasDisc: boolean;
  canUseRareMenu: boolean;
  lastFocusPossession: PointPossession | null;
  lastOppPossession: PointPossession | null;
  focusHasStarted: boolean;
  possession: PointPossession | null;
  lastFocusThrowTarget: ThrowDetailsTarget | null;
  lastOppThrowTarget: ThrowDetailsTarget | null;
  lastGoalThrowTarget: ThrowDetailsTarget | null;
  canUndo: boolean;
  canUndoPointEndingAction: boolean;
}

type TrackerLastActionCardModel =
  | {
      kind: 'modifier';
      accentColor: string;
      buttonMode: BottomCardButtonMode;
      content: ReactNode;
      preferCompactActions?: boolean;
    }
  | {
      kind: 'goal';
      accentColor: string;
      buttonMode: BottomCardButtonMode;
      content: ReactNode;
      preferCompactActions?: boolean;
    }
  | {
      kind: 'turnover';
      accentColor: string;
      buttonMode: BottomCardButtonMode;
      content: ReactNode;
      preferCompactActions?: boolean;
    }
  | {
      kind: 'label';
      accentColor: string;
      buttonMode: BottomCardButtonMode;
      content: ReactNode;
      preferCompactActions?: boolean;
    };

export const TrackerLastActionCard = ({
  session,
  passModifier,
  onCancelModifier,
  onMorePress,
  fillHeight,
}: TrackerLastActionCardProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();

  const onUndo = useAdvancedTrackingStore((state) => state.undoLastOperation);
  const undoStack = useAdvancedTrackingStore((state) => state.undoStack);
  const updateThrowType = useAdvancedTrackingStore((state) => state.updateThrowType);

  const {
    game,
    point,
    possession,
    pointIsOver,
    tracksBothSides,
    perspectiveSideId,
    oppHasDisc,
    canUseRareMenu,
    commands,
  } = session;
  const lastOppPossession =
    point?.possessions.findLast(
      (previousPossession) => previousPossession.sideId !== perspectiveSideId,
    ) ?? null;
  const lastFocusPossession =
    point?.possessions.findLast(
      (previousPossession) => previousPossession.sideId === perspectiveSideId,
    ) ?? null;
  const focusHasStarted =
    !!possession && possession.sideId === perspectiveSideId && possession.actions.length > 0;
  const getTrackedThrowTarget = (candidate: PointPossession | null) => {
    const side = game.sides.find((gameSide) => gameSide.id === candidate?.sideId);
    if (side?.trackingMode !== 'full-roster') return null;
    return getLatestThrowDetailsTarget(point, candidate);
  };
  const canUndoPointEndingAction = isUndoOfPointEndingAction(undoStack.at(-1), point);

  const eyebrow = (color: string) => (
    <ThemedText
      style={{
        fontFamily: Fonts.black,
        fontSize: scaleBySizeClass(10, sizeClass),
        lineHeight: scaleBySizeClass(LAST_ACTION_EYEBROW_LINE_HEIGHT, sizeClass),
        includeFontPadding: false,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
        color,
      }}>
      LAST ACTION
    </ThemedText>
  );

  const frameLabel = (text: string) => (
    <ThemedText style={[s.label(sizeClass), { color: palette.textMuted }]}>{text}</ThemedText>
  );

  const lastActionCardState: TrackerLastActionCardState = {
    passModifier,
    pointIsOver,
    point,
    focusSideId: perspectiveSideId,
    tracksBothSides,
    participants: game.participants,
    oppHasDisc,
    canUseRareMenu,
    lastFocusPossession,
    lastOppPossession,
    focusHasStarted,
    possession,
    lastFocusThrowTarget: getTrackedThrowTarget(lastFocusPossession),
    lastOppThrowTarget: getTrackedThrowTarget(lastOppPossession),
    lastGoalThrowTarget: getTrackedThrowTarget(point?.possessions.at(-1) ?? null),
    canUndo: commands.undo,
    canUndoPointEndingAction,
  };
  const model = getTrackerLastActionCardModel({
    state: lastActionCardState,
    ui: {
      palette,
      onCancelModifier,
      onMorePress,
      onUndo,
      onSelectThrowType: (target, type) =>
        updateThrowType({
          pointId: target.pointId,
          possessionId: target.possessionId,
          actionId: target.actionId,
          type,
        }),
      frameLabel,
      eyebrow,
    },
  });

  return (
    <LastActionCardFrame
      accentColor={model.accentColor}
      buttonMode={model.buttonMode}
      preferCompactActions={model.preferCompactActions}
      fillHeight={fillHeight}>
      {model.content}
    </LastActionCardFrame>
  );
};

interface TrackerLastActionCardModelUi {
  palette: Palette;
  onCancelModifier: () => void;
  onMorePress: () => void;
  onUndo: () => void;
  onSelectThrowType: (target: ThrowDetailsTarget, type: ThrowType | undefined) => void;
  frameLabel: (text: string) => ReactNode;
  eyebrow: (color: string) => ReactNode;
}

function getTrackerLastActionCardModel({
  state,
  ui,
}: {
  state: TrackerLastActionCardState;
  ui: TrackerLastActionCardModelUi;
}): TrackerLastActionCardModel {
  const {
    passModifier,
    pointIsOver,
    point,
    focusSideId,
    tracksBothSides,
    participants,
    oppHasDisc,
    canUseRareMenu,
    lastFocusPossession,
    lastOppPossession,
    focusHasStarted,
    possession,
    lastFocusThrowTarget,
    lastOppThrowTarget,
    lastGoalThrowTarget,
    canUndo,
    canUndoPointEndingAction,
  } = state;
  const { palette, onCancelModifier, onMorePress, onUndo, onSelectThrowType, frameLabel, eyebrow } =
    ui;
  const undoRareButtonMode = getUndoRareButtonMode(canUseRareMenu, canUndo, onUndo, onMorePress);

  if (passModifier) {
    const tone = PASS_MODIFIER_TONES[passModifier];
    const isDangerModifier = tone === 'danger';
    const accentColor = palette[tone];
    return {
      kind: 'modifier',
      accentColor,
      buttonMode: { kind: 'cancel-only', onCancel: onCancelModifier, isDanger: isDangerModifier },
      preferCompactActions: true,
      content: <ModifierPrompt modifier={passModifier} />,
    };
  }

  if (pointIsOver) {
    const goalInfo = getGoalInfo(point, focusSideId, participants);
    return {
      kind: 'goal',
      accentColor: goalInfo?.isFocusGoal ? palette.accent : palette.danger,
      buttonMode: canUndoPointEndingAction ? { kind: 'undo-only', onUndo } : { kind: 'none' },
      content: goalInfo ? (
        <>
          <GoalHeader goalInfo={goalInfo} />
          {lastGoalThrowTarget && (
            <ThrowTypePrompt
              accentColor={goalInfo.isFocusGoal ? palette.accent : palette.danger}
              availableTypes={getEligibleThrowTypes(lastGoalThrowTarget.result)}
              value={lastGoalThrowTarget.details?.type}
              onChange={(type) => onSelectThrowType(lastGoalThrowTarget, type)}
            />
          )}
        </>
      ) : null,
    };
  }

  if (oppHasDisc) {
    const turnoverEvent = getLastTurnoverEvent(lastFocusPossession, true, participants);

    if (turnoverEvent) {
      const accentColor = !turnoverEvent.isFocusTurnover ? palette.success : palette.danger;
      return {
        kind: 'turnover',
        accentColor,
        buttonMode: undoRareButtonMode,
        preferCompactActions:
          shouldPreferCompactForTurnover(turnoverEvent) || lastFocusThrowTarget != null,
        content: (
          <>
            {eyebrow(accentColor)}
            <TurnoverHeader event={turnoverEvent} />
            {lastFocusThrowTarget && (
              <ThrowTypePrompt
                accentColor={accentColor}
                availableTypes={getEligibleThrowTypes(lastFocusThrowTarget.result)}
                value={lastFocusThrowTarget.details?.type}
                onChange={(type) => onSelectThrowType(lastFocusThrowTarget, type)}
              />
            )}
          </>
        ),
      };
    }

    return {
      kind: 'label',
      accentColor: palette.neutral,
      buttonMode: undoRareButtonMode,
      preferCompactActions: true,
      content: frameLabel('DEFENSE'),
    };
  }

  const turnoverEvent = !focusHasStarted
    ? getLastTurnoverEvent(lastOppPossession, false, participants, {
        showSpecificResult: tracksBothSides,
      })
    : null;

  if (turnoverEvent) {
    const accentColor = turnoverEvent.isFocusTurnover ? palette.danger : palette.success;
    return {
      kind: 'turnover',
      accentColor,
      buttonMode: undoRareButtonMode,
      preferCompactActions:
        shouldPreferCompactForTurnover(turnoverEvent) || lastOppThrowTarget != null,
      content: (
        <>
          {eyebrow(accentColor)}
          <TurnoverHeader event={turnoverEvent} />
          {lastOppThrowTarget && (
            <ThrowTypePrompt
              accentColor={accentColor}
              availableTypes={getEligibleThrowTypes(lastOppThrowTarget.result)}
              value={lastOppThrowTarget.details?.type}
              onChange={(type) => onSelectThrowType(lastOppThrowTarget, type)}
            />
          )}
        </>
      ),
    };
  }

  const passChainEvents = getPassChainEvents(possession, participants, undefined, point);
  if (passChainEvents.events.length > 0) {
    const passThrowTypeTarget = lastFocusThrowTarget ?? lastOppThrowTarget;
    return {
      kind: 'turnover',
      accentColor: palette.accent,
      buttonMode: undoRareButtonMode,
      content: (
        <>
          <PassChainHeader events={passChainEvents.events} />
          {passThrowTypeTarget && (
            <ThrowTypePrompt
              accentColor={palette.accent}
              availableTypes={getEligibleThrowTypes(passThrowTypeTarget.result)}
              value={passThrowTypeTarget.details?.type}
              onChange={(type) => onSelectThrowType(passThrowTypeTarget, type)}
            />
          )}
        </>
      ),
    };
  }

  return {
    kind: 'label',
    accentColor: palette.neutral,
    buttonMode: undoRareButtonMode,
    preferCompactActions: true,
    content: frameLabel(PICKUP_PROMPT_TEXT),
  };
}

function getUndoRareButtonMode(
  canUseRareMenu: boolean,
  canUndo: boolean,
  onUndo: () => void,
  onMore: () => void,
): BottomCardButtonMode {
  if (!canUseRareMenu) {
    return canUndo ? { kind: 'undo-only', onUndo } : { kind: 'none' };
  }
  return canUndo ? { kind: 'undo-more', onUndo, onMore } : { kind: 'more-only', onMore };
}

function shouldPreferCompactForTurnover(event: TurnoverEventInfo) {
  if (event.isDropWithSplitAttribution) {
    return true;
  }

  const displayText = [event.responsibleName, event.label].filter(Boolean).join(' ');
  return displayText.length > EXPANDED_TURNOVER_TEXT_LIMIT;
}

const s = {
  label: (sizeClass: SizeClass) =>
    StyleSheet.create({
      label: {
        fontFamily: Fonts.bold,
        fontSize: scaleBySizeClass(12, sizeClass),
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        flexShrink: 1,
      },
    }).label,
};
