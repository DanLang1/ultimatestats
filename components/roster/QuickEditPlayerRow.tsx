import { useTheme } from '@/context/ThemeContext';
import { MatchingType, Player, PlayerRole } from '@/lib/storage/types';
import { useSettingsStore } from '@/store/settingsStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

interface QuickEditPlayerRowProps {
  player: Player;
  isLandscape: boolean;
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
  onEditPlayer,
  onSetActive,
  onSetMatching,
  onSetRole,
}: QuickEditPlayerRowProps) {
  const { palette } = useTheme();
  const { mmpColor, fmpColor } = useSettingsStore();
  const styles = createStyles(isLandscape);

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
              size={15}
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
          <MaterialCommunityIcons name="pencil-outline" size={14} color={palette.textMuted} />
        </Pressable>

        <View style={styles.topActions}>
          <Text style={[styles.activeLabel, { color: palette.textMuted }]}>Active</Text>
          <Switch
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
            <MaterialCommunityIcons name="dots-horizontal" size={16} color={palette.textMuted} />
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
                size={13}
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
                size={13}
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
                size={13}
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

function createStyles(isLandscape: boolean) {
  return StyleSheet.create({
    row: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 10,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    nameButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minHeight: 28,
    },
    playerName: {
      fontSize: 16,
      fontWeight: '600',
      flexShrink: 1,
    },
    topActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    activeLabel: {
      fontSize: 12,
      fontWeight: '600',
    },
    moreButton: {
      width: 30,
      height: 30,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    controlsRow: {
      flexDirection: isLandscape ? 'row' : 'column',
      gap: 12,
    },
    controlGroup: {
      flex: 1,
      gap: 6,
    },
    groupLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    pillRow: {
      flexDirection: 'row',
      gap: 6,
    },
    pill: {
      minHeight: 30,
      minWidth: 34,
      paddingHorizontal: 8,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rolePill: {
      flexDirection: 'row',
      gap: 4,
    },
    pillText: {
      fontSize: 12,
      fontWeight: '700',
    },
    buttonPressed: {
      opacity: 0.8,
    },
  });
}
