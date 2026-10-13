import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import TutorialAdvancedActionCard from '@/components/tutorial/TutorialAdvancedActionCard';
import TutorialAdvancedCompleteInline from '@/components/tutorial/TutorialAdvancedCompleteInline';
import { TUTORIAL_ADVANCED_PARTICIPANTS } from '@/components/tutorial/tutorialAdvancedData';
import TutorialAdvancedFooter from '@/components/tutorial/TutorialAdvancedFooter';
import TutorialAdvancedPlayerGrid from '@/components/tutorial/TutorialAdvancedPlayerGrid';
import TutorialAdvancedRareActionsSheet from '@/components/tutorial/TutorialAdvancedRareActionsSheet';
import {
  exitAdvancedTutorial,
  parseTutorialAdvancedVariant,
  parseTutorialOrigin,
} from '@/components/tutorial/tutorialNavigation';
import useTutorialAdvancedGameState, {
  TUTORIAL_ADVANCED_COMPLETION_TEXT,
} from '@/components/tutorial/useTutorialAdvancedGameState';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, useLayout } from '@/hooks/useLayout';
import { useTutorialStore } from '@/store/tutorialStore';
import { Fonts } from '@/theme/theme';

export default function TutorialAdvancedTrackerRoute() {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const { origin: rawOrigin, variant: rawVariant } = useLocalSearchParams<{
    origin?: string;
    variant?: string;
  }>();
  const origin = parseTutorialOrigin(rawOrigin);
  const variant = parseTutorialAdvancedVariant(rawVariant);
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

  const gameState = useTutorialAdvancedGameState(variant);
  const { cue } = gameState;
  const chipCue = cue.target === 'chip' ? cue : null;
  const footerCueButton = cue.target === 'footer' ? cue.button : null;
  const holderName =
    gameState.discHolderRef?.refType === 'participant'
      ? (TUTORIAL_ADVANCED_PARTICIPANTS.find(
          (participant) => participant.id === gameState.discHolderRef?.participantId,
        )?.name ?? null)
      : null;
  const exit = () => exitAdvancedTutorial(origin);

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
        armedModifier={gameState.armedModifier}
        showMore={gameState.showMore}
        showMoreCue={cue.target === 'more'}
        onOpenMoreMenu={gameState.openMoreMenu}
        onCancelModifier={gameState.cancelModifier}
      />

      <TutorialAdvancedRareActionsSheet
        visible={gameState.moreMenuOpen}
        onClose={gameState.closeMoreMenu}
        onPressure={gameState.selectPressure}
      />

      {gameState.isComplete ? (
        <TutorialAdvancedCompleteInline
          body={TUTORIAL_ADVANCED_COMPLETION_TEXT[variant]}
          buttonLabel="DONE"
          onFinish={finish}
        />
      ) : (
        <>
          <View style={styles.surface}>
            <View style={styles.directions}>
              <ThemedText style={[styles.title, { color: palette.textInverse }]}>
                {gameState.title}
              </ThemedText>
              <ThemedText style={[styles.message, { color: palette.textMuted }]}>
                {gameState.correctionMessage ?? gameState.message}
              </ThemedText>
            </View>
            <View style={styles.grid}>
              <TutorialAdvancedPlayerGrid
                participants={TUTORIAL_ADVANCED_PARTICIPANTS}
                discHolderRef={gameState.discHolderRef}
                oppHasDisc={gameState.oppHasDisc}
                handlers={gameState.handlers}
                cuePlayerId={chipCue?.playerId ?? null}
                cueDirection={chipCue?.direction ?? null}
                passModifier={gameState.armedModifier}
              />
            </View>
          </View>
          {variant === 'buttons' && (
            <TutorialAdvancedFooter
              oppHasDisc={gameState.oppHasDisc}
              isRowHidden={gameState.armedModifier != null}
              cueButton={footerCueButton}
              onThrowaway={gameState.footerHandlers.onThrowaway}
              onArmTapAction={gameState.footerHandlers.onArmTapAction}
            />
          )}
        </>
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
