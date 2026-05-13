import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useDerivedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { PassModifier } from './types';

const CHIP_BORDER_RADIUS = 12;

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

  const isHolderSV = useDerivedValue(() => isHolder);
  const isTargetableSV = useDerivedValue(() => isTargetable);
  const oppHasDiscSV = useDerivedValue(() => oppHasDisc);
  const canDropOpeningPullSV = useDerivedValue(() => canDropOpeningPull);

  const panGesture = Gesture.Pan()
    .activeOffsetY([-12, 12])
    .failOffsetX([-8, 8])
    .onEnd((e) => {
      'worklet';
      if (isHolderSV.value) {
        if (e.translationY > 0) scheduleOnRN(throwaway);
        else scheduleOnRN(goal);
        return;
      }
      if (oppHasDiscSV.value && oppSwipeDown != null) {
        if (e.translationY > 0) scheduleOnRN(oppSwipeDown);
        return;
      }
      if (canDropOpeningPullSV.value) {
        if (e.translationY > 0) scheduleOnRN(pullDrop);
        return;
      }
      if (!isTargetableSV.value) return;
      if (e.translationY > 0) scheduleOnRN(drop);
      else scheduleOnRN(goal);
    });

  let modifierColor: string | null = null;
  if (passModifier === 'callahan' || passModifier === 'stall') modifierColor = palette.success;
  else if (passModifier === 'fifty-fifty') modifierColor = palette.danger;

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
    if (isHolder) {
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
          isHolder && { boxShadow: `0 4px 12px ${palette.shadow}40` },
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
            style={({ pressed }) => [styles.chipBody, pressed && !oppHasDisc && { opacity: 0.75 }]}
            onPress={tap}>
            {playerNumber != null && playerNumber !== '' && (
              <View style={[styles.numberBadge, { backgroundColor: palette.overlay15 }]}>
                <ThemedText
                  style={[
                    styles.numberText,
                    { color: textColor, fontSize: scaleBySizeClass(10, sizeClass) },
                  ]}>
                  #{playerNumber}
                </ThemedText>
              </View>
            )}
            <ThemedText
              style={[
                styles.chipText,
                { fontSize: scaleBySizeClass(14, sizeClass), color: textColor },
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
    padding: 12,
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
