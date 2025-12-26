import { useTutorialStore } from '@/store/tutorialStore';
import { palette } from '@/theme/theme';
import React, { useState } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import TutorialStep from './TutorialStep';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TUTORIAL_STEPS = [
  {
    icon: 'disc' as const,
    title: 'Welcome to UltimateStats!',
    description:
      "The easiest way to keep score for your ultimate frisbee games. Let's show you around.",
  },
  {
    icon: 'gesture-tap' as const,
    title: 'Score with Gestures',
    description:
      "Tap or swipe up on either team's side to add a point. Swipe down to correct a mistake and remove a point.",
  },
  {
    icon: 'timer-outline' as const,
    title: 'Track Timeouts',
    description:
      'Tap the circles at the top of each team to mark timeouts as used. Tap again to restore.',
  },
  {
    icon: 'cog-outline' as const,
    title: 'Top Controls',
    description:
      'The bar at the top has your game timer, stats view, match info, settings, and reset',
  },
];

export default function TutorialOverlay() {
  const { hasSeenOnboarding, showOnboarding, closeOnboarding } = useTutorialStore();
  const [currentStep, setCurrentStep] = useState(0);

  // Show on first launch OR when manually triggered
  const visible = !hasSeenOnboarding || showOnboarding;

  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleClose();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    closeOnboarding();
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const isFirstStep = currentStep === 0;

  if (!visible) {
    return null;
  }

  const step = TUTORIAL_STEPS[currentStep];

  return (
    <Modal transparent visible={visible} animationType="fade">
      <SafeAreaProvider>
        <SafeAreaView style={styles.overlay} edges={['top', 'bottom', 'left', 'right']}>
          <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
            {/* Skip button */}
            <Pressable onPress={handleClose} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>

            {/* Step content with animation */}
            <View style={styles.contentContainer}>
              <Animated.View
                key={currentStep}
                entering={SlideInRight.duration(300)}
                exiting={SlideOutLeft.duration(200)}
                style={styles.stepWrapper}>
                <TutorialStep icon={step.icon} title={step.title} description={step.description} />
              </Animated.View>
            </View>

            {/* Progress dots */}
            <View style={styles.dotsContainer}>
              {TUTORIAL_STEPS.map((_, index) => (
                <View key={index} style={[styles.dot, index === currentStep && styles.dotActive]} />
              ))}
            </View>

            {/* Navigation buttons */}
            <View style={styles.buttonRow}>
              {!isFirstStep && (
                <Pressable onPress={handleBack} style={styles.backButton}>
                  <Text style={styles.backButtonText}>Back</Text>
                </Pressable>
              )}
              <Pressable
                onPress={handleNext}
                style={[styles.nextButton, isFirstStep && styles.nextButtonFull]}>
                <Text style={styles.nextButtonText}>{isLastStep ? 'Get Started' : 'Next'}</Text>
              </Pressable>
            </View>
          </Animated.View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: palette.overlayDark60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: palette.secondary,
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 16,
    maxWidth: Math.min(SCREEN_WIDTH - 48, 600),
    maxHeight: '90%', // Ensure it doesn't overflow screen height
    borderWidth: 1,
    borderColor: palette.overlay20,
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
    color: palette.textMuted,
    fontWeight: '500',
  },
  contentContainer: {
    minHeight: 200,
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
    backgroundColor: palette.overlay20,
  },
  dotActive: {
    backgroundColor: palette.accent,
    width: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
  },
  backButton: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: palette.accent,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.accent,
  },
  nextButton: {
    flex: 1,
    backgroundColor: palette.accent,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.textInverse,
  },
});
