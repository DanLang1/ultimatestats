import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TrackerActionBar } from '@/components/advancedTracking/TrackerActionBar';
import { TrackerLineScreen } from '@/components/advancedTracking/TrackerLineScreen';
import { TrackerPlayerGrid } from '@/components/advancedTracking/TrackerPlayerGrid';
import { TrackerScoreBar } from '@/components/advancedTracking/TrackerScoreBar';
import { TrackerStatusBar } from '@/components/advancedTracking/TrackerStatusBar';
import { PassModifier } from '@/components/advancedTracking/types';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  getActiveSideId,
  getActiveStoppage,
  getDiscHolderId,
  getGoalInfo,
  getLastTurnoverEvent,
  getPassChainEvents,
  getSideTimeoutsUsed,
} from '@/lib/advancedTracking/trackingDisplayHelpers';
import {
  getCurrentPoint,
  getCurrentPossession,
  getReceivingSideForNextPoint,
  getSideScore,
  hasPointEnded,
  isPossessionOver,
} from '@/lib/advancedTracking/trackingUtils';
import { hasItems } from '@/lib/utils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { Fonts, Palette } from '@/theme/theme';
import { router, Stack } from 'expo-router';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FOCUS_SIDE_ID, OPP_SIDE_ID } from './PreGameConfirm';

