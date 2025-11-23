import TeamScoreSection from '@/components/TeamScoreSection';
import { ThemedView } from '@/components/ThemedView';
import { palette } from '@/constants/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

export default function BasicScoreboard() {
  const params = useLocalSearchParams<{ team1: string; team2: string }>();
  const team1 = params.team1 || 'Team 1';
  const team2 = params.team2 || 'Team 2';

  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);

  const openSettings = () => {
    router.push({ pathname: '/Settings', params: { team1, team2 } });
  };

  const incrementScore = (isTeam1: boolean) => {
    if (isTeam1) {
      setTeam1Score((prev) => prev + 1);
    } else {
      setTeam2Score((prev) => prev + 1);
    }
  };

  const decrementScore = (isTeam1: boolean) => {
    if (isTeam1) {
      setTeam1Score((prev) => Math.max(0, prev - 1));
    } else {
      setTeam2Score((prev) => Math.max(0, prev - 1));
    }
  };

  const reset = () => {
    setTeam1Score(0);
    setTeam2Score(0);
  };

  return (
    <ThemedView style={styles.container}>
      {/* Top half */}
      <TeamScoreSection
        teamName={team1}
        score={team1Score}
        onIncrement={() => incrementScore(true)}
        onDecrement={() => decrementScore(true)}
        textColor={palette.primary}
        backgroundColor={palette.white}
        onSettingsPress={openSettings}
      />

      {/* Mid section that holds the button */}
      <View style={styles.buttonRow}>
        <Pressable onPress={reset}>
          <MaterialCommunityIcons name="restart" size={48} color={palette.accent} />
        </Pressable>
      </View>

      {/* Bottom half */}
      <TeamScoreSection
        teamName={team2}
        score={team2Score}
        onIncrement={() => incrementScore(false)}
        onDecrement={() => decrementScore(false)}
        textColor={palette.white}
        backgroundColor={palette.primary}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 60,
    marginVertical: -30,
    zIndex: 10,
    gap: 10,
  },
  button: {
    backgroundColor: palette.secondary,
    borderWidth: 2,
    borderColor: palette.accent,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
  },
});
