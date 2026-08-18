import React, { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { GoalHeader } from '@/components/advancedTracking/bottomCard/GoalHeader';
import { LastActionCardFrame } from '@/components/advancedTracking/bottomCard/LastActionCardFrame';
import { ModifierPrompt } from '@/components/advancedTracking/bottomCard/ModifierPrompt';
import { PassChainHeader } from '@/components/advancedTracking/bottomCard/PassChainHeader';
import { ThrowTypePrompt } from '@/components/advancedTracking/bottomCard/ThrowTypePrompt';
import { TurnoverHeader } from '@/components/advancedTracking/bottomCard/TurnoverHeader';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  getActiveSideId,
  getGoalInfo,
  getLastTurnoverEvent,
  getLatestThrowawayDetailsTarget,
  getPassChainEvents,
  getSafeDiscHolderRef,
  getTrackerDisplaySideId,
  ThrowDetailsTarget,
  TurnoverEventInfo,
} from '@/lib/advancedTracking/trackingDisplayHelpers';
import { areBothSidesFullyTracked } from '@/lib/advancedTracking/trackingModeUtils';
import {
  getCurrentPoint,
  getCurrentPossession,
  hasPointEnded,
} from '@/lib/advancedTracking/trackingUtils';
import {
  Participant,
  PassModifier,
  PointPossession,
  ThrowType,
  TrackedPoint,
} from '@/lib/advancedTracking/types';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { Fonts, Palette } from '@/theme/theme';

const EXPANDED_TURNOVER_TEXT_LIMIT = 12;

interface TrackerLastActionCardProps {
  passModifier: PassModifier;
  onCancelModifier: () => void;
  onMorePress: () => void;
}

type BottomCardButtonMode = React.ComponentProps<typeof LastActionCardFrame>['buttonMode'];

interface TrackerLastActionCardState {
  passModifier: PassModifier;
  pointIsOver: boolean;
  isOpeningDefensivePull: boolean;
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
  lastFocusThrowawayTarget: ThrowDetailsTarget | null;
  lastOppThrowawayTarget: ThrowDetailsTarget | null;
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
  passModifier,
  onCancelModifier,
  onMorePress,
}: TrackerLastActionCardProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();

  const { currentGame: game, undoLastOperation, updateThrowType } = useAdvancedTrackingStore();
  if (!game) return null;

  const point = getCurrentPoint(game);
  const possession = getCurrentPossession(game);
  const pointIsOver = hasPointEnded(point);

  const activeSideId = getActiveSideId(possession, game);
  const tracksBothSides = areBothSidesFullyTracked(game);
  const perspectiveSideId = getTrackerDisplaySideId(game, possession, point);
  const oppHasDisc = !tracksBothSides && !pointIsOver && activeSideId !== game.focusSideId;
  const discHolderRef = getSafeDiscHolderRef(possession, perspectiveSideId, point);

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
  const isOpeningDefensivePull =
    game.points.length === 1 &&
    possession?.sideId !== perspectiveSideId &&
    possession?.actions.length === 1 &&
    possession.actions[0]?.kind === 'pull';
  const getTrackedThrowawayTarget = (candidate: PointPossession | null) => {
    const side = game.sides.find((gameSide) => gameSide.id === candidate?.sideId);
    if (side?.trackingMode !== 'full-roster') return null;
    return getLatestThrowawayDetailsTarget(point, candidate);
  };

  const eyebrow = (color: string) => (
    <ThemedText
      style={{
        fontFamily: Fonts.black,
        fontSize: scaleBySizeClass(10, sizeClass),
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
    isOpeningDefensivePull,
    point,
    focusSideId: perspectiveSideId,
    tracksBothSides,
    participants: game.participants,
    oppHasDisc,
    canUseRareMenu: !pointIsOver && (oppHasDisc || discHolderRef != null),
    lastFocusPossession,
    lastOppPossession,
    focusHasStarted,
    possession,
    lastFocusThrowawayTarget: getTrackedThrowawayTarget(lastFocusPossession),
    lastOppThrowawayTarget: getTrackedThrowawayTarget(lastOppPossession),
  };
  const model = getTrackerLastActionCardModel({
    state: lastActionCardState,
    ui: {
      palette,
      onCancelModifier,
      onMorePress,
      onUndo: undoLastOperation,
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
      preferCompactActions={model.preferCompactActions}>
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
    isOpeningDefensivePull,
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
    lastFocusThrowawayTarget,
    lastOppThrowawayTarget,
  } = state;
  const { palette, onCancelModifier, onMorePress, onUndo, onSelectThrowType, frameLabel, eyebrow } =
    ui;
  const undoRareButtonMode: BottomCardButtonMode = canUseRareMenu
    ? { kind: 'undo-more', onUndo, onMore: onMorePress }
    : { kind: 'undo-only', onUndo };
  const defensiveButtonMode: BottomCardButtonMode = isOpeningDefensivePull
    ? { kind: 'more-only', onMore: onMorePress }
    : undoRareButtonMode;

  if (passModifier) {
    const isFiftyFifty = passModifier === 'fifty-fifty';
    return {
      kind: 'modifier',
      accentColor: isFiftyFifty ? palette.danger : palette.neutral,
      buttonMode: {
        kind: 'cancel-more',
        onCancel: onCancelModifier,
        onMore: onMorePress,
        isDanger: isFiftyFifty,
      },
      preferCompactActions: true,
      content: <ModifierPrompt modifier={passModifier} />,
    };
  }

  if (pointIsOver) {
    const goalInfo = getGoalInfo(point, focusSideId, participants);
    return {
      kind: 'goal',
      accentColor: goalInfo?.isFocusGoal ? palette.accent : palette.danger,
      buttonMode: { kind: 'undo-only', onUndo },
      content: goalInfo ? <GoalHeader goalInfo={goalInfo} /> : null,
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
          shouldPreferCompactForTurnover(turnoverEvent) || lastFocusThrowawayTarget != null,
        content: (
          <>
            {eyebrow(accentColor)}
            <TurnoverHeader event={turnoverEvent} />
            {lastFocusThrowawayTarget && (
              <ThrowTypePrompt
                accentColor={accentColor}
                value={lastFocusThrowawayTarget.details?.type}
                onChange={(type) => onSelectThrowType(lastFocusThrowawayTarget, type)}
              />
            )}
          </>
        ),
      };
    }

    return {
      kind: 'label',
      accentColor: palette.neutral,
      buttonMode: defensiveButtonMode,
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
        shouldPreferCompactForTurnover(turnoverEvent) || lastOppThrowawayTarget != null,
      content: (
        <>
          {eyebrow(accentColor)}
          <TurnoverHeader event={turnoverEvent} />
          {lastOppThrowawayTarget && (
            <ThrowTypePrompt
              accentColor={accentColor}
              value={lastOppThrowawayTarget.details?.type}
              onChange={(type) => onSelectThrowType(lastOppThrowawayTarget, type)}
            />
          )}
        </>
      ),
    };
  }

  const passChainEvents = getPassChainEvents(possession, participants, undefined, point);
  if (passChainEvents.events.length > 0) {
    return {
      kind: 'turnover',
      accentColor: palette.accent,
      buttonMode: undoRareButtonMode,
      content: <PassChainHeader events={passChainEvents.events} />,
    };
  }

  return {
    kind: 'label',
    accentColor: palette.neutral,
    buttonMode: undoRareButtonMode,
    preferCompactActions: true,
    content: frameLabel('TAP WHO STARTS WITH DISC'),
  };
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
