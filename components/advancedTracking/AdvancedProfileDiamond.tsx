import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line as SvgLine, Polygon } from 'react-native-svg';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { AdvancedPlayerStats } from '@/lib/advancedTracking/advancedPlayerStatsUtils';
import { Fonts } from '@/theme/theme';

interface AdvancedProfileDiamondProps {
  stats: AdvancedPlayerStats;
}

export default function AdvancedProfileDiamond({ stats }: AdvancedProfileDiamondProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();

  const size = scaleBySizeClass(140, sizeClass);
  const styles = createStyles(sizeClass, size);
  const center = size / 2;
  const maxRadius = center - 20;

  const rawGoals = stats.goals;
  const rawAssists = stats.assists + stats.hockeyAssists;
  const rawDefense = stats.blocks + stats.pressures;
  const rawTurnovers = stats.throwaways + stats.drops;

  const scaleMax = Math.max(rawGoals, rawAssists, rawDefense, rawTurnovers, 1);
  const goals = rawGoals / scaleMax;
  const assists = rawAssists / scaleMax;
  const defense = rawDefense / scaleMax;
  const turnovers = rawTurnovers / scaleMax;

  const topY = center - goals * maxRadius;
  const rightX = center + assists * maxRadius;
  const bottomY = center + turnovers * maxRadius;
  const leftX = center - defense * maxRadius;

  const points = `${center},${topY} ${rightX},${center} ${center},${bottomY} ${leftX},${center}`;

  const outlinePoints = [
    `${center},${center - maxRadius}`,
    `${center + maxRadius},${center}`,
    `${center},${center + maxRadius}`,
    `${center - maxRadius},${center}`,
  ].join(' ');

  return (
    <View style={styles.container}>
      <ThemedText style={[styles.title, { color: palette.textMuted }]}>PROFILE</ThemedText>

      <View style={styles.diamondWrapper}>
        <ThemedText style={[styles.sideLabel, styles.leftLabel, { color: palette.textMuted }]}>
          BLK+PRS{'\n'}({rawDefense})
        </ThemedText>

        <View style={styles.diamondArea}>
          <Svg width={size} height={size}>
            <SvgLine
              x1={center}
              y1={center - maxRadius}
              x2={center}
              y2={center + maxRadius}
              stroke={palette.overlay10}
              strokeWidth="1"
            />
            <SvgLine
              x1={center - maxRadius}
              y1={center}
              x2={center + maxRadius}
              y2={center}
              stroke={palette.overlay10}
              strokeWidth="1"
            />
            <Polygon
              points={outlinePoints}
              fill="none"
              stroke={palette.overlay10}
              strokeWidth="1"
              strokeDasharray="4,4"
            />
            <Polygon
              points={points}
              fill={palette.accent}
              fillOpacity={0.3}
              stroke={palette.accent}
              strokeWidth="2"
            />
            <Circle cx={center} cy={center} r="3" fill={palette.textMuted} />
          </Svg>

          <ThemedText style={[styles.topLabel, { color: palette.textMuted }]}>
            GOALS ({rawGoals})
          </ThemedText>
          <ThemedText style={[styles.bottomLabel, { color: palette.danger }]}>
            TURNS ({rawTurnovers})
          </ThemedText>
        </View>

        <ThemedText style={[styles.sideLabel, styles.rightLabel, { color: palette.textMuted }]}>
          AST+HA{'\n'}({rawAssists})
        </ThemedText>
      </View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass, size: number) {
  return StyleSheet.create({
    container: {
      padding: 16,
      alignItems: 'center',
    },
    title: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 1,
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    diamondWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    diamondArea: {
      width: size,
      height: size,
      position: 'relative',
      justifyContent: 'center',
      alignItems: 'center',
    },
    sideLabel: {
      fontSize: scaleBySizeClass(9, sizeClass),
      fontFamily: Fonts.semiBold,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    leftLabel: {
      marginRight: 4,
    },
    rightLabel: {
      marginLeft: 4,
    },
    topLabel: {
      position: 'absolute',
      top: 2,
      left: 0,
      right: 0,
      textAlign: 'center',
      fontSize: scaleBySizeClass(9, sizeClass),
      fontFamily: Fonts.semiBold,
      textTransform: 'uppercase',
    },
    bottomLabel: {
      position: 'absolute',
      bottom: 2,
      left: 0,
      right: 0,
      textAlign: 'center',
      fontSize: scaleBySizeClass(9, sizeClass),
      fontFamily: Fonts.semiBold,
      textTransform: 'uppercase',
    },
  });
}
