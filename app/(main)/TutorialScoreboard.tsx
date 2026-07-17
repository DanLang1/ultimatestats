import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedView } from '@/components/ThemedView';
import EventToast from '@/components/toast/EventToast';
import TutorialAnimatedArrow from '@/components/tutorial/TutorialAnimatedArrow';
import TutorialSettingsBar from '@/components/tutorial/TutorialSettingsBar';
import TutorialTeamScoreSection from '@/components/tutorial/TutorialTeamScoreSection';
import TutorialTooltip from '@/components/tutorial/TutorialTooltip';
import useTutorialGameState from '@/components/tutorial/useTutorialGameState';
import { getSizeClassValue, scaleBySizeClass, useLayout } from '@/hooks/useLayout';
import { getContrastingTextColor } from '@/lib/colorUtils';
import { useTutorialStore } from '@/store/tutorialStore';
import { TutorialColors } from '@/theme/theme';

const TEAM1_NAME = 'USA';
const TEAM2_NAME = 'Canada';
const ARROW_SIZE = 24;

export default function TutorialScoreboardRoute() {
  const layout = useLayout();
  const styles = createStyles(layout.isLandscape, layout.sizeClass);
  const homeIconSize = scaleBySizeClass(30, layout.sizeClass);
  const homeHitSlop = getSizeClassValue({ small: 16, medium: 18, large: 20 }, layout.sizeClass);
  const portraitAspectRatio = layout.width > 0 ? layout.height / layout.width : 0;
  const isCompactVertical = !layout.isLandscape && portraitAspectRatio < 1.75;
  const centerBarClearance = layout.isLandscape
    ? 0
    : scaleBySizeClass(isCompactVertical ? 14 : 20, layout.sizeClass);

  const {
    team1Score,
    team2Score,
    team1Timeouts,
    team2Timeouts,
    timeLeft,
    isTimerRunning,
    hasTimerStarted,
    toast,
    toastInstanceId,
    currentStep,
    step,
    canUndo,
    handleScore,
    handleTimeout,
    handleUndo,
    handlePlay,
  } = useTutorialGameState(() => {
    router.replace('/TutorialComplete');
  });

  const handleClose = () => {
    useTutorialStore.getState().completeTutorial();
    router.dismissTo('/Dashboard');
  };

  const team1TextColor = getContrastingTextColor(TutorialColors.team1Bg);
  const team2TextColor = getContrastingTextColor(TutorialColors.team2Bg);

  const isScoreStep = step?.expectedAction === 'score-any';
  const isPlayStep = step?.expectedAction === 'play';
  const showTimeouts = step?.expectedAction === 'timeout';
  const highlightTimeout = step?.expectedAction === 'timeout';
  const showPlay = hasTimerStarted || isPlayStep;
  const showTimer = hasTimerStarted || isPlayStep;

  const getTooltipPosition = (): 'top' | 'bottom' | 'center' => {
    if (!step) return 'center';
    switch (step.tooltipTarget) {
      case 'team1':
        return 'bottom';
      case 'team2':
        return 'top';
      case 'timeouts':
        return 'bottom';
      case 'undo':
        return 'bottom';
      case 'play':
        return 'bottom';
      case 'center':
        return 'center';
      default:
        return 'center';
    }
  };

  return (
    <ThemedView style={styles.container}>
      <TutorialTeamScoreSection
        teamName={TEAM1_NAME}
        score={team1Score}
        onIncrement={() => handleScore(true)}
        textColor={team1TextColor}
        backgroundColor={TutorialColors.team1Bg}
        isCompactVertical={isCompactVertical}
        contentInsetBottom={centerBarClearance}
        timeouts={showTimeouts ? team1Timeouts : []}
        onTimeoutUse={(index) => handleTimeout('team1', index)}
      />

      <View style={styles.timerBarContainer}>
        <TutorialSettingsBar
          message={isScoreStep ? step?.title : undefined}
          showPlay={showPlay}
          isPlaying={isTimerRunning}
          onPlay={handlePlay}
          highlightPlay={isPlayStep}
          timeLeft={showTimer ? timeLeft : undefined}
          onUndo={isScoreStep ? undefined : handleUndo}
          canUndo={canUndo}
          highlightUndo={step?.tooltipTarget === 'undo'}
        />
      </View>

      <Pressable onPress={handleClose} hitSlop={homeHitSlop} style={styles.floatingHomeButton}>
        <MaterialCommunityIcons name="home" size={homeIconSize} color={team1TextColor} />
      </Pressable>

      <TutorialTeamScoreSection
        teamName={TEAM2_NAME}
        score={team2Score}
        onIncrement={() => handleScore(false)}
        textColor={team2TextColor}
        backgroundColor={TutorialColors.team2Bg}
        isCompactVertical={isCompactVertical}
        contentInsetTop={centerBarClearance}
        timeouts={showTimeouts ? team2Timeouts : []}
        onTimeoutUse={(index) => handleTimeout('team2', index)}
        highlightTimeoutIndex={highlightTimeout ? 0 : undefined}
        timeoutLeadingIndicator={
          highlightTimeout ? (
            <TutorialAnimatedArrow direction="right" color={team2TextColor} size={ARROW_SIZE} />
          ) : undefined
        }
      />

      {step && !isScoreStep && (
        <TutorialTooltip
          title={step.title}
          message={step.message}
          stepIndex={currentStep}
          position={getTooltipPosition()}
        />
      )}

      <EventToast toast={toast} toastInstanceId={toastInstanceId} />
    </ThemedView>
  );
}

function createStyles(isLandscape: boolean, sizeClass: 'small' | 'medium' | 'large') {
  const timerBarTranslateY = getSizeClassValue({ small: -28, medium: -32, large: -36 }, sizeClass);

  return StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: isLandscape ? 'row' : 'column',
    },
    timerBarContainer: {
      position: 'absolute',
      top: isLandscape ? 0 : '50%',
      left: 0,
      right: 0,
      ...(isLandscape ? {} : { transform: [{ translateY: timerBarTranslateY }] }),
      alignItems: 'center',
      zIndex: 100,
    },
    floatingHomeButton: {
      position: 'absolute',
      top: 12,
      left: 12,
      padding: 12,
      zIndex: 200,
    },
  });
}
