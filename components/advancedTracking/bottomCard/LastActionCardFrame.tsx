import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts, Palette } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

type ButtonMode =
  | { kind: 'undo-more'; onUndo: () => void; onMore: () => void }
  | { kind: 'cancel-more'; onCancel: () => void; onMore: () => void; isDanger?: boolean }
  | { kind: 'undo-only'; onUndo: () => void };

interface LastActionCardFrameProps {
  accentColor: string;
  children: React.ReactNode;
  buttonMode: ButtonMode;
}

export const LastActionCardFrame = ({
  accentColor,
  children,
  buttonMode,
}: LastActionCardFrameProps) => {
  const { palette } = useTheme();
  const { sizeClass, isLandscape } = useLayout();
  const styles = createStyles(sizeClass, isLandscape, palette);

  const showMore = buttonMode.kind !== 'undo-only';

  return (
    <View style={styles.outerContainer}>
      <View style={styles.card}>
        <View style={[styles.accentRail, { backgroundColor: accentColor }]} />
        <View style={styles.headerCenterContent}>{children}</View>

        <View style={styles.cardActionGroup}>
          {buttonMode.kind === 'cancel-more' ? (
            <Pressable
              onPress={buttonMode.onCancel}
              hitSlop={8}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
                pressed && { opacity: 0.7 },
              ]}>
              <MaterialCommunityIcons
                name="close"
                size={scaleBySizeClass(18, sizeClass)}
                color={buttonMode.isDanger ? palette.danger : palette.textMuted}
              />
              <ThemedText style={[styles.actionBtnText, { color: palette.inputText }]}>
                CANCEL
              </ThemedText>
            </Pressable>
          ) : (
            <Pressable
              testID="tracker-undo-button"
              onPress={async () => await buttonMode.onUndo()}
              hitSlop={8}
              style={({ pressed }) => [
                styles.moreBtn,
                { backgroundColor: 'transparent', borderColor: palette.overlay10 },
                pressed && { opacity: 0.7 },
              ]}>
              <MaterialCommunityIcons
                name="undo"
                size={scaleBySizeClass(20, sizeClass)}
                color={palette.textMuted}
              />
            </Pressable>
          )}

          {showMore && (
            <Pressable
              testID="tracker-more-button"
              onPress={buttonMode.onMore}
              hitSlop={8}
              style={({ pressed }) => [
                styles.moreBtn,
                { backgroundColor: 'transparent', borderColor: palette.overlay10 },
                pressed && { opacity: 0.7 },
              ]}>
              <MaterialCommunityIcons
                name="dots-vertical"
                size={scaleBySizeClass(20, sizeClass)}
                color={palette.textMuted}
              />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
};

function createStyles(sizeClass: SizeClass, isLandscape: boolean, palette: Palette) {
  return StyleSheet.create({
    outerContainer: {
      padding: scaleBySizeClass(8, sizeClass),
      backgroundColor: 'transparent',
    },
    card: {
      flexDirection: isLandscape ? 'column' : 'row',
      alignItems: isLandscape ? 'stretch' : 'center',
      gap: scaleBySizeClass(isLandscape ? 8 : 12, sizeClass),
      minHeight: scaleBySizeClass(isLandscape ? 76 : 92, sizeClass),
      backgroundColor: palette.cardBg,
      borderRadius: 18,
      borderCurve: 'continuous',
      overflow: 'hidden',
      paddingHorizontal: scaleBySizeClass(isLandscape ? 10 : 14, sizeClass),
      paddingVertical: scaleBySizeClass(12, sizeClass),
      shadowColor: palette.shadow,
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 4,
      borderWidth: 1,
      borderColor: palette.borderLight,
    },
    accentRail: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: scaleBySizeClass(6, sizeClass),
    },
    headerCenterContent: {
      flex: 1,
      minWidth: 0,
      justifyContent: 'center',
      gap: 2,
    },
    cardActionGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: isLandscape ? 'space-between' : 'flex-start',
      gap: 6,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      minHeight: scaleBySizeClass(44, sizeClass),
      minWidth: scaleBySizeClass(isLandscape ? 82 : 96, sizeClass),
      flex: isLandscape ? 1 : 0,
      borderRadius: 14,
      borderCurve: 'continuous',
      paddingHorizontal: scaleBySizeClass(12, sizeClass),
      borderWidth: 1,
    },
    actionBtnText: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(12, sizeClass),
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    moreBtn: {
      width: scaleBySizeClass(40, sizeClass),
      height: scaleBySizeClass(44, sizeClass),
      borderRadius: 14,
      borderCurve: 'continuous',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
    },
  });
}
