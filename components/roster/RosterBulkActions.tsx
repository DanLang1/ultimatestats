import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { MatchingType, PlayerRole } from '@/lib/storage/types';
import { useSettingsStore } from '@/store/settingsStore';
import { Fonts } from '@/theme/theme';

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
  const { sizeClass } = useLayout();
  const { palette } = useTheme();
  const styles = createStyles(sizeClass);
  const iconSize = scaleBySizeClass(14, sizeClass);
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
          <ThemedText style={[styles.actionPillText, { color: palette.textOnAccent }]}>
            FMP
          </ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.actionPill,
            styles.pillShadow,
            { backgroundColor: mmpColor, shadowColor: palette.shadow },
          ]}
          onPress={() => onSetMatching('mmp')}>
          <ThemedText style={[styles.actionPillText, { color: palette.textOnAccent }]}>
            MMP
          </ThemedText>
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
          <MaterialCommunityIcons
            name="bullseye-arrow"
            size={iconSize}
            color={palette.textInverse}
          />
          <ThemedText style={[styles.actionPillText, { color: palette.textInverse }]}>
            Handler
          </ThemedText>
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
          <MaterialCommunityIcons
            name="star-three-points"
            size={iconSize}
            color={palette.textInverse}
          />
          <ThemedText style={[styles.actionPillText, { color: palette.textInverse }]}>
            Hybrid
          </ThemedText>
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
          <MaterialCommunityIcons name="shoe-print" size={iconSize} color={palette.textInverse} />
          <ThemedText style={[styles.actionPillText, { color: palette.textInverse }]}>
            Cutter
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    bottomBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      gap: scaleBySizeClass(8, sizeClass),
      paddingHorizontal: scaleBySizeClass(16, sizeClass),
      paddingTop: scaleBySizeClass(12, sizeClass),
      paddingBottom: scaleBySizeClass(24, sizeClass),
      borderTopWidth: 1,
    },
    pillGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(8, sizeClass),
    },
    pillShadow: {
      shadowOffset: { width: 0, height: scaleBySizeClass(3, sizeClass) },
      shadowOpacity: 0.25,
      shadowRadius: scaleBySizeClass(6, sizeClass),
      elevation: scaleBySizeClass(8, sizeClass),
    },
    actionPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(4, sizeClass),
      paddingHorizontal: scaleBySizeClass(14, sizeClass),
      paddingVertical: scaleBySizeClass(10, sizeClass),
      borderRadius: scaleBySizeClass(20, sizeClass),
    },
    actionPillText: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    rolePill: {
      borderWidth: 1.5,
    },
  });
}
