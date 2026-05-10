import { useTheme } from '@/context/ThemeContext';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface ScoreBarPaginationProps {
  isExpanded: boolean;
}

export const ScoreBarPagination = ({ isExpanded }: ScoreBarPaginationProps) => {
  const { palette } = useTheme();

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

const styles = StyleSheet.create({
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.3,
  },
});
