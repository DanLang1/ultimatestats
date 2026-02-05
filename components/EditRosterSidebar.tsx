import { useTheme } from '@/context/ThemeContext';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

const EXPANDED_WIDTH = 180;
const COLLAPSED_WIDTH = 48;
const ANIMATION_DURATION = 200;

export interface EditRosterSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onBack: () => void;
  onRenameTeam: () => void;
  onNewTeam: () => void;
  onSwitchTeam: () => void;
  onEditPresets: () => void;
  onClearRoster: () => void;
  // Conditional visibility
  showSwitchTeam: boolean;
  showEditPresets: boolean;
  showClearRoster: boolean;
  showNewTeam: boolean;
}

interface SidebarButtonProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
  collapsed: boolean;
  variant?: 'default' | 'danger';
}

function SidebarButton({
  icon,
  label,
  onPress,
  collapsed,
  variant = 'default',
}: SidebarButtonProps) {
  const { palette } = useTheme();

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
      <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
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
  onBack,
  onRenameTeam,
  onNewTeam,
  onSwitchTeam,
  onEditPresets,
  onClearRoster,
  showSwitchTeam,
  showEditPresets,
  showClearRoster,
  showNewTeam,
}: EditRosterSidebarProps) {
  const { palette } = useTheme();

  const animatedStyle = useAnimatedStyle(() => ({
    width: withTiming(collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH, {
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
      {/* Top section - Back button only when expanded */}
      {!collapsed && (
        <View style={styles.topSection}>
          <SidebarButton icon="arrow-left" label="Back" onPress={onBack} collapsed={collapsed} />
        </View>
      )}

      {/* Actions section */}
      <View style={styles.actionsSection}>
        <SidebarButton
          icon="pencil-outline"
          label="Rename Team"
          onPress={onRenameTeam}
          collapsed={collapsed}
        />
        {showNewTeam && (
          <SidebarButton icon="plus" label="New Team" onPress={onNewTeam} collapsed={collapsed} />
        )}
        {showSwitchTeam && (
          <SidebarButton
            icon="swap-horizontal"
            label="Switch Team"
            onPress={onSwitchTeam}
            collapsed={collapsed}
          />
        )}
        {showEditPresets && (
          <SidebarButton
            icon="playlist-edit"
            label="Edit Lines"
            onPress={onEditPresets}
            collapsed={collapsed}
          />
        )}

        {/* Divider before danger action */}
        {showClearRoster && (
          <>
            <View style={[styles.divider, { backgroundColor: palette.overlay15 }]} />
            <SidebarButton
              icon="delete-sweep-outline"
              label="Clear Roster"
              onPress={onClearRoster}
              collapsed={collapsed}
              variant="danger"
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
            size={20}
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

const styles = StyleSheet.create({
  sidebar: {
    borderRightWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    justifyContent: 'space-between',
  },
  topSection: {
    marginBottom: 8,
  },
  actionsSection: {
    flex: 1,
    gap: 4,
  },
  bottomSection: {
    marginTop: 16,
  },
  sidebarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  sidebarButtonCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  sidebarButtonText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  divider: {
    height: 1,
    marginVertical: 8,
    marginHorizontal: 4,
  },
  collapseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  collapseButtonCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  collapseButtonText: {
    fontSize: 12,
    flex: 1,
  },
});
