import { useTheme } from '@/context/ThemeContext';
import { getSizeClassValue, scaleBySizeClass, SizeClass } from '@/hooks/useLayout';
import { MatchingType, Player, PlayerRole } from '@/lib/storage/types';
import { useSettingsStore } from '@/store/settingsStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

interface QuickEditPlayerRowProps {
  player: Player;
  isLandscape: boolean;
  sizeClass?: SizeClass;
  onEditPlayer: () => void;
  onSetActive: (isActive: boolean) => void;
  onSetMatching: (matchingType: MatchingType | null) => void;
  onSetRole: (role: PlayerRole | null) => void;
}

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const ROLE_ICONS: Record<PlayerRole, IconName> = {
  handler: 'bullseye-arrow',
  hybrid: 'star-three-points',
  cutter: 'shoe-print',
};

export function QuickEditPlayerRow({
  player,
  isLandscape,
  sizeClass = 'small',
  onEditPlayer,
  onSetActive,
  onSetMatching,
  onSetRole,
}: QuickEditPlayerRowProps) {
  const { palette } = useTheme();
  const { mmpColor, fmpColor } = useSettingsStore();
  const styles = createStyles(isLandscape, sizeClass);
  const metrics = createMetrics(sizeClass);

  return (
    <View
      style={[styles.row, { backgroundColor: palette.overlay05, borderColor: palette.overlay15 }]}>
      <View style={styles.topRow}>
        <Pressable
          style={({ pressed }) => [styles.nameButton, pressed && styles.buttonPressed]}
          onPress={onEditPlayer}>
          {player.role && (
            <MaterialCommunityIcons
              name={ROLE_ICONS[player.role]}
              size={metrics.roleBadgeIconSize}
              color={palette.textMuted}
            />
          )}
          <Text
            style={[
              styles.playerName,
              { color: player.isActive ? palette.textInverse : palette.textMuted },
            ]}
            numberOfLines={1}>
            {player.name}
          </Text>
          <MaterialCommunityIcons
            name="pencil-outline"
            size={metrics.pencilIconSize}
            color={palette.textMuted}
          />
        </Pressable>

        <View style={styles.topActions}>
          <Text style={[styles.activeLabel, { color: palette.textMuted }]}>Active</Text>
          <Switch
            style={{ transform: [{ scale: metrics.nativeSwitchScale }] }}
            value={player.isActive}
            onValueChange={onSetActive}
            trackColor={{ false: palette.overlay20, true: palette.accent }}
            thumbColor={player.isActive ? palette.textOnAccent : palette.textMuted}
          />
          <Pressable
            style={({ pressed }) => [
              styles.moreButton,
              { borderColor: palette.overlay20, backgroundColor: palette.overlay08 },
              pressed && styles.buttonPressed,
            ]}
            onPress={onEditPlayer}>
            <MaterialCommunityIcons
              name="dots-horizontal"
              size={metrics.moreIconSize}
              color={palette.textMuted}
            />
          </Pressable>
        </View>
      </View>

      <View style={styles.controlsRow}>
        <View style={styles.controlGroup}>
          <Text style={[styles.groupLabel, { color: palette.textMuted }]}>Matching</Text>
          <View style={styles.pillRow}>
            <Pressable
              style={({ pressed }) => [
                styles.pill,
                { borderColor: palette.overlay20 },
                player.matchingType === 'fmp' && {
                  backgroundColor: fmpColor,
                  borderColor: fmpColor,
                },
                pressed && styles.buttonPressed,
              ]}
              onPress={() => onSetMatching(player.matchingType === 'fmp' ? null : 'fmp')}>
              <Text
                style={[
                  styles.pillText,
                  {
                    color: player.matchingType === 'fmp' ? palette.textOnAccent : palette.textMuted,
                  },
                ]}>
                FMP
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.pill,
                { borderColor: palette.overlay20 },
                player.matchingType === 'mmp' && {
                  backgroundColor: mmpColor,
                  borderColor: mmpColor,
                },
                pressed && styles.buttonPressed,
              ]}
              onPress={() => onSetMatching(player.matchingType === 'mmp' ? null : 'mmp')}>
              <Text
                style={[
                  styles.pillText,
                  {
                    color: player.matchingType === 'mmp' ? palette.textOnAccent : palette.textMuted,
                  },
                ]}>
                MMP
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.controlGroup}>
          <Text style={[styles.groupLabel, { color: palette.textMuted }]}>Role</Text>
          <View style={styles.pillRow}>
            <Pressable
              style={({ pressed }) => [
                styles.pill,
                styles.rolePill,
                { borderColor: palette.overlay20 },
                player.role === 'handler' && {
                  backgroundColor: palette.accent,
                  borderColor: palette.accent,
                },
                pressed && styles.buttonPressed,
              ]}
              onPress={() => onSetRole(player.role === 'handler' ? null : 'handler')}>
              <MaterialCommunityIcons
                name={ROLE_ICONS.handler}
                size={metrics.rolePillIconSize}
                color={player.role === 'handler' ? palette.textOnAccent : palette.textMuted}
              />
              <Text
                style={[
                  styles.pillText,
                  { color: player.role === 'handler' ? palette.textOnAccent : palette.textMuted },
                ]}>
                Handler
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.pill,
                styles.rolePill,
                { borderColor: palette.overlay20 },
                player.role === 'hybrid' && {
                  backgroundColor: palette.accent,
                  borderColor: palette.accent,
                },
                pressed && styles.buttonPressed,
              ]}
              onPress={() => onSetRole(player.role === 'hybrid' ? null : 'hybrid')}>
              <MaterialCommunityIcons
                name={ROLE_ICONS.hybrid}
                size={metrics.rolePillIconSize}
                color={player.role === 'hybrid' ? palette.textOnAccent : palette.textMuted}
              />
              <Text
                style={[
                  styles.pillText,
                  { color: player.role === 'hybrid' ? palette.textOnAccent : palette.textMuted },
                ]}>
                Hybrid
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.pill,
                styles.rolePill,
                { borderColor: palette.overlay20 },
                player.role === 'cutter' && {
                  backgroundColor: palette.accent,
                  borderColor: palette.accent,
                },
                pressed && styles.buttonPressed,
              ]}
              onPress={() => onSetRole(player.role === 'cutter' ? null : 'cutter')}>
              <MaterialCommunityIcons
                name={ROLE_ICONS.cutter}
                size={metrics.rolePillIconSize}
                color={player.role === 'cutter' ? palette.textOnAccent : palette.textMuted}
              />
              <Text
                style={[
                  styles.pillText,
                  { color: player.role === 'cutter' ? palette.textOnAccent : palette.textMuted },
                ]}>
                Cutter
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