const MAX_TIMEOUTS = 2;
export default function AdvancedTrackerScreen() {
  const { palette } = useTheme();
  const { isLandscape, width, sizeClass } = useLayout();
  const styles = createStyles(palette, sizeClass);
  const insets = useSafeAreaInsets();

  const {
    currentGameId,
    savedGames,
    recordThrow,
    recordPickup,
    amendLastThrowAsGoal,
    recordBetweenPointTimeout,
    recordStoppage,
    resumeStoppage,
    undoLastOperation,
  } = useAdvancedTrackingStore();

  const game = savedGames.find((g) => g.id === currentGameId);
  const [showDevModal, setShowDevModal] = useState(false);
  const [showRareMenu, setShowRareMenu] = useState(false);
  const [isSelectingLine, setIsSelectingLine] = useState(false);
  const [passModifier, setPassModifier] = useState<PassModifier>(null);

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

  const oppSide = game.sides.find((s) => s.id !== game.focusSideId);
  if (!oppSide) throw new Error(`Game ${game.id} is missing the opponent side.`);

  const focusScore = getSideScore(game, game.focusSideId);
  const oppScore = getSideScore(game, oppSide.id);

  const focusSideName = game.sides.find((s) => s.id === game.focusSideId)?.label;
  if (!focusSideName) throw new Error(`Game ${game.id} focus side is missing a label.`);
  const oppSideName = oppSide.label;

  const focusTimeoutsUsed = getSideTimeoutsUsed(game, game.focusSideId);

  const point = getCurrentPoint(game);
  const pointIsOver = hasPointEnded(point);
  const possession = getCurrentPossession(game);
  const activeSideId = getActiveSideId(possession, game);
  const oppHasDisc = !pointIsOver && activeSideId !== game.focusSideId;

  const myLine = point?.lines.find((l) => l.sideId === game.focusSideId);
  const activeParticipants = game.participants.filter((p) => myLine?.participantIds.includes(p.id));

  const discHolderId = getDiscHolderId(possession, game.focusSideId);

  const lastPossessionAction = possession?.actions[possession.actions.length - 1] ?? null;
  const awaitingPullPickup =
    !pointIsOver && !oppHasDisc && discHolderId === null && lastPossessionAction?.kind === 'pull';
  const oppTimeoutsUsed = oppSide ? getSideTimeoutsUsed(game, oppSide.id) : 0;
  const activeStoppage = getActiveStoppage(possession);

  const handleTimeout = (sideId: string) => {
    if (pointIsOver) {
      recordBetweenPointTimeout({ sideId });
    } else {
      recordStoppage({ reason: 'timeout', sideId });
    }
  };

  const handleStartNextPoint = () => {
    setPassModifier(null);
    setIsSelectingLine(true);
  };

  if (isSelectingLine) {
    return (
      <TrackerLineScreen
        participants={game.participants}
        onConfirm={(ids) => {
          setIsSelectingLine(false);
          const receivingSideId = getReceivingSideForNextPoint(game);
          const isOurPull = receivingSideId !== game.focusSideId;
          const lineIds = hasItems(ids) ? [...ids] : [...(myLine?.participantIds ?? [])];

          router.push({
            pathname: '/advancedTracking/pulltracking',
            params: {
              isOurPull: String(isOurPull),
              lineParticipantIds: JSON.stringify(lineIds),
            },
          });
        }}
      />
    );
  }

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

    if (!possession || isPossessionOver(possession)) {
      recordPickup({ sideId: FOCUS_SIDE_ID, player: { refType: 'participant', participantId } });
      return;
    }
    if (discHolderId === null) {
      recordPickup({ sideId: FOCUS_SIDE_ID, player: { refType: 'participant', participantId } });
      return;
    }
    if (discHolderId === participantId) return;

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
    amendLastThrowAsGoal();
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

  const handleOppBlock = () => {
    if (!discHolderId || pointIsOver) return;
    recordThrow({
      thrower: { refType: 'participant', participantId: discHolderId },
      result: 'block',
    });
    setShowRareMenu(false);
  };

  const handleStall = () => {
    if (!discHolderId || pointIsOver) return;
    recordThrow({
      thrower: { refType: 'participant', participantId: discHolderId },
      result: 'stall',
    });
    setPassModifier(null);
    setShowRareMenu(false);
  };

  const handleFiftyFiftyArm = () => {
    setPassModifier('fifty-fifty');
    setShowRareMenu(false);
  };

  const handleOppTurnover = () => {
    if (!possession || isPossessionOver(possession)) {
      recordPickup({ sideId: OPP_SIDE_ID, player: { refType: 'untracked' } });
    }
    recordThrow({ thrower: { refType: 'untracked' }, result: 'throwaway' });
  };

  const handleOppScored = () => {
    if (!possession || isPossessionOver(possession)) {
      recordPickup({ sideId: OPP_SIDE_ID, player: { refType: 'untracked' } });
    }
    recordThrow({ thrower: { refType: 'untracked' }, result: 'goal' });
  };

  const handleCallahan = () => {
    setPassModifier('callahan');
    setShowRareMenu(false);
  };

  const handleDefensiveStallArm = () => {
    setPassModifier('stall');
    setShowRareMenu(false);
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
    });
    setPassModifier(null);
  };

  const goalInfo = getGoalInfo(point, game.focusSideId, game.participants);

  const lastFocusPossession =
    point?.possessions.filter((p) => p.sideId === game.focusSideId).at(-1) ?? null;
  const lastOppPossession =
    point?.possessions.filter((p) => p.sideId !== game.focusSideId).at(-1) ?? null;

  // True only once we have an active focus possession with at least one action (disc pickup).
  // When opp just turned it over, `possession` is their (now-over) possession — not ours.
  const focusHasStarted =
    !!possession && possession.sideId === game.focusSideId && possession.actions.length > 0;

  const turnoverEvent = oppHasDisc
    ? getLastTurnoverEvent(lastFocusPossession, true, game.participants)
    : !focusHasStarted
      ? getLastTurnoverEvent(lastOppPossession, false, game.participants)
      : null;

  const passChainEvents = getPassChainEvents(
    oppHasDisc ? lastFocusPossession : possession,
    game.participants,
  );

  const instructionText = (() => {
    if (pointIsOver || activeStoppage !== null) return null;
    if (passModifier === 'callahan') return 'TAP WHO CAUGHT THE CALLAHAN';
    if (passModifier === 'stall') return 'TAP WHO EARNED THE STALL';
    if (passModifier === 'fifty-fifty') return 'TAP THE OTHER PLAYER (SPLIT)';
    if (oppHasDisc) return 'TAP A PLAYER TO RECORD A BLOCK';
    if (discHolderId === null) {
      return awaitingPullPickup ? 'TAP WHO STARTS WITH DISC' : 'TAP A PLAYER TO PICK UP DISC';
    }
    return null;
  })();

  const instructionColor =
    passModifier === 'callahan' || passModifier === 'stall'
      ? palette.success
      : passModifier === 'fifty-fifty'
        ? palette.warning
        : palette.textMuted;

  const LEFT_PANEL_WIDTH = 160;
  const scoreBarProps = {
    focusSideName,
    focusScore,
    focusTimeoutsUsed,
    oppTimeoutsUsed,
    maxTimeouts: MAX_TIMEOUTS,
    oppSideName,
    oppScore,
    onHomePress: () => router.dismissTo('/Dashboard'),
    onFocusTimeout: () => handleTimeout(game.focusSideId),
    onOppTimeout: () => oppSide && handleTimeout(oppSide.id),
  };
  const statusBarProps = {
    pointIsOver,
    goalInfo,
    stoppageActive: activeStoppage !== null,
    stoppageStartedAt: activeStoppage?.pausedAt ?? activeStoppage?.recordedAt ?? null,
    passChainEvents,
    turnoverEvent,
  };
  const actionBarProps = {
    pointIsOver,
    oppHasDisc,
    discHolderId,
    activeStoppageId: activeStoppage?.id ?? null,
    onStartNextPoint: handleStartNextPoint,
    onOppScored: handleOppScored,
    onOppTurnover: handleOppTurnover,
    onThrowaway: handleThrowaway,
    onMorePress: () => setShowRareMenu(true),
    onResumeStoppage: () => activeStoppage && resumeStoppage(activeStoppage.id),
    onUndoLastOperation: undoLastOperation,
  };

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
            <TrackerScoreBar {...scoreBarProps} topInset={insets.top} isLandscape />
            <TrackerStatusBar {...statusBarProps} isLandscape />
            <TrackerActionBar {...actionBarProps} bottomInset={insets.bottom} isLandscape />
          </View>
          <View style={[styles.rightPanel, { paddingRight: insets.right }]}>
            {instructionText && (
              <ThemedText style={[styles.instructionText, { color: instructionColor }]}>
                {instructionText}
              </ThemedText>
            )}
            <TrackerPlayerGrid
              activeParticipants={activeParticipants}
              discHolderId={discHolderId}
              oppHasDisc={oppHasDisc}
              passModifier={passModifier}
              onPlayerTap={handlePlayerTap}
              onDrop={handleDrop}
              onGoal={handleGoal}
              availableWidth={width - LEFT_PANEL_WIDTH - insets.left - insets.right}
            />
          </View>
        </View>
      ) : (
        <>
          <TrackerScoreBar {...scoreBarProps} topInset={insets.top} />
          {instructionText && (
            <ThemedText style={[styles.instructionText, { color: instructionColor }]}>
              {instructionText}
            </ThemedText>
          )}
          <TrackerPlayerGrid
            activeParticipants={activeParticipants}
            discHolderId={discHolderId}
            oppHasDisc={oppHasDisc}
            passModifier={passModifier}
            onPlayerTap={handlePlayerTap}
            onDrop={handleDrop}
            onGoal={handleGoal}
          />
          <TrackerStatusBar {...statusBarProps} />
          <TrackerActionBar {...actionBarProps} bottomInset={insets.bottom} />
        </>
      )}

      <Modal
        visible={showRareMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRareMenu(false)}>
        <Pressable
          style={[styles.rareMenuBackdrop, { backgroundColor: palette.overlayDark88 }]}
          onPress={() => setShowRareMenu(false)}>
          <Pressable
            style={[
              styles.rareMenuSheet,
              { backgroundColor: palette.primary, borderColor: palette.overlay15 },
            ]}
            onPress={() => {}}>
            {oppHasDisc ? (
              <>
                <Pressable
                  style={({ pressed }) => [
                    styles.rareMenuBtn,
                    { borderColor: palette.success, backgroundColor: palette.success + '12' },
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={handleCallahan}>
                  <ThemedText style={[styles.rareMenuBtnText, { color: palette.success }]}>
                    CALLAHAN
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.rareMenuBtn,
                    { borderColor: palette.success, backgroundColor: palette.success + '12' },
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={handleDefensiveStallArm}>
                  <ThemedText style={[styles.rareMenuBtnText, { color: palette.success }]}>
                    STALL
                  </ThemedText>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  disabled={!discHolderId}
                  style={({ pressed }) => [
                    styles.rareMenuBtn,
                    {
                      borderColor: discHolderId ? palette.textMuted : palette.overlay15,
                      backgroundColor: discHolderId ? palette.textMuted + '12' : palette.overlay05,
                      opacity: discHolderId ? 1 : 0.4,
                    },
                    pressed && discHolderId && { opacity: 0.7 },
                  ]}
                  onPress={handleOppBlock}>
                  <ThemedText
                    style={[
                      styles.rareMenuBtnText,
                      { color: discHolderId ? palette.textInverse : palette.textMuted },
                    ]}>
                    OPP D
                  </ThemedText>
                  <ThemedText style={[styles.rareMenuBtnDesc, { color: palette.textMuted }]}>
                    Tap the intended receiver — opponent got a block
                  </ThemedText>
                </Pressable>
                <Pressable
                  disabled={!discHolderId}
                  style={({ pressed }) => [
                    styles.rareMenuBtn,
                    {
                      borderColor: discHolderId ? palette.warning : palette.overlay15,
                      backgroundColor: discHolderId ? palette.warning + '12' : palette.overlay05,
                      opacity: discHolderId ? 1 : 0.4,
                    },
                    pressed && discHolderId && { opacity: 0.7 },
                  ]}
                  onPress={handleFiftyFiftyArm}>
                  <ThemedText
                    style={[
                      styles.rareMenuBtnText,
                      { color: discHolderId ? palette.warning : palette.textMuted },
                    ]}>
                    50/50
                  </ThemedText>
                  <ThemedText style={[styles.rareMenuBtnDesc, { color: palette.textMuted }]}>
                    Tap the other player — blame shared equally
                  </ThemedText>
                </Pressable>
                <Pressable
                  disabled={!discHolderId}
                  style={({ pressed }) => [
                    styles.rareMenuBtn,
                    {
                      borderColor: discHolderId ? palette.overlay20 : palette.overlay15,
                      backgroundColor: palette.overlay05,
                      opacity: discHolderId ? 1 : 0.4,
                    },
                    pressed && discHolderId && { opacity: 0.7 },
                  ]}
                  onPress={handleStall}>
                  <ThemedText
                    style={[
                      styles.rareMenuBtnText,
                      { color: discHolderId ? palette.textInverse : palette.textMuted },
                    ]}>
                    STALL
                  </ThemedText>
                  <ThemedText style={[styles.rareMenuBtnDesc, { color: palette.textMuted }]}>
                    Stall count reached 10
                  </ThemedText>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

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
    instructionText: {
      textAlign: 'center',
      fontFamily: Fonts.bold,
      fontSize: scaleBySizeClass(12, sizeClass),
      letterSpacing: 1,
      textTransform: 'uppercase',
      paddingHorizontal: 24,
      paddingVertical: 6,
    },
    leftPanel: {
      flexDirection: 'column',
      borderRightWidth: 1,
    },
    rightPanel: { flex: 1 },
    rareMenuBackdrop: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    rareMenuSheet: {
      width: '100%',
      maxWidth: 360,
      borderRadius: 24,
      borderCurve: 'continuous',
      borderWidth: 1,
      padding: 20,
      gap: 12,
    },
    rareMenuTitle: {
      fontFamily: Fonts.bold,
      fontSize: scaleBySizeClass(11, sizeClass),
      letterSpacing: 1.5,
      marginBottom: 4,
    },
    rareMenuBtn: {
      borderWidth: 1,
      borderRadius: 16,
      borderCurve: 'continuous',
      paddingVertical: 14,
      paddingHorizontal: 16,
      gap: 4,
    },
    rareMenuBtnText: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(14, sizeClass),
      letterSpacing: 1,
    },
    rareMenuBtnDesc: {
      fontFamily: Fonts.regular,
      fontSize: scaleBySizeClass(12, sizeClass),
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
