import GameLockedOverlay from '@/components/GameLockedOverlay';
import { ActionBarAction, ScoreboardActionBar } from '@/components/ScoreboardActionBar';
import SettingsBar from '@/components/SettingsBar';
import TeamScoreSection from '@/components/TeamScoreSection';
import { ThemedView } from '@/components/ThemedView';
import StatsTrackingTutorial from '@/components/tutorial/StatsTrackingTutorial';
import TutorialOverlay from '@/components/tutorial/TutorialOverlay';
import { useHalftimeNavigation } from '@/hooks/useHalftimeNavigation';
import * as ScreenOrientation from 'expo-screen-orientation';
import { usePullPromptNavigation } from '@/hooks/usePullPromptNavigation';
import { useTimeoutTimer } from '@/hooks/useTimeoutTimer';
import { getContrastingTextColor } from '@/lib/colorUtils';
import { checkGameOver } from '@/lib/gameUtils';
import { shouldShowLinePrompt } from '@/lib/linePromptUtils';
import { useGameStore } from '@/store/gameStore';
import { TurnoverType } from '@/store/gameStore.types';
import { useLinePresetsStore } from '@/store/linePresetsStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { router, useFocusEffect } from 'expo-router';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

export default function BasicScoreboard() {
  useKeepAwake();
  // Unlock orientation on focus without re-locking on blur,
  // so transparent modals pushed on top don't cause an orientation snap.
  useFocusEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT);
  });
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

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
  } = useGameStore();

  const { handleContinue: endTimeout } = useTimeoutTimer();

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

  // Show PullPrompt modal when stat tracking enabled and no possession set
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

    // Team2 goal (not halftime, not game over): show PointTransition for summary + line selection
    if (shouldShowLinePrompt()) {
      router.push('/PointTransition');
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
    <ThemedView style={[styles.container, { flexDirection: isLandscape ? 'row' : 'column' }]}>
      {/* Top half */}
      <TeamScoreSection
        teamName={team1Name}
        score={team1Score}
        onIncrement={() => handleIncrement(true)}
        textColor={getContrastingTextColor(team1BgColor)}
        backgroundColor={team1BgColor}
        timeouts={team1Combined}
        onTimeoutUse={(index) => {
          toggleTimeout(true, index);
          router.push('/TimeoutModal');
        }}
        hasPossession={possessionTrackingEnabled ? possession === 'team1' : undefined}
      />

      {/* Timer Bar Overlay */}
      <View
        style={[
          styles.timerBarContainer,
          !isLandscape && { top: '50%', transform: [{ translateY: -25 }] },
        ]}>
        <SettingsBar onUndo={undo} />
      </View>

      {/* Floating Home Button - Top Left */}
      <Pressable onPress={() => router.push('/Dashboard')} style={styles.floatingHomeButton}>
        <MaterialCommunityIcons
          name="home"
          size={30}
          color={getContrastingTextColor(team1BgColor)}
        />
      </Pressable>

      {/* Bottom half */}
      <TeamScoreSection
        teamName={team2Name}
        score={team2Score}
        onIncrement={() => handleIncrement(false)}
        textColor={getContrastingTextColor(team2BgColor)}
        backgroundColor={team2BgColor}
        timeouts={team2Combined}
        onTimeoutUse={(index) => {
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

      {/* Game Locked Overlay - shows when WinModal has appeared (sets gameLocked=true) */}
      <GameLockedOverlay />

      {/* Tutorial Overlays */}
      <TutorialOverlay />
      <StatsTrackingTutorial />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  timerBarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  floatingHomeButton: {
    position: 'absolute',
    top: 12,
    left: 12,
    padding: 10,
    zIndex: 200,
  },
});
