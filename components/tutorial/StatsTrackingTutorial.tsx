import { useTheme } from '@/context/ThemeContext';
import { useLayout } from '@/hooks/useLayout';
import { useTutorialStore } from '@/store/tutorialStore';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeIn, SlideInLeft, SlideInRight } from 'react-native-reanimated';
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
    title: 'Import Roster',
    description: 'Have a USA Ultimate team link? You can import the roster from Settings',
  },
  {
    icon: 'chart-bar' as const,
    title: 'View Your Stats',
    description:
      'Tap the stats icon in the top bar to see team and player statistics. Export to CSV or share games with a link.',
  },
];

export default function StatsTrackingTutorial() {
  const { width, height, isLandscape } = useLayout();
  const styles = createStyles({ width, height, isLandscape });
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

  const enteringAnimation = slideDirection === 'right' ? SlideInRight : SlideInLeft;

  return (
    <Modal transparent visible={showStatsTutorial} animationType="fade" statusBarTranslucent>
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
                    {isLastStep ? 'Got It' : 'Next'}
                  </Text>
                </Pressable>
              </View>
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function createStyles(layout: { width: number; height: number; isLandscape: boolean }) {
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
      paddingVertical: 16,
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
      fontSize: 14,
      fontWeight: '500',
    },
    contentContainer: {
      minHeight: layout.isLandscape ? 140 : 180,
      justifyContent: 'center',
      paddingTop: 24,
      overflow: 'hidden',
    },
    scrollContainer: {
      maxHeight: layout.isLandscape ? layout.height * 0.62 : layout.height * 0.58,
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
}
