import { useTheme } from '@/context/ThemeContext';
import { useLayout } from '@/hooks/useLayout';
import { useTutorialStore } from '@/store/tutorialStore';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
} from 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import TutorialStep from './TutorialStep';

const TUTORIAL_STEPS = [
  {
    icon: 'chart-line' as const,
    title: 'Track Possession',
    description:
      'Follow the Frisbee to track which team has the disc. Tap either team to record a goal and switch possession.',
  },
  {
    icon: 'gesture-tap' as const,
    title: 'Track Turnovers',
    description:
      'Use the floating action bar to record turnovers. Tap the info icon (ⓘ) in the top bar for a legend of the floating action bar icons.',
  },

  {
    icon: 'account-group' as const,
    title: 'Build Roster Incrementally',
    description:
      'Add players to your team as you go. Rosters can also be edited from the Settings screen.',
  },
  {
    icon: 'chart-bar' as const,
    title: 'View Your Stats',
    description:
      'Tap the stats icon in the top bar to see team and player statistics. Export to CSV to analyze your data.',
  },
];

export default function StatsTrackingTutorial() {
  const { width } = useLayout();
  const { showStatsTutorial, closeStatsTutorial } = useTutorialStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const { palette } = useTheme();

  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      handleClose();
    } else {
      setSlideDirection('right');
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    closeStatsTutorial();
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setSlideDirection('left');
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Pan gesture to detect horizontal swipes
  const SWIPE_THRESHOLD = 50;
  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .onEnd((event) => {
      if (event.translationX < -SWIPE_THRESHOLD && !isLastStep) {
        // Swiped left - go next
        handleNext();
      } else if (event.translationX > SWIPE_THRESHOLD && !isFirstStep) {
        // Swiped right - go back
        handleBack();
      }
    });

  if (!showStatsTutorial) {
    return null;
  }

  const step = TUTORIAL_STEPS[currentStep];

  // Choose animations based on slide direction
  const enteringAnimation = slideDirection === 'right' ? SlideInRight : SlideInLeft;
  const exitingAnimation = slideDirection === 'right' ? SlideOutLeft : SlideOutRight;

  return (
    <Modal transparent visible={showStatsTutorial} animationType="fade">
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <SafeAreaView
            style={[styles.overlay, { backgroundColor: palette.overlayDark60 }]}
            edges={['top', 'bottom', 'left', 'right']}>
            <GestureDetector gesture={panGesture}>
              <Animated.View
                entering={FadeIn.duration(300)}
                style={[
                  styles.container,
                  { maxWidth: Math.min(width - 48, 600) },
                  { backgroundColor: palette.modalBg, borderColor: palette.overlay20 },
                ]}>
                {/* Skip button */}
                <Pressable onPress={handleClose} style={styles.skipButton}>
                  <Text style={[styles.skipText, { color: palette.textMuted }]}>Skip</Text>
                </Pressable>

                {/* Step content with animation */}
                <ScrollView
                  style={styles.scrollContainer}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={false}>
                  <View style={styles.contentContainer}>
                    <Animated.View
                      key={currentStep}
                      entering={enteringAnimation.duration(300)}
                      exiting={exitingAnimation.duration(200)}
                      style={styles.stepWrapper}>
                      <TutorialStep
                        icon={step.icon}
                        title={step.title}
                        description={step.description}
                      />
                    </Animated.View>
                  </View>

                  {/* Progress dots */}
                  <View style={styles.dotsContainer}>
                    {TUTORIAL_STEPS.map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.dot,
                          { backgroundColor: palette.overlay20 },
                          index === currentStep && [
                            styles.dotActive,
                            { backgroundColor: palette.accent },
                          ],
                        ]}
                      />
                    ))}
                  </View>
                </ScrollView>

                {/* Navigation buttons */}
                <View style={styles.buttonRow}>
                  {!isFirstStep && (
                    <Pressable
                      onPress={handleBack}
                      style={[styles.backButton, { borderColor: palette.accent }]}>
                      <Text style={[styles.backButtonText, { color: palette.accent }]}>Back</Text>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={handleNext}
                    style={[styles.nextButton, { backgroundColor: palette.accent }]}>
                    <Text style={[styles.nextButtonText, { color: palette.textOnAccent }]}>
                      {isLastStep ? 'Got It' : 'Next'}
                    </Text>
                  </Pressable>
                </View>
              </Animated.View>
            </GestureDetector>
          </SafeAreaView>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '92%',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 16,
    maxHeight: '90%',
    borderWidth: 1,
  },
  skipButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
    zIndex: 10,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  contentContainer: {
    minHeight: 180,
    justifyContent: 'center',
    paddingTop: 24, // Space for skip button
  },
  scrollContainer: {
    maxHeight: 450,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  stepWrapper: {
    width: '100%',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    paddingBottom: 4,
  },
  backButton: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
