import { useTheme } from '@/context/ThemeContext';
import { useTutorialStore } from '@/store/tutorialStore';
import React, { useState } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import TutorialStep from './TutorialStep';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TUTORIAL_STEPS = [
  {
    icon: 'chart-line' as const,
    title: 'Track Player Stats',
    description:
      'Record goals, assists, and turnovers for each player. See who scored and who made the assist on every point.',
  },
  {
    icon: 'account-group' as const,
    title: 'Set Up Your Roster',
    description:
      "Go to Settings and tap the Roster button to add your players. You'll select from this list when recording stats.",
  },
  {
    icon: 'gesture-tap' as const,
    title: 'Record During Game',
    description:
      "After each goal, you'll be prompted to select the scorer and assister. Turnovers can be logged with the disc button.",
  },
  {
    icon: 'chart-bar' as const,
    title: 'View Your Stats',
    description:
      'Tap the stats icon in the top bar to see player statistics. Export to CSV to analyze your data.',
  },
];

export default function StatsTrackingTutorial() {
  const { showStatsTutorial, closeStatsTutorial } = useTutorialStore();
  const [currentStep, setCurrentStep] = useState(0);
  const { palette } = useTheme();

  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      handleClose();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    closeStatsTutorial();
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  if (!showStatsTutorial) {
    return null;
  }

  const step = TUTORIAL_STEPS[currentStep];

  return (
    <Modal transparent visible={showStatsTutorial} animationType="fade">
      <SafeAreaProvider>
        <SafeAreaView
          style={[styles.overlay, { backgroundColor: palette.overlayDark60 }]}
          edges={['top', 'bottom', 'left', 'right']}>
          <Animated.View
            entering={FadeIn.duration(300)}
            style={[
              styles.container,
              { backgroundColor: palette.modalBg, borderColor: palette.overlay20 },
            ]}>
            {/* Skip button */}
            <Pressable onPress={handleClose} style={styles.skipButton}>
              <Text style={[styles.skipText, { color: palette.textMuted }]}>Skip</Text>
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
                style={[
                  styles.nextButton,
                  { backgroundColor: palette.accent },
                  isFirstStep && styles.nextButtonFull,
                ]}>
                <Text style={[styles.nextButtonText, { color: palette.textOnAccent }]}>
                  {isLastStep ? 'Got It' : 'Next'}
                </Text>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 16,
    maxWidth: Math.min(SCREEN_WIDTH - 48, 600),
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
  },
  dotActive: {
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
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
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
  },
});
