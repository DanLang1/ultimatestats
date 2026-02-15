import GameLockedOverlay from '@/components/GameLockedOverlay';
import { ActionBarAction, ScoreboardActionBar } from '@/components/ScoreboardActionBar';
import SettingsBar from '@/components/SettingsBar';
import TeamScoreSection from '@/components/TeamScoreSection';
import { ThemedView } from '@/components/ThemedView';
import StatsTrackingTutorial from '@/components/tutorial/StatsTrackingTutorial';
import TutorialOverlay from '@/components/tutorial/TutorialOverlay';
import { useTheme } from '@/context/ThemeContext';
import { useHalftimeNavigation } from '@/hooks/useHalftimeNavigation';
import { useLayout } from '@/hooks/useLayout';
import { usePullPromptNavigation } from '@/hooks/usePullPromptNavigation';
import { useTimeoutTimer } from '@/hooks/useTimeoutTimer';
import { useTurnoverRecordedToast } from '@/hooks/useTurnoverRecordedToast';
import { getContrastingTextColor } from '@/lib/colorUtils';
import { checkGameOver } from '@/lib/gameUtils';
import { shouldShowLinePrompt } from '@/lib/linePromptUtils';
import { useGameStore } from '@/store/gameStore';
import { TurnoverType } from '@/store/gameStore.types';
import { useLinePresetsStore } from '@/store/linePresetsStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BasicScoreboard() {
  useKeepAwake();
  const { isLandscape } = useLayout();
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(isLandscape, insets.top);

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
    events,
    turnoverToastSignal,
    clearTurnoverToastSignal,
  } = useGameStore();

  const { handleContinue: endTimeout } = useTimeoutTimer();
  const roster = currentTeam?.roster ?? [];
  const { toast, handleUndoTurnover } = useTurnoverRecordedToast({
    events,
    undoLastAction,
    roster,
    team2Name,
    turnoverToastSignal,
    clearTurnoverToastSignal,
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
  const turnoverToneColor = toast.tone === 'success' ? palette.success : palette.danger;
  const turnoverToneOverlay =
    toast.tone === 'success' ? palette.successOverlay15 : palette.dangerOverlay15;

  return (
    <ThemedView style={styles.container}>
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
      <View style={styles.timerBarContainer}>
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

      {toast.visible && (
        <View style={styles.turnoverToastContainer} pointerEvents="box-none">
          <View
            style={[
              styles.turnoverToast,
              { backgroundColor: palette.glassBg, borderColor: palette.overlay15 },
            ]}>
            <View style={[styles.turnoverToastAccent, { backgroundColor: turnoverToneColor }]} />
            <View style={styles.turnoverToastContent}>
              <View style={styles.turnoverToastLeft}>
                <View
                  style={[styles.turnoverToastIconWrap, { backgroundColor: turnoverToneOverlay }]}>
                  <MaterialCommunityIcons
                    name="swap-horizontal"
                    size={16}
                    color={turnoverToneColor}
                  />
                </View>
                <Text
                  style={[styles.turnoverToastText, { color: palette.textInverse }]}
                  numberOfLines={1}>
                  {toast.message}
                </Text>
              </View>
              <Pressable
                onPress={handleUndoTurnover}
                style={({ pressed }) => [
                  styles.turnoverUndoButton,
                  {
                    backgroundColor: palette.overlay08,
                    borderColor: palette.overlay15,
                  },
                  pressed && styles.turnoverUndoButtonPressed,
                ]}>
                <Text style={[styles.turnoverUndoButtonText, { color: palette.textInverse }]}>
                  Undo
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Game Locked Overlay - shows when WinModal has appeared (sets gameLocked=true) */}
      <GameLockedOverlay />

      {/* Tutorial Overlays */}
      <TutorialOverlay />
      <StatsTrackingTutorial />
    </ThemedView>
  );
}

function createStyles(isLandscape: boolean, topInset: number) {
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
      ...(isLandscape ? {} : { transform: [{ translateY: -25 }] }),
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
    turnoverToastContainer: {
      position: 'absolute',
      // In landscape, SettingsBar is pinned to top-center, so toast needs extra clearance.
      top: topInset + (isLandscape ? 68 : 14),
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 350,
    },
    turnoverToast: {
      width: isLandscape ? '50%' : '88%',
      maxWidth: 400,
      borderRadius: 14,
      borderWidth: 1,
      overflow: 'hidden',
      flexDirection: 'row',
      alignItems: 'stretch',
    },
    turnoverToastAccent: {
      width: 4,
    },
    turnoverToastContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingLeft: 12,
      paddingRight: 10,
      paddingVertical: 12,
      gap: 10,
    },
    turnoverToastLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    turnoverToastIconWrap: {
      width: 30,
      height: 30,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    turnoverToastText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      letterSpacing: 0.1,
    },
    turnoverUndoButton: {
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 7,
    },
    turnoverUndoButtonPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.96 }],
    },
    turnoverUndoButtonText: {
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
  });
}
