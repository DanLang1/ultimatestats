import { useTheme } from '@/context/ThemeContext';
import { getSizeClassValue, scaleBySizeClass, SizeClass } from '@/hooks/useLayout';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

const ANIMATION_DURATION = 200;

export interface EditRosterSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onRenameTeam: () => void;
  onNewTeam: () => void;
  onSwitchTeam: () => void;
  onEditPresets: () => void;
  onShareTeam: () => void;
  onClearRoster: () => void;
  // Conditional visibility
  showSwitchTeam: boolean;
  showEditPresets: boolean;
  showShareTeam: boolean;
  showClearRoster: boolean;
  showNewTeam: boolean;
  sizeClass?: SizeClass;
}

interface SidebarButtonProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
  collapsed: boolean;
  variant?: 'default' | 'danger';
  sizeClass?: SizeClass;
}

function SidebarButton({
  icon,
  label,
  onPress,
  collapsed,
  variant = 'default',
  sizeClass = 'small',
}: SidebarButtonProps) {
  const { palette } = useTheme();
  const styles = createStyles(sizeClass);
  const iconSize = scaleBySizeClass(20, sizeClass);

  const iconColor = variant === 'danger' ? palette.danger : palette.textInverse;
  const textColor = variant === 'danger' ? palette.danger : palette.textInverse;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.sidebarButton,
        collapsed && styles.sidebarButtonCollapsed,
        pressed && styles.buttonPressed,
      ]}>
      <MaterialCommunityIcons name={icon} size={iconSize} color={iconColor} />
      {!collapsed && (
        <Text style={[styles.sidebarButtonText, { color: textColor }]} numberOfLines={1}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function EditRosterSidebar({
  collapsed,
  onToggleCollapse,
  onRenameTeam,
  onNewTeam,
  onSwitchTeam,
  onEditPresets,
  onShareTeam,
  onClearRoster,
  showSwitchTeam,
  showEditPresets,
  showShareTeam,
  showClearRoster,
  showNewTeam,
  sizeClass = 'small',
}: EditRosterSidebarProps) {
  const { palette } = useTheme();
  const styles = createStyles(sizeClass);
  const metrics = createMetrics(sizeClass);

  const animatedStyle = useAnimatedStyle(() => ({
    width: withTiming(collapsed ? metrics.collapsedWidth : metrics.expandedWidth, {
      duration: ANIMATION_DURATION,
    }),
  }));

  return (
    <Animated.View
      style={[
        styles.sidebar,
        { backgroundColor: palette.overlay05, borderRightColor: palette.overlay10 },
        animatedStyle,
      ]}>
      {/* Actions section */}
      <View style={styles.actionsSection}>
        <SidebarButton
          icon="pencil-outline"
          label="Rename Team"
          onPress={onRenameTeam}
          collapsed={collapsed}
          sizeClass={sizeClass}
        />
        {showNewTeam && (
          <SidebarButton
            icon="plus"
            label="New Team"
            onPress={onNewTeam}
            collapsed={collapsed}
            sizeClass={sizeClass}
          />
        )}
        {showSwitchTeam && (
          <SidebarButton
            icon="swap-horizontal"
            label="Switch Team"
            onPress={onSwitchTeam}
            collapsed={collapsed}
            sizeClass={sizeClass}
          />
        )}
        {showEditPresets && (
          <SidebarButton
            icon="playlist-edit"
            label="Edit Lines"
            onPress={onEditPresets}
            collapsed={collapsed}
            sizeClass={sizeClass}
          />
        )}
        {showShareTeam && (
          <SidebarButton
            icon="share-variant"
            label="Share Team"
            onPress={onShareTeam}
            collapsed={collapsed}
            sizeClass={sizeClass}
          />
        )}
        {showClearRoster && (
          <>
            <SidebarButton
              icon="delete-sweep-outline"
              label="Clear Roster"
              onPress={onClearRoster}
              collapsed={collapsed}
              variant="danger"
              sizeClass={sizeClass}
            />
          </>
        )}
      </View>

      {/* Bottom section - Collapse toggle */}
      <View style={styles.bottomSection}>
        <Pressable
          onPress={onToggleCollapse}
          style={({ pressed }) => [
            styles.collapseButton,
            collapsed && styles.collapseButtonCollapsed,
            pressed && styles.buttonPressed,
          ]}>
          <MaterialCommunityIcons
            name={collapsed ? 'chevron-right' : 'chevron-left'}
            size={metrics.toggleIconSize}
            color={palette.textMuted}
          />
          {!collapsed && (
            <Text style={[styles.collapseButtonText, { color: palette.textMuted }]}>Collapse</Text>
          )}
        </Pressable>
      </View>
    </Animated.View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    sidebar: {
      borderRightWidth: 1,
      paddingVertical: scaleBySizeClass(16, sizeClass),
      paddingHorizontal: scaleBySizeClass(8, sizeClass),
      justifyContent: 'space-between',
    },
    actionsSection: {
      flex: 1,
      gap: scaleBySizeClass(2, sizeClass),
    },
    bottomSection: {
      marginTop: scaleBySizeClass(16, sizeClass),
    },
    sidebarButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(12, sizeClass),
      paddingVertical: scaleBySizeClass(12, sizeClass),
      paddingHorizontal: scaleBySizeClass(12, sizeClass),
      borderRadius: scaleBySizeClass(8, sizeClass),
    },
    sidebarButtonCollapsed: {
      justifyContent: 'center',
      paddingHorizontal: 0,
    },
    sidebarButtonText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontWeight: '500',
      flex: 1,
    },
    buttonPressed: {
      opacity: 0.7,
    },
    divider: {
      height: 1,
      marginVertical: scaleBySizeClass(8, sizeClass),
      marginHorizontal: scaleBySizeClass(4, sizeClass),
    },
    collapseButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(8, sizeClass),
      paddingVertical: scaleBySizeClass(8, sizeClass),
      paddingHorizontal: scaleBySizeClass(12, sizeClass),
      borderRadius: scaleBySizeClass(8, sizeClass),
    },
    collapseButtonCollapsed: {
      justifyContent: 'center',
      paddingHorizontal: 0,
    },
    collapseButtonText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      flex: 1,
    },
  });
}

function createMetrics(sizeClass: SizeClass) {
  return {
    expandedWidth: getSizeClassValue({ small: 180, medium: 196, large: 212 }, sizeClass),
    collapsedWidth: getSizeClassValue({ small: 48, medium: 52, large: 56 }, sizeClass),
    toggleIconSize: scaleBySizeClass(20, sizeClass),
  };
}
