import ScoreDisplay from '@/components/ScoreDisplay';
import TeamText from '@/components/TeamText';
import { ThemedView } from '@/components/ThemedView';
import { palette } from '@/constants/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Directions, Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';

export default function BasicScoreboard() {
  const [team1, setTeam1] = useState('Team 1');
  const [team2, setTeam2] = useState('Team 2');
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);

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
      setTeam2Score((prev) => prev - 1);
    }
  };

  const flingUp = Gesture.Fling()
    .direction(Directions.UP)
    .onEnd(() => {
      scheduleOnRN(incrementScore, true);
    });

  const flingDown = Gesture.Fling()
    .direction(Directions.DOWN)
    .onEnd(() => {
      scheduleOnRN(decrementScore, true);
    });

  const composedGesture = Gesture.Simultaneous(flingDown, flingUp);

  const flingUpTeam2 = Gesture.Fling()
    .direction(Directions.UP)
    .onEnd(() => {
      scheduleOnRN(incrementScore, false);
    });

  const flingDownTeam2 = Gesture.Fling()
    .direction(Directions.DOWN)
    .onEnd(() => {
      scheduleOnRN(decrementScore, false);
    });

  const composedGestureTeam2 = Gesture.Simultaneous(flingDownTeam2, flingUpTeam2);

  const reset = () => {
    setTeam1Score(0);
    setTeam2Score(0);
  };

  return (
    <ThemedView style={styles.container}>
      {/* Top half */}
      <Pressable onPress={() => incrementScore(true)} style={{ flex: 1 }}>
        <GestureDetector gesture={composedGesture}>
          <ThemedView style={styles.team1}>
            <TeamText color={palette.primary} initialTeamName={team1} />
            <ScoreDisplay bgColor={palette.white} textColor={palette.primary} score={team1Score} />
          </ThemedView>
        </GestureDetector>
      </Pressable>
      {/* Mid section that holds the button */}
      <View style={styles.buttonRow}>
        {/* <Pressable>
          <Ionicons name="settings" size={48} color={palette.silver} />
        </Pressable> */}

        <Pressable onPress={reset}>
          <MaterialCommunityIcons name="restart" size={48} color={palette.accent} />
        </Pressable>
        {/* Add more buttons here */}
      </View>
      {/* Bottom half */}
      <Pressable onPress={() => incrementScore(false)} style={{ flex: 1 }}>
        <GestureDetector gesture={composedGestureTeam2}>
          <ThemedView style={styles.team2}>
            <TeamText color={palette.white} initialTeamName={team2} />
            <ScoreDisplay bgColor={palette.primary} textColor={palette.white} score={team2Score} />
          </ThemedView>
        </GestureDetector>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  team1: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.white,
  },

  team2: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primary,
  },
  buttonRow: {
    flexDirection: 'row', // arrange buttons horizontally
    justifyContent: 'center', // center the row in the screen
    alignItems: 'center',
    height: 60, // enough height for button overlap
    marginVertical: -30, // float row over the color intersection
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
    marginHorizontal: 5, // spacing between buttons
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
  },
});
