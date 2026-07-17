import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { SlideInUp, SlideOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import EventToastIcon from '@/components/toast/EventToastIcon';
import { EventIconInfo } from '@/components/toast/hooks/useEventToast';
import { useToastPulse } from '@/components/toast/hooks/useToastPulse';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts, Palette } from '@/theme/theme';

export type EventToastData = {
  visible: boolean;
  message: string;
  tone: 'success' | 'danger' | 'neutral';
  icon: EventIconInfo;
};

interface EventToastProps {
  toast: EventToastData;
  toastInstanceId: number;
}

function getToneBg(tone: 'success' | 'danger' | 'neutral', palette: Palette) {
  if (tone === 'success') return palette.success;
  if (tone === 'neutral') return palette.neutral;
  return palette.danger;
}

export default function EventToast({ toast, toastInstanceId }: EventToastProps) {
  const { isLandscape, sizeClass } = useLayout();
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const [toastWidth, setToastWidth] = useState(0);
  const toastHeight = scaleBySizeClass(44, sizeClass);
  const styles = createStyles(sizeClass, toastHeight);
  const { toastAnimatedStyle, borderRunnerAnimatedStyle, borderRunnerOffsetAnimatedStyle } =
    useToastPulse(toast.visible, toastInstanceId, toastWidth, toastHeight);

  if (!toast.visible) return null;

  const topOffset = insets.top + (isLandscape ? 68 : 14);
  const toneColor = getToneBg(toast.tone, palette);

  return (
    <View style={[styles.container, { top: topOffset }]} pointerEvents="box-none">
      <Animated.View
        onLayout={(event) => {
          setToastWidth(event.nativeEvent.layout.width);
        }}
        entering={SlideInUp.duration(200)}
        exiting={SlideOutUp.duration(150)}
        style={[
          styles.banner,
          toastAnimatedStyle,
          { backgroundColor: toneColor, shadowColor: palette.shadow },
        ]}>
        <View pointerEvents="none" style={styles.borderLayer}>
          <View style={[styles.borderBase, { borderColor: palette.textOnAccent }]} />
          <Animated.View style={[styles.borderRunner, borderRunnerAnimatedStyle]}>
            <View style={[styles.borderRunnerOuter, { backgroundColor: palette.textOnAccent }]}>
              <View style={[styles.borderRunnerInner, { backgroundColor: toneColor }]} />
            </View>
          </Animated.View>
          <Animated.View style={[styles.borderRunner, borderRunnerOffsetAnimatedStyle]}>
            <View style={[styles.borderRunnerOuter, { backgroundColor: palette.textOnAccent }]}>
              <View style={[styles.borderRunnerInner, { backgroundColor: toneColor }]} />
            </View>
          </Animated.View>
        </View>
        <EventToastIcon icon={toast.icon} color={palette.textOnAccent} />
        <ThemedText style={[styles.bannerText, { color: palette.textOnAccent }]} numberOfLines={1}>
          {toast.message}
        </ThemedText>
      </Animated.View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass, toastHeight: number) {
  return StyleSheet.create({
    container: {
      position: 'absolute',
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 350,
    },
    banner: {
      width: '88%',
      maxWidth: 400,
      height: toastHeight,
      borderRadius: 10,
      overflow: 'hidden',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      gap: 10,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 6,
    },
    borderLayer: {
      ...StyleSheet.absoluteFill,
      borderRadius: 10,
    },
    borderBase: {
      ...StyleSheet.absoluteFill,
      borderRadius: 10,
      borderWidth: 3,
    },
    borderRunner: {
      position: 'absolute',
      left: 0,
      top: 0,
      width: 44,
      height: 5,
    },
    borderRunnerOuter: {
      width: '100%',
      height: '100%',
      borderRadius: 999,
      paddingHorizontal: 1,
      paddingVertical: 1,
    },
    borderRunnerInner: {
      width: '100%',
      height: '100%',
      borderRadius: 999,
    },
    bannerText: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 0.2,
      flex: 1,
    },
  });
}
