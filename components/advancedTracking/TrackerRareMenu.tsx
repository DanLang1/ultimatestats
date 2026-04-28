import { ThemedText } from '@/components/ThemedText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  getActiveSideId,
  getDiscHolderId,
  isInjuryJustResumed,
} from '@/lib/advancedTracking/trackingDisplayHelpers';
import {
  getCurrentPoint,
  getCurrentPossession,
  hasPointEnded,
} from '@/lib/advancedTracking/trackingUtils';
import { PassModifier } from '@/lib/advancedTracking/types';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { Fonts } from '@/theme/theme';
import { router } from 'expo-router';
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

  const { currentGameId, savedGames, recordThrow, recordStoppage } = useAdvancedTrackingStore();

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

  const handleGoHome = () => {
    onClose();
    router.dismissTo('/Dashboard');
  };

  const closeAnd = (fn: () => void) => () => {
    onClose();
    fn();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BottomSheet
        onDismiss={onClose}
        overlayColor={palette.overlayDark88}
        sheetStyle={{ backgroundColor: palette.primary }}
        minBottomPadding={12}>
        <View style={styles.content}>
          <View style={[styles.handle, { backgroundColor: palette.overlay20 }]} />

          {!pointIsOver && oppHasDisc && (
            <>
              <Pressable
                style={({ pressed }) => [
                  styles.btn,
                  { borderColor: palette.overlay15, backgroundColor: palette.overlay05 },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={closeAnd(() => setPassModifier('callahan'))}>
                <ThemedText style={[styles.btnText, { color: palette.textInverse }]}>
                  CALLAHAN
                </ThemedText>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.btn,
                  { borderColor: palette.overlay15, backgroundColor: palette.overlay05 },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={closeAnd(() => setPassModifier('stall'))}>
                <ThemedText style={[styles.btnText, { color: palette.textInverse }]}>
                  STALL
                </ThemedText>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.btn,
                  { borderColor: palette.overlay15, backgroundColor: palette.overlay05 },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={closeAnd(handleInjury)}>
                <ThemedText style={[styles.btnText, { color: palette.textInverse }]}>
                  INJURY
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
                    borderColor: palette.overlay15,
                    backgroundColor: palette.overlay05,
                    opacity: discHolderId ? 1 : 0.4,
                  },
                  pressed && discHolderId && { opacity: 0.7 },
                ]}
                onPress={closeAnd(handleOppBlock)}>
                <ThemedText style={[styles.btnText, { color: palette.textInverse }]}>
                  OPP D
                </ThemedText>
              </Pressable>
              <Pressable
                disabled={!discHolderId}
                style={({ pressed }) => [
                  styles.btn,
                  {
                    borderColor: palette.overlay15,
                    backgroundColor: palette.overlay05,
                    opacity: discHolderId ? 1 : 0.4,
                  },
                  pressed && discHolderId && { opacity: 0.7 },
                ]}
                onPress={closeAnd(() => setPassModifier('fifty-fifty'))}>
                <ThemedText style={[styles.btnText, { color: palette.textInverse }]}>
                  50/50
                </ThemedText>
              </Pressable>
              <Pressable
                disabled={!discHolderId}
                style={({ pressed }) => [
                  styles.btn,
                  {
                    borderColor: palette.overlay15,
                    backgroundColor: palette.overlay05,
                    opacity: discHolderId ? 1 : 0.4,
                  },
                  pressed && discHolderId && { opacity: 0.7 },
                ]}
                onPress={closeAnd(handleStall)}>
                <ThemedText style={[styles.btnText, { color: palette.textInverse }]}>
                  STALL
                </ThemedText>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.btn,
                  { borderColor: palette.overlay15, backgroundColor: palette.overlay05 },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={closeAnd(handleInjury)}>
                <ThemedText style={[styles.btnText, { color: palette.textInverse }]}>
                  INJURY
                </ThemedText>
              </Pressable>
            </>
          )}

          <View style={[styles.divider, { backgroundColor: palette.overlay15 }]} />

          <Pressable
            style={({ pressed }) => [
              styles.btn,
              { borderColor: palette.overlay15, backgroundColor: palette.overlay05 },
              pressed && { opacity: 0.7 },
            ]}
            onPress={handleGoHome}>
            <ThemedText style={[styles.btnText, { color: palette.textInverse }]}>
              GO HOME
            </ThemedText>
          </Pressable>
        </View>
      </BottomSheet>
    </Modal>
  );
};

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    content: {
      paddingVertical: 20,
      paddingHorizontal: 16,
      gap: 12,
    },
    handle: {
      width: 36,
      height: 5,
      borderRadius: 3,
      alignSelf: 'center',
      marginBottom: 4,
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
    divider: {
      height: 1,
    },
  });
}
