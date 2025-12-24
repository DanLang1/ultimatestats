import PullPrompt from '@/components/PullPrompt';
import SettingsBar from '@/components/SettingsBar';
import StatEntrySheet from '@/components/StatEntrySheet';
import TeamScoreSection from '@/components/TeamScoreSection';
import { ThemedView } from '@/components/ThemedView';
import TurnoverEntrySheet from '@/components/TurnoverEntrySheet';
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
    incrementScore,
    decrementScore,
    toggleTimeout,
    resetGame,
    // Possession tracking
    statTrackingEnabled,
    possession,
    triggerTurnover,
  } = useGameStore();

  const openSettings = () => {
    router.push('/Settings');
  };

  const reset = () => {
    resetGame();
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

  return (
    <ThemedView style={styles.container}>
      {/* Top half */}
      <TeamScoreSection
        teamName={team1Name}
        score={team1Score}
        onIncrement={() => incrementScore(true)}
        onDecrement={() => decrementScore(true)}
        textColor={getContrastingTextColor(team1BgColor)}
        backgroundColor={team1BgColor}
        timeouts={team1Combined}
        onTimeoutUse={(index) => toggleTimeout(true, index)}
        // Possession tracking props (only when enabled)
        hasPossession={possessionTrackingEnabled ? possession === 'team1' : undefined}
        onTurnover={possessionTrackingEnabled ? triggerTurnover : undefined}
      />

      {/* Timer Bar Overlay */}
      <View style={styles.timerBarContainer}>
        <SettingsBar onReset={reset} onSettingsPress={openSettings} />
      </View>

      {/* Bottom half */}
      <TeamScoreSection
        teamName={team2Name}
        score={team2Score}
        onIncrement={() => incrementScore(false)}
        onDecrement={() => decrementScore(false)}
        textColor={getContrastingTextColor(team2BgColor)}
        backgroundColor={team2BgColor}
        timeouts={team2Combined}
        onTimeoutUse={(index) => toggleTimeout(false, index)}
        // Possession tracking props (only when enabled)
        hasPossession={possessionTrackingEnabled ? possession === 'team2' : undefined}
        onTurnover={possessionTrackingEnabled ? triggerTurnover : undefined}
      />

      {/* Pull Prompt Modal */}
      <PullPrompt />

      {/* Stat Entry Modal */}
      <StatEntrySheet />

      {/* Turnover Entry Modal */}
      <TurnoverEntrySheet />
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
