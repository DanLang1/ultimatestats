import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedView } from '@/components/ThemedView';
import TutorialActionBar from '@/components/tutorial/TutorialActionBar';
import TutorialLineEditor from '@/components/tutorial/TutorialLineEditor';
import TutorialSettingsBar from '@/components/tutorial/TutorialSettingsBar';
import {
  TUTORIAL_STAT_CURRENT_POINT,
  TUTORIAL_STAT_EXPECTED_RATIO,
  TUTORIAL_STAT_GAME_TIMER,
  TUTORIAL_STAT_NUM_PLAYERS,
  TUTORIAL_STAT_PRESETS,
  TUTORIAL_STAT_ROSTER,
  TUTORIAL_STAT_TEAM1_BG,
  TUTORIAL_STAT_TEAM1_NAME,
  TUTORIAL_STAT_TEAM2_BG,
  TUTORIAL_STAT_TEAM2_NAME,
} from '@/components/tutorial/tutorialStatData';
import TutorialStatEntry from '@/components/tutorial/TutorialStatEntry';
import TutorialStatTeamScoreSection from '@/components/tutorial/TutorialStatTeamScoreSection';
import TutorialTooltip from '@/components/tutorial/TutorialTooltip';
import TutorialTurnoverEntry from '@/components/tutorial/TutorialTurnoverEntry';
import useTutorialStatGameState from '@/components/tutorial/useTutorialStatGameState';
import { useCountdown } from '@/hooks/useCountdown';
import { getSizeClassValue, scaleBySizeClass, useLayout } from '@/hooks/useLayout';
import { getContrastingTextColor } from '@/lib/colorUtils';
import { formatRatio, getSequenceNumber } from '@/lib/genderRatioUtils';
import { useTutorialStore } from '@/store/tutorialStore';

