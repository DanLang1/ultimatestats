import { useTheme } from '@/context/ThemeContext';
import { useTutorialStore } from '@/store/tutorialStore';
import React, { useState } from 'react';
import { Dimensions, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PRIVACY_URL = 'https://ustat.netlify.app/privacy/';

const TUTORIAL_STEPS = [
  {
    icon: 'gesture-tap' as const,
    title: 'Score with a Tap',
    description:
      'Score by tapping on either side of the screen. Use the undo button in the top bar to correct any mistakes.',
  },
  {
    icon: 'timer-outline' as const,
    title: 'Track Timeouts',
    description:
      'Tap the circles at the top of each team to mark timeouts as used. Diamonds are floaters.',
  },
  {
    icon: 'cog-outline' as const,
    title: 'Customizable',
    description: (
      <Text>
        Configure stats and settings before you begin.{' '}
        <Text style={{ fontWeight: 'bold' }}>Certain options lock during play!</Text>
      </Text>
    ),
  },
];

export default function TutorialOverlay() {
  const { hasSeenOnboarding, showOnboarding, closeOnboarding } = useTutorialStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const { palette } = useTheme();

  // Show on first launch OR when manually triggered
  const visible = !hasSeenOnboarding || showOnboarding;

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
    closeOnboarding();
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

  if (!visible) {
    return null;
  }

  const step = TUTORIAL_STEPS[currentStep];

  // Choose animations based on slide direction
  const enteringAnimation = slideDirection === 'right' ? SlideInRight : SlideInLeft;
  const exitingAnimation = slideDirection === 'right' ? SlideOutLeft : SlideOutRight;

  return (
    <Modal transparent visible={visible} animationType="fade">
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
                      {isLastStep ? 'Get Started' : 'Next'}
                    </Text>
                  </Pressable>
                </View>

                {/* Privacy link footer - only on first step */}
                {isFirstStep && (
                  <Pressable
                    onPress={() => Linking.openURL(PRIVACY_URL)}
                    style={styles.privacyFooter}>
                    <Text style={[styles.privacyFooterText, { color: palette.accent }]}>
                      Privacy Policy
                    </Text>
                  </Pressable>
                )}
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
    borderRadius: 24,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    maxWidth: Math.min(SCREEN_WIDTH - 48, 600),
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
    minHeight: 150,
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
  privacyFooter: {
    alignItems: 'center',
    paddingTop: 12,
  },
  privacyFooterText: {
    fontSize: 12,
    textDecorationLine: 'underline',
  },
});
