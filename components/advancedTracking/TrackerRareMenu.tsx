import { ThemedText } from '@/components/ThemedText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useTheme } from '@/context/ThemeContext';
import { getSizeClassValue, SizeClass, useLayout } from '@/hooks/useLayout';
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
  getPointElapsedMs: () => number;
  setPassModifier: (m: PassModifier) => void;
}

type RareAction = {
  testID: string;
  label: string;
  disabled?: boolean;
  onPress: () => void;
};

export const TrackerRareMenu = ({
  visible,
  onClose,
  getPointElapsedMs,
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
  const discHolderRef = getSafeDiscHolderRef(possession, game.focusSideId, point);

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
      timerElapsedMs: getPointElapsedMs(),
    });
    setPassModifier(null);
  };

  const closeAnd = (fn: () => void) => () => {
    onClose();
    fn();
  };

  function getActions(): RareAction[] {
    if (!pointIsOver && oppHasDisc) {
      return [
        {
          testID: 'rare-menu-callahan',
          label: 'Callahan',
          onPress: closeAnd(() => setPassModifier('callahan')),
        },
        {
          testID: 'rare-menu-stall',
          label: 'Stall',
          onPress: closeAnd(() => setPassModifier('stall')),
        },
      ];
    }

    if (!pointIsOver) {
      return [
        {
          testID: 'rare-menu-opp-d',
          label: 'Opp D',
          disabled: !discHolderRef,
          onPress: closeAnd(handleOppBlock),
        },
        {
          testID: 'rare-menu-50-50',
          label: '50/50',
          disabled: !discHolderRef,
          onPress: closeAnd(() => setPassModifier('fifty-fifty')),
        },
        {
          testID: 'rare-menu-thrown-callahan',
          label: 'Opp Callahan',
          disabled: !discHolderRef,
          onPress: closeAnd(handleThrownCallahan),
        },
        {
          testID: 'rare-menu-stall-offense',
          label: 'Stall',
          disabled: !discHolderRef,
          onPress: closeAnd(handleStall),
        },
      ];
    }

    return [];
  }

  const actions = getActions();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BottomSheet
        onDismiss={onClose}
        overlayColor={palette.overlayDark88}
        sheetStyle={[
          styles.sheet,
          {
            backgroundColor: palette.primary,
            borderColor: palette.overlay20,
            shadowColor: palette.shadow,
          },
        ]}
        minBottomPadding={10}>
        <View accessible={false} style={styles.content}>
          <View
            accessible={false}
            style={[styles.handle, { backgroundColor: palette.overlay20 }]}
          />

          <View style={styles.list}>
            {actions.map((action, index) => (
              <Pressable
                key={action.testID}
                testID={action.testID}
                disabled={action.disabled}
                style={({ pressed }) => [
                  styles.row,
                  index < actions.length - 1 && {
                    borderBottomColor: palette.overlay20,
                    borderBottomWidth: 2,
                  },
                  action.disabled && { opacity: 0.4 },
                  pressed && !action.disabled && { backgroundColor: palette.overlay08 },
                ]}
                onPress={action.onPress}>
                <ThemedText style={[styles.rowText, { color: palette.textInverse }]}>
                  {action.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
      </BottomSheet>
    </Modal>
  );
};

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    sheet: {
      marginHorizontal: 0,
      marginBottom: 0,
      borderTopLeftRadius: getSizeClassValue({ small: 18, medium: 22, large: 26 }, sizeClass),
      borderTopRightRadius: getSizeClassValue({ small: 18, medium: 22, large: 26 }, sizeClass),
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      borderCurve: 'continuous',
      borderTopWidth: 1,
      shadowOffset: { width: 0, height: -8 },
      shadowOpacity: 0.2,
      shadowRadius: 18,
      elevation: 8,
      overflow: 'hidden',
    },
    content: {
      alignSelf: 'center',
      width: '100%',
      maxWidth: '100%',
      paddingTop: getSizeClassValue({ small: 14, medium: 18, large: 22 }, sizeClass),
      paddingHorizontal: 0,
      paddingBottom: getSizeClassValue({ small: 8, medium: 10, large: 12 }, sizeClass),
      gap: getSizeClassValue({ small: 12, medium: 16, large: 20 }, sizeClass),
    },
    handle: {
      width: getSizeClassValue({ small: 30, medium: 38, large: 46 }, sizeClass),
      height: getSizeClassValue({ small: 4, medium: 5, large: 6 }, sizeClass),
      borderRadius: 999,
      alignSelf: 'center',
      marginBottom: getSizeClassValue({ small: 2, medium: 4, large: 6 }, sizeClass),
    },
    list: {
      width: '100%',
    },
    row: {
      minHeight: getSizeClassValue({ small: 48, medium: 58, large: 68 }, sizeClass),
      justifyContent: 'center',
      paddingHorizontal: getSizeClassValue({ small: 28, medium: 44, large: 56 }, sizeClass),
    },
    rowText: {
      fontFamily: Fonts.black,
      fontSize: getSizeClassValue({ small: 14, medium: 17, large: 21 }, sizeClass),
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
  });
}
