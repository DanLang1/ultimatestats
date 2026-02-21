import { useTheme } from '@/context/ThemeContext';
import { LayoutInfo, scaleBySizeClass, useLayout } from '@/hooks/useLayout';
import { useTutorialStore } from '@/store/tutorialStore';
import React, { useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeIn, SlideInLeft, SlideInRight } from 'react-native-reanimated';
import TutorialStep from './TutorialStep';

const PRIVACY_URL = 'https://u-stat.app/privacy/';

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
  const { width, height, isLandscape, sizeClass } = useLayout();
  const styles = createStyles({ width, height, isLandscape, sizeClass });
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

  const enteringAnimation = slideDirection === 'right' ? SlideInRight : SlideInLeft;

  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent>
      <GestureHandlerRootView style={styles.root}>
        <View style={[styles.overlay, { backgroundColor: palette.overlayDark60 }]}>
          <GestureDetector gesture={panGesture}>
            <Animated.View
              entering={FadeIn.duration(220)}
              style={[
                styles.container,
                { maxWidth: Math.min(width - 32, 640) },
                { backgroundColor: palette.modalBg, borderColor: palette.overlay20 },
              ]}>
              <Pressable onPress={handleClose} style={styles.skipButton}>
                <Text style={[styles.skipText, { color: palette.modalTextMuted }]}>Skip</Text>
              </Pressable>

              <ScrollView
                style={styles.scrollContainer}
                contentContainerStyle={styles.scrollContent}
                bounces={false}
                showsVerticalScrollIndicator={false}>
                <View style={styles.contentContainer}>
                  <Animated.View
                    key={`${slideDirection}-${currentStep}`}
                    entering={enteringAnimation.duration(260)}
                    style={styles.stepWrapper}>
                    <TutorialStep
                      icon={step.icon}
                      title={step.title}
                      description={step.description}
                      sizeClass={sizeClass}
                    />
                  </Animated.View>
                </View>

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
                    {isLastStep ? 'Get Started' : 'Next'}
                  </Text>
                </Pressable>
              </View>

              {isFirstStep && (
                <Pressable
                  onPress={() => Linking.openURL(PRIVACY_URL)}
                  style={styles.privacyFooter}>
                  <Text style={[styles.privacyFooterText, { color: palette.accent }]}>Privacy</Text>
                </Pressable>
              )}
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function createStyles(layout: LayoutInfo) {
  return StyleSheet.create({
    root: {
      flex: 1,
    },
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: layout.width < 400 ? 12 : 16,
      paddingVertical: layout.isLandscape ? 12 : 20,
    },
    container: {
      width: '100%',
      borderRadius: 24,
      paddingTop: 16,
      paddingBottom: 16,
      paddingHorizontal: layout.width < 400 ? 12 : 16,
      maxHeight: layout.isLandscape ? layout.height * 0.9 : layout.height * 0.84,
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
      fontSize: scaleBySizeClass(14, layout.sizeClass),
      fontWeight: '500',
    },
    scrollContainer: {
      maxHeight: layout.isLandscape ? layout.height * 0.55 : layout.height * 0.56,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    contentContainer: {
      minHeight: layout.isLandscape ? 130 : 160,
      justifyContent: 'center',
      paddingTop: 24,
      overflow: 'hidden',
    },
    stepWrapper: {
      width: '100%',
    },
    dotsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
      marginBottom: layout.isLandscape ? 16 : 24,
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
      fontSize: scaleBySizeClass(16, layout.sizeClass),
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
      fontSize: scaleBySizeClass(16, layout.sizeClass),
      fontWeight: '600',
    },
    privacyFooter: {
      alignItems: 'center',
      paddingTop: 12,
    },
    privacyFooterText: {
      fontSize: scaleBySizeClass(12, layout.sizeClass),
      textDecorationLine: 'underline',
    },
  });
}
