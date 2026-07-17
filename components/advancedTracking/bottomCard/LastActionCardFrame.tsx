import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts, Palette } from '@/theme/theme';

const COMPACT_ACTIONS_CARD_WIDTH = 360;

export type ButtonMode =
  | { kind: 'undo-more'; onUndo: () => void; onMore: () => void }
  | { kind: 'more-only'; onMore: () => void }
  | { kind: 'next-only'; onNext: () => void; label?: string }
  | { kind: 'none' }
  | { kind: 'cancel-more'; onCancel: () => void; onMore: () => void; isDanger?: boolean }
  | { kind: 'undo-only'; onUndo: () => void };

interface LastActionCardFrameProps {
  accentColor: string;
  children: React.ReactNode;
  buttonMode: ButtonMode;
  preferCompactActions?: boolean;
  moreAdornment?: React.ReactNode;
}

export const LastActionCardFrame = ({
  accentColor,
  children,
  buttonMode,
  preferCompactActions = false,
  moreAdornment,
}: LastActionCardFrameProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass, palette);
  const [cardWidth, setCardWidth] = useState(0);

  const showMore =
    buttonMode.kind === 'undo-more' ||
    buttonMode.kind === 'more-only' ||
    buttonMode.kind === 'cancel-more';
  const showUndo = buttonMode.kind === 'undo-more' || buttonMode.kind === 'undo-only';
  const canUseCompactActions = sizeClass === 'small';
  const compactActionThreshold = scaleBySizeClass(COMPACT_ACTIONS_CARD_WIDTH, sizeClass);
  const useCompactActions =
    canUseCompactActions &&
    (preferCompactActions || (cardWidth > 0 && cardWidth < compactActionThreshold));

  const handleCardLayout = (event: LayoutChangeEvent) => {
    const measuredWidth = Math.round(event.nativeEvent.layout.width);
    setCardWidth((currentWidth) => (currentWidth === measuredWidth ? currentWidth : measuredWidth));
  };

  let primaryAction: React.ReactNode = null;
  if (buttonMode.kind === 'cancel-more') {
    primaryAction = (
      <Pressable
        onPress={buttonMode.onCancel}
        hitSlop={8}
        style={({ pressed }) => [
          useCompactActions ? styles.compactBtn : styles.actionBtn,
          { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
          pressed && { opacity: 0.7 },
        ]}>
        <MaterialCommunityIcons
          name="close"
          size={scaleBySizeClass(18, sizeClass)}
          color={buttonMode.isDanger ? palette.danger : palette.textMuted}
        />
        {!useCompactActions && (
          <ThemedText style={[styles.actionBtnText, { color: palette.textInverse }]}>
            CANCEL
          </ThemedText>
        )}
      </Pressable>
    );
  } else if (showUndo) {
    primaryAction = (
      <Pressable
        testID="tracker-undo-button"
        onPress={async () => await buttonMode.onUndo()}
        hitSlop={8}
        style={({ pressed }) => [
          useCompactActions ? styles.compactBtn : styles.actionBtn,
          { backgroundColor: 'transparent', borderColor: palette.overlay10 },
          pressed && { opacity: 0.7 },
        ]}>
        <MaterialCommunityIcons
          name="undo"
          size={scaleBySizeClass(useCompactActions ? 20 : 18, sizeClass)}
          color={palette.textMuted}
        />
        {!useCompactActions && (
          <ThemedText style={[styles.actionBtnText, { color: palette.textInverse }]}>
            UNDO
          </ThemedText>
        )}
      </Pressable>
    );
  } else if (buttonMode.kind === 'next-only') {
    primaryAction = (
      <Pressable
        testID="tutorial-next-step"
        onPress={buttonMode.onNext}
        hitSlop={8}
        style={({ pressed }) => [
          useCompactActions ? styles.compactBtn : styles.actionBtn,
          { backgroundColor: palette.accent, borderColor: palette.accent },
          pressed && { opacity: 0.7 },
        ]}>
        {useCompactActions && (
          <MaterialCommunityIcons
            name="arrow-right"
            size={scaleBySizeClass(20, sizeClass)}
            color={palette.textOnAccent}
          />
        )}
        {!useCompactActions && (
          <ThemedText style={[styles.actionBtnText, { color: palette.textOnAccent }]}>
            {buttonMode.label ?? 'NEXT STEP'}
          </ThemedText>
        )}
      </Pressable>
    );
  }

  return (
    <View style={styles.outerContainer}>
      <View style={styles.card} onLayout={handleCardLayout}>
        <View style={[styles.accentRail, { backgroundColor: accentColor }]} />
        <View style={styles.headerCenterContent}>{children}</View>

        <View style={styles.cardActionGroup}>
          {primaryAction}

          {showMore && (
            <View style={styles.moreButtonWrap}>
              {moreAdornment}
              <Pressable
                testID="tracker-more-button"
                onPress={buttonMode.onMore}
                hitSlop={8}
                style={({ pressed }) => [
                  useCompactActions ? styles.compactBtn : styles.actionBtn,
                  {
                    backgroundColor: 'transparent',
                    borderColor: palette.overlay10,
                  },
                  pressed && { opacity: 0.7 },
                ]}>
                {useCompactActions && (
                  <MaterialCommunityIcons
                    name="dots-horizontal"
                    size={scaleBySizeClass(20, sizeClass)}
                    color={palette.textMuted}
                  />
                )}
                {!useCompactActions && (
                  <ThemedText style={[styles.actionBtnText, { color: palette.textInverse }]}>
                    MORE
                  </ThemedText>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

function createStyles(sizeClass: SizeClass, palette: Palette) {
  return StyleSheet.create({
    outerContainer: {
      padding: scaleBySizeClass(8, sizeClass),
      backgroundColor: 'transparent',
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(12, sizeClass),
      minHeight: scaleBySizeClass(92, sizeClass),
      backgroundColor: palette.trackerActionCardBg,
      borderRadius: 18,
      borderCurve: 'continuous',
      overflow: 'hidden',
      paddingHorizontal: scaleBySizeClass(14, sizeClass),
      paddingVertical: scaleBySizeClass(12, sizeClass),
      shadowColor: palette.shadow,
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 4,
      borderWidth: 1,
      borderColor: palette.trackerActionCardBorder,
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
      justifyContent: 'flex-start',
      flexShrink: 0,
      gap: 6,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      minHeight: scaleBySizeClass(44, sizeClass),
      minWidth: scaleBySizeClass(86, sizeClass),
      borderRadius: 14,
      borderCurve: 'continuous',
      paddingHorizontal: scaleBySizeClass(12, sizeClass),
      borderWidth: 1,
    },
    compactBtn: {
      width: scaleBySizeClass(40, sizeClass),
      height: scaleBySizeClass(44, sizeClass),
      borderRadius: 14,
      borderCurve: 'continuous',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
    },
    actionBtnText: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(12, sizeClass),
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    moreButtonWrap: {
      position: 'relative',
    },
  });
}
