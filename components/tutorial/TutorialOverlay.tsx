import { useTutorialStore } from '@/store/tutorialStore';
import { palette } from '@/theme/theme';
import React, { useState } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
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
    title: 'Tap to Score',
    description:
      "Tap either team's side to add a point. Swipe down to correct a mistake and remove a point.",
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
      'The bar at the top has your game timer, stats view, match info, settings, and reset. Long press reset for a fresh game.',
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

  if (!visible) {
    return null;
  }

  const step = TUTORIAL_STEPS[currentStep];

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
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

          {/* Next/Done button */}
          <Pressable onPress={handleNext} style={styles.nextButton}>
            <Text style={styles.nextButtonText}>{isLastStep ? 'Get Started' : 'Next'}</Text>
          </Pressable>
        </Animated.View>
      </View>
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
    paddingVertical: 24,
    paddingHorizontal: 16,
    width: Math.min(SCREEN_WIDTH - 48, 400),
    maxWidth: 400,
    borderWidth: 1,
    borderColor: palette.overlay20,
  },
  skipButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    zIndex: 10,
  },
  skipText: {
    fontSize: 14,
    color: palette.textMuted,
    fontWeight: '500',
  },
  contentContainer: {
    minHeight: 280,
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
  nextButton: {
    backgroundColor: palette.accent,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.textInverse,
  },
});
