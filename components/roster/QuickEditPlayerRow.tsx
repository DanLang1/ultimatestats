import { useTheme } from '@/context/ThemeContext';
import { getSizeClassValue, scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { normalizePlayerNumber } from '@/lib/advancedTracking/voiceNumberUtils';
import { MAX_PLAYER_NUMBER_LENGTH } from '@/lib/constants';
import { MatchingType, Player, PlayerRole } from '@/lib/storage/types';
import { useSettingsStore } from '@/store/settingsStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Fonts } from '@/theme/theme';

interface QuickEditPlayerRowProps {
  player: Player;
  isLandscape: boolean;
  onEditPlayer: () => void;
  onSetActive: (isActive: boolean) => void;
  onSetMatching: (matchingType: MatchingType | null) => void;
  onSetNumber: (number: string) => Promise<boolean>;
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
  onSetNumber,
  onSetRole,
}: QuickEditPlayerRowProps) {
  const { sizeClass } = useLayout();
  const { palette } = useTheme();
  const { mmpColor, fmpColor } = useSettingsStore();
  const styles = createStyles(isLandscape, sizeClass);
  const metrics = createMetrics(sizeClass);
  const [draftNumber, setDraftNumber] = useState(player.number ?? '');

  const handleNumberBlur = async () => {
    if (draftNumber === (player.number ?? '')) return;
    const didSave = await onSetNumber(draftNumber);
    if (!didSave) {
      setDraftNumber(player.number ?? '');
    }
  };

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
          <ThemedText
            style={[
              styles.playerName,
              { color: player.isActive ? palette.textInverse : palette.textMuted },
            ]}
            numberOfLines={1}>
            {player.name}
          </ThemedText>
          <MaterialCommunityIcons
            name="pencil-outline"
            size={metrics.pencilIconSize}
            color={palette.textMuted}
          />
        </Pressable>

        <View style={styles.topActions}>
          <ThemedText style={[styles.activeLabel, { color: palette.textMuted }]}>Active</ThemedText>
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
        <View style={styles.numberGroup}>
          <ThemedText style={[styles.groupLabel, { color: palette.textMuted }]}>Number</ThemedText>
          <TextInput
            style={[
              styles.numberInput,
              {
                borderColor: palette.overlay20,
                backgroundColor: palette.overlay08,
                color: palette.textInverse,
              },
            ]}
            value={draftNumber}
            onChangeText={(value) => setDraftNumber(normalizePlayerNumber(value))}
            onBlur={handleNumberBlur}
            placeholder="#"
            placeholderTextColor={palette.textMuted}
            keyboardType="number-pad"
            maxLength={MAX_PLAYER_NUMBER_LENGTH}
          />
        </View>

        <View style={styles.controlGroup}>
          <ThemedText style={[styles.groupLabel, { color: palette.textMuted }]}>
            Matching
          </ThemedText>
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
              <ThemedText
                style={[
                  styles.pillText,
                  {
                    color: player.matchingType === 'fmp' ? palette.textOnAccent : palette.textMuted,
                  },
                ]}>
                FMP
              </ThemedText>
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
              <ThemedText
                style={[
                  styles.pillText,
                  {
                    color: player.matchingType === 'mmp' ? palette.textOnAccent : palette.textMuted,
                  },
                ]}>
                MMP
              </ThemedText>
            </Pressable>
          </View>
        </View>

        <View style={styles.controlGroup}>
          <ThemedText style={[styles.groupLabel, { color: palette.textMuted }]}>Role</ThemedText>
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
              <ThemedText
                style={[
                  styles.pillText,
                  { color: player.role === 'handler' ? palette.textOnAccent : palette.textMuted },
                ]}>
                Handler
              </ThemedText>
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
              <ThemedText
                style={[
                  styles.pillText,
                  { color: player.role === 'hybrid' ? palette.textOnAccent : palette.textMuted },
                ]}>
                Hybrid
              </ThemedText>
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
              <ThemedText
                style={[
                  styles.pillText,
                  { color: player.role === 'cutter' ? palette.textOnAccent : palette.textMuted },
                ]}>
                Cutter
              </ThemedText>
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
      fontFamily: Fonts.semiBold,
      flexShrink: 1,
    },
    topActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(8, sizeClass),
    },
    activeLabel: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.semiBold,
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
    numberGroup: {
      gap: scaleBySizeClass(6, sizeClass),
      width: isLandscape ? scaleBySizeClass(72, sizeClass) : '100%',
    },
    numberInput: {
      minHeight: scaleBySizeClass(30, sizeClass),
      borderRadius: scaleBySizeClass(8, sizeClass),
      borderWidth: 1,
      paddingHorizontal: scaleBySizeClass(8, sizeClass),
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.bold,
    },
    controlGroup: {
      flex: 1,
      gap: scaleBySizeClass(6, sizeClass),
    },
    groupLabel: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.bold,
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
      fontFamily: Fonts.bold,
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
    nativeSwitchScale:
      Platform.OS === 'ios'
        ? getSizeClassValue({ small: 0.8, medium: 0.9, large: 1.0 }, sizeClass)
        : getSizeClassValue({ small: 1, medium: 1.08, large: 1.15 }, sizeClass),
  };
}
