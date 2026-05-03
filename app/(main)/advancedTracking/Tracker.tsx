import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { DevDebugModal } from '@/components/advancedTracking/DevDebugModal';
import { TrackerBottomCard } from '@/components/advancedTracking/TrackerBottomCard';
import { TrackerCapBar } from '@/components/advancedTracking/TrackerCapBar';
import { TrackerHomeMenu } from '@/components/advancedTracking/TrackerHomeMenu';
import { TrackerPlayerGrid } from '@/components/advancedTracking/TrackerPlayerGrid';
import { TrackerRareMenu } from '@/components/advancedTracking/TrackerRareMenu';
import { TrackerScoreBar } from '@/components/advancedTracking/TrackerScoreBar';
import { useTheme } from '@/context/ThemeContext';
import { useTimestampTimer } from '@/hooks/advancedTracking/useTimer';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  getActiveSideId,
  getActiveStoppage,
  getDiscHolderId,
  getEffectiveLineParticipantIds,
  getPointAdjustedTimestamp,
  isInjuryJustResumed,
  isInjuryStoppageAwaitingSub,
} from '@/lib/advancedTracking/trackingDisplayHelpers';
import {
  getCurrentPoint,
  getCurrentPossession,
  hasPointEnded,
  isAdvancedGameOver,
  isPossessionOver,
} from '@/lib/advancedTracking/trackingUtils';
import { computeCapState } from '@/lib/advancedTracking/capUtils';
import { PassModifier } from '@/lib/advancedTracking/types';

import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Fonts, Palette } from '@/theme/theme';
import { Redirect, router, Stack } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FOCUS_SIDE_ID, OPP_SIDE_ID } from './PreGameConfirm';

