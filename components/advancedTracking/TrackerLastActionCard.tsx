import { ThemedText } from '@/components/ThemedText';
import { LastActionCardFrame } from '@/components/advancedTracking/bottomCard/LastActionCardFrame';
import { GoalHeader } from '@/components/advancedTracking/bottomCard/GoalHeader';
import { ModifierPrompt } from '@/components/advancedTracking/bottomCard/ModifierPrompt';
import { PassChainHeader } from '@/components/advancedTracking/bottomCard/PassChainHeader';
import { TurnoverHeader } from '@/components/advancedTracking/bottomCard/TurnoverHeader';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  getActiveSideId,
  getGoalInfo,
  getLastTurnoverEvent,
  getPassChainEvents,
} from '@/lib/advancedTracking/trackingDisplayHelpers';
import {
  getCurrentPoint,
  getCurrentPossession,
  hasPointEnded,
} from '@/lib/advancedTracking/trackingUtils';
import {
  Participant,
  PassModifier,
  PointPossession,
  TrackedPoint,
} from '@/lib/advancedTracking/types';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { Fonts, Palette } from '@/theme/theme';
import React, { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

interface TrackerLastActionCardProps {
  passModifier: PassModifier;
  onCancelModifier: () => void;
  onMorePress: () => void;
}

type BottomCardButtonMode = React.ComponentProps<typeof LastActionCardFrame>['buttonMode'];

interface TrackerLastActionCardState {
  passModifier: PassModifier;
  pointIsOver: boolean;
  point: TrackedPoint | null;
  focusSideId: string;
  participants: Participant[];
  oppHasDisc: boolean;
  lastFocusPossession: PointPossession | null;
  lastOppPossession: PointPossession | null;
  focusHasStarted: boolean;
  possession: PointPossession | null;
}

type TrackerLastActionCardModel =
  | {
      kind: 'modifier';
      accentColor: string;
      buttonMode: BottomCardButtonMode;
      content: ReactNode;
    }
  | {
      kind: 'goal';
      accentColor: string;
      buttonMode: BottomCardButtonMode;
      content: ReactNode;
    }
  | {
      kind: 'turnover';
      accentColor: string;
      buttonMode: BottomCardButtonMode;
      content: ReactNode;
    }
  | {
      kind: 'label';
      accentColor: string;
      buttonMode: BottomCardButtonMode;
      content: ReactNode;
    };

export const TrackerLastActionCard = ({
  passModifier,
  onCancelModifier,
  onMorePress,
}: TrackerLastActionCardProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();

  const { currentGame: game, undoLastOperation } = useAdvancedTrackingStore();
  if (!game) return null;

  const point = getCurrentPoint(game);
  const possession = getCurrentPossession(game);
  const pointIsOver = hasPointEnded(point);

  const activeSideId = getActiveSideId(possession, game);
  const oppHasDisc = !pointIsOver && activeSideId !== game.focusSideId;

  const lastOppPossession =
    point?.possessions.filter((p) => p.sideId !== game.focusSideId).at(-1) ?? null;
  const lastFocusPossession =
    point?.possessions.filter((p) => p.sideId === game.focusSideId).at(-1) ?? null;
  const focusHasStarted =
    !!possession && possession.sideId === game.focusSideId && possession.actions.length > 0;

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
    point,
    focusSideId: game.focusSideId,
    participants: game.participants,
    oppHasDisc,
    lastFocusPossession,
    lastOppPossession,
    focusHasStarted,
    possession,
  };
  const model = getTrackerLastActionCardModel({
    state: lastActionCardState,
    ui: {
      palette,
      onCancelModifier,
      onMorePress,
      onUndo: undoLastOperation,
      frameLabel,
      eyebrow,
    },
  });

  return (
    <LastActionCardFrame accentColor={model.accentColor} buttonMode={model.buttonMode}>
      {model.content}
    </LastActionCardFrame>
  );
};

interface TrackerLastActionCardModelUi {
  palette: Palette;
  onCancelModifier: () => void;
  onMorePress: () => void;
  onUndo: () => void;
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
    participants,
    oppHasDisc,
    lastFocusPossession,
    lastOppPossession,
    focusHasStarted,
    possession,
  } = state;
  const { palette, onCancelModifier, onMorePress, onUndo, frameLabel, eyebrow } = ui;

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
        buttonMode: { kind: 'undo-more', onUndo, onMore: onMorePress },
        content: (
          <>
            {eyebrow(accentColor)}
            <TurnoverHeader event={turnoverEvent} />
          </>
        ),
      };
    }

    return {
      kind: 'label',
      accentColor: palette.neutral,
      buttonMode: { kind: 'undo-more', onUndo, onMore: onMorePress },
      content: frameLabel('DEFENSE'),
    };
  }

  const turnoverEvent = !focusHasStarted
    ? getLastTurnoverEvent(lastOppPossession, false, participants)
    : null;

  if (turnoverEvent) {
    const accentColor = turnoverEvent.isFocusTurnover ? palette.danger : palette.success;
    return {
      kind: 'turnover',
      accentColor,
      buttonMode: { kind: 'undo-more', onUndo, onMore: onMorePress },
      content: (
        <>
          {eyebrow(accentColor)}
          <TurnoverHeader event={turnoverEvent} />
        </>
      ),
    };
  }

  const passChainEvents = getPassChainEvents(possession, participants, undefined, point);
  if (passChainEvents.events.length > 0) {
    return {
      kind: 'turnover',
      accentColor: palette.accent,
      buttonMode: { kind: 'undo-more', onUndo, onMore: onMorePress },
      content: <PassChainHeader events={passChainEvents.events} />,
    };
  }

  return {
    kind: 'label',
    accentColor: palette.neutral,
    buttonMode: { kind: 'more-only', onMore: onMorePress },
    content: frameLabel('TAP WHO STARTS WITH DISC'),
  };
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
