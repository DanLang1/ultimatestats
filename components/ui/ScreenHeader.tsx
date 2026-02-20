import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

type ScreenHeaderProps = {
  title: string;
  onBack: () => void;
  rightSlot?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  titleColor?: string;
  backButtonBackgroundColor?: string;
  backIconColor?: string;
  backHitSlop?: number;
  centerTitleInLandscape?: boolean;
  titleOverlayPaddingPortrait?: number;
  titleOverlayPaddingLandscape?: number;
  titleNumberOfLines?: number;
};

export function ScreenHeader({
  title,
  onBack,
  rightSlot,
  containerStyle,
  titleStyle,
  titleColor,
  backButtonBackgroundColor,
  backIconColor,
  backHitSlop = 12,
  centerTitleInLandscape = false,
  titleOverlayPaddingPortrait = 88,
  titleOverlayPaddingLandscape = 88,
  titleNumberOfLines = 1,
}: ScreenHeaderProps) {
  const { isLandscape, sizeClass } = useLayout();
  const { palette } = useTheme();
  const styles = createStyles(sizeClass);
  const metrics = createMetrics(sizeClass);
  const useTitleOverlay = !isLandscape || centerTitleInLandscape;
  const effectiveBackHitSlop = scaleBySizeClass(backHitSlop, sizeClass);
  const titlePaddingPortrait = scaleBySizeClass(titleOverlayPaddingPortrait, sizeClass);
  const titlePaddingLandscape = scaleBySizeClass(titleOverlayPaddingLandscape, sizeClass);

  return (
    <View style={[styles.header, containerStyle]}>
      <Pressable
        onPress={onBack}
        style={[
          styles.backButton,
          { backgroundColor: backButtonBackgroundColor ?? palette.overlay10 },
        ]}
        hitSlop={effectiveBackHitSlop}>
        <MaterialCommunityIcons
          name="arrow-left"
          size={metrics.backIconSize}
          color={backIconColor ?? palette.textInverse}
        />
      </Pressable>

      {useTitleOverlay ? (
        <View
          pointerEvents="none"
          style={[
            styles.titleOverlay,
            {
              paddingHorizontal: isLandscape ? titlePaddingLandscape : titlePaddingPortrait,
            },
          ]}>
          <Text
            style={[
              styles.title,
              styles.titleCentered,
              { color: titleColor ?? palette.textMuted },
              titleStyle,
            ]}
            numberOfLines={titleNumberOfLines}
            ellipsizeMode="tail">
            {title}
          </Text>
        </View>
      ) : (
        <Text style={[styles.title, { color: titleColor ?? palette.textMuted }, titleStyle]}>
          {title}
        </Text>
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
    titleOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontWeight: '700',
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