export default function AdvancedTrackerScreen() {
  const { palette } = useTheme();
  const { isLandscape, width, sizeClass } = useLayout();
  const styles = createStyles(palette, sizeClass);
  const insets = useSafeAreaInsets();

  const {
    currentGameId,
    savedGames,
    isHalftimeBreakActive,
    recordThrow,
    recordPickup,
    amendLastThrowAsGoal,
  } = useAdvancedTrackingStore();

  const game = savedGames.find((g) => g.id === currentGameId);
  const [showDevModal, setShowDevModal] = useState(false);
  const [showHomeMenu, setShowHomeMenu] = useState(false);
  const [showRareMenu, setShowRareMenu] = useState(false);
  const [passModifier, setPassModifier] = useState<PassModifier>(null);

  const point = game ? getCurrentPoint(game) : null;
  const possession = game ? getCurrentPossession(game) : null;
  const activeStoppage = getActiveStoppage(possession);
  const isPointTimerPaused = activeStoppage !== null;
  const showPointTimer = point?.startedAt != null && !hasPointEnded(point);
  const pointTimerAdjustedTimestamp = point ? getPointAdjustedTimestamp(point) : null;
  const pointElapsedMs = useTimestampTimer({
    timestamp: pointTimerAdjustedTimestamp,
    mode: 'elapsed',
    intervalMs: 250,
    enabled: showPointTimer && !isPointTimerPaused,
  });

  const gameStartedAt = game?.points[0]?.startedAt ?? null;
  const gameElapsedMs = useTimestampTimer({
    timestamp: gameStartedAt,
    mode: 'elapsed',
    intervalMs: 1000,
    enabled: gameStartedAt !== null,
  });
  const { hardCapMins, softCapMins } = useSettingsStore();
  const { capLabel, capProgress, capTimeLeftMs, capIsWarning } = computeCapState({
    gameElapsedMs,
    gameStarted: gameStartedAt !== null,
    gameLengthMinutes: hardCapMins,
    softCapMins,
  });

  if (!game) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ThemedText style={{ color: palette.textMuted }}>
            No active game. Go back and set one up.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (isAdvancedGameOver(game)) {
    return <Redirect href="/advancedTracking/TrackerGameComplete" />;
  }

  if (isHalftimeBreakActive) {
    return <Redirect href="/advancedTracking/TrackerHalftime" />;
  }

  if (activeStoppage) {
    const injuryWithNoSub = isInjuryStoppageAwaitingSub(point, activeStoppage);
    return (
      <Redirect
        href={
          injuryWithNoSub
            ? '/advancedTracking/TrackerInjurySub'
            : '/advancedTracking/TrackerStoppage'
        }
      />
    );
  }

  if (!game.sides.find((s) => s.id !== game.focusSideId)) {
    throw new Error(`Game ${game.id} is missing the opponent side.`);
  }

  const pointIsOver = hasPointEnded(point);
  const activeSideId = getActiveSideId(possession, game);
  const oppHasDisc = !pointIsOver && activeSideId !== game.focusSideId;

  const activeIds = point ? getEffectiveLineParticipantIds(point, game.focusSideId) : [];
  const activeParticipants = game.participants.filter((p) => activeIds.includes(p.id));

  // After an injury stoppage resumes, force disc-holder to null so the coach must re-tap who has
  // the disc — handles the subbed-out disc holder case and the general check-in requirement.
  const injuryJustResumed = isInjuryJustResumed(possession);
  const discHolderId = injuryJustResumed ? null : getDiscHolderId(possession, game.focusSideId);

  const handleStartNextPoint = () => {
    setPassModifier(null);
    router.push('/advancedTracking/TrackerLineSelect');
  };

  const handlePlayerTap = (participantId: string) => {
    if (pointIsOver) return;
    if (passModifier === 'callahan') {
      handleCallahanCatch(participantId);
      return;
    }
    if (passModifier === 'stall') {
      handleDefensiveStall(participantId);
      return;
    }
    if (oppHasDisc) {
      // Tap = our player got a block. Disc hits the ground — tap again to pick up.
      if (!possession || isPossessionOver(possession)) {
        recordPickup({ sideId: OPP_SIDE_ID, player: { refType: 'untracked' } });
      }
      recordThrow({
        thrower: { refType: 'untracked' },
        result: 'block',
        defender: { refType: 'participant', participantId },
      });
      setPassModifier(null);
      return;
    }

    if (!possession || isPossessionOver(possession) || discHolderId === null) {
      recordPickup({ sideId: FOCUS_SIDE_ID, player: { refType: 'participant', participantId } });
      return;
    }

    if (passModifier === 'fifty-fifty') {
      recordThrow({
        thrower: { refType: 'participant', participantId: discHolderId },
        toPlayer: { refType: 'participant', participantId },
        result: 'drop',
        splitAttribution: true,
      });
      setPassModifier(null);
      return;
    }

    recordThrow({
      thrower: { refType: 'participant', participantId: discHolderId },
      toPlayer: { refType: 'participant', participantId },
      result: 'complete',
    });
  };

  const handleThrowaway = () => {
    if (!discHolderId) return;
    recordThrow({
      thrower: { refType: 'participant', participantId: discHolderId },
      result: 'throwaway',
    });
    setPassModifier(null);
  };

  const handleGoal = (participantId: string) => {
    if (!discHolderId || pointIsOver) return;
    recordThrow({
      thrower: { refType: 'participant', participantId: discHolderId },
      toPlayer: { refType: 'participant', participantId },
      result: 'complete',
    });
    amendLastThrowAsGoal(pointElapsedMs);
  };

  const handleDrop = (participantId: string) => {
    if (!discHolderId || pointIsOver) return;
    recordThrow({
      thrower: { refType: 'participant', participantId: discHolderId },
      toPlayer: { refType: 'participant', participantId },
      result: 'drop',
    });
    setPassModifier(null);
  };

  const handleDefensiveStall = (participantId: string) => {
    if (!possession || isPossessionOver(possession)) {
      recordPickup({ sideId: OPP_SIDE_ID, player: { refType: 'untracked' } });
    }
    recordThrow({
      thrower: { refType: 'untracked' },
      result: 'stall',
      defender: { refType: 'participant', participantId },
    });
    setPassModifier(null);
  };

  const handleCallahanCatch = (participantId: string) => {
    if (!possession || isPossessionOver(possession)) {
      recordPickup({ sideId: OPP_SIDE_ID, player: { refType: 'untracked' } });
    }
    recordThrow({
      thrower: { refType: 'untracked' },
      result: 'callahan',
      toPlayer: { refType: 'participant', participantId },
      timerElapsedMs: pointElapsedMs,
    });
    setPassModifier(null);
  };

  const LEFT_PANEL_WIDTH = 160;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {isLandscape ? (
        <View style={styles.landscapeContainer}>
          <View
            style={[
              styles.leftPanel,
              {
                width: LEFT_PANEL_WIDTH + insets.left,
                paddingLeft: insets.left,
                paddingTop: 4,
                borderRightColor: palette.overlay15,
              },
            ]}>
            <TrackerCapBar
              compact
              onMenuPress={() => setShowHomeMenu(true)}
              capLabel={capLabel}
              capProgress={capProgress}
              capIsWarning={capIsWarning}
              capTimeLeftMs={capTimeLeftMs}
              gameStarted={gameStartedAt !== null}
            />
            <TrackerScoreBar pointElapsedMs={pointElapsedMs} />
            <View style={{ flex: 1 }} />
            <TrackerBottomCard
              pointElapsedMs={pointElapsedMs}
              passModifier={passModifier}
              onCancelModifier={() => setPassModifier(null)}
              onStartNextPoint={handleStartNextPoint}
              onMorePress={() => setShowRareMenu(true)}
            />
          </View>
          <View
            style={[styles.rightPanel, { paddingRight: insets.right, justifyContent: 'center' }]}>
            <TrackerPlayerGrid
              activeParticipants={activeParticipants}
              discHolderId={discHolderId}
              oppHasDisc={oppHasDisc}
              passModifier={passModifier}
              onPlayerTap={handlePlayerTap}
              onDrop={handleDrop}
              onGoal={handleGoal}
              onThrowaway={handleThrowaway}
              availableWidth={width - LEFT_PANEL_WIDTH - insets.left - insets.right}
            />
          </View>
        </View>
      ) : (
        <>
          <TrackerCapBar
            compact={false}
            onMenuPress={() => setShowHomeMenu(true)}
            capLabel={capLabel}
            capProgress={capProgress}
            capIsWarning={capIsWarning}
            capTimeLeftMs={capTimeLeftMs}
            gameStarted={gameStartedAt !== null}
          />
          <TrackerScoreBar pointElapsedMs={pointElapsedMs} />
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <TrackerPlayerGrid
              activeParticipants={activeParticipants}
              discHolderId={discHolderId}
              oppHasDisc={oppHasDisc}
              passModifier={passModifier}
              onPlayerTap={handlePlayerTap}
              onDrop={handleDrop}
              onGoal={handleGoal}
              onThrowaway={handleThrowaway}
            />
          </View>
          <TrackerBottomCard
            pointElapsedMs={pointElapsedMs}
            passModifier={passModifier}
            onCancelModifier={() => setPassModifier(null)}
            onStartNextPoint={handleStartNextPoint}
            onMorePress={() => setShowRareMenu(true)}
          />
        </>
      )}

      <TrackerRareMenu
        visible={showRareMenu}
        onClose={() => setShowRareMenu(false)}
        setPassModifier={setPassModifier}
      />

      <TrackerHomeMenu visible={showHomeMenu} onClose={() => setShowHomeMenu(false)} />

      {__DEV__ && (
        <>
          <Pressable
            onPress={() => setShowDevModal(true)}
            style={[styles.devButton, { bottom: insets.bottom + 190 }]}>
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
    landscapeContainer: { flex: 1, flexDirection: 'row' },
    leftPanel: {
      flexDirection: 'column',
      justifyContent: 'space-between',
      borderRightWidth: 1,
    },
    rightPanel: { flex: 1 },
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
