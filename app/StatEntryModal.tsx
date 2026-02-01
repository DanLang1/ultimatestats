import { StatEntryInner } from '@/components/stat-entry/StatEntryInner';
import { useTheme } from '@/context/ThemeContext';
import { checkGameOver } from '@/lib/gameUtils';
import { shouldShowLinePrompt } from '@/lib/linePromptUtils';
import { useGameStore } from '@/store/gameStore';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

export default function StatEntryScreen() {
  const {
    pendingStatEntry,
    currentTeam,
    team2Name,
    addPlayer,
    addGoalEvent,
    pointTimerEnabled,
    isHalftimeBreak,
    currentLine,
  } = useGameStore();
  const { palette } = useTheme();

  const team1Name = currentTeam?.name ?? 'Team 1';
  const team1Roster = currentTeam?.roster ?? [];

  // Filter roster by current line if set
  const currentLineSet = new Set(currentLine);
  const lineFilteredRoster =
    currentLine.length > 0 ? team1Roster.filter((p) => currentLineSet.has(p.id)) : team1Roster;

  // If no pending entry, just render nothing - the useEffect in index.tsx won't push here
  if (!pendingStatEntry) {
    return null;
  }

  const teamName = pendingStatEntry.team === 'team1' ? team1Name : team2Name;
  const roster = lineFilteredRoster; // Filter by current line if set

  const handleComplete = (goalPlayerId: string | null, assistPlayerId: string | null) => {
    addGoalEvent({
      team: pendingStatEntry.team,
      goalPlayerId,
      assistPlayerId,
    });

    // Check if game ended
    const state = useGameStore.getState();
    const isGameOver = checkGameOver({
      team1Score: state.team1Score,
      team2Score: state.team2Score,
      gameTo: state.gameTo,
      timerTimeLeft: state.timerTimeLeft,
    });

    if (isGameOver) {
      router.dismiss();
      setTimeout(() => {
        router.push('/WinModal');
        useGameStore.getState().setGameLocked(true);
      }, 100);
      return;
    }

    // Skip point summary for halftime goals - let useHalftimeNavigation handle it
    // (PointSummaryModal returns null when isHalftimeBreak is true anyway)
    if (isHalftimeBreak) {
      router.dismiss();
      return;
    }

    // Show point summary modal when point timer enabled
    // PointSummaryModal will chain to LinePromptModal if needed
    if (pointTimerEnabled) {
      router.replace('/PointSummaryModal');
    } else if (shouldShowLinePrompt()) {
      // No point timer, but line calling enabled - go to line prompt
      router.replace('/LinePromptModal');
    } else {
      router.dismiss();
    }
  };

  const handleSkip = () => {
    // Record with null goal/assist
    addGoalEvent({
      team: pendingStatEntry.team,
      goalPlayerId: null,
      assistPlayerId: null,
    });

    // Check if game ended
    const state = useGameStore.getState();
    const isGameOver = checkGameOver({
      team1Score: state.team1Score,
      team2Score: state.team2Score,
      gameTo: state.gameTo,
      timerTimeLeft: state.timerTimeLeft,
    });

    if (isGameOver) {
      router.dismiss();
      setTimeout(() => {
        useGameStore.getState().setGameLocked(true);
        router.push('/WinModal');
      }, 100);
      return;
    }

    // Skip point summary for halftime goals - let useHalftimeNavigation handle it
    // (PointSummaryModal returns null when isHalftimeBreak is true anyway)
    if (isHalftimeBreak) {
      router.dismiss();
      return;
    }

    // Show point summary modal when point timer enabled
    // PointSummaryModal will chain to LinePromptModal if needed
    if (pointTimerEnabled) {
      router.replace('/PointSummaryModal');
    } else if (shouldShowLinePrompt()) {
      // No point timer, but line calling enabled - go to line prompt
      router.replace('/LinePromptModal');
    } else {
      router.dismiss();
    }
  };

  const handleAddPlayer = (name: string) => {
    return addPlayer(name);
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable
        style={[styles.overlay, { backgroundColor: palette.overlayDark40 }]}
        onPress={handleSkip}>
        <StatEntryInner
          key={`${teamName}-${pendingStatEntry.pointNumber}`}
          teamName={teamName}
          roster={roster}
          onSkip={handleSkip}
          onComplete={handleComplete}
          onAddPlayer={handleAddPlayer}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
});
