import { ActionBarAction, ScoreboardActionBar } from '@/components/ScoreboardActionBar';
import SettingsBar from '@/components/SettingsBar';
import TeamScoreSection from '@/components/TeamScoreSection';
import { ThemedView } from '@/components/ThemedView';
import StatsTrackingTutorial from '@/components/tutorial/StatsTrackingTutorial';
import TutorialOverlay from '@/components/tutorial/TutorialOverlay';
import { useTheme } from '@/context/ThemeContext';
import { usePullPromptNavigation } from '@/hooks/usePullPromptNavigation';
import { getContrastingTextColor } from '@/lib/colorUtils';
import { checkGameOver } from '@/lib/gameUtils';
import { useGameStore } from '@/store/gameStore';
import { TurnoverType } from '@/store/gameStore.types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

export default function BasicScoreboard() {
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
    resetGame,
    gameTo,
    timerTimeLeft,
    gameLocked,
  } = useGameStore();
  const { palette } = useTheme();

  const team1Name = currentTeam?.name ?? 'Team 1';

  const openSettings = () => {
    router.push('/Settings');
  };

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

  // Show PullPrompt modal when stat tracking enabled and no possession set
  usePullPromptNavigation();

  const handleIncrement = (isTeam1: boolean) => {
    const didIncrement = incrementScore(isTeam1);

    // If game was already over, don't navigate anywhere
    if (!didIncrement) return;

    // Only open stat entry for team1 (my team) goals
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
        onTimeoutUse={(index) => toggleTimeout(true, index)}
        hasPossession={possessionTrackingEnabled ? possession === 'team1' : undefined}
      />

      {/* Timer Bar Overlay */}
      <View style={styles.timerBarContainer}>
        <SettingsBar onUndo={undo} onSettingsPress={openSettings} />
      </View>

      {/* Bottom half */}
      <TeamScoreSection
        teamName={team2Name}
        score={team2Score}
        onIncrement={() => handleIncrement(false)}
        textColor={getContrastingTextColor(team2BgColor)}
        backgroundColor={team2BgColor}
        timeouts={team2Combined}
        onTimeoutUse={(index) => toggleTimeout(false, index)}
        hasPossession={possessionTrackingEnabled ? possession === 'team2' : undefined}
      />

      {/* Action Bar for stat tracking */}
      {statTrackingEnabled && (
        <ScoreboardActionBar possession={possession} onAction={handleActionBarAction} />
      )}

      <TutorialOverlay />
      <StatsTrackingTutorial />

      {/* Game Locked Overlay */}
      {/* We only lock IF the game is actually over AND the user has "finalized" it by viewing stats */}
      {checkGameOver({ team1Score, team2Score, gameTo, timerTimeLeft }) && gameLocked && (
        <View style={[styles.lockedOverlay, { backgroundColor: palette.overlayDark60 }]}>
          <Animated.View entering={FadeIn} style={styles.lockedContent}>
            <MaterialCommunityIcons name="lock" size={64} color={palette.lockScreenText} />
            <Text style={[styles.lockedTitle, { color: palette.lockScreenText }]}>
              Game Complete
            </Text>
            <Text style={[styles.lockedSubtitle, { color: palette.lockScreenText }]}>
              Start a new game to continue
            </Text>

            <View style={styles.lockedButtons}>
              <Pressable
                style={[styles.lockedButton, { backgroundColor: palette.lockScreenBtnPrimaryBg }]}
                onPress={() => {
                  resetGame();
                }}>
                <MaterialCommunityIcons
                  name="restart"
                  size={20}
                  color={palette.lockScreenBtnPrimaryText}
                />
                <Text
                  style={[styles.lockedButtonText, { color: palette.lockScreenBtnPrimaryText }]}>
                  Start New Game
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.lockedButton,
                  {
                    backgroundColor: palette.lockScreenBtnSecondaryBg,
                    borderWidth: 1,
                    borderColor: palette.lockScreenBtnSecondaryBorder,
                  },
                ]}
                onPress={undo}>
                <MaterialCommunityIcons name="undo" size={20} color={palette.lockScreenText} />
                <Text style={[styles.lockedButtonText, { color: palette.lockScreenText }]}>
                  Undo
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  timerBarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: 24,
  },
  lockedContent: {
    alignItems: 'center',
    gap: 16,
  },
  lockedTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 8,
  },
  lockedSubtitle: {
    fontSize: 16,
    opacity: 0.8,
    marginBottom: 16,
  },
  lockedButtons: {
    gap: 12,
    width: '100%',
    maxWidth: 280,
  },
  lockedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  lockedButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
