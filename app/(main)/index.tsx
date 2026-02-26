import GameLockedOverlay from '@/components/GameLockedOverlay';
import { ActionBarAction, ScoreboardActionBar } from '@/components/ScoreboardActionBar';
import SettingsBar from '@/components/SettingsBar';
import TeamScoreSection from '@/components/TeamScoreSection';
import { ThemedView } from '@/components/ThemedView';
import { useEventToast } from '@/components/toast/hooks/useEventToast';
import EventToast from '@/components/toast/EventToast';
import StatsTrackingTutorial from '@/components/tutorial/StatsTrackingTutorial';
import TutorialOverlay from '@/components/tutorial/TutorialOverlay';
import { useHalftimeNavigation } from '@/hooks/useHalftimeNavigation';
import { getSizeClassValue, scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { usePullPromptNavigation } from '@/hooks/usePullPromptNavigation';
import { useTimeoutTimer } from '@/hooks/useTimeoutTimer';
import { getContrastingTextColor } from '@/lib/colorUtils';
import { checkGameOver } from '@/lib/gameUtils';
import { shouldShowLinePrompt } from '@/lib/linePromptUtils';
import { useGameStore } from '@/store/gameStore';
import { TurnoverType } from '@/store/gameStore.types';
import { useLinePresetsStore } from '@/store/linePresetsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BasicScoreboard() {
  useKeepAwake();
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
    // Possession tracking
    statTrackingEnabled,
    possession,
    triggerTurnover,
    addTurnoverEvent,
    gameLocked,
    // Point timer
    pointTimerEnabled,
    currentPointStartTime,
    pointStartTimestamps,
    currentPoint,
    startPoint,
    // Timeout
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

  // Possession tracking is enabled when stat tracking is on
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

  usePullPromptNavigation();
  // Show HalftimeModal when halftime break is active
  useHalftimeNavigation();

  const handleIncrement = (isTeam1: boolean) => {
    // Auto-end timeout if active
    if (pendingTimeoutModal) {
      endTimeout();
    }

    const { didIncrement, isHalftime } = incrementScore(isTeam1);

    // Reset line confirmation for the new point
    if (didIncrement) {
      useLinePresetsStore.getState().setLineConfirmedForNextPoint(false);
    }

    // If game was already over, don't navigate anywhere
    if (!didIncrement) return;

    // Team1 goals with stat tracking: always go to stat entry first
    // After stat entry completes, halftime modal will show via useHalftimeNavigation
    // (since isHalftimeBreak is already set in incrementScore)
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
      router.push('/WinModal');
      useGameStore.getState().setGameLocked(true);
      return;
    }

    // Halftime reached (team2 goal or no stat tracking) - show halftime modal
    if (isHalftime) {
      router.push('/HalftimeModal');
      return;
    }

    // Team2 goal (not halftime, not game over): show LineEditor for summary + line selection
    if (shouldShowLinePrompt()) {
      router.push('/LineEditor');
    } else if (pointTimerEnabled && statTrackingEnabled) {
      router.push('/PointSummaryModal');
    }
  };
  const handleActionBarAction = (action: ActionBarAction) => {
    triggerTurnover();

    if (action.type === 'oppBlock') {
      // Opponent blocked us - no player selection needed
      addTurnoverEvent({ team: 'team2', subtype: 'block', playerId: null });
      return;
    }

    if (action.type === 'turn') {
      // Opponent turned it over - no player selection needed
      addTurnoverEvent({ team: 'team2', subtype: 'throwaway', playerId: null });
      return;
    }

    // For other actions, open the modal with preselected type
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
    !gameLocked;

  return (
    <ThemedView style={styles.container}>
      {/* Top half */}
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

      {/* Timer Bar Overlay */}
      <View style={styles.timerBarContainer}>
        <SettingsBar onUndo={undo} />
      </View>

      {/* Floating Home Button - Top Left */}
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

      {lineCallingEnabled && !gameLocked && (
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

      {/* Bottom half */}
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

      {/* Action Bar for stat tracking or active timeout */}
      {(statTrackingEnabled || pendingTimeoutModal) && (
        <ScoreboardActionBar
          possession={possession}
          onAction={handleActionBarAction}
          showStartPoint={showStartButton}
          onStartPoint={startPoint}
        />
      )}

      <EventToast toast={toast} toastInstanceId={toastInstanceId} />

      {/* Game Locked Overlay - shows when WinModal has appeared (sets gameLocked=true) */}
      <GameLockedOverlay />

      {/* Tutorial Overlays */}
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
