import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass } from '@/hooks/useLayout';
import { getAllPlayersByPoint } from '@/lib/lineUtils';
import { GameEvent, PointLineRecord } from '@/lib/storage';
import { computePointByPointEvents } from '@/lib/timelineUtils';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Fonts } from '@/theme/theme';

interface PointPresenceStripProps {
  playerId: string;
  events: GameEvent[];
  pointLines: PointLineRecord[];
  sizeClass: SizeClass;
  startingPossession: 'team1' | 'team2' | null;
  gameTo: number;
  autoHalftimeEnabled?: boolean;
}

export default function PointPresenceStrip({
  playerId,
  events,
  pointLines,
  sizeClass,
  startingPossession,
  gameTo,
  autoHalftimeEnabled,
}: PointPresenceStripProps) {
  const { palette } = useTheme();
  const styles = createStyles(sizeClass);

  let totalPoints = 0;
  const outcomes = new Map<number, boolean>();
  for (const event of events) {
    if (event.type === 'goal') {
      totalPoints++;
      outcomes.set(totalPoints, event.team === 'team1');
    }
  }

  if (totalPoints === 0) return null;

  const playersByPoint = getAllPlayersByPoint(pointLines);

  // Per-point offensive team (who had the disc at the start of each point)
  const pointByPoint = computePointByPointEvents(
    events,
    startingPossession,
    gameTo,
    undefined,
    undefined,
    autoHalftimeEnabled,
  );
  const offensiveByPoint = new Map<number, 'team1' | 'team2'>();
  for (const p of pointByPoint) {
    offensiveByPoint.set(p.pointNumber, p.offensiveTeam);
  }

  type SegmentType = 'Hold' | 'Break' | 'Opp Hold' | 'Broken' | 'Off';
  const usedTypes = new Set<SegmentType>();

  const segments = Array.from({ length: totalPoints }, (_, i) => {
    const p = i + 1;
    const onField = playersByPoint.get(p)?.has(playerId) ?? false;
    const won = outcomes.get(p) ?? false;
    const onOffense = offensiveByPoint.get(p) === 'team1';

    let segType: SegmentType;
    if (!onField) {
      segType = 'Off';
    } else if (onOffense && won) {
      segType = 'Hold';
    } else if (!onOffense && won) {
      segType = 'Break';
    } else if (!onOffense && !won) {
      segType = 'Opp Hold';
    } else {
      segType = 'Broken';
    }
    usedTypes.add(segType);
    return { p, segType };
  });

  const segColorMap: Record<SegmentType, string> = {
    Hold: palette.success,
    Break: palette.dLineAccent,
    'Opp Hold': palette.warning,
    Broken: palette.danger,
    Off: palette.overlay15,
  };
  const legendOrder: SegmentType[] = ['Hold', 'Break', 'Opp Hold', 'Broken', 'Off'];

  return (
    <View style={styles.container}>
      <ThemedText style={[styles.label, { color: palette.textMuted }]}>GAME BREAKDOWN</ThemedText>

      <View style={styles.bar}>
        {segments.map(({ p, segType }) => (
          <React.Fragment key={p}>
            <View style={[styles.segment, { backgroundColor: segColorMap[segType] }]} />
            {p < totalPoints && (
              <View style={[styles.divider, { backgroundColor: palette.overlay08 }]} />
            )}
          </React.Fragment>
        ))}
      </View>

      {/* Legend — only show types that appear in this game */}
      <View style={styles.legend}>
        {legendOrder
          .filter((type) => usedTypes.has(type))
          .map((type) => (
            <React.Fragment key={type}>
              <View style={[styles.legendSwatch, { backgroundColor: segColorMap[type] }]} />
              <ThemedText style={[styles.legendText, { color: palette.textMuted }]}>
                {type}
              </ThemedText>
            </React.Fragment>
          ))}
      </View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  const barH = scaleBySizeClass(20, sizeClass);
  return StyleSheet.create({
    container: {
      gap: 8,
    },
    label: {
      fontSize: scaleBySizeClass(9, sizeClass),
      fontFamily: Fonts.semiBold,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    bar: {
      flexDirection: 'row',
      height: barH,
      borderRadius: barH / 2,
      overflow: 'hidden',
    },
    segment: {
      flex: 1,
      height: barH,
    },
    divider: {
      height: barH,
      width: 1,
    },
    legend: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexWrap: 'wrap',
    },
    legendSwatch: {
      width: scaleBySizeClass(10, sizeClass),
      height: scaleBySizeClass(10, sizeClass),
      borderRadius: 2,
    },
    legendText: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.semiBold,
      marginRight: 6,
    },
  });
}
