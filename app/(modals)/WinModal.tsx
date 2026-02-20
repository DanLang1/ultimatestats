import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { checkGameOver, getWinner } from '@/lib/gameUtils';
import { useGameStore } from '@/store/gameStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';

export default function WinModal() {
  const {
    team1Score,
    team2Score,
    gameTo,
    currentTeam,
    team2Name,
    saveCurrentGame,
    resetGame,
    statTrackingEnabled,
    undoLastAction,
    timerTimeLeft,
    setTimerActive,
    setGameLocked,
  } = useGameStore();
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const team1Name = currentTeam?.name ?? 'Team 1';

  // Game is over when checkGameOver returns true
  const isGameOver = checkGameOver({
    team1Score,
    team2Score,
    gameTo,
    timerTimeLeft,
  });

  // If game isn't over, don't render
  if (!isGameOver) {
    return null;
  }

  // Determine winner: whoever has more points wins
  const winnerTeam = getWinner(team1Score, team2Score);
  const team1Won = winnerTeam === 'team1';
  const winnerName = team1Won ? team1Name : team2Name;
  const winnerScore = team1Won ? team1Score : team2Score;
  const loserScore = team1Won ? team2Score : team1Score;

  const handleViewStats = async () => {
    setTimerActive(false);
    setGameLocked(true);
    if (statTrackingEnabled) {
      await saveCurrentGame();
    }
    router.dismissTo('/');
    router.push('/ViewStats');
  };

  const handleNewGame = async () => {
    if (statTrackingEnabled) {
      await saveCurrentGame();
    }
    resetGame();
    router.dismissTo('/');
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={[styles.overlay, { backgroundColor: palette.overlayDark60 }]}>
        <Animated.View
          entering={SlideInUp.springify().damping(50)}
          style={[
            styles.card,
            {
              backgroundColor: palette.primary,
              borderColor: palette.overlay15,
              shadowColor: palette.shadow,
            },
          ]}>
          {/* Trophy Icon - Centered */}
          <Animated.View entering={FadeIn.delay(200)} style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="trophy"
              size={scaleBySizeClass(48, sizeClass)}
              color={palette.warning}
            />
          </Animated.View>

          {/* Winner Text */}
          <Animated.Text
            entering={FadeIn.delay(300)}
            style={[styles.winnerText, { color: palette.textInverse }]}
            numberOfLines={1}>
            {winnerName}
          </Animated.Text>
          <Animated.Text
            entering={FadeIn.delay(400)}
            style={[styles.winsText, { color: palette.textMuted }]}>
            WINS!
          </Animated.Text>

          {/* Score */}
          <Animated.View entering={FadeIn.delay(500)} style={styles.scoreContainer}>
            <Text style={[styles.score, { color: palette.textInverse }]}>{winnerScore}</Text>
            <Text style={[styles.scoreDivider, { color: palette.textMuted }]}>-</Text>
            <Text style={[styles.score, { color: palette.textInverse }]}>{loserScore}</Text>
          </Animated.View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <View style={styles.buttonRow}>
              {/* View Stats Button */}
              {statTrackingEnabled && (
                <Pressable
                  style={[
                    styles.button,
                    styles.rowButton,
                    styles.statsButton,
                    {
                      backgroundColor: palette.accentOverlay15,
                      borderColor: palette.accentOverlay30,
                    },
                  ]}
                  onPress={handleViewStats}>
                  <MaterialCommunityIcons
                    name="chart-bar"
                    size={scaleBySizeClass(18, sizeClass)}
                    color={palette.accent}
                  />
                  <Text style={[styles.buttonText, { color: palette.accent }]}>View Stats</Text>
                </Pressable>
              )}

              {/* New Game Button */}
              <Pressable
                style={[styles.button, styles.rowButton, { backgroundColor: palette.success }]}
                onPress={handleNewGame}>
                <MaterialCommunityIcons
                  name="restart"
                  size={scaleBySizeClass(18, sizeClass)}
                  color={palette.textOnAccent}
                />
                <Text style={[styles.buttonText, { color: palette.textOnAccent }]}>New Game</Text>
              </Pressable>
            </View>

            {/* Undo Button - Full width below other buttons */}
            <Pressable
              style={[
                styles.button,
                { backgroundColor: 'transparent', borderColor: palette.overlay15, borderWidth: 1 },
              ]}
              onPress={() => {
                undoLastAction();
                router.back();
              }}>
              <MaterialCommunityIcons
                name="undo"
                size={scaleBySizeClass(18, sizeClass)}
                color={palette.textMuted}
              />
              <Text style={[styles.buttonText, { color: palette.textMuted }]}>
                Undo Winning Point
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    card: {
      borderRadius: 20,
      padding: 24,
      width: '100%',
      maxWidth: 320,
      alignItems: 'center',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 12,
      borderWidth: 1,
    },
    iconContainer: {
      marginBottom: 12,
    },
    winnerText: {
      fontSize: scaleBySizeClass(24, sizeClass),
      fontWeight: '800',
      textAlign: 'center',
    },
    winsText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontWeight: '700',
      letterSpacing: 3,
      marginTop: 2,
      marginBottom: 16,
    },
    scoreContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 20,
    },
    score: {
      fontSize: scaleBySizeClass(40, sizeClass),
      fontWeight: '800',
    },
    scoreDivider: {
      fontSize: scaleBySizeClass(28, sizeClass),
      fontWeight: '300',
    },
    buttonContainer: {
      width: '100%',
      gap: 10,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 10,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 10,
    },
    rowButton: {
      flex: 1,
    },
    buttonText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontWeight: '600',
    },
    statsButton: {
      borderWidth: 1,
    },
  });
}
