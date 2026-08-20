import { StyleSheet, View } from 'react-native';

import { ThrowTypePrompt } from '@/components/advancedTracking/bottomCard/ThrowTypePrompt';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  getGoalInfo,
  getLatestThrowDetailsTarget,
} from '@/lib/advancedTracking/trackingDisplayHelpers';
import { areBothSidesFullyTracked } from '@/lib/advancedTracking/trackingModeUtils';
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
  const lastPossession = point?.possessions.at(-1) ?? null;
  const goalInfo = getGoalInfo(point, game.focusSideId, game.participants);
  const shouldShowGoalCard =
    goalInfo != null && (goalInfo.isFocusGoal || areBothSidesFullyTracked(game));
  const throwTarget = shouldShowGoalCard
    ? getLatestThrowDetailsTarget(point, lastPossession)
    : null;
  const throwPrompt =
    throwTarget == null
      ? null
      : {
          target: throwTarget,
          availableTypes: getEligibleThrowTypes(throwTarget.result),
        };

  if (!shouldShowGoalCard) return null;

  const goalParticipants = [goalInfo?.assisterName, goalInfo?.scorerName].filter(
    (name): name is string => name != null,
  );
  const goalLabel = goalInfo?.isCallahan ? 'CALLAHAN' : 'GOAL';
  const goalSummary = goalParticipants.length > 0 ? `${goalParticipants.join(' + ')} · ` : '';

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
      style={[styles.card, { backgroundColor: palette.overlay02, borderColor: palette.overlay10 }]}>
      <View style={styles.summaryCopy}>
        <ThemedText numberOfLines={2} style={[styles.goalSummary, { color: palette.textInverse }]}>
          {goalSummary}
          {goalLabel}
        </ThemedText>
        {throwPrompt != null && (
          <ThrowTypePrompt
            accentColor={palette.accent}
            availableTypes={throwPrompt.availableTypes}
            value={throwPrompt.target.details?.type}
            onChange={handleThrowTypeChange}
          />
        )}
      </View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    card: {
      borderRadius: 18,
      borderWidth: 1,
      padding: scaleBySizeClass(14, sizeClass),
    },
    summaryCopy: {
      alignSelf: 'stretch',
    },
    goalSummary: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.extraBold,
      textTransform: 'uppercase',
    },
  });
}
