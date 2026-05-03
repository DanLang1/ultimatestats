import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, useLayout } from '@/hooks/useLayout';
import { Participant } from '@/lib/advancedTracking/types';
import { Fonts } from '@/theme/theme';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useDerivedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { PassModifier } from './types';

const CHIP_BORDER_RADIUS = 12;

interface TrackerPlayerChipProps {
  p: Participant;
  discHolderId: string | null;
  oppHasDisc: boolean;
  passModifier: PassModifier;
  onTap: (id: string) => void;
  onDrop: (id: string) => void;
  onGoal: (id: string) => void;
  onThrowaway: () => void;
  chipWidth: number;
}

export const TrackerPlayerChip = ({
  p,
  discHolderId,
  oppHasDisc,
  passModifier,
  onTap,
  onDrop,
  onGoal,
  onThrowaway,
  chipWidth,
}: TrackerPlayerChipProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const isHolder = discHolderId === p.id;
  const isTargetable = !oppHasDisc && discHolderId !== null && !isHolder;

  const isTargetableSV = useDerivedValue(() => isTargetable);
  const isHolderSV = useDerivedValue(() => isHolder);

  // Directional swipes on player chips (our possession only):
  //   swipe down on holder → throwaway
  //   swipe up on holder   → self-goal
  //   swipe down on receiver → drop   (translationY > 0)
  //   swipe up on receiver   → goal   (translationY < 0)
  const panGesture = Gesture.Pan()
    .activeOffsetY([-12, 12])
    .failOffsetX([-8, 8])
    .onEnd((e) => {
      'worklet';
      if (isHolderSV.value) {
        if (e.translationY > 0) scheduleOnRN(onThrowaway);
        else scheduleOnRN(onGoal, p.id);
        return;
      }
      if (!isTargetableSV.value) return;
      if (e.translationY > 0) scheduleOnRN(onDrop, p.id);
      else scheduleOnRN(onGoal, p.id);
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
    if (isTargetable) {
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
            style={({ pressed }) => [styles.chipBody, pressed && !oppHasDisc && { opacity: 0.75 }]}
            onPress={() => onTap(p.id)}>
            <ThemedText
              style={[
                styles.chipText,
                { fontSize: scaleBySizeClass(14, sizeClass), color: textColor },
              ]}
              numberOfLines={2}>
              {p.name}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'stretch',
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
  chipText: {
    fontFamily: Fonts.extraBold,
    textAlign: 'center',
  },
});