function createStyles(isLandscape: boolean, sizeClass: SizeClass) {
  return StyleSheet.create({
    row: {
      borderWidth: 1,
      borderRadius: scaleBySizeClass(12, sizeClass),
      paddingHorizontal: scaleBySizeClass(12, sizeClass),
      paddingVertical: scaleBySizeClass(10, sizeClass),
      gap: scaleBySizeClass(10, sizeClass),
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: scaleBySizeClass(12, sizeClass),
    },
    nameButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(8, sizeClass),
      minHeight: scaleBySizeClass(28, sizeClass),
    },
    playerName: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontWeight: '600',
      flexShrink: 1,
    },
    topActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(8, sizeClass),
    },
    activeLabel: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontWeight: '600',
    },
    moreButton: {
      width: scaleBySizeClass(30, sizeClass),
      height: scaleBySizeClass(30, sizeClass),
      borderRadius: scaleBySizeClass(8, sizeClass),
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    controlsRow: {
      flexDirection: isLandscape ? 'row' : 'column',
      gap: scaleBySizeClass(12, sizeClass),
    },
    controlGroup: {
      flex: 1,
      gap: scaleBySizeClass(6, sizeClass),
    },
    groupLabel: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontWeight: '700',
      letterSpacing: scaleBySizeClass(0.6, sizeClass, { rounding: 'none' }),
      textTransform: 'uppercase',
    },
    pillRow: {
      flexDirection: 'row',
      gap: scaleBySizeClass(6, sizeClass),
    },
    pill: {
      minHeight: scaleBySizeClass(30, sizeClass),
      minWidth: scaleBySizeClass(34, sizeClass),
      paddingHorizontal: scaleBySizeClass(8, sizeClass),
      borderRadius: scaleBySizeClass(8, sizeClass),
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rolePill: {
      flexDirection: 'row',
      gap: scaleBySizeClass(4, sizeClass),
    },
    pillText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontWeight: '700',
    },
    buttonPressed: {
      opacity: 0.8,
    },
  });
}

function createMetrics(sizeClass: SizeClass) {
  return {
    roleBadgeIconSize: scaleBySizeClass(15, sizeClass),
    pencilIconSize: scaleBySizeClass(14, sizeClass),
    moreIconSize: scaleBySizeClass(16, sizeClass),
    rolePillIconSize: scaleBySizeClass(13, sizeClass),
    nativeSwitchScale: getSizeClassValue({ small: 1, medium: 1.08, large: 1.15 }, sizeClass),
  };
}
