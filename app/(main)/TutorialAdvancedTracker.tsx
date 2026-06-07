import { ThemedText } from '@/components/ThemedText';
import TutorialAdvancedActionCard from '@/components/tutorial/TutorialAdvancedActionCard';
import TutorialAdvancedCompleteInline from '@/components/tutorial/TutorialAdvancedCompleteInline';
import TutorialAdvancedPlayerGrid from '@/components/tutorial/TutorialAdvancedPlayerGrid';
import TutorialAdvancedRareMenu from '@/components/tutorial/TutorialAdvancedRareMenu';
import useTutorialAdvancedGameState from '@/components/tutorial/useTutorialAdvancedGameState';
import { TUTORIAL_ADVANCED_PARTICIPANTS } from '@/components/tutorial/tutorialAdvancedData';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, useLayout } from '@/hooks/useLayout';
import { useTutorialStore } from '@/store/tutorialStore';
import { Fonts } from '@/theme/theme';
import { router, useLocalSearchParams } from 'expo-router';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { useState } from 'react';

export default function TutorialAdvancedTrackerRoute() {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const { origin } = useLocalSearchParams<{ origin?: string }>();
  const [surfaceHeight, setSurfaceHeight] = useState(0);
  const styles = createStyles(sizeClass);

  const finish = () => {
    useTutorialStore.getState().completeAdvancedTutorial();
    if (origin === 'tracker') {
      router.replace('/advancedTracking/Tracker');
      return;
    }
    router.replace(origin === 'help' ? '/Dashboard' : '/advancedTracking/PreGameConfirm');
  };

  const gameState = useTutorialAdvancedGameState();
  const showBetweenPoint = gameState.result === 'goal';
  const cue = (() => {
    if (gameState.result != null) return { playerId: null, direction: null };
    if (gameState.step === 'pass-to-blair') {
      return { playerId: 'blair', direction: 'right' as const };
    }
    if (gameState.step === 'drop-by-carl') {
      return { playerId: 'carl', direction: 'down' as const };
    }
    if (gameState.step === 'stall-by-carl') {
      return { playerId: 'carl', direction: 'right' as const };
    }
    if (
      gameState.step === 'throwaway-by-carl' &&
      gameState.discHolderRef?.refType === 'participant'
    ) {
      return {
        playerId: gameState.discHolderRef.participantId,
        direction: 'down' as const,
      };
    }
    if (gameState.step === 'goal-to-carl') {
      return { playerId: 'carl', direction: 'up' as const };
    }
    if (gameState.step === 'block-by-blair') {
      return { playerId: 'blair', direction: 'right' as const };
    }
    return { playerId: null, direction: null };
  })();
  const holderName =
    gameState.discHolderRef?.refType === 'participant'
      ? (TUTORIAL_ADVANCED_PARTICIPANTS.find(
          (participant) => participant.id === gameState.discHolderRef?.participantId,
        )?.name ?? null)
      : null;
  const passModifier = gameState.step === 'stall-by-carl' ? 'stall' : null;

  const skip = () => {
    finish();
  };

  const onSurfaceLayout = (event: LayoutChangeEvent) => {
    setSurfaceHeight(event.nativeEvent.layout.height);
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.primary }]}>
      <View style={[styles.header, { borderBottomColor: palette.overlay10 }]}>
        <ThemedText style={[styles.step, { color: palette.accent }]}>
          STEP {gameState.stepIndex + 1} OF {gameState.stepCount}
        </ThemedText>
        <Pressable onPress={skip} style={styles.skip}>
          <ThemedText style={[styles.skipText, { color: palette.textMuted }]}>SKIP</ThemedText>
        </Pressable>
      </View>

      <TutorialAdvancedActionCard
        step={gameState.step}
        result={gameState.lastResult}
        awaitingConfirmation={gameState.result != null}
        holderName={holderName}
        oppHasDisc={gameState.oppHasDisc}
        onMore={gameState.openRareMenu}
      />

      {showBetweenPoint ? (
        <TutorialAdvancedCompleteInline
          buttonLabel={origin === 'help' || origin === 'tracker' ? 'DONE' : 'SET UP GAME'}
          onFinish={finish}
        />
      ) : (
        <View style={styles.surface}>
          {gameState.result == null && !gameState.rareMenuVisible && (
            <View style={styles.directions}>
              <ThemedText style={[styles.title, { color: palette.textInverse }]}>
                {gameState.title}
              </ThemedText>
              <ThemedText style={[styles.message, { color: palette.textMuted }]}>
                {gameState.message}
              </ThemedText>
            </View>
          )}
          <View style={styles.grid} onLayout={onSurfaceLayout}>
            <TutorialAdvancedPlayerGrid
              participants={TUTORIAL_ADVANCED_PARTICIPANTS}
              discHolderRef={gameState.discHolderRef}
              oppHasDisc={gameState.oppHasDisc}
              handlers={gameState.handlers}
              availableHeight={surfaceHeight}
              cuePlayerId={cue.playerId}
              cueDirection={cue.direction}
              passModifier={passModifier}
            />
          </View>
        </View>
      )}

      <TutorialAdvancedRareMenu
        visible={gameState.rareMenuVisible}
        onClose={gameState.closeRareMenu}
        onSelectStall={gameState.selectStall}
      />
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
