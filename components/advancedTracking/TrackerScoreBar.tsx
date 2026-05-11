import { ThemedText } from '@/components/ThemedText';
import { LandscapeTimeoutButton } from '@/components/advancedTracking/scoreBar/LandscapeTimeoutButton';
import { ScoreBarActionRow } from '@/components/advancedTracking/scoreBar/ScoreBarActionRow';
import { ScoreBarMainRow } from '@/components/advancedTracking/scoreBar/ScoreBarMainRow';
import { ScoreBarPagination } from '@/components/advancedTracking/scoreBar/ScoreBarPagination';
import { useScoreBarData } from '@/components/advancedTracking/scoreBar/useScoreBarData';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { formatPointTime } from '@/lib/advancedTracking/trackingDisplayHelpers';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

interface TrackerScoreBarProps {
  pointElapsedMs: number;
}

export const TrackerScoreBar = ({ pointElapsedMs }: TrackerScoreBarProps) => {
  const { palette } = useTheme();
  const { sizeClass, isLandscape, width } = useLayout();
  const styles = createStyles(sizeClass);
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

  const {
    focusSideId,
    oppSideId,
    focusSideName,
    oppSideName,
    focusScore,
    oppScore,
    focusTimeouts,
    oppTimeouts,
    stoppageActive,
    showPointTimer,
    isPointTimerPaused,
    currentPointNumber,
    handleTimeout,
    handlePause,
  } = data;

  if (isLandscape) {
    return (
      <View style={[styles.landscapeContainer, { paddingTop: 8 }]}>
        <View style={styles.landscapeTeamRow}>
          <ThemedText
            style={[styles.landscapeTeamName, { color: palette.textMuted }]}
            numberOfLines={1}>
            {focusSideName}
          </ThemedText>
          <ThemedText style={[styles.landscapeScore, { color: palette.textInverse }]}>
            {focusScore}
          </ThemedText>
          <LandscapeTimeoutButton
            state={focusTimeouts}
            onPress={() => handleTimeout(focusSideId)}
            stoppageActive={stoppageActive}
          />
        </View>

        <View style={[styles.landscapeDivider, { backgroundColor: palette.overlay15 }]} />

        <View style={styles.landscapeTeamRow}>
          <ThemedText
            style={[styles.landscapeTeamName, { color: palette.textMuted }]}
            numberOfLines={1}>
            {oppSideName}
          </ThemedText>
          <ThemedText style={[styles.landscapeScore, { color: palette.textInverse }]}>
            {oppScore}
          </ThemedText>
          <LandscapeTimeoutButton
            state={oppTimeouts}
            onPress={() => handleTimeout(oppSideId)}
            stoppageActive={stoppageActive}
          />
        </View>

        <View style={[styles.landscapeDivider, { backgroundColor: palette.overlay15 }]} />

        {showPointTimer && (
          <View style={styles.landscapeTimerRow}>
            <ThemedText style={[styles.landscapePointLabel, { color: palette.textMuted }]}>
              PT {currentPointNumber}
            </ThemedText>
            <View style={styles.landscapeTimerInner}>
              {!isPointTimerPaused && (
                <Pressable testID="scorebar-pause" onPress={handlePause} hitSlop={8}>
                  <MaterialCommunityIcons
                    name="pause"
                    size={scaleBySizeClass(18, sizeClass)}
                    color={palette.textMuted}
                  />
                </Pressable>
              )}
              <ThemedText style={[styles.landscapeTimer, { color: palette.textInverse }]}>
                {formatPointTime(pointElapsedMs)}
              </ThemedText>
            </View>
          </View>
        )}
      </View>
    );
  }

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
            pointElapsedMs={pointElapsedMs}
            onToggleExpanded={toggleExpanded}
          />

          <ScoreBarActionRow width={cardWidth} />
        </ScrollView>
      </View>

      <ScoreBarPagination isExpanded={isExpanded} />
    </View>
  );
};

function createStyles(sizeClass: SizeClass) {
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
    landscapeContainer: {
      paddingHorizontal: 12,
      paddingBottom: 4,
    },
    landscapeTeamRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 5,
      gap: 8,
    },
    landscapeTeamName: {
      flex: 1,
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.extraBold,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    landscapeScore: {
      fontSize: scaleBySizeClass(28, sizeClass),
      fontFamily: Fonts.black,
      fontVariant: ['tabular-nums'],
    },
    landscapeDivider: {
      height: 1,
      marginVertical: 4,
    },
    landscapeTimerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 5,
      gap: 8,
    },
    landscapeTimerInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    landscapePointLabel: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.black,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    landscapeTimer: {
      fontSize: scaleBySizeClass(18, sizeClass),
      fontFamily: Fonts.black,
      fontVariant: ['tabular-nums'],
      letterSpacing: 0.5,
    },
  });
}
