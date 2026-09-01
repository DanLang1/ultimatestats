import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { getSizeClassValue, scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

const TITLE_FONT_SIZE: Record<SizeClass, number> = { small: 14, medium: 16, large: 20 };

type ScreenHeaderProps = {
  title: string;
  onBack?: () => void;
  rightSlot?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  titleColor?: string;
  backButtonBackgroundColor?: string;
  backHitSlop?: number;
  centerTitleInLandscape?: boolean;
  titleOverlayPaddingPortrait?: number;
};

export function ScreenHeader({
  title,
  onBack,
  rightSlot,
  containerStyle,
  titleColor,
  backButtonBackgroundColor,
  backHitSlop = 12,
  centerTitleInLandscape = false,
  titleOverlayPaddingPortrait = 88,
}: ScreenHeaderProps) {
  const { isLandscape, sizeClass } = useLayout();
  const { palette } = useTheme();
  const styles = createStyles(sizeClass);
  const metrics = createMetrics(sizeClass);
  const useTitleOverlay = !isLandscape || centerTitleInLandscape;
  const effectiveBackHitSlop = scaleBySizeClass(backHitSlop, sizeClass);
  const titlePaddingPortrait = scaleBySizeClass(titleOverlayPaddingPortrait, sizeClass);

  return (
    <View style={[styles.header, containerStyle]}>
      <Pressable
        testID="screen-header-back"
        onPress={onBack}
        disabled={!onBack}
        style={[
          styles.backButton,
          { backgroundColor: backButtonBackgroundColor ?? palette.overlay10 },
          !onBack && styles.backButtonHidden,
        ]}
        hitSlop={effectiveBackHitSlop}>
        {onBack ? (
          <MaterialCommunityIcons
            name="arrow-left"
            size={metrics.backIconSize}
            color={palette.textInverse}
          />
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </Pressable>

      {useTitleOverlay ? (
        <View
          pointerEvents="none"
          style={[
            styles.titleOverlay,
            {
              paddingHorizontal: titlePaddingPortrait,
            },
          ]}>
          <ThemedText
            style={[styles.title, styles.titleCentered, { color: titleColor ?? palette.textMuted }]}
            numberOfLines={1}
            ellipsizeMode="tail">
            {title}
          </ThemedText>
        </View>
      ) : (
        <ThemedText style={[styles.title, { color: titleColor ?? palette.textMuted }]}>
          {title}
        </ThemedText>
      )}

      <View style={styles.rightSlot}>{rightSlot ?? <View style={styles.headerSpacer} />}</View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: scaleBySizeClass(20, sizeClass),
      paddingTop: scaleBySizeClass(8, sizeClass),
      paddingBottom: scaleBySizeClass(12, sizeClass),
    },
    backButton: {
      padding: scaleBySizeClass(8, sizeClass),
      borderRadius: scaleBySizeClass(20, sizeClass),
      zIndex: 10,
    },
    backButtonHidden: {
      backgroundColor: 'transparent',
    },
    titleOverlay: {
      ...StyleSheet.absoluteFill,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      fontSize: getSizeClassValue(TITLE_FONT_SIZE, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: scaleBySizeClass(2, sizeClass, { rounding: 'none' }),
      textTransform: 'uppercase',
    },
    titleCentered: {
      textAlign: 'center',
      width: '100%',
    },
    rightSlot: {
      minWidth: scaleBySizeClass(40, sizeClass),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    headerSpacer: {
      width: scaleBySizeClass(40, sizeClass),
    },
  });
}

function createMetrics(sizeClass: SizeClass) {
  return {
    backIconSize: scaleBySizeClass(24, sizeClass),
  };
}
