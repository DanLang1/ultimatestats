import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TrackerBottomCard } from '@/components/advancedTracking/TrackerBottomCard';
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
import { PassModifier } from '@/lib/advancedTracking/types';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { Fonts, Palette } from '@/theme/theme';
import { Redirect, router, Stack } from 'expo-router';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
                borderRightColor: palette.overlay15,
              },
            ]}>
            <TrackerScoreBar pointElapsedMs={pointElapsedMs} />
            <View style={{ flex: 1 }} />
            <TrackerBottomCard
              pointElapsedMs={pointElapsedMs}
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

      {__DEV__ && (
        <>
          <Pressable
            onPress={() => setShowDevModal(true)}
            style={[styles.devButton, { bottom: insets.bottom + 140 }]}>
            <ThemedText style={styles.devButtonText}>DEV</ThemedText>
          </Pressable>
          <Modal
            visible={showDevModal}
            transparent
            animationType="slide"
            onRequestClose={() => setShowDevModal(false)}>
            <SafeAreaView style={{ flex: 1, backgroundColor: palette.overlayDark88 }}>
              <Pressable style={styles.devModalClose} onPress={() => setShowDevModal(false)}>
                <ThemedText style={{ color: palette.textInverse, fontFamily: Fonts.bold }}>
                  ✕ Close
                </ThemedText>
              </Pressable>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
                <ThemedText style={styles.devModalText} selectable>
                  {JSON.stringify(game, null, 2)}
                </ThemedText>
              </ScrollView>
            </SafeAreaView>
          </Modal>
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
    devModalClose: {
      padding: 16,
      alignItems: 'flex-end',
    },
    devModalText: {
      color: palette.success,
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: 'monospace',
    },
  });
}
