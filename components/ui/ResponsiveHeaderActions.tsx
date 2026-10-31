import MaterialCommunityIcons, {
  type MaterialDesignIconsIconName,
} from '@react-native-vector-icons/material-design-icons/static';
import React, { useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import {
  BottomSheetActionRow,
  BottomSheetActionRowTone,
} from '@/components/ui/BottomSheetActionRow';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

type ResponsiveHeaderActionBase = {
  key: string;
  label: string;
  onPress: () => void;
  /** For when the visible label needs more context, e.g. "Select" read as "Select games". */
  accessibilityLabel?: string;
  menuIcon?: React.ReactNode;
  advancedMenuIcon?: MaterialDesignIconsIconName;
  advancedMenuTone?: BottomSheetActionRowTone;
  visible?: boolean;
  disabled?: boolean;
};

/** Inline, an action shows its icon, or its `label` as a text pill when no icon says it clearly. */
export type ResponsiveHeaderAction = ResponsiveHeaderActionBase &
  (
    | { inlineStyle?: 'icon'; inlineIcon: React.ReactNode }
    | { inlineStyle: 'text'; inlineIcon?: never }
  );

type ResponsiveHeaderActionsProps = {
  actions: ResponsiveHeaderAction[];
  menuVariant?: 'default' | 'advanced';
  menuTitle?: string;
};

export function ResponsiveHeaderActions({
  actions,
  menuVariant = 'default',
  menuTitle = 'ACTIONS',
}: ResponsiveHeaderActionsProps) {
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const visibleActions = actions.filter((action) => action.visible !== false);
  const showInlineHeaderActions =
    isLandscape || sizeClass !== 'small' || visibleActions.length <= 2;
  const hasActions = visibleActions.length > 0;
  const hasEnabledActions = visibleActions.some((action) => !action.disabled);

  if (!hasActions) {
    return <View style={styles.headerSpacer} />;
  }

  const handleMenuAction = (action: () => void) => {
    setIsMenuVisible(false);

    if (Platform.OS !== 'ios') {
      action();
      return;
    }

    pendingActionRef.current = action;
  };

  const handleMenuDismiss = () => {
    const pendingAction = pendingActionRef.current;
    pendingActionRef.current = null;
    pendingAction?.();
  };

  return (
    <>
      {showInlineHeaderActions ? (
        <View style={styles.headerRight}>
          {visibleActions.map((action) => (
            <Pressable
              key={action.key}
              testID={`header-action-${action.key}`}
              accessibilityRole="button"
              accessibilityLabel={action.accessibilityLabel ?? action.label}
              onPress={action.onPress}
              style={({ pressed }) => [
                action.inlineStyle === 'text' ? styles.textButton : styles.iconButton,
                { backgroundColor: palette.overlay10 },
                pressed && !action.disabled && styles.buttonPressed,
              ]}
              hitSlop={12}
              disabled={action.disabled}>
              {action.inlineStyle === 'text' ? (
                // Capped so large text sizes don't push the pill over the centered title.
                <ThemedText
                  style={[
                    styles.textButtonLabel,
                    { color: action.disabled ? palette.textMuted : palette.accent },
                  ]}
                  maxFontSizeMultiplier={1.2}>
                  {action.label}
                </ThemedText>
              ) : (
                action.inlineIcon
              )}
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.headerRightPortrait}>
          <Pressable
            testID="header-actions-menu"
            onPress={() => setIsMenuVisible(true)}
            style={({ pressed }) => [
              styles.iconButton,
              { backgroundColor: palette.overlay10 },
              pressed && hasEnabledActions && styles.buttonPressed,
            ]}
            hitSlop={12}
            disabled={!hasEnabledActions}>
            <MaterialCommunityIcons
              name="dots-horizontal"
              size={scaleBySizeClass(22, sizeClass)}
              color={hasEnabledActions ? palette.accent : palette.textMuted}
            />
          </Pressable>
        </View>
      )}

      {menuVariant === 'advanced' ? (
        <Modal
          visible={isMenuVisible}
          transparent
          animationType="fade"
          supportedOrientations={['portrait', 'landscape']}
          onDismiss={handleMenuDismiss}
          onRequestClose={() => setIsMenuVisible(false)}>
          <BottomSheet
            onDismiss={() => setIsMenuVisible(false)}
            overlayColor={palette.overlayDark88}
            sheetStyle={[styles.advancedSheet, { backgroundColor: palette.primary }]}
            minBottomPadding={12}>
            <View accessible={false} style={styles.advancedContent}>
              <View
                accessible={false}
                style={[styles.advancedHandle, { backgroundColor: palette.overlay20 }]}
              />
              <View
                accessible={false}
                style={[styles.advancedHeader, { borderBottomColor: palette.overlay10 }]}>
                <ThemedText style={[styles.advancedTitle, { color: palette.textMuted }]}>
                  {menuTitle}
                </ThemedText>
                <Pressable onPress={() => setIsMenuVisible(false)} hitSlop={12}>
                  <MaterialCommunityIcons
                    name="close"
                    size={scaleBySizeClass(22, sizeClass)}
                    color={palette.textMuted}
                  />
                </Pressable>
              </View>
              <View style={styles.advancedActions}>
                {visibleActions.map((action) => (
                  <BottomSheetActionRow
                    key={action.key}
                    testID={`header-menu-${action.key}`}
                    icon={action.advancedMenuIcon ?? 'dots-horizontal'}
                    label={action.label}
                    tone={action.advancedMenuTone}
                    disabled={action.disabled}
                    onPress={() => handleMenuAction(action.onPress)}
                  />
                ))}
              </View>
            </View>
          </BottomSheet>
        </Modal>
      ) : (
        <Modal
          visible={isMenuVisible}
          transparent
          animationType="fade"
          supportedOrientations={['portrait', 'landscape']}
          onDismiss={handleMenuDismiss}
          onRequestClose={() => setIsMenuVisible(false)}>
          <View style={StyleSheet.absoluteFill}>
            <Pressable
              style={[styles.menuOverlay, { backgroundColor: palette.overlayDark40 }]}
              onPress={() => setIsMenuVisible(false)}
            />
            <View
              style={[
                styles.menuSheet,
                {
                  backgroundColor: palette.modalBg,
                  borderColor: palette.overlay15,
                  bottom: Math.max(insets.bottom, 12),
                },
              ]}>
              {visibleActions.map((action) => (
                <Pressable
                  key={action.key}
                  style={({ pressed }) => [
                    styles.menuActionRow,
                    pressed && !action.disabled && styles.buttonPressed,
                  ]}
                  disabled={action.disabled}
                  onPress={() => handleMenuAction(action.onPress)}>
                  {action.menuIcon ?? (action.inlineStyle === 'text' ? null : action.inlineIcon)}
                  <ThemedText style={[styles.menuActionText, { color: palette.modalText }]}>
                    {action.label}
                  </ThemedText>
                </Pressable>
              ))}
              <Pressable
                style={({ pressed }) => [
                  styles.menuCancelButton,
                  { backgroundColor: palette.overlay10 },
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => setIsMenuVisible(false)}>
                <ThemedText style={[styles.menuCancelText, { color: palette.modalText }]}>
                  Cancel
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    iconButton: {
      padding: 8,
      borderRadius: 20,
    },
    // Matches the height of ScreenHeader's round back button.
    textButton: {
      minHeight: scaleBySizeClass(40, sizeClass),
      paddingHorizontal: scaleBySizeClass(14, sizeClass),
      borderRadius: scaleBySizeClass(20, sizeClass),
      justifyContent: 'center',
    },
    textButtonLabel: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    headerSpacer: {
      width: 40,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerRightPortrait: {
      minWidth: 40,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 8,
    },
    menuOverlay: {
      ...StyleSheet.absoluteFill,
    },
    menuSheet: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 24,
      borderRadius: 14,
      borderWidth: 1,
      padding: 12,
      gap: 6,
    },
    menuActionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    menuActionText: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    menuCancelButton: {
      marginTop: 6,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
    },
    menuCancelText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    advancedSheet: {
      maxHeight: '72%',
    },
    advancedContent: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      gap: 14,
    },
    advancedHandle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 999,
    },
    advancedHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 12,
      borderBottomWidth: 1,
      gap: 12,
    },
    advancedTitle: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 1,
    },
    advancedActions: {
      gap: 4,
    },
    buttonPressed: {
      opacity: 0.8,
    },
  });
}
