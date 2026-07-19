import { Redirect, router, Stack, useFocusEffect } from 'expo-router';
import React, { useState } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DevDebugModal } from '@/components/advancedTracking/DevDebugModal';
import { LandscapeUnsupported } from '@/components/advancedTracking/LandscapeUnsupported';
import { TrackerActionFooter } from '@/components/advancedTracking/TrackerActionFooter';
import { TrackerCapBar } from '@/components/advancedTracking/TrackerCapBar';
import { TrackerHomeMenu } from '@/components/advancedTracking/TrackerHomeMenu';
import { TrackerLastActionCard } from '@/components/advancedTracking/TrackerLastActionCard';
import { TrackerLineChangeMenu } from '@/components/advancedTracking/TrackerLineChangeMenu';
import { TrackerRareMenu } from '@/components/advancedTracking/TrackerRareMenu';
import { TrackerScoreBar } from '@/components/advancedTracking/TrackerScoreBar';
import {
  getTrackerSurfaceState,
  TrackerSurface,
} from '@/components/advancedTracking/TrackerSurface';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/context/ThemeContext';
import { useLiveRosterParticipants } from '@/hooks/advancedTracking/useLiveRosterParticipants';
import { useTrackerHandlers } from '@/hooks/advancedTracking/useTrackerHandlers';
import { useVoiceStatCommands } from '@/hooks/advancedTracking/useVoiceStatCommands';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  getActiveGameClockPause,
  getActiveSideId,
  getActiveStoppage,
  getEffectiveLineParticipantIds,
  getPointAdjustedTimestamp,
  getSafeDiscHolderRef,
  isPullAwaitingPickup,
} from '@/lib/advancedTracking/trackingDisplayHelpers';
import {
  canStartSecondHalfEarly,
  getCurrentPoint,
  getCurrentPossession,
  hasPointEnded,
  isAdvancedGameOver,
} from '@/lib/advancedTracking/trackingUtils';
import { PassModifier } from '@/lib/advancedTracking/types';
import { buildVoiceParticipantContexts } from '@/lib/advancedTracking/voiceContext';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { Fonts, Palette } from '@/theme/theme';

