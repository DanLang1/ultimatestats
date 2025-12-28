import SettingsBar from '@/components/SettingsBar';
import TeamScoreSection from '@/components/TeamScoreSection';
import { ThemedView } from '@/components/ThemedView';
import StatsTrackingTutorial from '@/components/tutorial/StatsTrackingTutorial';
import TutorialOverlay from '@/components/tutorial/TutorialOverlay';
import { usePullPromptNavigation } from '@/hooks/usePullPromptNavigation';
import { getContrastingTextColor } from '@/lib/colorUtils';
import { useGameStore } from '@/store/gameStore';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

export default function BasicScoreboard() {
  const {
    team1Name,
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
    gameTo,
    incrementScore,
    toggleTimeout,
    undoLastAction,
    // Possession tracking
    statTrackingEnabled,
    possession,
    triggerTurnover,
  } = useGameStore();

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

  const handleIncrement = (isTeam1: boolean) => {
    incrementScore(isTeam1);

    // Check if this score wins the game
    const newScore = isTeam1 ? team1Score + 1 : team2Score + 1;
    if (newScore >= gameTo) {
      router.push('/WinModal');
      return;
    }

    // Only open stat entry for team1 (my team) goals
    if (statTrackingEnabled && isTeam1) {
      router.push('/StatEntryModal');
    }
  };

  const handleTurnover = () => {
    triggerTurnover();
    if (statTrackingEnabled) {
      router.push('/TurnoverEntryModal');
    }
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
        onTurnover={possessionTrackingEnabled ? handleTurnover : undefined}
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
        onTurnover={possessionTrackingEnabled ? handleTurnover : undefined}
      />

      {/* Tutorial Overlay - shows on first launch or when triggered */}
      <TutorialOverlay />
      <StatsTrackingTutorial />
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
});
