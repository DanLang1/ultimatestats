import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';

const DOT_SIZE = 8;
const DOTS_MARGIN_TOP = 4;

/** Height the page dots add below the score bar card. */
export function getScoreBarPaginationHeight(sizeClass: SizeClass): number {
  return scaleBySizeClass(DOTS_MARGIN_TOP, sizeClass) + scaleBySizeClass(DOT_SIZE, sizeClass);
}

interface ScoreBarPaginationProps {
  isExpanded: boolean;
}

export const ScoreBarPagination = ({ isExpanded }: ScoreBarPaginationProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  return (
    <View style={styles.paginationDots}>
      <View
        style={[
          styles.dot,
          { backgroundColor: palette.textMuted },
          !isExpanded && { backgroundColor: palette.textInverse, opacity: 1 },
        ]}
      />
      <View
        style={[
          styles.dot,
          { backgroundColor: palette.textMuted },
          isExpanded && { backgroundColor: palette.textInverse, opacity: 1 },
        ]}
      />
    </View>
  );
};

function createStyles(sizeClass: SizeClass) {
  const dotSize = scaleBySizeClass(DOT_SIZE, sizeClass);

  return StyleSheet.create({
    paginationDots: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: scaleBySizeClass(6, sizeClass),
      marginTop: scaleBySizeClass(DOTS_MARGIN_TOP, sizeClass),
    },
    dot: {
      width: dotSize,
      height: dotSize,
      borderRadius: dotSize / 2,
      opacity: 0.3,
    },
  });
}
