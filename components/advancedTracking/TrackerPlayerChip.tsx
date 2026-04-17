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

interface TrackerPlayerChipProps {
  p: Participant;
  discHolderId: string | null;
  oppHasDisc: boolean;
  passModifier: PassModifier;
  onTap: (id: string) => void;
  onDrop: (id: string) => void;
  onGoal: (id: string) => void;
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
  chipWidth,
}: TrackerPlayerChipProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const isHolder = discHolderId === p.id;
  const isTargetable = !oppHasDisc && discHolderId !== null && !isHolder;

  const isTargetableSV = useDerivedValue(() => isTargetable);

  // Directional swipes on receiver chips (our possession only):
  //   swipe down → drop   (translationY > 0)
  //   swipe up   → goal   (translationY < 0)
  const panGesture = Gesture.Pan()
    .activeOffsetY([-12, 12])
    .failOffsetX([-8, 8])
    .onEnd((e) => {
      'worklet';
      if (!isTargetableSV.value) return;
      if (e.translationY > 0) scheduleOnRN(onDrop, p.id);
      else scheduleOnRN(onGoal, p.id);
    });

  let modifierColor: string | null = null;
  if (passModifier === 'callahan' || passModifier === 'stall') modifierColor = palette.success;
  else if (passModifier === 'fifty-fifty') modifierColor = palette.warning;

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
      return {
        bg: palette.accent + '25',
        border: palette.accent,
        textColor: palette.accent,
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
          { width: chipWidth, backgroundColor: bg, borderColor: border, borderWidth, opacity },
          isHolder && { boxShadow: `0 0 20px ${palette.accent}50` },
          isTargetable && modifierColor && { boxShadow: `0 0 12px ${modifierColor}30` },
          oppHasDisc && modifierColor && { boxShadow: `0 0 12px ${modifierColor}30` },
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
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'stretch',
    borderRadius: 24,
    borderCurve: 'continuous',
  },
  chipBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  chipText: {
    fontFamily: Fonts.extraBold,
    textAlign: 'center',
  },
});
