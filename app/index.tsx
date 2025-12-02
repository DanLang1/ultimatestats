import TeamScoreSection from '@/components/TeamScoreSection';
import { ThemedView } from '@/components/ThemedView';
import { palette } from '@/constants/theme';
import { useScreenOrientation } from '@/hooks/useScreenOrientation';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SettingsScreenSearchParams } from './Settings';

export default function BasicScoreboard() {
  const params = useLocalSearchParams<SettingsScreenSearchParams>();
  const team1 = params.team1 || 'Team 1';
  const team2 = params.team2 || 'Team 2';
  const gameTo = params.gameTo || 15;
  const team1ScoreInitial = params.team1Score || 0;
  const team2ScoreInitial = params.team2Score || 0;
  const [team1Timeouts, setTeam1Timeouts] = useState(Number(params.team1Timeouts ?? 2));
  const [team2Timeouts, setTeam2Timeouts] = useState(Number(params.team2Timeouts ?? 2));

  const orientation = useScreenOrientation();
  const isLandscape =
    orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
    orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;

  const [team1Score, setTeam1Score] = useState(Number(team1ScoreInitial));
  const [team2Score, setTeam2Score] = useState(Number(team2ScoreInitial));

  const openSettings = () => {
    const settings: SettingsScreenSearchParams = {
      team1,
      team2,
      gameTo: gameTo.toString(),
      team1Score: team1Score.toString(),
      team2Score: team2Score.toString(),
      team1Timeouts: team1Timeouts.toString(),
      team2Timeouts: team2Timeouts.toString(),
    };
    router.push({ pathname: '/Settings', params: settings });
  };

  const handleTimeoutUse = (isTeam1: boolean) => {
    if (isTeam1) {
      setTeam1Timeouts((prev) => Math.max(0, prev - 1));
    } else {
      setTeam2Timeouts((prev) => Math.max(0, prev - 1));
    }
  };

  const incrementScore = (isTeam1: boolean) => {
    if (isTeam1) {
      setTeam1Score((prev) => Math.min(Number(gameTo), prev + 1));
    } else {
      setTeam2Score((prev) => Math.min(Number(gameTo), prev + 1));
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
    setTeam1Timeouts(2);
    setTeam2Timeouts(2);
    router.setParams({
      team1Score: '0',
      team2Score: '0',
      team1Timeouts: '2',
      team2Timeouts: '2',
    });
  };

  return (
    <ThemedView
      style={[
        styles.container,
        isLandscape ? styles.containerLandscape : styles.containerPortrait,
      ]}>
      {/* Top half */}
      <TeamScoreSection
        teamName={team1}
        score={team1Score}
        onIncrement={() => incrementScore(true)}
        onDecrement={() => decrementScore(true)}
        textColor={palette.primary}
        backgroundColor={palette.white}
        onSettingsPress={openSettings}
        timeouts={team1Timeouts}
        onTimeoutUse={() => handleTimeoutUse(true)}
      />

      {/* Mid section that holds the button */}
      <View
        style={[
          styles.buttonRow,
          isLandscape ? styles.buttonRowLandscape : styles.buttonRowPortrait,
        ]}>
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
        timeouts={team2Timeouts}
        onTimeoutUse={() => handleTimeoutUse(false)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerPortrait: {
    flexDirection: 'column',
  },
  containerLandscape: {
    flexDirection: 'row',
  },
  buttonRow: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    gap: 10,
  },
  buttonRowPortrait: {
    flexDirection: 'row',
    height: 60,
    marginVertical: -30,
    width: '100%',
  },
  buttonRowLandscape: {
    flexDirection: 'column',
    width: 60,
    marginHorizontal: -30,
    height: '100%',
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
