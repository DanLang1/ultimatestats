import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';

import { OffenseActionButton } from './OffenseActionButton';

/** Tap-then-pick-a-player footer actions offered alongside the goal and drop swipes. */
export type OffenseTapAction = 'goal' | 'drop';

export interface OffenseActionsProps {
  hasHolder: boolean;
  canDropOpeningPull: boolean;
  onThrowaway: () => void;
  onArmTapAction: (action: OffenseTapAction) => void;
}

export const OffenseActions = ({
  hasHolder,
  canDropOpeningPull,
  onThrowaway,
  onArmTapAction,
}: OffenseActionsProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  return (
    <View style={styles.row}>
      <OffenseActionButton
        testID="offense-throwaway"
        label="T/A"
        accessibilityLabel="Throwaway"
        enabled={hasHolder}
        fillColor={palette.danger}
        onPress={onThrowaway}
      />
      <OffenseActionButton
        testID="offense-drop"
        label="DROP"
        accessibilityLabel="Drop, then tap who dropped it"
        enabled={hasHolder || canDropOpeningPull}
        fillColor={palette.danger}
        onPress={() => onArmTapAction('drop')}
      />
      <OffenseActionButton
        testID="offense-goal"
        label="GOAL"
        accessibilityLabel="Goal, then tap who scored"
        enabled={hasHolder}
        fillColor={palette.success}
        onPress={() => onArmTapAction('goal')}
      />
    </View>
  );
};

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    row: {
      flex: 1,
      flexDirection: 'row',
      gap: scaleBySizeClass(8, sizeClass),
    },
  });
}
