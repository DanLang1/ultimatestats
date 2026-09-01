import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';

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
  const dotSize = scaleBySizeClass(8, sizeClass);

  return StyleSheet.create({
    paginationDots: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: scaleBySizeClass(6, sizeClass),
      marginTop: scaleBySizeClass(4, sizeClass),
    },
    dot: {
      width: dotSize,
      height: dotSize,
      borderRadius: dotSize / 2,
      opacity: 0.3,
    },
  });
}