export default function TutorialStatScoreboardRoute() {
  const layout = useLayout();
  const styles = createStyles(layout.isLandscape, layout.sizeClass);
  const homeIconSize = scaleBySizeClass(30, layout.sizeClass);
  const homeHitSlop = getSizeClassValue({ small: 16, medium: 18, large: 20 }, layout.sizeClass);
  const portraitAspectRatio = layout.width > 0 ? layout.height / layout.width : 0;
  const isCompactVertical = !layout.isLandscape && portraitAspectRatio < 1.75;
  const centerBarClearance = layout.isLandscape
    ? 0
    : scaleBySizeClass(isCompactVertical ? 14 : 20, layout.sizeClass);

  const gameState = useTutorialStatGameState(() => {
    router.replace('/TutorialStatComplete');
  });

  const {
    step,
    phase,
    currentStep,
    team1Score,
    team2Score,
    possession,
    currentLine,
    selectedPresetId,
    ratioCheck,
    pointTimerRunning,
    hasPointStarted,
    goalScorerId,
    handleSelectPreset,
    handleTogglePlayer,
    handleConfirmLine,
    handleStartPoint,
    handleBlock,
    handleSelectBlocker,
    handleScoreGoal,
    handleSelectScorer,
    handleSelectAssist,
  } = gameState;

  const handleClose = () => {
    useTutorialStore.getState().closeStatsTutorial();
    router.dismissTo('/Dashboard');
  };

  const team1TextColor = getContrastingTextColor(TUTORIAL_STAT_TEAM1_BG);
  const team2TextColor = getContrastingTextColor(TUTORIAL_STAT_TEAM2_BG);

  // Game timer (countdown from 90 min, running when point timer is running)
  const gameTimeLeft = useCountdown(TUTORIAL_STAT_GAME_TIMER, pointTimerRunning);

  // Ratio labels: current point for settings bar, next point for line editor
  const currentRatioLabel = formatRatio(
    TUTORIAL_STAT_EXPECTED_RATIO,
    getSequenceNumber(TUTORIAL_STAT_CURRENT_POINT),
  );
  const nextPointRatioLabel = formatRatio(
    TUTORIAL_STAT_EXPECTED_RATIO,
    getSequenceNumber(TUTORIAL_STAT_CURRENT_POINT + 1),
  );

  // Show START POINT on action bar before timer starts
  const showStartPoint = phase === 'scoreboard' && !pointTimerRunning && !hasPointStarted;

  // Highlight button on action bar based on step
  let actionBarHighlight: 'start' | 'block' | null = null;
  if (step?.expectedAction === 'start-point') {
    actionBarHighlight = 'start';
  } else if (step?.expectedAction === 'record-block') {
    actionBarHighlight = 'block';
  }

  // Get goal scorer name for stat entry badge
  const goalScorerName = goalScorerId
    ? TUTORIAL_STAT_ROSTER.find((p) => p.id === goalScorerId)?.name
    : undefined;

  // Determine stat entry step
  const statEntryStep = step?.expectedAction === 'select-scorer' ? 'goal' : 'assist';

  return (
    <ThemedView style={styles.container}>
      {/* Line Editor Overlay */}
      {phase === 'line-editor' && (
        <>
          <TutorialLineEditor
            roster={TUTORIAL_STAT_ROSTER}
            presets={TUTORIAL_STAT_PRESETS}
            currentLine={currentLine}
            numPlayers={TUTORIAL_STAT_NUM_PLAYERS}
            expectedRatioLabel={nextPointRatioLabel}
            pointNumber={TUTORIAL_STAT_CURRENT_POINT + 1}
            ratioCheck={ratioCheck}
            selectedPresetId={selectedPresetId}
            highlightPreset={step?.expectedAction === 'select-preset'}
            onSelectPreset={handleSelectPreset}
            onTogglePlayer={handleTogglePlayer}
            onConfirm={handleConfirmLine}
          />
          {step && (
            <View style={styles.lineEditorTooltipContainer}>
              <TutorialTooltip
                title={step.title}
                message={step.message}
                stepIndex={currentStep}
                position="bottom"
              />
            </View>
          )}
        </>
      )}

      {/* Team 1 (Top) */}
      <TutorialStatTeamScoreSection
        teamName={TUTORIAL_STAT_TEAM1_NAME}
        score={team1Score}
        onIncrement={handleScoreGoal}
        textColor={team1TextColor}
        backgroundColor={TUTORIAL_STAT_TEAM1_BG}
        isCompactVertical={isCompactVertical}
        contentInsetBottom={centerBarClearance}
        hasPossession={possession === 'team1'}
      />

      {/* Settings Bar — shows step instruction as message during tutorial, icons otherwise */}
      <View style={styles.timerBarContainer}>
        <TutorialSettingsBar
          message={phase === 'scoreboard' && step ? (step.message ?? step.title) : undefined}
          showPlay
          isPlaying={pointTimerRunning}
          timeLeft={gameTimeLeft}
          ratioLabel={currentRatioLabel}
          onUndo={() => {}}
          canUndo={false}
        />
      </View>

      {/* Floating Home Button */}
      <Pressable onPress={handleClose} hitSlop={homeHitSlop} style={styles.floatingHomeButton}>
        <MaterialCommunityIcons name="home" size={homeIconSize} color={team1TextColor} />
      </Pressable>

      {/* Team 2 (Bottom) */}
      <TutorialStatTeamScoreSection
        teamName={TUTORIAL_STAT_TEAM2_NAME}
        score={team2Score}
        onIncrement={() => {}}
        textColor={team2TextColor}
        backgroundColor={TUTORIAL_STAT_TEAM2_BG}
        isCompactVertical={isCompactVertical}
        contentInsetTop={centerBarClearance}
        hasPossession={possession === 'team2'}
      />

      {/* Action Bar */}
      {phase === 'scoreboard' && (
        <TutorialActionBar
          showStartPoint={showStartPoint}
          possession={possession}
          onStartPoint={handleStartPoint}
          onBlock={handleBlock}
          highlightButton={actionBarHighlight}
        />
      )}

      {/* Turnover Entry Overlay (who made the block?) */}
      {phase === 'turnover-entry' && (
        <TutorialTurnoverEntry
          teamName={TUTORIAL_STAT_TEAM1_NAME}
          roster={TUTORIAL_STAT_ROSTER}
          currentLine={currentLine}
          onSelectPlayer={handleSelectBlocker}
        />
      )}

      {/* Stat Entry Overlay */}
      {phase === 'stat-entry' && (
        <TutorialStatEntry
          roster={TUTORIAL_STAT_ROSTER}
          currentLine={currentLine}
          step={statEntryStep}
          goalScorerId={goalScorerId}
          goalScorerName={goalScorerName}
          onSelectPlayer={
            step?.expectedAction === 'select-scorer' ? handleSelectScorer : handleSelectAssist
          }
        />
      )}
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

    lineEditorTooltipContainer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: 'box-none',
      zIndex: 500,
    },
  });
}
