import SettingsBar from '@/components/SettingsBar';
import TeamScoreSection from '@/components/TeamScoreSection';
import { ThemedView } from '@/components/ThemedView';
import { palette } from '@/constants/theme';

import { useGameStore } from '@/store/gameStore';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

export default function BasicScoreboard() {
  const {
    team1Name,
    team2Name,
    team1Score,
    team2Score,
    team1Timeouts,
    team2Timeouts,
    incrementScore,
    decrementScore,
    toggleTimeout,
    resetGame,
  } = useGameStore();

  const openSettings = () => {
    router.push('/Settings');
  };

  const reset = () => {
    resetGame();
  };

  return (
    <ThemedView style={styles.container}>
      {/* Top half */}
      <TeamScoreSection
        teamName={team1Name}
        score={team1Score}
        onIncrement={() => incrementScore(true)}
        onDecrement={() => decrementScore(true)}
        textColor={palette.primary}
        backgroundColor={palette.white}
        timeouts={team1Timeouts}
        onTimeoutUse={(index) => toggleTimeout(true, index)}
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
        textColor={palette.white}
        backgroundColor={palette.primary}
        timeouts={team2Timeouts}
        onTimeoutUse={(index) => toggleTimeout(false, index)}
      />
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
