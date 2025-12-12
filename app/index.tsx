import SettingsBar from '@/components/SettingsBar';
import TeamScoreSection from '@/components/TeamScoreSection';
import { ThemedView } from '@/components/ThemedView';
import { palette } from '@/constants/theme';

import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
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
    <ThemedView style={styles.container}>
      {/* Top half */}
      <TeamScoreSection
        teamName={team1}
        score={team1Score}
        onIncrement={() => incrementScore(true)}
        onDecrement={() => decrementScore(true)}
        textColor={palette.primary}
        backgroundColor={palette.white}
        timeouts={team1Timeouts}
        onTimeoutUse={() => handleTimeoutUse(true)}
      />

      {/* Timer Bar Overlay */}
      <View style={styles.timerBarContainer}>
        <SettingsBar onReset={reset} onSettingsPress={openSettings} />
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
