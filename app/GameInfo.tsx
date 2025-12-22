import { TimeoutCounter } from '@/components/game-info/TimeoutCounter';
import { ThemedView } from '@/components/ThemedView';
import { palette } from '@/constants/theme';
import { useGameStore } from '@/store/gameStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function GameInfoScreen() {
  const {
    gameTo,
    team1Name,
    team2Name,
    team1Timeouts,
    team2Timeouts,
    team1Floater,
    team2Floater,

    team1Score,
    team2Score,
  } = useGameStore();

  const countTimeoutsRemaining = (timeouts: boolean[]) => timeouts.filter((t) => t).length;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={palette.textInverse} />
        </Pressable>
        <Text style={styles.headerTitle}>MATCH STATUS</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Game To Section */}
        <View style={styles.targetSection}>
          <Text style={styles.targetLabel}>GAME TO</Text>
          <Text style={styles.targetNumber}>{gameTo}</Text>
        </View>

        {/* Current Score */}
        <View style={styles.scoreSection}>
          <View style={styles.scoreTeam}>
            <Text style={styles.scoreTeamName}>{team1Name}</Text>
            <Text style={styles.scoreValue}>{team1Score}</Text>
          </View>
          <Text style={styles.scoreDivider}>-</Text>
          <View style={styles.scoreTeam}>
            <Text style={styles.scoreValue}>{team2Score}</Text>
            <Text style={styles.scoreTeamName}>{team2Name}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Timeouts Section */}
        <Text style={styles.sectionTitle}>TIMEOUTS REMAINING</Text>
        <View style={styles.teamsGrid}>
          <View style={styles.teamColumn}>
            <Text style={styles.teamName}>{team1Name}</Text>
            <TimeoutCounter
              count={countTimeoutsRemaining(team1Timeouts)}
              hasFloater={team1Floater}
            />
          </View>

          <View style={styles.verticalDivider} />

          <View style={styles.teamColumn}>
            <Text style={styles.teamName}>{team2Name}</Text>
            <TimeoutCounter
              count={countTimeoutsRemaining(team2Timeouts)}
              hasFloater={team2Floater}
            />
          </View>
        </View>

        <View style={styles.divider} />

        {/* Placeholder for future content */}
        <Text style={styles.sectionTitle}>GAME EVENTS</Text>
        <View style={styles.placeholderSection}>
          <MaterialCommunityIcons name="clock-outline" size={32} color={palette.textMuted} />
          <Text style={styles.placeholderText}>More features coming soon...</Text>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
    color: palette.textMuted,
    textTransform: 'uppercase',
  },
  headerSpacer: {
    width: 40, // Same as back button for centering
  },
  scrollContent: {
    padding: 24,
    paddingTop: 8,
  },

  // Game To
  targetSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  targetLabel: {
    fontSize: 12,
    color: palette.accent,
    fontWeight: '700',
    letterSpacing: 1,
  },
  targetNumber: {
    fontSize: 56,
    fontWeight: '800',
    color: palette.textInverse,
    includeFontPadding: false,
    lineHeight: 64,
  },

  // Current Score
  scoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 16,
  },
  scoreTeam: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreTeamName: {
    fontSize: 14,
    color: palette.textMuted,
    fontWeight: '600',
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: '800',
    color: palette.textInverse,
  },
  scoreDivider: {
    fontSize: 24,
    color: palette.textMuted,
    fontWeight: '300',
  },

  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 20,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: palette.textMuted,
    marginBottom: 16,
  },

  // Teams Grid
  teamsGrid: {
    flexDirection: 'row',
  },
  teamColumn: {
    flex: 1,
    alignItems: 'center',
  },
  verticalDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 16,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.textInverse,
    marginBottom: 12,
  },

  // Placeholder
  placeholderSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  placeholderText: {
    fontSize: 14,
    color: palette.textMuted,
  },
});
