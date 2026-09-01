import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import type { AdvancedTimelineSub } from '@/lib/advancedTracking/advancedTimelineUtils';
import { hasItems } from '@/lib/utils';
import { Fonts } from '@/theme/theme';

interface LinkedSubDetailProps {
  subs: AdvancedTimelineSub[];
  stoppageActionId: string;
}

export default function LinkedSubDetail({ subs, stoppageActionId }: LinkedSubDetailProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const sub = subs.find((s) => s.stoppageActionId === stoppageActionId);
  if (!sub) return null;

  return (
    <View style={styles.subDetail}>
      {hasItems(sub.inNames) && (
        <View style={[styles.subBadge, { backgroundColor: palette.successOverlay10 }]}>
          <ThemedText style={[styles.subText, { color: palette.success }]}>
            In: {sub.inNames.join(', ')}
          </ThemedText>
        </View>
      )}
      {hasItems(sub.outNames) && (
        <View style={[styles.subBadge, { backgroundColor: palette.dangerOverlay10 }]}>
          <ThemedText style={[styles.subText, { color: palette.danger }]}>
            Out: {sub.outNames.join(', ')}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    subDetail: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 2,
      paddingLeft: 4,
    },
    subBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    subText: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.semiBold,
    },
  });
}
