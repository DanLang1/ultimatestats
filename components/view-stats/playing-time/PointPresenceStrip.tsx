import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass } from '@/hooks/useLayout';
import { getAllPlayersByPoint } from '@/lib/lineUtils';
import { GameEvent, PointLineRecord } from '@/lib/storage';
import { computePointByPointEvents } from '@/lib/timelineUtils';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

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

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: palette.textMuted }]}>GAME BREAKDOWN</Text>

      <View style={styles.bar}>
        {Array.from({ length: totalPoints }, (_, i) => {
          const p = i + 1;
          const onField = playersByPoint.get(p)?.has(playerId) ?? false;
          const won = outcomes.get(p) ?? false;
          const onOffense = offensiveByPoint.get(p) === 'team1';

          let segColor: string;
          if (!onField) {
            segColor = palette.overlay15; // Did not play
          } else if (onOffense && won) {
            segColor = palette.success; // Hold
          } else if (!onOffense && won) {
            segColor = palette.gold; // Break — exceptional
          } else if (!onOffense && !won) {
            segColor = palette.dLineAccent; // Opp Hold — D-line color
          } else {
            segColor = palette.danger; // Broken — bad
          }

          return (
            <React.Fragment key={p}>
              <View style={[styles.segment, { backgroundColor: segColor }]} />
              {p < totalPoints && (
                <View style={[styles.divider, { backgroundColor: palette.overlay08 }]} />
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={[styles.legendSwatch, { backgroundColor: palette.success }]} />
        <Text style={[styles.legendText, { color: palette.textMuted }]}>Hold</Text>
        <View style={[styles.legendSwatch, { backgroundColor: palette.gold }]} />
        <Text style={[styles.legendText, { color: palette.textMuted }]}>Break</Text>
        <View style={[styles.legendSwatch, { backgroundColor: palette.dLineAccent }]} />
        <Text style={[styles.legendText, { color: palette.textMuted }]}>Opp Hold</Text>
        <View style={[styles.legendSwatch, { backgroundColor: palette.danger }]} />
        <Text style={[styles.legendText, { color: palette.textMuted }]}>Broken</Text>
        <View style={[styles.legendSwatch, { backgroundColor: palette.overlay15 }]} />
        <Text style={[styles.legendText, { color: palette.textMuted }]}>Off</Text>
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
      fontWeight: '600',
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
      fontWeight: '500',
      marginRight: 6,
    },
  });
}
