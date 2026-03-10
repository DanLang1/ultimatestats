import { ActionBarAction, ScoreboardActionBar } from '@/components/ScoreboardActionBar';
import SettingsBar from '@/components/SettingsBar';
import TeamScoreSection from '@/components/TeamScoreSection';
import { ThemedView } from '@/components/ThemedView';
import EventToast from '@/components/toast/EventToast';
import { useEventToast } from '@/components/toast/hooks/useEventToast';
import StatsTrackingTutorial from '@/components/tutorial/StatsTrackingTutorial';
import TutorialOverlay from '@/components/tutorial/TutorialOverlay';
import { getSizeClassValue, scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { useTimeoutTimer } from '@/hooks/useTimeoutTimer';
import { getContrastingTextColor } from '@/lib/colorUtils';
import { checkGameOver } from '@/lib/gameUtils';
import { shouldShowLinePrompt } from '@/lib/linePromptUtils';
import { useGameStore } from '@/store/gameStore';
import { TurnoverType } from '@/store/gameStore.types';
import { useLinePresetsStore } from '@/store/linePresetsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LiveScoreboard() {
  const layout = useLayout();
  const styles = createStyles(layout.isLandscape, layout.sizeClass);
  const insets = useSafeAreaInsets();
  const homeIconSize = scaleBySizeClass(30, layout.sizeClass);
  const homeHitSlop = getSizeClassValue({ small: 16, medium: 18, large: 20 }, layout.sizeClass);
  const portraitAspectRatio = layout.width > 0 ? layout.height / layout.width : 0;
  const isCompactVertical = !layout.isLandscape && portraitAspectRatio < 1.75;
  const topSafeInset = layout.isLandscape ? 0 : Math.max(12, Math.round(insets.top * 0.35));
  const bottomSafeInset = layout.isLandscape ? 0 : Math.max(12, Math.round(insets.bottom * 0.35));
  const centerBarClearance = layout.isLandscape
    ? 0
    : isCompactVertical
      ? scaleBySizeClass(14, layout.sizeClass)
      : scaleBySizeClass(20, layout.sizeClass);

  const {
    currentTeam,
    team2Name,
    team1BgColor,
    team2BgColor,
    team1Score,
    team2Score,
    team1Timeouts,
    team2Timeouts,
    team1Floater,
    team2Floater,
    floaterEnabled,
    incrementScore,
    toggleTimeout,
    undoLastAction,
    statTrackingEnabled,
    possession,
    triggerTurnover,
    addTurnoverEvent,
    currentGameStatus,
    pointTimerEnabled,
    currentPointStartTime,
    pointStartTimestamps,
    currentPoint,
    startPoint,
    pendingTimeoutModal,
    eventToastSignal,
    clearEventToastSignal,
  } = useGameStore();
  const { lineCallingEnabled } = useSettingsStore();

  const { handleContinue: endTimeout } = useTimeoutTimer();
  const floatingEditIconColor = getContrastingTextColor(
    layout.isLandscape ? team2BgColor : team1BgColor,
  );
  const roster = currentTeam?.roster ?? [];
  const { toast, toastInstanceId } = useEventToast({
    roster,
    team2Name,
    eventToastSignal,
    clearEventToastSignal,
  });

  const team1Name = currentTeam?.name ?? 'Team 1';

  const undo = () => {
    undoLastAction();
  };

  const possessionTrackingEnabled = statTrackingEnabled;

  const team1Combined = [
    ...team1Timeouts.map((active) => ({ active, isFloater: false })),
    ...(floaterEnabled
      ? [
          {
            active: team1Floater,
            isFloater: true,
            disabled: team1Timeouts.some((active) => active),
          },
        ]
      : []),
  ];

  const team2Combined = [
    ...team2Timeouts.map((active) => ({ active, isFloater: false })),
    ...(floaterEnabled
      ? [
          {
            active: team2Floater,
            isFloater: true,
            disabled: team2Timeouts.some((active) => active),
          },
        ]
      : []),
  ];

  const handleIncrement = async (isTeam1: boolean) => {
    if (pendingTimeoutModal) {
      endTimeout();
    }

    const { didIncrement, isHalftime } = incrementScore(isTeam1);

    if (didIncrement) {
      useLinePresetsStore.getState().setLineConfirmedForNextPoint(false);
    }

    if (!didIncrement) return;

    if (statTrackingEnabled && isTeam1) {
      router.push('/StatEntryModal');
      return;
    }

    const isGameOver = checkGameOver({
      team1Score: useGameStore.getState().team1Score,
      team2Score: useGameStore.getState().team2Score,
      gameTo: useGameStore.getState().gameTo,
      timerTimeLeft: useGameStore.getState().timerTimeLeft,
    });

    if (isGameOver) {
      if (statTrackingEnabled) {
        await useGameStore.getState().saveCurrentGame();
      }
      useGameStore.getState().setCurrentGameStatus('finished');
      useGameStore.getState().setPostGameFlowPending(true);
      router.push('/GameComplete');
      return;
    }

    if (isHalftime) {
      router.push('/HalftimeModal');
      return;
    }

    if (shouldShowLinePrompt()) {
      router.push('/LineEditor');
    } else if (pointTimerEnabled && statTrackingEnabled) {
      router.push('/PointSummaryModal');
    }
  };

  const handleActionBarAction = (action: ActionBarAction) => {
    triggerTurnover();

    if (action.type === 'oppBlock') {
      addTurnoverEvent({ team: 'team2', subtype: 'block', playerId: null });
      return;
    }

    if (action.type === 'turn') {
      addTurnoverEvent({ team: 'team2', subtype: 'throwaway', playerId: null });
      return;
    }

    const typeMap: Record<string, TurnoverType> = {
      drop: 'drop',
      throwaway: 'throwaway',
      block: 'block',
      fiftyfifty: 'fiftyfifty',
    };

    router.push({ pathname: '/TurnoverEntryModal', params: { type: typeMap[action.type] } });
  };

  const showStartButton =
    pointTimerEnabled &&
    statTrackingEnabled &&
    currentPointStartTime === null &&
    pointStartTimestamps[currentPoint] === undefined &&
    currentGameStatus !== 'finished';

  return (
    <ThemedView style={styles.container}>
      <TeamScoreSection
        teamName={team1Name}
        score={team1Score}
        onIncrement={() => handleIncrement(true)}
        textColor={getContrastingTextColor(team1BgColor)}
        backgroundColor={team1BgColor}
        isCompactVertical={isCompactVertical}
        contentInsetTop={topSafeInset}
        contentInsetBottom={centerBarClearance}
        timeouts={team1Combined}
        onTimeoutUse={(index) => {
          if (!team1Combined[index]?.active) return;
          toggleTimeout(true, index);
          router.push('/TimeoutModal');
        }}
        hasPossession={possessionTrackingEnabled ? possession === 'team1' : undefined}
      />

      <View style={styles.timerBarContainer}>
        <SettingsBar onUndo={undo} />
      </View>

      <Pressable
        onPress={() => router.push('/Dashboard')}
        hitSlop={homeHitSlop}
        style={styles.floatingHomeButton}>
        <MaterialCommunityIcons
          name="home"
          size={homeIconSize}
          color={getContrastingTextColor(team1BgColor)}
        />
      </Pressable>

      {lineCallingEnabled && currentGameStatus !== 'finished' && (
        <Pressable
          onPress={() => router.push({ pathname: '/LineEditor', params: { mode: 'edit-line' } })}
          hitSlop={homeHitSlop}
          style={styles.floatingEditLineButton}>
          <MaterialCommunityIcons
            name="account-switch"
            size={homeIconSize}
            color={floatingEditIconColor}
          />
        </Pressable>
      )}

      <TeamScoreSection
        teamName={team2Name}
        score={team2Score}
        onIncrement={() => handleIncrement(false)}
        textColor={getContrastingTextColor(team2BgColor)}
        backgroundColor={team2BgColor}
        isCompactVertical={isCompactVertical}
        contentInsetTop={centerBarClearance}
        contentInsetBottom={bottomSafeInset}
        timeouts={team2Combined}
        onTimeoutUse={(index) => {
          if (!team2Combined[index]?.active) return;
          toggleTimeout(false, index);
          router.push('/TimeoutModal');
        }}
        hasPossession={possessionTrackingEnabled ? possession === 'team2' : undefined}
      />

      {(statTrackingEnabled || pendingTimeoutModal) && (
        <ScoreboardActionBar
          possession={possession}
          onAction={handleActionBarAction}
          showStartPoint={showStartButton}
          onStartPoint={startPoint}
        />
      )}

      <EventToast toast={toast} toastInstanceId={toastInstanceId} />
      <TutorialOverlay />
      <StatsTrackingTutorial />
    </ThemedView>
  );
}

function createStyles(isLandscape: boolean, sizeClass: SizeClass) {
  const timerBarTranslateY = getSizeClassValue({ small: -28, medium: -32, large: -36 }, sizeClass);

  return StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: isLandscape ? 'row' : 'column',
    },
    timerBarContainer: {
      position: 'absolute',
      top: isLandscape ? 0 : '50%',
      left: 0,
      right: 0,
      ...(isLandscape ? {} : { transform: [{ translateY: timerBarTranslateY }] }),
      alignItems: 'center',
      zIndex: 100,
    },
    floatingHomeButton: {
      position: 'absolute',
      top: 12,
      left: 12,
      padding: 12,
      zIndex: 200,
    },
    floatingEditLineButton: {
      position: 'absolute',
      top: 12,
      right: 12,
      padding: 12,
      zIndex: 200,
    },
  });
}
