import { ScoreBarActionRow } from '@/components/advancedTracking/scoreBar/ScoreBarActionRow';
import { ScoreBarMainRow } from '@/components/advancedTracking/scoreBar/ScoreBarMainRow';
import { ScoreBarPagination } from '@/components/advancedTracking/scoreBar/ScoreBarPagination';
import { useScoreBarData } from '@/components/advancedTracking/scoreBar/useScoreBarData';
import { useTheme } from '@/context/ThemeContext';
import { useLayout } from '@/hooks/useLayout';
import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

interface TrackerScoreBarProps {
  pointTimerAdjustedTimestamp: number | null;
  pointTimerPausedAt: number | null;
}

export const TrackerScoreBar = ({
  pointTimerAdjustedTimestamp,
  pointTimerPausedAt,
}: TrackerScoreBarProps) => {
  const { palette } = useTheme();
  const { width } = useLayout();
  const styles = createStyles();
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const data = useScoreBarData();

  const cardWidth = width - 20;

  const toggleExpanded = () => {
    const next = !isExpanded;
    setIsExpanded(next);
    scrollViewRef.current?.scrollTo({ x: next ? cardWidth : 0, animated: true });
  };

  if (!data) return null;

  return (
    <View style={styles.scoreBarContainer}>
      <View
        style={[
          styles.scoreboardCard,
          { backgroundColor: palette.primary, borderColor: palette.border, overflow: 'hidden' },
        ]}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onMomentumScrollEnd={(e) => {
            const page = Math.round(
              e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width,
            );
            setIsExpanded(page === 1);
          }}
          scrollEventThrottle={16}>
          <ScoreBarMainRow
            width={cardWidth}
            onToggleExpanded={toggleExpanded}
            pointTimerAdjustedTimestamp={pointTimerAdjustedTimestamp}
            pointTimerPausedAt={pointTimerPausedAt}
          />

          <ScoreBarActionRow width={cardWidth} />
        </ScrollView>
      </View>

      <ScoreBarPagination isExpanded={isExpanded} />
    </View>
  );
};

function createStyles() {
  return StyleSheet.create({
    scoreBarContainer: {
      position: 'relative',
      paddingHorizontal: 10,
      paddingTop: 8,
      paddingBottom: 4,
      zIndex: 10,
      gap: 0,
    },
    scoreboardCard: {
      borderWidth: 1,
      borderRadius: 22,
      borderCurve: 'continuous',
      overflow: 'hidden',
    },
  });
}
