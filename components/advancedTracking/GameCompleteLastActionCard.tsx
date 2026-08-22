import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, View } from 'react-native';

import { getPointOutcomeLabel } from '@/components/advancedTracking/betweenPointUtils';
import { ThrowTypePrompt } from '@/components/advancedTracking/bottomCard/ThrowTypePrompt';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  getGoalInfo,
  getLatestThrowDetailsTarget,
} from '@/lib/advancedTracking/trackingDisplayHelpers';
import { areBothSidesFullyTracked } from '@/lib/advancedTracking/trackingModeUtils';
import { getPointScoringSideId } from '@/lib/advancedTracking/trackingUtils';
import {
  getEligibleThrowTypes,
  type AdvancedTrackedGame,
  type ThrowType,
} from '@/lib/advancedTracking/types';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { Fonts } from '@/theme/theme';

interface GameCompleteLastActionCardProps {
  game: AdvancedTrackedGame;
}

export function GameCompleteLastActionCard({ game }: GameCompleteLastActionCardProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const { updateThrowType } = useAdvancedTrackingStore();

  const point = game.points.at(-1) ?? null;
  const goalInfo = getGoalInfo(point, game.focusSideId, game.participants);
  const shouldShowGoalCard =
    goalInfo != null && (goalInfo.isFocusGoal || areBothSidesFullyTracked(game));

  if (!shouldShowGoalCard || goalInfo == null || point == null) return null;

  const lastPossession = point.possessions[point.possessions.length - 1];
  const throwTarget = getLatestThrowDetailsTarget(point, lastPossession);
  const throwPrompt =
    throwTarget == null
      ? null
      : {
          target: throwTarget,
          availableTypes: getEligibleThrowTypes(throwTarget.result),
        };

  const scoringSideId = getPointScoringSideId(game, point);
  const pointOutcome = getPointOutcomeLabel({
    focusSideId: game.focusSideId,
    scoringSideId,
    receivingSideId: point.possessions[0].sideId,
    possessionSideIds: point.possessions.map((possession) => possession.sideId),
  });

  const goalLabel = goalInfo.isCallahan ? 'CALLAHAN' : 'GOAL';
  const accentColor = goalInfo.isFocusGoal ? palette.accent : palette.danger;

  const handleThrowTypeChange = (type: ThrowType | undefined) => {
    if (throwTarget == null) return;
    updateThrowType({
      pointId: throwTarget.pointId,
      possessionId: throwTarget.possessionId,
      actionId: throwTarget.actionId,
      type,
    });
  };

  return (
    <View
      testID="game-complete-last-goal-card"
      style={[styles.card, { backgroundColor: palette.overlay05, borderColor: palette.overlay10 }]}>
      <View style={styles.infoColumn}>
        <View style={styles.nameRow}>
          {goalInfo.assisterName != null && goalInfo.scorerName != null && (
            <>
              <ThemedText
                numberOfLines={1}
                style={[styles.nameText, { color: palette.textInverse }]}>
                {goalInfo.assisterName}
              </ThemedText>
              <MaterialCommunityIcons
                name="arrow-right"
                size={scaleBySizeClass(16, sizeClass)}
                color={palette.textMuted}
              />
            </>
          )}

          {goalInfo.scorerName != null && (
            <ThemedText numberOfLines={1} style={[styles.nameText, { color: palette.textInverse }]}>
              {goalInfo.scorerName}
            </ThemedText>
          )}
        </View>

        <View style={styles.metaRow}>
          <ThemedText style={[styles.metaText, { color: palette.textMuted }]}>
            {pointOutcome.toUpperCase()}
          </ThemedText>
          <ThemedText style={[styles.bullet, { color: palette.textMuted }]}>·</ThemedText>
          {goalInfo.assisterName != null && (
            <>
              <ThemedText style={[styles.metaText, { color: palette.textMuted }]}>
                ASSIST
              </ThemedText>
              <ThemedText style={[styles.bullet, { color: palette.textMuted }]}>+</ThemedText>
            </>
          )}
          <ThemedText style={[styles.metaText, { color: accentColor }]}>{goalLabel}</ThemedText>
        </View>
      </View>

      {throwPrompt != null && (
        <View style={styles.tagColumn}>
          <ThrowTypePrompt
            accentColor={accentColor}
            availableTypes={throwPrompt.availableTypes}
            value={throwPrompt.target.details?.type}
            onChange={handleThrowTypeChange}
          />
        </View>
      )}
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: 20,
      borderWidth: 1,
      paddingHorizontal: scaleBySizeClass(18, sizeClass),
      paddingVertical: scaleBySizeClass(16, sizeClass),
      gap: scaleBySizeClass(12, sizeClass),
    },
    infoColumn: {
      flex: 1,
      minWidth: 0,
      gap: scaleBySizeClass(4, sizeClass),
      justifyContent: 'center',
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(8, sizeClass),
      flexWrap: 'wrap',
    },
    nameText: {
      fontSize: scaleBySizeClass(17, sizeClass),
      fontFamily: Fonts.black,
      textTransform: 'uppercase',
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(5, sizeClass),
      flexWrap: 'wrap',
    },
    metaText: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 0.8,
    },
    bullet: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.black,
    },
    tagColumn: {
      flexShrink: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
