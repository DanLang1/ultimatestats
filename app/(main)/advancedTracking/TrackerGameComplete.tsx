import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { useGameSessionActions } from '@/hooks/useGameSessionActions';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { getGameScore, isAdvancedGameOver } from '@/lib/advancedTracking/trackingUtils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Redirect, router, Stack } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

export default function TrackerGameCompleteScreen() {
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();

  const { currentGameId, savedGames, finalizeGame, undoLastOperation } = useAdvancedTrackingStore();
  const { finishActiveGameSession, restoreAdvancedGameSession } = useGameSessionActions();
  const game = savedGames.find((g) => g.id === currentGameId);

  if (!game || !isAdvancedGameOver(game)) {
    return <Redirect href="/advancedTracking/Tracker" />;
  }

  const styles = createStyles(isLandscape, sizeClass);

  const score = getGameScore(game);
  const focusSide = game.sides.find((s) => s.id === game.focusSideId)!;
  const oppSide = game.sides.find((s) => s.id !== game.focusSideId)!;
  const focusScore = score[focusSide.id] ?? 0;
  const oppScore = score[oppSide.id] ?? 0;

  const isTie = focusScore === oppScore;
  const focusWon = !isTie && focusScore > oppScore;
  const winnerName = focusWon ? focusSide.label : oppSide.label;
  const loserName = focusWon ? oppSide.label : focusSide.label;
  const winnerScore = focusWon ? focusScore : oppScore;
  const loserScore = focusWon ? oppScore : focusScore;

  const handleFinish = () => {
    finalizeGame();
    finishActiveGameSession();
    router.replace('/Dashboard');
  };

  const handleUndo = () => {
    undoLastOperation();
    restoreAdvancedGameSession();
    router.replace('/advancedTracking/Tracker');
  };

  const handleGoHome = () => {
    router.replace('/Dashboard');
  };

  return (
    <ThemedView style={[styles.screen, { backgroundColor: palette.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenHeader title="GAME COMPLETE" titleColor={palette.textMuted} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}>
        <View
          style={[
            styles.hero,
            { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
          ]}>
          <View
            style={[
              styles.trophyBadge,
              { backgroundColor: palette.overlay08, borderColor: palette.overlay15 },
            ]}>
            <MaterialCommunityIcons
              name={isTie ? 'handshake-outline' : 'trophy'}
              size={scaleBySizeClass(34, sizeClass)}
              color={isTie ? palette.textMuted : palette.warning}
            />
          </View>

          <ThemedText style={[styles.eyebrow, { color: palette.textMuted }]}>
            FINAL RESULT
          </ThemedText>
          <ThemedText style={[styles.winnerName, { color: palette.textInverse }]} numberOfLines={2}>
            {isTie ? "It's a Tie" : winnerName}
          </ThemedText>
          {!isTie && (
            <ThemedText style={[styles.subhead, { color: palette.textMuted }]}>
              wins the game
            </ThemedText>
          )}

          <View style={styles.scoreRow}>
            <View style={styles.scoreBlock}>
              <ThemedText
                style={[styles.teamLabel, { color: palette.textMuted }]}
                numberOfLines={1}>
                {isTie ? focusSide.label : winnerName}
              </ThemedText>
              <ThemedText style={[styles.scoreValue, { color: palette.textInverse }]}>
                {isTie ? focusScore : winnerScore}
              </ThemedText>
            </View>

            <ThemedText style={[styles.scoreDivider, { color: palette.textMuted }]}>-</ThemedText>

            <View style={styles.scoreBlock}>
              <ThemedText
                style={[styles.teamLabel, { color: palette.textMuted }]}
                numberOfLines={1}>
                {isTie ? oppSide.label : loserName}
              </ThemedText>
              <ThemedText style={[styles.scoreValue, { color: palette.textInverse }]}>
                {isTie ? oppScore : loserScore}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: palette.textMuted }]}>
            WHAT NEXT
          </ThemedText>

          <Pressable
            testID="game-complete-undo"
            style={[
              styles.secondaryAction,
              { backgroundColor: 'transparent', borderColor: palette.overlay15 },
            ]}
            onPress={handleUndo}>
            <View style={styles.actionCopy}>
              <ThemedText style={[styles.secondaryActionTitle, { color: palette.textInverse }]}>
                {isTie ? 'Undo Last Point' : 'Undo Winning Point'}
              </ThemedText>
              <ThemedText style={[styles.secondaryActionText, { color: palette.textMuted }]}>
                Return to the tracker and continue the game
              </ThemedText>
            </View>
            <MaterialCommunityIcons
              name="undo"
              size={scaleBySizeClass(22, sizeClass)}
              color={palette.textMuted}
            />
          </Pressable>

          <Pressable
            testID="game-complete-finish"
            style={[styles.primaryAction, { backgroundColor: palette.success }]}
            onPress={handleFinish}>
            <View>
              <ThemedText style={[styles.primaryActionTitle, { color: palette.textOnAccent }]}>
                Finish Game
              </ThemedText>
              <ThemedText style={[styles.primaryActionText, { color: palette.textOnAccent }]}>
                Save the result and return to the dashboard
              </ThemedText>
            </View>
            <MaterialCommunityIcons
              name="check-circle-outline"
              size={scaleBySizeClass(22, sizeClass)}
              color={palette.textOnAccent}
            />
          </Pressable>

          <Pressable
            testID="game-complete-home"
            style={[
              styles.secondaryAction,
              { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
            ]}
            onPress={handleGoHome}>
            <View style={styles.actionCopy}>
              <ThemedText style={[styles.secondaryActionTitle, { color: palette.textInverse }]}>
                Home
              </ThemedText>
              <ThemedText style={[styles.secondaryActionText, { color: palette.textMuted }]}>
                Leave without finalizing and return to the dashboard
              </ThemedText>
            </View>
            <MaterialCommunityIcons
              name="home-outline"
              size={scaleBySizeClass(22, sizeClass)}
              color={palette.textMuted}
            />
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function createStyles(isLandscape: boolean, sizeClass: SizeClass) {
  return StyleSheet.create({
    screen: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: scaleBySizeClass(20, sizeClass),
      paddingTop: scaleBySizeClass(20, sizeClass),
      paddingBottom: scaleBySizeClass(28, sizeClass),
      gap: scaleBySizeClass(22, sizeClass),
    },
    hero: {
      borderRadius: 24,
      borderWidth: 1,
      paddingHorizontal: scaleBySizeClass(22, sizeClass),
      paddingVertical: scaleBySizeClass(26, sizeClass),
      alignItems: 'center',
    },
    trophyBadge: {
      width: scaleBySizeClass(78, sizeClass),
      height: scaleBySizeClass(78, sizeClass),
      borderRadius: 999,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: scaleBySizeClass(18, sizeClass),
    },
    eyebrow: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 2.5,
      marginBottom: 8,
      textAlign: 'center',
    },
    winnerName: {
      fontSize: scaleBySizeClass(isLandscape ? 34 : 30, sizeClass),
      fontFamily: Fonts.extraBold,
      textAlign: 'center',
    },
    subhead: {
      fontSize: scaleBySizeClass(16, sizeClass),
      marginTop: 6,
      textAlign: 'center',
    },
    scoreRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: scaleBySizeClass(18, sizeClass),
      marginTop: scaleBySizeClass(24, sizeClass),
      width: '100%',
    },
    scoreBlock: {
      flex: 1,
      alignItems: 'center',
      maxWidth: isLandscape ? 260 : undefined,
    },
    teamLabel: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
      textAlign: 'center',
      marginBottom: 4,
    },
    scoreValue: {
      fontSize: scaleBySizeClass(isLandscape ? 58 : 52, sizeClass),
      fontFamily: Fonts.extraBold,
      lineHeight: scaleBySizeClass(isLandscape ? 62 : 56, sizeClass),
    },
    scoreDivider: {
      fontSize: scaleBySizeClass(30, sizeClass),
      paddingBottom: 6,
    },
    section: {
      gap: scaleBySizeClass(12, sizeClass),
    },
    sectionTitle: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 2.5,
    },
    primaryAction: {
      borderRadius: 20,
      minHeight: scaleBySizeClass(86, sizeClass),
      paddingHorizontal: scaleBySizeClass(18, sizeClass),
      paddingVertical: scaleBySizeClass(18, sizeClass),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
    },
    primaryActionTitle: {
      fontSize: scaleBySizeClass(22, sizeClass),
      fontFamily: Fonts.extraBold,
    },
    primaryActionText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      marginTop: 2,
      maxWidth: '92%',
    },
    secondaryAction: {
      borderRadius: 18,
      borderWidth: 1,
      minHeight: scaleBySizeClass(84, sizeClass),
      paddingHorizontal: scaleBySizeClass(18, sizeClass),
      paddingVertical: scaleBySizeClass(16, sizeClass),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
    },
    actionCopy: {
      flex: 1,
    },
    secondaryActionTitle: {
      fontSize: scaleBySizeClass(19, sizeClass),
      fontFamily: Fonts.bold,
    },
    secondaryActionText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      marginTop: 3,
    },
  });
}
