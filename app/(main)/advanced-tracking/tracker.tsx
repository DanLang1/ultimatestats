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
import {
  getScoreBarCardInsets,
  TrackerScoreBar,
} from '@/components/advancedTracking/TrackerScoreBar';
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
import { getActiveLineIds } from '@/lib/advancedTracking/lineup';
import { getActiveBetweenPointTimeout } from '@/lib/advancedTracking/livePlayState';
import { getPointTimer } from '@/lib/advancedTracking/pointClock';
import { isAdvancedGameOver } from '@/lib/advancedTracking/trackingUtils';
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
  const activeIds = session?.point ? getActiveLineIds(session.point, session.displaySideId) : [];
  const activeParticipants = participants.filter((p) => activeIds.includes(p.id));
  const activeVoiceParticipants = buildVoiceParticipantContexts(activeParticipants);

  const handlers = useTrackerHandlers({
    oppHasDisc: session?.oppHasDisc ?? false,
    discHolderRef: session?.discHolderRef ?? null,
    canDropOpeningPull: session?.commands.amendOpeningPull ?? false,
    passModifier,
    setPassModifier,
    recordCaptureIntent,
    amendOpeningPullAsDropped,
  });

  const voiceControls = useVoiceStatCommands({
    enabled: session?.commands.recordVoicePass ?? false,
    activeParticipants: activeVoiceParticipants,
    pointIsOver: session?.pointIsOver ?? false,
    oppHasDisc: session?.oppHasDisc ?? false,
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
    activeStoppage,
    activeGameClockPause,
    isPlayLive,
    commands,
  } = session;
  const pointTimer = getPointTimer(game);
  const activeBetweenPointTimeout = getActiveBetweenPointTimeout(game);
  const showPostPointLastActionCard = pointIsOver && activeBetweenPointTimeout == null;
  const showLastActionCard = isPlayLive || showPostPointLastActionCard;

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
    canDropOpeningPull: commands.amendOpeningPull,
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
        canDropOpeningPull={commands.amendOpeningPull}
        passModifier={passModifier}
        handlers={handlers}
        onLineChangePress={() => setShowLineChangeMenu(true)}
        onPrepareNextLine={handlePrepareNextLine}
        onStartNextPoint={handleStartNextPoint}
        canChangeLine={commands.changeLine}
        availableHeight={trackingSurfaceHeight}
        onPointNote={() => setShowPointNote(true)}
      />
    );
  };

  // Past the phone-landscape guard above, landscape means a tablet. Its short screen puts the
  // scorecard and last-action card side by side so the player grid keeps more height.
  const hasLandscapeHeaderRow = isLandscape && showLastActionCard;
  const scoreBar = (
    <TrackerScoreBar
      isHalfWidth={hasLandscapeHeaderRow}
      pointTimerBase={pointTimer?.base ?? null}
      pointTimerPausedAt={pointTimer?.frozenAt ?? null}
      hideRedZoneControl={passModifier != null}
    />
  );
  const lastActionCard = showLastActionCard && (
    <TrackerLastActionCard
      session={session}
      passModifier={passModifier}
      onCancelModifier={() => setPassModifier(null)}
      onMorePress={() => setShowRareMenu(true)}
      fillHeight={hasLandscapeHeaderRow}
    />
  );

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />

      <TrackerCapBar
        onMenuPress={() => setShowHomeMenu(true)}
        onHelpPress={() => setShowHelp(true)}
        game={game}
      />
      {hasLandscapeHeaderRow ? (
        <View testID="tracker-landscape-header" style={styles.landscapeHeader}>
          <View style={styles.landscapeHeaderCell}>{scoreBar}</View>
          <View style={styles.landscapeLastActionCell}>{lastActionCard}</View>
        </View>
      ) : (
        <>
          {scoreBar}
          {lastActionCard}
        </>
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
          canUseVoice={commands.recordVoicePass}
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

      <TrackerHelpSheet
        visible={showHelp}
        onClose={() => setShowHelp(false)}
        onAdvancedTutorial={handleAdvancedTutorial}
      />

      <TrackerHomeMenu
        visible={showHomeMenu}
        onClose={() => setShowHomeMenu(false)}
        canPauseGameClock={commands.pauseGameClock}
        canStartSecondHalfEarly={commands.startSecondHalfEarly}
        hasGameNote={Boolean(game.metadata?.notes)}
        onGameClockPause={handleGamePause}
        onGameNote={() => setShowGameNote(true)}
        onStartSecondHalfEarly={triggerHalftimeEarly}
        onEndGameEarly={handleEndGameEarly}
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

      {commands.changeLine && (
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

function createStyles(palette: Palette, sizeClass: SizeClass) {
  const scoreBarCardInsets = getScoreBarCardInsets(sizeClass);
  return StyleSheet.create({
    container: { flex: 1 },
    landscapeHeader: {
      flexDirection: 'row',
    },
    landscapeHeaderCell: { flex: 1 },
    // Matches the score bar's card edges, so both cards in the header row are the same height.
    landscapeLastActionCell: {
      flex: 1,
      paddingTop: scoreBarCardInsets.top,
      paddingBottom: scoreBarCardInsets.bottom,
    },
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
