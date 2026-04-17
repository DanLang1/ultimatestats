import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { PassChainEvent, TurnoverEventInfo } from '@/lib/advancedTracking/trackingDisplayHelpers';
import { Fonts, Palette } from '@/theme/theme';
import { default as React } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft, LinearTransition } from 'react-native-reanimated';

const springLayout = LinearTransition.springify();

export interface TrackerPassChainProps {
  events: PassChainEvent[];
  truncated: boolean;
  turnoverEvent: TurnoverEventInfo | null;
  isLandscape?: boolean;
}

export const TrackerPassChain = ({
  events,
  truncated,
  turnoverEvent,
  isLandscape = false,
}: TrackerPassChainProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass, isLandscape, palette);

  let turnoverColor = palette.textMuted;
  if (turnoverEvent) {
    if (!turnoverEvent.isFocusTurnover) turnoverColor = palette.success;
    else if (turnoverEvent.isDropWithSplitAttribution) turnoverColor = palette.warning;
    else turnoverColor = palette.danger;
  }

  if (turnoverEvent) {
    const { label, responsibleName, throwerName, isDropWithSplitAttribution } = turnoverEvent;

    let chipContent: React.ReactNode;
    if (isDropWithSplitAttribution && throwerName && responsibleName) {
      chipContent = (
        <View style={[styles.chip, { backgroundColor: turnoverColor }]}>
          <ThemedText numberOfLines={1} style={[styles.chipText, { color: palette.textOnAccent }]}>
            {throwerName}
          </ThemedText>
          <ThemedText style={[styles.chipSep, { color: palette.textOnAccentMuted }]}>+</ThemedText>
          <ThemedText numberOfLines={1} style={[styles.chipText, { color: palette.textOnAccent }]}>
            {responsibleName}
          </ThemedText>
          <ThemedText style={[styles.chipSep, { color: palette.textOnAccentMuted }]}>·</ThemedText>
          <ThemedText style={[styles.chipLabel, { color: palette.textOnAccentMuted }]}>
            {label}
          </ThemedText>
        </View>
      );
    } else if (responsibleName) {
      chipContent = (
        <View style={[styles.chip, { backgroundColor: turnoverColor }]}>
          <ThemedText numberOfLines={1} style={[styles.chipText, { color: palette.textOnAccent }]}>
            {responsibleName}
          </ThemedText>
          <ThemedText style={[styles.chipSep, { color: palette.textOnAccentMuted }]}>·</ThemedText>
          <ThemedText style={[styles.chipLabel, { color: palette.textOnAccentMuted }]}>
            {label}
          </ThemedText>
        </View>
      );
    } else {
      chipContent = (
        <View style={[styles.chip, { backgroundColor: turnoverColor }]}>
          <ThemedText style={[styles.chipText, { color: palette.textOnAccent }]}>
            {label}
          </ThemedText>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <Animated.View entering={FadeInRight} style={styles.chipWrapper}>
          {chipContent}
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {truncated && (
        <>
          <View style={[styles.chip, styles.chipTruncated]}>
            <ThemedText style={styles.chipText}>...</ThemedText>
          </View>
          <ThemedText style={[styles.arrow, { color: palette.textMuted }]}>→</ThemedText>
        </>
      )}

      {events.map((event, index) => {
        const isLastInChain = index === events.length - 1;
        return (
          <Animated.View
            key={event.id}
            entering={FadeInRight}
            exiting={FadeOutLeft}
            layout={springLayout}
            style={styles.chipWrapper}>
            <View style={[styles.chip, { backgroundColor: palette.overlay12 }]}>
              <ThemedText
                numberOfLines={1}
                style={[styles.chipText, { color: palette.textInverse }]}>
                {event.name}
              </ThemedText>
            </View>
            {!isLastInChain && (
              <ThemedText style={[styles.arrow, { color: palette.textMuted }]}>→</ThemedText>
            )}
          </Animated.View>
        );
      })}
    </View>
  );
};

function createStyles(sizeClass: SizeClass, isLandscape: boolean, palette: Palette) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'stretch',
      gap: 4,
    },
    chipWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
      minWidth: 0,
      gap: 4,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
      minWidth: 0,
      gap: 3,
      paddingHorizontal: isLandscape ? 6 : 8,
      paddingVertical: isLandscape ? 3 : 5,
      borderRadius: 16,
      borderCurve: 'continuous',
      backgroundColor: palette.overlay12,
    },
    chipTruncated: {
      backgroundColor: 'transparent',
      paddingHorizontal: 0,
      flexShrink: 0,
    },
    chipText: {
      flexShrink: 1,
      fontSize: scaleBySizeClass(isLandscape ? 11 : 12, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      lineHeight: isLandscape ? 14 : 15,
    },
    chipSep: {
      flexShrink: 0,
      fontSize: scaleBySizeClass(isLandscape ? 10 : 11, sizeClass),
      fontFamily: Fonts.bold,
      lineHeight: isLandscape ? 14 : 15,
    },
    chipLabel: {
      flexShrink: 0,
      fontSize: scaleBySizeClass(isLandscape ? 10 : 11, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      lineHeight: isLandscape ? 14 : 15,
    },
    arrow: {
      flexShrink: 0,
      fontSize: scaleBySizeClass(isLandscape ? 11 : 13, sizeClass),
      fontFamily: Fonts.black,
      marginHorizontal: 2,
    },
  });
}
