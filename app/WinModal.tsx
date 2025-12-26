import { useGameStore } from '@/store/gameStore';
import { palette } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';

export default function WinModal() {
  const { team1Score, team2Score, gameTo, team1Name, team2Name, saveCurrentGame, resetGame } =
    useGameStore();

  const isGameOver = team1Score >= gameTo || team2Score >= gameTo;

  // If game isn't over, don't render
  if (!isGameOver) {
    return null;
  }

  const team1Won = team1Score >= gameTo;
  const winnerName = team1Won ? team1Name : team2Name;
  const winnerScore = team1Won ? team1Score : team2Score;
  const loserScore = team1Won ? team2Score : team1Score;

  const handleViewStats = () => {
    saveCurrentGame();
    router.dismissTo('/');
    router.push('/ViewStats');
  };

  const handleNewGame = () => {
    saveCurrentGame();
    resetGame();
    router.dismissTo('/');
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={styles.overlay}>
        <Animated.View entering={SlideInUp.springify().damping(50)} style={styles.card}>
          {/* Trophy Icon - Centered */}
          <Animated.View entering={FadeIn.delay(200)} style={styles.iconContainer}>
            <MaterialCommunityIcons name="trophy" size={48} color={palette.warning} />
          </Animated.View>

          {/* Winner Text */}
          <Animated.Text entering={FadeIn.delay(300)} style={styles.winnerText} numberOfLines={1}>
            {winnerName}
          </Animated.Text>
          <Animated.Text entering={FadeIn.delay(400)} style={styles.winsText}>
            WINS!
          </Animated.Text>

          {/* Score */}
          <Animated.View entering={FadeIn.delay(500)} style={styles.scoreContainer}>
            <Text style={styles.score}>{winnerScore}</Text>
            <Text style={styles.scoreDivider}>-</Text>
            <Text style={styles.score}>{loserScore}</Text>
          </Animated.View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <View style={styles.buttonRow}>
              {/* View Stats Button */}
              <Pressable
                style={[styles.button, styles.rowButton, styles.statsButton]}
                onPress={handleViewStats}>
                <MaterialCommunityIcons name="chart-bar" size={18} color={palette.accent} />
                <Text style={[styles.buttonText, styles.statsButtonText]}>View Stats</Text>
              </Pressable>

              {/* New Game Button */}
              <Pressable
                style={[styles.button, styles.rowButton, styles.newGameButton]}
                onPress={handleNewGame}>
                <MaterialCommunityIcons name="restart" size={18} color={palette.textMuted} />
                <Text style={[styles.buttonText, styles.newGameButtonText]}>New Game</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: palette.overlayDark60,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: palette.primary,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: palette.overlay15,
  },
  iconContainer: {
    marginBottom: 12,
  },
  winnerText: {
    fontSize: 24,
    fontWeight: '800',
    color: palette.textInverse,
    textAlign: 'center',
  },
  winsText: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.textMuted,
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
    fontSize: 40,
    fontWeight: '800',
    color: palette.textInverse,
  },
  scoreDivider: {
    fontSize: 28,
    fontWeight: '300',
    color: palette.textMuted,
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
    fontSize: 14,
    fontWeight: '600',
  },
  statsButton: {
    backgroundColor: palette.accentOverlay15,
    borderWidth: 1,
    borderColor: palette.accentOverlay30,
  },
  statsButtonText: {
    color: palette.accent,
  },
  newGameButton: {
    backgroundColor: palette.overlay10,
  },
  newGameButtonText: {
    color: palette.textMuted,
  },
});
