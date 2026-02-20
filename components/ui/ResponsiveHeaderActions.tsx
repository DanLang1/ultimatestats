import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ResponsiveHeaderAction = {
  key: string;
  label: string;
  onPress: () => void;
  inlineIcon: React.ReactNode;
  menuIcon?: React.ReactNode;
  visible?: boolean;
  disabled?: boolean;
};

type ResponsiveHeaderActionsProps = {
  actions: ResponsiveHeaderAction[];
};

export function ResponsiveHeaderActions({ actions }: ResponsiveHeaderActionsProps) {
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  const showInlineHeaderActions = isLandscape || sizeClass !== 'small';
  const visibleActions = actions.filter((action) => action.visible !== false);
  const hasActions = visibleActions.length > 0;
  const hasEnabledActions = visibleActions.some((action) => !action.disabled);

  if (!hasActions) {
    return <View style={styles.headerSpacer} />;
  }

  return (
    <>
      {showInlineHeaderActions ? (
        <View style={styles.headerRight}>
          {visibleActions.map((action) => (
            <Pressable
              key={action.key}
              onPress={action.onPress}
              style={({ pressed }) => [
                styles.iconButton,
                { backgroundColor: palette.overlay10 },
                pressed && !action.disabled && styles.buttonPressed,
              ]}
              hitSlop={12}
              disabled={action.disabled}>
              {action.inlineIcon}
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.headerRightPortrait}>
          <Pressable
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

      <Modal
        visible={isMenuVisible}
        transparent
        animationType="fade"
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
                onPress={() => {
                  setIsMenuVisible(false);
                  action.onPress();
                }}>
                {action.menuIcon ?? action.inlineIcon}
                <Text style={[styles.menuActionText, { color: palette.modalText }]}>
                  {action.label}
                </Text>
              </Pressable>
            ))}
            <Pressable
              style={({ pressed }) => [
                styles.menuCancelButton,
                { backgroundColor: palette.overlay10 },
                pressed && styles.buttonPressed,
              ]}
              onPress={() => setIsMenuVisible(false)}>
              <Text style={[styles.menuCancelText, { color: palette.modalText }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    iconButton: {
      padding: 8,
      borderRadius: 20,
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
      ...StyleSheet.absoluteFillObject,
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
      fontWeight: '600',
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
      fontWeight: '600',
    },
    buttonPressed: {
      opacity: 0.8,
    },
  });
}
