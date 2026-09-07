import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import TutorialAdvancedActionCard from '@/components/tutorial/TutorialAdvancedActionCard';
import TutorialAdvancedCompleteInline from '@/components/tutorial/TutorialAdvancedCompleteInline';
import { TUTORIAL_ADVANCED_PARTICIPANTS } from '@/components/tutorial/tutorialAdvancedData';
import TutorialAdvancedPlayerGrid from '@/components/tutorial/TutorialAdvancedPlayerGrid';
import TutorialAdvancedRareActionsSheet from '@/components/tutorial/TutorialAdvancedRareActionsSheet';
import {
  getTutorialExitRoute,
  parseTutorialOrigin,
} from '@/components/tutorial/tutorialNavigation';
import useTutorialAdvancedGameState from '@/components/tutorial/useTutorialAdvancedGameState';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, useLayout } from '@/hooks/useLayout';
import { useTutorialStore } from '@/store/tutorialStore';
import { Fonts } from '@/theme/theme';

export default function TutorialAdvancedTrackerRoute() {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const { origin: rawOrigin } = useLocalSearchParams<{
    origin?: string;
  }>();
  const origin = parseTutorialOrigin(rawOrigin);
  const styles = createStyles(sizeClass);

  const finish = () => {
    if (origin === 'onboarding') {
      useTutorialStore.getState().completeAdvancedOnboarding();
      router.replace('/Dashboard');
      return;
    }
    useTutorialStore.getState().completeAdvancedTutorial();
    if (origin === 'tracker') {
      router.replace('/advancedTracking/Tracker');
      return;
    }
    if (origin === 'help') router.replace('/Dashboard');
  };

  const gameState = useTutorialAdvancedGameState();
  const showBetweenPoint = gameState.result === 'goal';
  const cue = (() => {
    if (gameState.result != null) return { playerId: null, direction: null };
    if (gameState.step === 'pass-to-mark') {
      return { playerId: 'line-mark', direction: 'right' as const };
    }
    if (gameState.step === 'drop-by-jules') {
      return { playerId: 'line-jules', direction: 'down' as const };
    }
    if (
      gameState.step === 'throwaway-by-mark' &&
      gameState.discHolderRef?.refType === 'participant'
    ) {
      return {
        playerId: gameState.discHolderRef.participantId,
        direction: 'down' as const,
      };
    }
    if (gameState.step === 'goal-to-kelly') {
      return { playerId: 'line-kelly', direction: 'up' as const };
    }
    if (gameState.step === 'block-by-rachel') {
      return { playerId: 'line-rachel', direction: 'right' as const };
    }
    if (gameState.step === 'pressure-by-harper' && gameState.pressureArmed) {
      return { playerId: 'line-harper', direction: 'right' as const };
    }
    return { playerId: null, direction: null };
  })();
  const holderName =
    gameState.discHolderRef?.refType === 'participant'
      ? (TUTORIAL_ADVANCED_PARTICIPANTS.find(
          (participant) => participant.id === gameState.discHolderRef?.participantId,
        )?.name ?? null)
      : null;
  const exit = () => router.replace(getTutorialExitRoute(origin));

  return (
    <View style={[styles.container, { backgroundColor: palette.primary }]}>
      <View style={[styles.header, { borderBottomColor: palette.overlay10 }]}>
        <ThemedText style={[styles.step, { color: palette.accent }]}>
          STEP {gameState.stepIndex + 1} OF {gameState.stepCount}
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Exit tutorial"
          onPress={exit}
          style={styles.skip}>
          <ThemedText style={[styles.skipText, { color: palette.textMuted }]}>EXIT</ThemedText>
        </Pressable>
      </View>

      <TutorialAdvancedActionCard
        result={gameState.lastResult}
        holderName={holderName}
        oppHasDisc={gameState.oppHasDisc}
        pressureArmed={gameState.pressureArmed}
        isPressureStep={gameState.step === 'pressure-by-harper'}
        onOpenPressureMenu={gameState.openPressureMenu}
      />

      <TutorialAdvancedRareActionsSheet
        visible={gameState.pressureMenuOpen}
        onClose={gameState.closePressureMenu}
        onPressure={gameState.selectPressure}
      />

      {showBetweenPoint ? (
        <TutorialAdvancedCompleteInline buttonLabel="DONE" onFinish={finish} />
      ) : (
        <View style={styles.surface}>
          {gameState.result == null && (
            <View style={styles.directions}>
              <ThemedText style={[styles.title, { color: palette.textInverse }]}>
                {gameState.title}
              </ThemedText>
              <ThemedText style={[styles.message, { color: palette.textMuted }]}>
                {gameState.correctionMessage ?? gameState.message}
              </ThemedText>
            </View>
          )}
          <View style={styles.grid}>
            <TutorialAdvancedPlayerGrid
              participants={TUTORIAL_ADVANCED_PARTICIPANTS}
              discHolderRef={gameState.discHolderRef}
              oppHasDisc={gameState.oppHasDisc}
              handlers={gameState.handlers}
              cuePlayerId={cue.playerId}
              cueDirection={cue.direction}
              passModifier={gameState.pressureArmed ? 'pressure' : null}
            />
          </View>
        </View>
      )}
    </View>
  );
}

function createStyles(sizeClass: 'small' | 'medium' | 'large') {
  return StyleSheet.create({
    container: { flex: 1 },
    header: {
      minHeight: scaleBySizeClass(48, sizeClass),
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      justifyContent: 'center',
    },
    step: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(10, sizeClass),
      letterSpacing: 1.2,
    },
    title: { fontFamily: Fonts.black, fontSize: scaleBySizeClass(19, sizeClass) },
    message: {
      fontFamily: Fonts.regular,
      fontSize: scaleBySizeClass(13, sizeClass),
      lineHeight: scaleBySizeClass(18, sizeClass),
    },
    skip: { position: 'absolute', right: 12, top: 12, padding: 12 },
    skipText: { fontFamily: Fonts.bold, fontSize: scaleBySizeClass(12, sizeClass) },
    surface: { flex: 1 },
    directions: {
      paddingHorizontal: 16,
      paddingTop: scaleBySizeClass(10, sizeClass),
      gap: 3,
    },
    grid: { flex: 1, justifyContent: 'center' },
  });
}
