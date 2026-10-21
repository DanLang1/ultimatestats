import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useDerivedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, useLayout } from '@/hooks/useLayout';
import {
  getTrackerChipContentGrowth,
  isTrackerChipContentCompact,
} from '@/lib/advancedTracking/trackerLayoutUtils';
import { Fonts } from '@/theme/theme';

import { PASS_MODIFIER_TONES, PassModifier } from './types';

const CHIP_BORDER_RADIUS = 12;
const CHIP_BODY_PADDING = 12;
const COMPACT_CHIP_BODY_PADDING = 4;

interface TrackerChipBaseProps {
  label: string;
  playerNumber?: string;
  chipWidth: number;
  state: {
    isHolder: boolean;
    isTargetable: boolean;
    oppHasDisc: boolean;
    canDropOpeningPull: boolean;
    passModifier: PassModifier;
  };
  actions: {
    tap: () => void;
    throwaway: () => void;
    goal: () => void;
    drop: () => void;
    pullDrop: () => void;
    oppSwipeDown?: () => void;
  };
}

export const TrackerChipBase = ({
  label,
  playerNumber,
  chipWidth,
  state,
  actions,
}: TrackerChipBaseProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const { isHolder, isTargetable, oppHasDisc, canDropOpeningPull, passModifier } = state;
  const { tap, throwaway, goal, drop, pullDrop, oppSwipeDown } = actions;
  // Height-limited chips on short phones give their padding to the label; long names may wrap.
  const isCompact = isTrackerChipContentCompact(chipWidth);
  const contentGrowth = getTrackerChipContentGrowth(chipWidth);
  const bodyPadding = isCompact ? COMPACT_CHIP_BODY_PADDING : CHIP_BODY_PADDING;

  const isHolderSV = useDerivedValue(() => isHolder);
  const isTargetableSV = useDerivedValue(() => isTargetable);
  const oppHasDiscSV = useDerivedValue(() => oppHasDisc);
  const canDropOpeningPullSV = useDerivedValue(() => canDropOpeningPull);

  // oxlint-disable-next-line react/capitalized-calls -- Gesture.Pan is a factory; keep the literal call so Worklets can recognize the gesture chain.
  const panGesture = Gesture.Pan()
    .activeOffsetY([-12, 12])
    .failOffsetX([-8, 8])
    .onEnd((e) => {
      'worklet';
      if (isHolderSV.get()) {
        if (e.translationY > 0) scheduleOnRN(throwaway);
        else scheduleOnRN(goal);
        return;
      }
      if (oppHasDiscSV.get() && oppSwipeDown != null) {
        if (e.translationY > 0) scheduleOnRN(oppSwipeDown);
        return;
      }
      if (canDropOpeningPullSV.get()) {
        if (e.translationY > 0) scheduleOnRN(pullDrop);
        return;
      }
      if (!isTargetableSV.get()) return;
      if (e.translationY > 0) scheduleOnRN(drop);
      else scheduleOnRN(goal);
    });

  // Tapping a chip while armed credits that player: errors read as danger, everything else success.
  let modifierColor: string | null = null;
  if (passModifier != null) {
    modifierColor =
      PASS_MODIFIER_TONES[passModifier] === 'danger' ? palette.danger : palette.success;
  }
  // A holder can't drop their own throw, so they sit out the drop prompt.
  const isHolderExcluded = isHolder && passModifier === 'drop';

  const { bg, border, textColor, borderWidth, opacity } = (() => {
    if (oppHasDisc) {
      if (modifierColor) {
        return {
          bg: modifierColor + '18',
          border: modifierColor + '80',
          textColor: modifierColor,
          borderWidth: 1.5,
          opacity: 1,
        };
      }
      return {
        bg: palette.overlay08,
        border: palette.overlay20,
        textColor: palette.textInverse,
        borderWidth: 1,
        opacity: 1,
      };
    }
    if (isHolder && !isHolderExcluded) {
      if (modifierColor) {
        return {
          bg: modifierColor,
          border: modifierColor,
          textColor: palette.textOnAccent,
          borderWidth: 2,
          opacity: 1,
        };
      }
      return {
        bg: palette.accent,
        border: palette.accent,
        textColor: palette.textOnAccent,
        borderWidth: 2,
        opacity: 1,
      };
    }
    if (isTargetable || canDropOpeningPull) {
      if (modifierColor) {
        return {
          bg: modifierColor + '18',
          border: modifierColor + '80',
          textColor: modifierColor,
          borderWidth: 1.5,
          opacity: 1,
        };
      }
      return {
        bg: palette.overlay08,
        border: palette.overlay20,
        textColor: palette.textInverse,
        borderWidth: 1,
        opacity: 1,
      };
    }
    return {
      bg: palette.glassBg,
      border: palette.overlay20,
      textColor: palette.textInverse,
      borderWidth: 1,
      opacity: 0.5,
    };
  })();

  return (
    <GestureDetector gesture={panGesture}>
      <View
        style={[
          styles.chip,
          { width: chipWidth, opacity },
          isHolder && !isHolderExcluded && { boxShadow: `0 4px 12px ${palette.shadow}40` },
          isTargetable && modifierColor && { boxShadow: `0 0 12px ${modifierColor}30` },
          oppHasDisc && modifierColor && { boxShadow: `0 0 12px ${modifierColor}30` },
        ]}>
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: bg,
              borderColor: border,
              borderWidth,
              borderRadius: CHIP_BORDER_RADIUS,
              overflow: 'hidden',
            },
          ]}>
          <Pressable
            testID={`tracker-chip-${label}`}
            style={({ pressed }) => [
              styles.chipBody,
              { padding: bodyPadding },
              pressed && !oppHasDisc && { opacity: 0.75 },
            ]}
            onPress={tap}>
            {playerNumber != null && playerNumber !== '' && (
              <View style={[styles.numberBadge, { backgroundColor: palette.overlay15 }]}>
                <ThemedText
                  style={[
                    styles.numberText,
                    { color: textColor, fontSize: scaleBySizeClass(10 * contentGrowth, sizeClass) },
                  ]}>
                  #{playerNumber}
                </ThemedText>
              </View>
            )}
            <ThemedText
              style={[
                styles.chipText,
                { fontSize: scaleBySizeClass(14 * contentGrowth, sizeClass), color: textColor },
              ]}
              numberOfLines={2}>
              {label}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    aspectRatio: 1,
    borderRadius: CHIP_BORDER_RADIUS,
    borderCurve: 'continuous',
  },
  chipBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  numberText: {
    fontFamily: Fonts.bold,
  },
  chipText: {
    fontFamily: Fonts.extraBold,
    textAlign: 'center',
  },
});
