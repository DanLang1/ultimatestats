import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ScoreBarActionRow } from '@/components/advancedTracking/scoreBar/ScoreBarActionRow';
import { ScoreBarMainRow } from '@/components/advancedTracking/scoreBar/ScoreBarMainRow';
import {
  getScoreBarPaginationHeight,
  ScoreBarPagination,
} from '@/components/advancedTracking/scoreBar/ScoreBarPagination';
import { useScoreBarData } from '@/components/advancedTracking/scoreBar/useScoreBarData';
import { useTheme } from '@/context/ThemeContext';
import { SizeClass, useLayout } from '@/hooks/useLayout';

const SCORE_BAR_TOP_PADDING = 8;
const SCORE_BAR_BOTTOM_PADDING = 4;

/** Space above and below the score bar card, so a neighbor can line its edges up with the card. */
export function getScoreBarCardInsets(sizeClass: SizeClass): { top: number; bottom: number } {
  return {
    top: SCORE_BAR_TOP_PADDING,
    bottom: SCORE_BAR_BOTTOM_PADDING + getScoreBarPaginationHeight(sizeClass),
  };
}

interface TrackerScoreBarProps {
  /** Shares the tablet landscape header row with the last-action card. */
  isHalfWidth: boolean;
  pointTimerBase: number | null;
  pointTimerPausedAt: number | null;
  hideRedZoneControl: boolean;
}

export const TrackerScoreBar = ({
  isHalfWidth,
  pointTimerBase,
  pointTimerPausedAt,
  hideRedZoneControl,
}: TrackerScoreBarProps) => {
  const { palette } = useTheme();
  const { width: windowWidth } = useLayout();
  const styles = createStyles();
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const data = useScoreBarData();

  const width = isHalfWidth ? Math.floor(windowWidth / 2) : windowWidth;
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
        testID="tracker-scorecard"
        style={[
          styles.scoreboardCard,
          {
            backgroundColor: palette.primary,
            borderColor: data.redZoneSelected ? palette.danger : palette.border,
            borderWidth: data.redZoneSelected ? 2 : 1,
          },
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
            pointTimerBase={pointTimerBase}
            pointTimerPausedAt={pointTimerPausedAt}
            hideRedZoneControl={hideRedZoneControl}
          />

          <ScoreBarActionRow width={cardWidth} isHalfWidth={isHalfWidth} />
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
      paddingTop: SCORE_BAR_TOP_PADDING,
      paddingBottom: SCORE_BAR_BOTTOM_PADDING,
      zIndex: 10,
      gap: 0,
    },
    scoreboardCard: {
      borderRadius: 22,
      borderCurve: 'continuous',
      overflow: 'hidden',
    },
  });
}
