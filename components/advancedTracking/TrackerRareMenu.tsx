import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  canCallTimeout,
  getActiveSideId,
  getDiscHolderId,
  getSideTimeoutState,
  isInjuryJustResumed,
} from '@/lib/advancedTracking/trackingDisplayHelpers';
import { PassModifier } from '@/lib/advancedTracking/types';
import {
  getCurrentPoint,
  getCurrentPossession,
  hasPointEnded,
} from '@/lib/advancedTracking/trackingUtils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { Fonts } from '@/theme/theme';
import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

interface TrackerRareMenuProps {
  visible: boolean;
  onClose: () => void;
  setPassModifier: (m: PassModifier) => void;
}

export const TrackerRareMenu = ({ visible, onClose, setPassModifier }: TrackerRareMenuProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const { currentGameId, savedGames, recordThrow, recordBetweenPointTimeout, recordStoppage } =
    useAdvancedTrackingStore();

  const game = savedGames.find((g) => g.id === currentGameId);
  if (!game) return null;

  const oppSide = game.sides.find((s) => s.id !== game.focusSideId);
  if (!oppSide) return null;

  const point = getCurrentPoint(game);
  const possession = getCurrentPossession(game);
  const pointIsOver = hasPointEnded(point);
  const activeSideId = getActiveSideId(possession, game);
  const oppHasDisc = !pointIsOver && activeSideId !== game.focusSideId;
  const injuryJustResumed = isInjuryJustResumed(possession);
  const discHolderId = injuryJustResumed ? null : getDiscHolderId(possession, game.focusSideId);

  const focusTimeouts = getSideTimeoutState(game, game.focusSideId);
  const oppTimeouts = getSideTimeoutState(game, oppSide.id);
  const focusCanTimeout = canCallTimeout(focusTimeouts);
  const oppCanTimeout = canCallTimeout(oppTimeouts);

  const focusSideName = game.sides.find((s) => s.id === game.focusSideId)?.label ?? '';
  const oppSideName = oppSide.label;

  const handleTimeout = (sideId: string) => {
    const state = sideId === game.focusSideId ? focusTimeouts : oppTimeouts;
    if (!canCallTimeout(state)) return;
    const useFloater = state.regularUsedInHalf >= state.regularPerHalf;
    if (pointIsOver) {
      recordBetweenPointTimeout({ sideId, isFloater: useFloater });
    } else {
      recordStoppage({ reason: 'timeout', sideId, isFloater: useFloater });
    }
  };

  const handleOppBlock = () => {
    if (!discHolderId || pointIsOver) return;
    recordThrow({
      thrower: { refType: 'participant', participantId: discHolderId },
      result: 'block',
    });
  };

  const handleStall = () => {
    if (!discHolderId || pointIsOver) return;
    recordThrow({
      thrower: { refType: 'participant', participantId: discHolderId },
      result: 'stall',
    });
    setPassModifier(null);
  };

  const handleInjury = () => {
    if (pointIsOver) return;
    recordStoppage({ reason: 'injury', sideId: game.focusSideId });
  };

  const closeAnd = (fn: () => void) => () => {
    onClose();
    fn();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={[styles.backdrop, { backgroundColor: palette.overlayDark88 }]}
        onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            { backgroundColor: palette.primary, borderColor: palette.overlay15 },
          ]}
          onPress={() => {}}>
          <View style={styles.timeoutRow}>
            <Pressable
              disabled={!focusCanTimeout}
              style={({ pressed }) => [
                styles.timeoutBtn,
                {
                  borderColor: focusCanTimeout ? palette.accent : palette.overlay15,
                  backgroundColor: focusCanTimeout ? palette.accent + '12' : palette.overlay05,
                  opacity: focusCanTimeout ? 1 : 0.4,
                },
                pressed && focusCanTimeout && { opacity: 0.7 },
              ]}
              onPress={closeAnd(() => handleTimeout(game.focusSideId))}>
              <ThemedText
                style={[
                  styles.btnText,
                  { color: focusCanTimeout ? palette.accent : palette.textMuted },
                ]}
                numberOfLines={1}>
                {focusSideName} T/O
              </ThemedText>
            </Pressable>
            <Pressable
              disabled={!oppCanTimeout}
              style={({ pressed }) => [
                styles.timeoutBtn,
                {
                  borderColor: oppCanTimeout ? palette.accent : palette.overlay15,
                  backgroundColor: oppCanTimeout ? palette.accent + '12' : palette.overlay05,
                  opacity: oppCanTimeout ? 1 : 0.4,
                },
                pressed && oppCanTimeout && { opacity: 0.7 },
              ]}
              onPress={closeAnd(() => handleTimeout(oppSide.id))}>
              <ThemedText
                style={[
                  styles.btnText,
                  { color: oppCanTimeout ? palette.accent : palette.textMuted },
                ]}
                numberOfLines={1}>
                {oppSideName} T/O
              </ThemedText>
            </Pressable>
          </View>

          {!pointIsOver && oppHasDisc && (
            <>
              <Pressable
                style={({ pressed }) => [
                  styles.btn,
                  { borderColor: palette.success, backgroundColor: palette.success + '12' },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={closeAnd(() => setPassModifier('callahan'))}>
                <ThemedText style={[styles.btnText, { color: palette.success }]}>
                  CALLAHAN
                </ThemedText>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.btn,
                  { borderColor: palette.success, backgroundColor: palette.success + '12' },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={closeAnd(() => setPassModifier('stall'))}>
                <ThemedText style={[styles.btnText, { color: palette.success }]}>STALL</ThemedText>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.btn,
                  { borderColor: palette.warning, backgroundColor: palette.warning + '12' },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={closeAnd(handleInjury)}>
                <ThemedText style={[styles.btnText, { color: palette.warning }]}>INJURY</ThemedText>
                <ThemedText style={[styles.btnDesc, { color: palette.textMuted }]}>
                  Pause the point to record a sub
                </ThemedText>
              </Pressable>
            </>
          )}

          {!pointIsOver && !oppHasDisc && (
            <>
              <Pressable
                disabled={!discHolderId}
                style={({ pressed }) => [
                  styles.btn,
                  {
                    borderColor: discHolderId ? palette.textMuted : palette.overlay15,
                    backgroundColor: discHolderId ? palette.textMuted + '12' : palette.overlay05,
                    opacity: discHolderId ? 1 : 0.4,
                  },
                  pressed && discHolderId && { opacity: 0.7 },
                ]}
                onPress={closeAnd(handleOppBlock)}>
                <ThemedText
                  style={[
                    styles.btnText,
                    { color: discHolderId ? palette.textInverse : palette.textMuted },
                  ]}>
                  OPP D
                </ThemedText>
                <ThemedText style={[styles.btnDesc, { color: palette.textMuted }]}>
                  Tap the intended receiver — opponent got a block
                </ThemedText>
              </Pressable>
              <Pressable
                disabled={!discHolderId}
                style={({ pressed }) => [
                  styles.btn,
                  {
                    borderColor: discHolderId ? palette.warning : palette.overlay15,
                    backgroundColor: discHolderId ? palette.warning + '12' : palette.overlay05,
                    opacity: discHolderId ? 1 : 0.4,
                  },
                  pressed && discHolderId && { opacity: 0.7 },
                ]}
                onPress={closeAnd(() => setPassModifier('fifty-fifty'))}>
                <ThemedText
                  style={[
                    styles.btnText,
                    { color: discHolderId ? palette.warning : palette.textMuted },
                  ]}>
                  50/50
                </ThemedText>
                <ThemedText style={[styles.btnDesc, { color: palette.textMuted }]}>
                  Tap the other player — blame shared equally
                </ThemedText>
              </Pressable>
              <Pressable
                disabled={!discHolderId}
                style={({ pressed }) => [
                  styles.btn,
                  {
                    borderColor: discHolderId ? palette.overlay20 : palette.overlay15,
                    backgroundColor: palette.overlay05,
                    opacity: discHolderId ? 1 : 0.4,
                  },
                  pressed && discHolderId && { opacity: 0.7 },
                ]}
                onPress={closeAnd(handleStall)}>
                <ThemedText
                  style={[
                    styles.btnText,
                    { color: discHolderId ? palette.textInverse : palette.textMuted },
                  ]}>
                  STALL
                </ThemedText>
                <ThemedText style={[styles.btnDesc, { color: palette.textMuted }]}>
                  Stall count reached 10
                </ThemedText>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.btn,
                  { borderColor: palette.warning, backgroundColor: palette.warning + '12' },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={closeAnd(handleInjury)}>
                <ThemedText style={[styles.btnText, { color: palette.warning }]}>INJURY</ThemedText>
                <ThemedText style={[styles.btnDesc, { color: palette.textMuted }]}>
                  Pause the point to record a sub
                </ThemedText>
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    sheet: {
      width: '100%',
      maxWidth: 360,
      borderRadius: 24,
      borderCurve: 'continuous',
      borderWidth: 1,
      padding: 20,
      gap: 12,
    },
    timeoutRow: {
      flexDirection: 'row',
      gap: 12,
    },
    timeoutBtn: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 16,
      borderCurve: 'continuous',
      paddingVertical: 14,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btn: {
      borderWidth: 1,
      borderRadius: 16,
      borderCurve: 'continuous',
      paddingVertical: 14,
      paddingHorizontal: 16,
      gap: 4,
    },
    btnText: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(14, sizeClass),
      letterSpacing: 1,
    },
    btnDesc: {
      fontFamily: Fonts.regular,
      fontSize: scaleBySizeClass(12, sizeClass),
    },
  });
}