export default function AdvancedTrackerScreen() {
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(palette, sizeClass);
  const insets = useSafeAreaInsets();

  const game = useAdvancedTrackingStore((state) => state.currentGame);
  const undoStack = useAdvancedTrackingStore((state) => state.undoStack);
  const isHalftimeBreakActive = useAdvancedTrackingStore((state) => state.isHalftimeBreakActive);
  const recordThrow = useAdvancedTrackingStore((state) => state.recordThrow);
  const recordPickup = useAdvancedTrackingStore((state) => state.recordPickup);
  const amendLastThrowAsGoal = useAdvancedTrackingStore((state) => state.amendLastThrowAsGoal);
  const amendOpeningPullAsDropped = useAdvancedTrackingStore(
    (state) => state.amendOpeningPullAsDropped,
  );
  const startGameClockPause = useAdvancedTrackingStore((state) => state.startGameClockPause);
  const triggerHalftimeEarly = useAdvancedTrackingStore((state) => state.triggerHalftimeEarly);
  const participants = useLiveRosterParticipants(game?.participants ?? []);
  const [showDevModal, setShowDevModal] = useState(false);
  const [showHomeMenu, setShowHomeMenu] = useState(false);
  const [showLineChangeMenu, setShowLineChangeMenu] = useState(false);
  const [showRareMenu, setShowRareMenu] = useState(false);
  const [passModifier, setPassModifier] = useState<PassModifier>(null);

  const point = game ? getCurrentPoint(game) : null;
  const possession = game ? getCurrentPossession(game) : null;
  const activeStoppage = getActiveStoppage(possession);
  const activeGameClockPause = game ? getActiveGameClockPause(game) : null;
  const pointTimerAdjustedTimestamp = point ? getPointAdjustedTimestamp(point, game) : null;
  const pointTimerPausedAt = activeGameClockPause?.pausedAt ?? activeStoppage?.pausedAt ?? null;
  const getPointElapsedMs = () => {
    if (pointTimerAdjustedTimestamp == null) return 0;
    // Event-time callback, not render output; use the exact current time for stat timestamps.
    // eslint-disable-next-line react/react-compiler
    return Math.max(0, (pointTimerPausedAt ?? Date.now()) - pointTimerAdjustedTimestamp);
  };

  const gameStartedAt = game?.points[0]?.startedAt ?? null;

  const pointIsOver = hasPointEnded(point);
  const lastUndoEntry = undoStack.at(-1);
  const showStartSecondHalfEarly = canStartSecondHalfEarly(game ?? undefined, lastUndoEntry);
  const showInPointControls = !activeStoppage && !activeGameClockPause && !pointIsOver;
  const activeSideId = game ? getActiveSideId(possession, game) : '';
  const oppHasDisc = game ? !pointIsOver && activeSideId !== game.focusSideId : false;
  const canChangeLine = !pointIsOver;
  const discHolderRef = getSafeDiscHolderRef(possession, game?.focusSideId ?? '', point);
  const isAwaitingPullPickup = isPullAwaitingPickup({
    possession,
    pointIsOver,
    oppHasDisc,
    discHolderId: discHolderRef?.refType === 'participant' ? discHolderRef.participantId : null,
  });
  const canUseVoice =
    !pointIsOver &&
    !activeStoppage &&
    activeGameClockPause === null &&
    !oppHasDisc &&
    discHolderRef != null;
  const activeIds = game && point ? getEffectiveLineParticipantIds(point, game.focusSideId) : [];
  const activeParticipants = participants.filter((p) => activeIds.includes(p.id));
  const activeVoiceParticipants = buildVoiceParticipantContexts(activeParticipants);

  const handlers = useTrackerHandlers({
    pointIsOver,
    oppHasDisc,
    possession,
    discHolderRef,
    getPointElapsedMs,
    passModifier,
    setPassModifier,
    recordThrow,
    recordPickup,
    amendLastThrowAsGoal,
    amendOpeningPullAsDropped,
  });

  const voiceControls = useVoiceStatCommands({
    enabled: canUseVoice,
    activeParticipants: activeVoiceParticipants,
    pointIsOver,
    oppHasDisc,
    possession,
    discHolderRef,
    recordThrow,
  });

  useFocusEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      router.dismissTo('/Dashboard');
      return true;
    });

    return () => subscription.remove();
  });

  if (!game) {
    return <Redirect href="/Dashboard" />;
  }

  if (isAdvancedGameOver(game)) {
    return <Redirect href="/advancedTracking/TrackerGameComplete" />;
  }

  if (sizeClass === 'small' && isLandscape) {
    return <LandscapeUnsupported />;
  }

  if (!game.sides.find((s) => s.id !== game.focusSideId)) {
    throw new Error(`Game ${game.id} is missing the opponent side.`);
  }

  const handleStartNextPoint = () => {
    setPassModifier(null);
    router.push('/advancedTracking/TrackerLineSelect');
  };
  const handleEditLine = () => {
    setPassModifier(null);
    router.push('/advancedTracking/TrackerEditLine');
  };
  const handleInjurySub = () => {
    setPassModifier(null);
    router.push('/advancedTracking/TrackerInjurySub');
  };
  const handleGamePause = () => {
    startGameClockPause('manual');
  };

  const handleEndGameEarly = () => {
    router.push({
      pathname: '/advancedTracking/TrackerGameComplete',
      params: { mode: 'earlyEnd' },
    });
  };
  const handleAdvancedTutorial = () => {
    router.push({
      pathname: '/TutorialAdvancedTracker',
      params: { origin: 'tracker' },
    });
  };

  const surfaceState = getTrackerSurfaceState({
    game,
    activeGameClockPause,
    activeStoppage,
    pointIsOver,
  });

  const renderTrackingSurface = () => {
    return (
      <TrackerSurface
        state={surfaceState}
        participants={participants}
        activeParticipants={activeParticipants}
        isHalftimeBreakActive={isHalftimeBreakActive}
        discHolderRef={discHolderRef}
        oppHasDisc={oppHasDisc}
        canDropOpeningPull={isAwaitingPullPickup}
        passModifier={passModifier}
        handlers={handlers}
        onLineChangePress={() => setShowLineChangeMenu(true)}
        onStartNextPoint={handleStartNextPoint}
        canChangeLine={canChangeLine}
      />
    );
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />

      <TrackerCapBar onMenuPress={() => setShowHomeMenu(true)} game={game} />
      <TrackerScoreBar
        pointTimerAdjustedTimestamp={pointTimerAdjustedTimestamp}
        pointTimerPausedAt={pointTimerPausedAt}
      />
      {showInPointControls && (
        <TrackerLastActionCard
          passModifier={passModifier}
          onCancelModifier={() => setPassModifier(null)}
          onMorePress={() => setShowRareMenu(true)}
        />
      )}
      <View style={styles.trackingSurface}>{renderTrackingSurface()}</View>
      {showInPointControls && (
        <TrackerActionFooter
          getPointElapsedMs={getPointElapsedMs}
          onStartNextPoint={handleStartNextPoint}
          voiceControls={canUseVoice ? voiceControls : undefined}
        />
      )}

      {showInPointControls && (
        <TrackerRareMenu
          visible={showRareMenu}
          onClose={() => setShowRareMenu(false)}
          getPointElapsedMs={getPointElapsedMs}
          setPassModifier={setPassModifier}
        />
      )}

      <TrackerHomeMenu
        visible={showHomeMenu}
        onClose={() => setShowHomeMenu(false)}
        canPauseGameClock={
          gameStartedAt !== null && activeStoppage === null && activeGameClockPause === null
        }
        canStartSecondHalfEarly={showStartSecondHalfEarly}
        onGameClockPause={handleGamePause}
        onStartSecondHalfEarly={triggerHalftimeEarly}
        onEndGameEarly={handleEndGameEarly}
        onAdvancedTutorial={handleAdvancedTutorial}
      />

      {!activeStoppage && !activeGameClockPause && canChangeLine && (
        <TrackerLineChangeMenu
          visible={showLineChangeMenu}
          onClose={() => setShowLineChangeMenu(false)}
          onCorrectLine={handleEditLine}
          onInjurySub={handleInjurySub}
        />
      )}

      {__DEV__ && (
        <>
          <Pressable
            onPress={() => setShowDevModal(true)}
            style={[styles.devButton, { bottom: insets.bottom + (pointIsOver ? 120 : 30) }]}>
            <ThemedText style={styles.devButtonText}>DEV</ThemedText>
          </Pressable>
          <DevDebugModal
            visible={showDevModal}
            onClose={() => setShowDevModal(false)}
            data={game}
          />
        </>
      )}
    </ThemedView>
  );
}

// --- Styles ---

function createStyles(palette: Palette, sizeClass: SizeClass) {
  return StyleSheet.create({
    container: { flex: 1 },
    trackingSurface: {
      flex: 1,
      justifyContent: 'flex-start',
      paddingTop: 4,
    },
    devButton: {
      position: 'absolute',
      right: 20,
      padding: 10,
      borderRadius: 8,
      backgroundColor: palette.warning + '33',
      borderWidth: 1,
      borderColor: palette.warning,
      zIndex: 999,
    },
    devButtonText: {
      color: palette.warning,
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 1,
    },
  });
}
