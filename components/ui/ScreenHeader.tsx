import { useLayout } from '@/hooks/useLayout';
import { useTheme } from '@/context/ThemeContext';
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
  const { isLandscape } = useLayout();
  const { palette } = useTheme();
  const useTitleOverlay = !isLandscape || centerTitleInLandscape;

  return (
    <View style={[styles.header, containerStyle]}>
      <Pressable
        onPress={onBack}
        style={[
          styles.backButton,
          { backgroundColor: backButtonBackgroundColor ?? palette.overlay10 },
        ]}
        hitSlop={backHitSlop}>
        <MaterialCommunityIcons
          name="arrow-left"
          size={24}
          color={backIconColor ?? palette.textInverse}
        />
      </Pressable>

      {useTitleOverlay ? (
        <View
          pointerEvents="none"
          style={[
            styles.titleOverlay,
            {
              paddingHorizontal: isLandscape
                ? titleOverlayPaddingLandscape
                : titleOverlayPaddingPortrait,
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

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    zIndex: 10,
  },
  titleOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  titleCentered: {
    textAlign: 'center',
    width: '100%',
  },
  rightSlot: {
    minWidth: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  headerSpacer: {
    width: 40,
  },
});
