import { StyleSheet, View } from 'react-native';

import DashboardPrimaryButton from '@/components/dashboard/DashboardPrimaryButton';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { pluralize } from '@/lib/utils';
import { Fonts } from '@/theme/theme';

interface DashboardIdleHeroProps {
  teamName: string;
  rosterCount: number;
  onStartGame: () => void;
}

/** With no game in progress: the current team and the screen's one primary action. */
export default function DashboardIdleHero({
  teamName,
  rosterCount,
  onStartGame,
}: DashboardIdleHeroProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const hasRoster = rosterCount > 0;

  return (
    <View style={[styles.card, { backgroundColor: palette.overlay05 }]}>
      <View style={styles.team}>
        <ThemedText style={[styles.teamName, { color: palette.textInverse }]} numberOfLines={2}>
          {teamName}
        </ThemedText>
        {hasRoster && (
          <ThemedText style={[styles.meta, { color: palette.textMuted }]}>
            {rosterCount} {pluralize(rosterCount, 'player', 'players')}
          </ThemedText>
        )}
      </View>
      <DashboardPrimaryButton
        testID="dashboard-new-game-button"
        label="Start game"
        onPress={onStartGame}
      />
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    card: {
      borderRadius: 18,
      padding: scaleBySizeClass(20, sizeClass),
      gap: scaleBySizeClass(16, sizeClass),
    },
    team: {
      gap: scaleBySizeClass(2, sizeClass),
    },
    teamName: {
      fontSize: scaleBySizeClass(22, sizeClass),
      fontFamily: Fonts.bold,
      lineHeight: scaleBySizeClass(28, sizeClass),
    },
    meta: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.semiBold,
    },
  });
}
