import { Redirect, router, Stack, useFocusEffect } from 'expo-router';
import { useState } from 'react';
import { BackHandler, LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdvancedGameNoteModal } from '@/components/advancedTracking/AdvancedGameNoteModal';
import { AdvancedPointNoteModal } from '@/components/advancedTracking/AdvancedPointNoteModal';
import { OffenseActionsProps } from '@/components/advancedTracking/bottomCard/OffenseActions';
import { DevDebugModal } from '@/components/advancedTracking/DevDebugModal';
import { LandscapeUnsupported } from '@/components/advancedTracking/LandscapeUnsupported';
import { TrackerActionFooter } from '@/components/advancedTracking/TrackerActionFooter';
import { TrackerCapBar } from '@/components/advancedTracking/TrackerCapBar';
import { TrackerHelpSheet } from '@/components/advancedTracking/TrackerHelpSheet';
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
import type { TutorialAdvancedVariant } from '@/components/tutorial/tutorialNavigation';
import { useTheme } from '@/context/ThemeContext';
import { useLiveRosterParticipants } from '@/hooks/advancedTracking/useLiveRosterParticipants';
import { useTrackerHandlers } from '@/hooks/advancedTracking/useTrackerHandlers';
import { useTrackerSession } from '@/hooks/advancedTracking/useTrackerSession';
import { useVoiceStatCommands } from '@/hooks/advancedTracking/useVoiceStatCommands';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  getActiveBetweenPointTimeout,
  getEffectiveLineParticipantIds,
  getPointAdjustedTimestamp,
} from '@/lib/advancedTracking/trackingDisplayHelpers';
import { canStartSecondHalfEarly, isAdvancedGameOver } from '@/lib/advancedTracking/trackingUtils';
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

  const undoStack = useAdvancedTrackingStore((state) => state.undoStack);
  const isHalftimeBreakActive = useAdvancedTrackingStore((state) => state.isHalftimeBreakActive);
  const recordCaptureIntent = useAdvancedTrackingStore((state) => state.recordCaptureIntent);
  const amendOpeningPullAsDropped = useAdvancedTrackingStore(
    (state) => state.amendOpeningPullAsDropped,
  );
  const startGameClockPause = useAdvancedTrackingStore((state) => state.startGameClockPause);
  const triggerHalftimeEarly = useAdvancedTrackingStore((state) => state.triggerHalftimeEarly);
  const updateGameMetadata = useAdvancedTrackingStore((state) => state.updateGameMetadata);
  const updatePointNote = useAdvancedTrackingStore((state) => state.updatePointNote);
  const [showDevModal, setShowDevModal] = useState(false);
  const [showHomeMenu, setShowHomeMenu] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showGameNote, setShowGameNote] = useState(false);
  const [showPointNote, setShowPointNote] = useState(false);
  const [showLineChangeMenu, setShowLineChangeMenu] = useState(false);
  const [showRareMenu, setShowRareMenu] = useState(false);
  const [passModifier, setPassModifier] = useState<PassModifier>(null);
  const [trackingSurfaceHeight, setTrackingSurfaceHeight] = useState<number | null>(null);

  // Hooks run before the no-game redirect below, so they read the nullable session directly.
  const session = useTrackerSession(passModifier);
  const participants = useLiveRosterParticipants(session?.game.participants ?? []);
  const activeIds = session?.point
    ? getEffectiveLineParticipantIds(session.point, session.displaySideId)
    : [];
  const activeParticipants = participants.filter((p) => activeIds.includes(p.id));
  const activeVoiceParticipants = buildVoiceParticipantContexts(activeParticipants);

  const handlers = useTrackerHandlers({
    pointIsOver: session?.pointIsOver ?? false,
    oppHasDisc: session?.oppHasDisc ?? false,
    discHolderRef: session?.discHolderRef ?? null,
    canDropOpeningPull: session?.canDropOpeningPull ?? false,
    passModifier,
    setPassModifier,
    recordCaptureIntent,
    amendOpeningPullAsDropped,
  });

  const voiceControls = useVoiceStatCommands({
    enabled: session?.canUseVoice ?? false,
    activeParticipants: activeVoiceParticipants,
    pointIsOver: session?.pointIsOver ?? false,
    oppHasDisc: session?.oppHasDisc ?? false,
    possession: session?.possession ?? null,
    discHolderRef: session?.discHolderRef ?? null,
    recordCaptureIntent,
  });

  useFocusEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      router.dismissTo('/dashboard');
      return true;
    });

    return () => subscription.remove();
  });

  if (!session) {
    return <Redirect href="/dashboard" />;
  }

  const {
    game,
    point,
    pointIsOver,
    discHolderRef,
    oppHasDisc,
    canDropOpeningPull,
    activeStoppage,
    activeGameClockPause,
    isPlayLive,
  } = session;
  const pointTimerAdjustedTimestamp = point ? getPointAdjustedTimestamp(point, game) : null;
  const pointTimerPausedAt = activeGameClockPause?.pausedAt ?? activeStoppage?.pausedAt ?? null;
  const activeBetweenPointTimeout = getActiveBetweenPointTimeout(game);
  const gameStartedAt = game.points[0]?.startedAt ?? null;
  const showStartSecondHalfEarly = canStartSecondHalfEarly(game, undoStack.at(-1));
  const showPostPointLastActionCard = pointIsOver && activeBetweenPointTimeout == null;
  const showLastActionCard = isPlayLive || showPostPointLastActionCard;
  const canChangeLine = !pointIsOver && passModifier == null;

  if (isAdvancedGameOver(game)) {
    return <Redirect href="/advanced-tracking/tracker-game-complete" />;
  }

  // Undoing the first pull (or resuming before it) leaves no point to track; the game restarts
  // from opening line selection, the first point's equivalent of returning to between-points.
  if (game.points.length === 0) {
    return <Redirect href="/advanced-tracking/tracker-line-select" />;
  }

  if (sizeClass === 'small' && isLandscape) {
    return <LandscapeUnsupported />;
  }

  const opponentSide = game.sides.find((side) => side.id !== game.focusSideId);
  if (!opponentSide) {
    throw new Error(`Game ${game.id} is missing the opponent side.`);
  }

  const handleStartNextPoint = () => {
    setPassModifier(null);
    router.push('/advanced-tracking/tracker-line-select');
  };
  const handlePrepareNextLine = () => {
    setPassModifier(null);
    router.push({
      pathname: '/advanced-tracking/tracker-line-select',
      params: { mode: 'prepare' },
    });
  };
  const handleEditLine = () => {
    setPassModifier(null);
    router.push('/advanced-tracking/tracker-edit-line');
  };
  const handleInjurySub = () => {
    setPassModifier(null);
    router.push('/advanced-tracking/tracker-injury-sub');
  };
  const handleGamePause = () => {
    startGameClockPause('manual');
  };
  const handleSaveGameNote = async (note: string) => {
    await updateGameMetadata({ ...game.metadata, notes: note });
  };
  const handleEndGameEarly = () => {
    router.push({
      pathname: '/advanced-tracking/tracker-game-complete',
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
  const handleAdvancedTutorial = (variant: TutorialAdvancedVariant) => {
    router.push({
      pathname: '/tutorial-advanced-tracker',
      params: { origin: 'tracker', variant },
    });
  };

  const offenseActions: OffenseActionsProps = {
    hasHolder: discHolderRef != null,
    canDropOpeningPull,
    onThrowaway: handlers.onThrowaway,
    onArmTapAction: setPassModifier,
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
        canDropOpeningPull={canDropOpeningPull}
        passModifier={passModifier}
        handlers={handlers}
        onLineChangePress={() => setShowLineChangeMenu(true)}
        onPrepareNextLine={handlePrepareNextLine}
        onStartNextPoint={handleStartNextPoint}
        canChangeLine={canChangeLine}
        availableHeight={trackingSurfaceHeight}
        onPointNote={() => setShowPointNote(true)}
      />
    );
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />

      <TrackerCapBar
        onMenuPress={() => setShowHomeMenu(true)}
        onHelpPress={() => setShowHelp(true)}
        game={game}
      />
      <TrackerScoreBar
        pointTimerAdjustedTimestamp={pointTimerAdjustedTimestamp}
        pointTimerPausedAt={pointTimerPausedAt}
        hideRedZoneControl={passModifier != null}
      />
      {showLastActionCard && (
        <TrackerLastActionCard
          session={session}
          passModifier={passModifier}
          onCancelModifier={() => setPassModifier(null)}
          onMorePress={() => setShowRareMenu(true)}
        />
      )}
      <View
        collapsable={false}
        collapsableChildren={false}
        style={styles.trackingSurface}
        onLayout={handleTrackingSurfaceLayout}>
        {renderTrackingSurface()}
      </View>
      {session.footerMode && (
        <TrackerActionFooter
          mode={session.footerMode}
          voiceControls={voiceControls}
          canUseVoice={session.canUseVoice}
          offenseActions={offenseActions}
          onOppScored={() => recordCaptureIntent({ kind: 'anonymous-opponent-goal' })}
          onOppTurnover={() => recordCaptureIntent({ kind: 'anonymous-opponent-turnover' })}
        />
      )}

      {isPlayLive && (
        <TrackerRareMenu
          session={session}
          visible={showRareMenu}
          onClose={() => setShowRareMenu(false)}
          setPassModifier={setPassModifier}
        />
      )}

      <TrackerHelpSheet visible={showHelp} onClose={() => setShowHelp(false)} />

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
      {showPointNote && point != null && (
        <AdvancedPointNoteModal
          initialNote={point.note}
          onClose={() => setShowPointNote(false)}
          onSave={(note) => updatePointNote({ pointId: point.id, note })}
        />
      )}

      {isPlayLive && canChangeLine && (
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
            testID="tracker-debug-button"
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
