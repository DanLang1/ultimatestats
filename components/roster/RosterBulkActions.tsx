import { useTheme } from '@/context/ThemeContext';
import { MatchingType, PlayerRole } from '@/lib/storage/types';
import { useSettingsStore } from '@/store/settingsStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface RosterBulkActionsProps {
  selectedCount: number;
  onSetMatching: (type: MatchingType) => void;
  onSetRole: (role: PlayerRole) => void;
  isVisible: boolean;
}

export default function RosterBulkActions({
  selectedCount,
  onSetMatching,
  onSetRole,
  isVisible,
}: RosterBulkActionsProps) {
  const { palette } = useTheme();
  const { fmpColor, mmpColor } = useSettingsStore();

  if (!isVisible || selectedCount === 0) return null;

  return (
    <View
      style={[
        styles.bottomBar,
        { backgroundColor: palette.primary, borderTopColor: palette.overlay20 },
      ]}>
      {/* Row 1: Matching type */}
      <View style={styles.pillGroup}>
        <Pressable
          style={[
            styles.actionPill,
            styles.pillShadow,
            { backgroundColor: fmpColor, shadowColor: palette.shadow },
          ]}
          onPress={() => onSetMatching('fmp')}>
          <Text style={[styles.actionPillText, { color: palette.textOnAccent }]}>FMP</Text>
        </Pressable>
        <Pressable
          style={[
            styles.actionPill,
            styles.pillShadow,
            { backgroundColor: mmpColor, shadowColor: palette.shadow },
          ]}
          onPress={() => onSetMatching('mmp')}>
          <Text style={[styles.actionPillText, { color: palette.textOnAccent }]}>MMP</Text>
        </Pressable>
      </View>

      {/* Row 2: Roles */}
      <View style={styles.pillGroup}>
        <Pressable
          style={[
            styles.actionPill,
            styles.pillShadow,
            styles.rolePill,
            {
              backgroundColor: palette.primary,
              borderColor: palette.overlay20,
              shadowColor: palette.shadow,
            },
          ]}
          onPress={() => onSetRole('handler')}>
          <MaterialCommunityIcons name="bullseye-arrow" size={14} color={palette.textInverse} />
          <Text style={[styles.actionPillText, { color: palette.textInverse }]}>Handler</Text>
        </Pressable>
        <Pressable
          style={[
            styles.actionPill,
            styles.pillShadow,
            styles.rolePill,
            {
              backgroundColor: palette.primary,
              borderColor: palette.overlay20,
              shadowColor: palette.shadow,
            },
          ]}
          onPress={() => onSetRole('hybrid')}>
          <MaterialCommunityIcons name="star-three-points" size={14} color={palette.textInverse} />
          <Text style={[styles.actionPillText, { color: palette.textInverse }]}>Hybrid</Text>
        </Pressable>
        <Pressable
          style={[
            styles.actionPill,
            styles.pillShadow,
            styles.rolePill,
            {
              backgroundColor: palette.primary,
              borderColor: palette.overlay20,
              shadowColor: palette.shadow,
            },
          ]}
          onPress={() => onSetRole('cutter')}>
          <MaterialCommunityIcons name="shoe-print" size={14} color={palette.textInverse} />
          <Text style={[styles.actionPillText, { color: palette.textInverse }]}>Cutter</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
  },
  pillGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pillShadow: {
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  actionPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  rolePill: {
    borderWidth: 1.5,
  },
});
