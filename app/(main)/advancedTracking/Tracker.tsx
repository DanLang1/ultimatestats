import { Redirect, router, Stack, useFocusEffect } from 'expo-router';
import React, { useState } from 'react';
import { BackHandler, LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdvancedGameNoteModal } from '@/components/advancedTracking/AdvancedGameNoteModal';
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
import { areBothSidesFullyTracked } from '@/lib/advancedTracking/trackingModeUtils';
import {
  canStartSecondHalfEarly,
  getCurrentPoint,
  getCurrentPossession,
  hasPointEnded,
  isAdvancedGameOver,
  getOtherSideId,
} from '@/lib/advancedTracking/trackingUtils';
import { PassModifier } from '@/lib/advancedTracking/types';
import { buildVoiceParticipantContexts } from '@/lib/advancedTracking/voiceContext';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { Fonts, Palette } from '@/theme/theme';

const TRACKING_SURFACE_TOP_PADDING = 4;

export default function AdvancedTrackerScreen() {
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(palette, sizeClass);
  const insets = useSafeAreaInsets();

  const game = useAdvancedTrackingStore((state) => state.currentGame);
  const undoStack = useAdvancedTrackingStore((state) => state.undoStack);
  const isHalftimeBreakActive = useAdvancedTrackingStore((state) => state.isHalftimeBreakActive);
  const recordCaptureIntent = useAdvancedTrackingStore((state) => state.recordCaptureIntent);
  const amendOpeningPullAsDropped = useAdvancedTrackingStore(
    (state) => state.amendOpeningPullAsDropped,
  );
  const startGameClockPause = useAdvancedTrackingStore((state) => state.startGameClockPause);
  const triggerHalftimeEarly = useAdvancedTrackingStore((state) => state.triggerHalftimeEarly);
  const updateGameMetadata = useAdvancedTrackingStore((state) => state.updateGameMetadata);
  const participants = useLiveRosterParticipants(game?.participants ?? []);
  const [showDevModal, setShowDevModal] = useState(false);
  const [showHomeMenu, setShowHomeMenu] = useState(false);
  const [showGameNote, setShowGameNote] = useState(false);
  const [showLineChangeMenu, setShowLineChangeMenu] = useState(false);
  const [showRareMenu, setShowRareMenu] = useState(false);
  const [passModifier, setPassModifier] = useState<PassModifier>(null);
  const [trackingSurfaceHeight, setTrackingSurfaceHeight] = useState<number | null>(null);

  const point = game ? getCurrentPoint(game) : null;
  const possession = game ? getCurrentPossession(game) : null;
  const activeStoppage = getActiveStoppage(possession);
  const activeGameClockPause = game ? getActiveGameClockPause(game) : null;
  const pointTimerAdjustedTimestamp = point ? getPointAdjustedTimestamp(point, game) : null;
  const pointTimerPausedAt = activeGameClockPause?.pausedAt ?? activeStoppage?.pausedAt ?? null;

  const gameStartedAt = game?.points[0]?.startedAt ?? null;

  const pointIsOver = hasPointEnded(point);
  const lastUndoEntry = undoStack.at(-1);
  const showStartSecondHalfEarly = canStartSecondHalfEarly(game ?? undefined, lastUndoEntry);
  const showInPointControls = !activeStoppage && !activeGameClockPause && !pointIsOver;
  const activeSideId = game ? getActiveSideId(possession, game) : '';
  const tracksBothSides = game != null && areBothSidesFullyTracked(game);
  const oppHasDisc = game
    ? !tracksBothSides && !pointIsOver && activeSideId !== game.focusSideId
    : false;
  const canChangeLine = !pointIsOver && passModifier == null;
  const trackedPossessionSideId = tracksBothSides
    ? (possession?.sideId ?? game?.focusSideId ?? '')
    : (game?.focusSideId ?? '');
  const discHolderRef = getSafeDiscHolderRef(possession, trackedPossessionSideId, point);
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
  const displaySideId = (() => {
    if (!game) return '';
    if (!tracksBothSides) return game.focusSideId;
    if (
      passModifier === 'block' ||
      passModifier === 'callahan' ||
      passModifier === 'stall' ||
      passModifier === 'pressure'
    ) {
      return getOtherSideId(game, activeSideId);
    }
    return activeSideId;
  })();
  const activeIds = game && point ? getEffectiveLineParticipantIds(point, displaySideId) : [];
  const activeParticipants = participants.filter((p) => activeIds.includes(p.id));
  const activeVoiceParticipants = buildVoiceParticipantContexts(activeParticipants);

  const handlers = useTrackerHandlers({
    pointIsOver,
    oppHasDisc,
    discHolderRef,
    passModifier,
    setPassModifier,
    recordCaptureIntent,
    amendOpeningPullAsDropped,
  });

  const voiceControls = useVoiceStatCommands({
    enabled: canUseVoice,
    activeParticipants: activeVoiceParticipants,
    pointIsOver,
    oppHasDisc,
    possession,
    discHolderRef,
    recordCaptureIntent,
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
  const handlePrepareNextLine = () => {
    setPassModifier(null);
    router.push({
      pathname: '/advancedTracking/TrackerLineSelect',
      params: { mode: 'prepare' },
    });
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
  const handleSaveGameNote = (note: string) => {
    updateGameMetadata({ ...game.metadata, notes: note });
  };

  const handleEndGameEarly = () => {
    router.push({
      pathname: '/advancedTracking/TrackerGameComplete',
      params: { mode: 'earlyEnd' },
    });
  };
  const handleTrackingSurfaceLayout = (event: LayoutChangeEvent) => {
    const topPadding = scaleBySizeClass(TRACKING_SURFACE_TOP_PADDING, sizeClass);
    const nextHeight = Math.max(0, Math.floor(event.nativeEvent.layout.height - topPadding));
    setTrackingSurfaceHeight((currentHeight) => {
      if (currentHeight === nextHeight) return currentHeight;
      return nextHeight;
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
        onPrepareNextLine={handlePrepareNextLine}
        onStartNextPoint={handleStartNextPoint}
        canChangeLine={canChangeLine}
        availableHeight={trackingSurfaceHeight}
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
      <View style={styles.trackingSurface} onLayout={handleTrackingSurfaceLayout}>
        {renderTrackingSurface()}
      </View>
      {showInPointControls && (
        <TrackerActionFooter
          onStartNextPoint={handleStartNextPoint}
          voiceControls={canUseVoice ? voiceControls : undefined}
        />
      )}

      {showInPointControls && (
        <TrackerRareMenu
          visible={showRareMenu}
          onClose={() => setShowRareMenu(false)}
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
        hasGameNote={Boolean(game.metadata?.notes)}
        onGameClockPause={handleGamePause}
        onGameNote={() => setShowGameNote(true)}
        onStartSecondHalfEarly={triggerHalftimeEarly}
        onEndGameEarly={handleEndGameEarly}
        onAdvancedTutorial={handleAdvancedTutorial}
      />

      {showGameNote && (
        <AdvancedGameNoteModal
          initialNote={game.metadata?.notes}
          onClose={() => setShowGameNote(false)}
          onSave={handleSaveGameNote}
        />
      )}

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
      paddingTop: scaleBySizeClass(TRACKING_SURFACE_TOP_PADDING, sizeClass),
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
