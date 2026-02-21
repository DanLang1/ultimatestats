import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, useLayout } from '@/hooks/useLayout';
import { LinePreset } from '@/lib/storage/types';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  LinearTransition,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const ITEM_HEIGHT = 48;
const GAP = 8;
export const ROW_HEIGHT = ITEM_HEIGHT + GAP;

interface DraggablePresetItemProps {
  preset: LinePreset;
  index: number;
  isDragging: boolean;
  totalCount: number;
  draggingId: SharedValue<string>;
  dragTranslateY: SharedValue<number>;
  dragOriginIndex: SharedValue<number>;
  dragCurrentIndex: SharedValue<number>;
  onDragStart: (presetId: string) => void;
  onSwap: (fromIndex: number, toIndex: number) => void;
  onDragEnd: () => void;
  onEditPreset: (preset: LinePreset) => void;
  onDeletePreset: (preset: LinePreset) => void;
}

export function DraggablePresetItem({
  preset,
  index,
  isDragging: isDraggingProp,
  totalCount,
  draggingId,
  dragTranslateY,
  dragOriginIndex,
  dragCurrentIndex,
  onDragStart,
  onSwap,
  onDragEnd,
  onEditPreset,
  onDeletePreset,
}: DraggablePresetItemProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const dragIconSize = scaleBySizeClass(22, sizeClass);
  const actionIconSize = scaleBySizeClass(16, sizeClass);

  // Smoothed layout compensation — animated with withTiming so the dragged item
  // transitions in sync with LinearTransition on non-dragged items, avoiding a
  // flash caused by the UI-thread offset jumping before the JS-thread store swap.
  const animatedOffset = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      draggingId.value = preset.id;
      dragTranslateY.value = 0;
      dragOriginIndex.value = index;
      dragCurrentIndex.value = index;
      animatedOffset.value = 0;
      scheduleOnRN(onDragStart, preset.id);
    })
    .onUpdate((e) => {
      dragTranslateY.value = e.translationY;

      const desiredIndex = dragOriginIndex.value + Math.round(e.translationY / ROW_HEIGHT);
      const clamped = Math.max(0, Math.min(totalCount - 1, desiredIndex));

      if (clamped !== dragCurrentIndex.value) {
        const from = dragCurrentIndex.value;
        const to = from + (clamped > from ? 1 : -1);
        dragCurrentIndex.value = to;
        animatedOffset.value = withTiming((to - dragOriginIndex.value) * ROW_HEIGHT, {
          duration: 100,
        });
        scheduleOnRN(onSwap, from, to);
      }
    })
    .onEnd(() => {
      draggingId.value = '';
      dragTranslateY.value = 0;
      dragOriginIndex.value = -1;
      dragCurrentIndex.value = -1;
      animatedOffset.value = 0;
      scheduleOnRN(onDragEnd);
    });

  const animatedStyle = useAnimatedStyle(() => {
    if (draggingId.value === preset.id) {
      return {
        transform: [{ translateY: dragTranslateY.value - animatedOffset.value }, { scale: 1.02 }],
        zIndex: 100,
        opacity: 0.9,
      };
    }
    return {
      transform: [{ translateY: 0 }],
      zIndex: 1,
      opacity: 1,
    };
  });

  return (
    <Animated.View
      layout={isDraggingProp ? undefined : LinearTransition.duration(150)}
      style={[styles.item, { backgroundColor: palette.overlay08 }, animatedStyle]}>
      <GestureDetector gesture={panGesture}>
        <View style={styles.dragHandle}>
          <MaterialCommunityIcons name="drag" size={dragIconSize} color={palette.textMuted} />
        </View>
      </GestureDetector>
      <View style={[styles.orderBadge, { backgroundColor: palette.overlay12 }]}>
        <Text style={[styles.orderText, { color: palette.textInverse }]}>{index + 1}</Text>
      </View>
      <View style={styles.infoSection}>
        <Text style={[styles.presetName, { color: palette.textInverse }]}>{preset.name}</Text>
        <Text style={[styles.presetCount, { color: palette.textMuted }]}>
          {preset.playerIds.length} players
        </Text>
      </View>
      <View style={styles.actions}>
        <Pressable
          onPress={() => onEditPreset(preset)}
          style={({ pressed }) => [
            styles.actionBtn,
            { backgroundColor: palette.overlay05 },
            pressed && { opacity: 0.7 },
          ]}
          hitSlop={4}>
          <MaterialCommunityIcons
            name="pencil-outline"
            size={actionIconSize}
            color={palette.textMuted}
          />
        </Pressable>
        <Pressable
          onPress={() => onDeletePreset(preset)}
          style={({ pressed }) => [
            styles.actionBtn,
            { backgroundColor: palette.dangerOverlay15 },
            pressed && { opacity: 0.7 },
          ]}
          hitSlop={4}>
          <MaterialCommunityIcons
            name="delete-outline"
            size={actionIconSize}
            color={palette.danger}
          />
        </Pressable>
      </View>
    </Animated.View>
  );
}

function createStyles(sizeClass: 'small' | 'medium' | 'large') {
  return StyleSheet.create({
    item: {
      height: ITEM_HEIGHT,
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 10,
      paddingRight: 16,
    },
    dragHandle: {
      paddingHorizontal: 12,
      paddingVertical: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    orderBadge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    orderText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontWeight: '700',
    },
    infoSection: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    presetName: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontWeight: '600',
    },
    presetCount: {
      fontSize: scaleBySizeClass(12, sizeClass),
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    actionBtn: {
      padding: 6,
      borderRadius: 8,
    },
  });
}
