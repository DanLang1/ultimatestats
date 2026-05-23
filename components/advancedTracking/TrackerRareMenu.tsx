import { ThemedText } from '@/components/ThemedText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  getActiveSideId,
  getSafeDiscHolderRef,
} from '@/lib/advancedTracking/trackingDisplayHelpers';
import {
  getCurrentPoint,
  getCurrentPossession,
  hasPointEnded,
} from '@/lib/advancedTracking/trackingUtils';
import { PassModifier } from '@/lib/advancedTracking/types';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { Fonts } from '@/theme/theme';
import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

interface TrackerRareMenuProps {
  visible: boolean;
  onClose: () => void;
  pointElapsedMs: number;
  setPassModifier: (m: PassModifier) => void;
}

export const TrackerRareMenu = ({
  visible,
  onClose,
  pointElapsedMs,
  setPassModifier,
}: TrackerRareMenuProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const { currentGame: game, recordThrow } = useAdvancedTrackingStore();
  if (!game) return null;

  const point = getCurrentPoint(game);
  const possession = getCurrentPossession(game);
  const pointIsOver = hasPointEnded(point);
  const activeSideId = getActiveSideId(possession, game);
  const oppHasDisc = !pointIsOver && activeSideId !== game.focusSideId;
  const discHolderRef = getSafeDiscHolderRef(possession, game.focusSideId);

  const handleOppBlock = () => {
    if (!discHolderRef || pointIsOver) return;
    recordThrow({
      thrower: discHolderRef,
      result: 'block',
    });
  };

  const handleStall = () => {
    if (!discHolderRef || pointIsOver) return;
    recordThrow({
      thrower: discHolderRef,
      result: 'stall',
    });
    setPassModifier(null);
  };

  const handleThrownCallahan = () => {
    if (!discHolderRef || pointIsOver) return;
    recordThrow({
      thrower: discHolderRef,
      result: 'callahan',
      defender: { refType: 'untracked' },
      timerElapsedMs: pointElapsedMs,
    });
    setPassModifier(null);
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
        <View accessible={false} style={styles.content}>
          <View
            accessible={false}
            style={[styles.handle, { backgroundColor: palette.overlay20 }]}
          />

          {!pointIsOver && oppHasDisc && (
            <>
              <Pressable
                testID="rare-menu-callahan"
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
                testID="rare-menu-stall"
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
            </>
          )}

          {!pointIsOver && !oppHasDisc && (
            <>
              <Pressable
                testID="rare-menu-opp-d"
                disabled={!discHolderRef}
                style={({ pressed }) => [
                  styles.btn,
                  {
                    borderColor: palette.overlay15,
                    backgroundColor: palette.overlay05,
                    opacity: discHolderRef ? 1 : 0.4,
                  },
                  pressed && discHolderRef && { opacity: 0.7 },
                ]}
                onPress={closeAnd(handleOppBlock)}>
                <ThemedText style={[styles.btnText, { color: palette.textInverse }]}>
                  OPP D
                </ThemedText>
              </Pressable>
              <Pressable
                testID="rare-menu-50-50"
                disabled={!discHolderRef}
                style={({ pressed }) => [
                  styles.btn,
                  {
                    borderColor: palette.overlay15,
                    backgroundColor: palette.overlay05,
                    opacity: discHolderRef ? 1 : 0.4,
                  },
                  pressed && discHolderRef && { opacity: 0.7 },
                ]}
                onPress={closeAnd(() => setPassModifier('fifty-fifty'))}>
                <ThemedText style={[styles.btnText, { color: palette.textInverse }]}>
                  50/50
                </ThemedText>
              </Pressable>
              <Pressable
                testID="rare-menu-thrown-callahan"
                disabled={!discHolderRef}
                style={({ pressed }) => [
                  styles.btn,
                  {
                    borderColor: palette.overlay15,
                    backgroundColor: palette.overlay05,
                    opacity: discHolderRef ? 1 : 0.4,
                  },
                  pressed && discHolderRef && { opacity: 0.7 },
                ]}
                onPress={closeAnd(handleThrownCallahan)}>
                <ThemedText style={[styles.btnText, { color: palette.textInverse }]}>
                  OPP CALLAHAN
                </ThemedText>
              </Pressable>
              <Pressable
                testID="rare-menu-stall-offense"
                disabled={!discHolderRef}
                style={({ pressed }) => [
                  styles.btn,
                  {
                    borderColor: palette.overlay15,
                    backgroundColor: palette.overlay05,
                    opacity: discHolderRef ? 1 : 0.4,
                  },
                  pressed && discHolderRef && { opacity: 0.7 },
                ]}
                onPress={closeAnd(handleStall)}>
                <ThemedText style={[styles.btnText, { color: palette.textInverse }]}>
                  STALL
                </ThemedText>
              </Pressable>
            </>
          )}
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
  });
}
