import { ThemedText } from '@/components/ThemedText';
import { BottomCardFrame } from '@/components/advancedTracking/bottomCard/BottomCardFrame';
import { DefenseActions } from '@/components/advancedTracking/bottomCard/DefenseActions';
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
  isPossessionOver,
} from '@/lib/advancedTracking/trackingUtils';
import {
  Participant,
  PassModifier,
  PointPossession,
  TrackedPoint,
} from '@/lib/advancedTracking/types';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { Fonts, Palette } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';

interface TrackerBottomCardProps {
  pointElapsedMs: number;
  passModifier: PassModifier;
  onCancelModifier: () => void;
  onStartNextPoint: () => void;
  onMorePress: () => void;
}

type BottomCardButtonMode = React.ComponentProps<typeof BottomCardFrame>['buttonMode'];

interface TrackerBottomCardState {
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

type TrackerBottomCardModel =
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

export const TrackerBottomCard = ({
  pointElapsedMs,
  passModifier,
  onCancelModifier,
  onStartNextPoint,
  onMorePress,
}: TrackerBottomCardProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();

  const { currentGameId, savedGames, recordPickup, recordThrow, undoLastOperation } =
    useAdvancedTrackingStore();

  const game = savedGames.find((g) => g.id === currentGameId);
  if (!game) return null;

  const oppSide = game.sides.find((s) => s.id !== game.focusSideId);
  if (!oppSide) return null;

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

  const handleOppTurnover = async () => {
    if (!possession || isPossessionOver(possession)) {
      await recordPickup({ sideId: oppSide.id, player: { refType: 'untracked' } });
    }
    await recordThrow({ thrower: { refType: 'untracked' }, result: 'throwaway' });
  };

  const handleOppScored = async () => {
    if (!possession || isPossessionOver(possession)) {
      await recordPickup({ sideId: oppSide.id, player: { refType: 'untracked' } });
    }
    await recordThrow({
      thrower: { refType: 'untracked' },
      result: 'goal',
      timerElapsedMs: pointElapsedMs,
    });
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

  // --- Bottom content (same regardless of modifier) ---
  let bottomContent: ReactNode = null;
  if (pointIsOver) {
    bottomContent = (
      <Pressable
        onPress={onStartNextPoint}
        style={({ pressed }) => [
          s.fullWidthBtn(sizeClass),
          { backgroundColor: palette.successOverlay10 },
          pressed && { opacity: 0.7 },
        ]}>
        <MaterialCommunityIcons
          name="arrow-right-circle"
          size={scaleBySizeClass(20, sizeClass)}
          color={palette.success}
          style={{ marginRight: 8 }}
        />
        <ThemedText style={[s.btnText(sizeClass), { color: palette.success }]}>
          NEXT POINT
        </ThemedText>
      </Pressable>
    );
  } else if (oppHasDisc) {
    bottomContent = (
      <DefenseActions onOppScored={handleOppScored} onOppTurnover={handleOppTurnover} />
    );
  }
  const bottomCardState: TrackerBottomCardState = {
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
  const model = getTrackerBottomCardModel({
    state: bottomCardState,
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
    <BottomCardFrame
      accentColor={model.accentColor}
      bottom={bottomContent}
      buttonMode={model.buttonMode}>
      {model.content}
    </BottomCardFrame>
  );
};

interface TrackerBottomCardModelUi {
  palette: Palette;
  onCancelModifier: () => void;
  onMorePress: () => void;
  onUndo: () => void;
  frameLabel: (text: string) => ReactNode;
  eyebrow: (color: string) => ReactNode;
}

function getTrackerBottomCardModel({
  state,
  ui,
}: {
  state: TrackerBottomCardState;
  ui: TrackerBottomCardModelUi;
}): TrackerBottomCardModel {
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

  const passChainEvents = getPassChainEvents(possession, participants);
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
    buttonMode: { kind: 'undo-more', onUndo, onMore: onMorePress },
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
  btnText: (sizeClass: SizeClass) =>
    StyleSheet.create({
      text: {
        fontFamily: Fonts.black,
        fontSize: scaleBySizeClass(14, sizeClass),
        letterSpacing: 0.5,
        textTransform: 'uppercase',
      },
    }).text,
  fullWidthBtn: (sizeClass: SizeClass) =>
    StyleSheet.create({
      btn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: scaleBySizeClass(56, sizeClass),
        borderRadius: 16,
        borderCurve: 'continuous',
      },
    }).btn,
};
