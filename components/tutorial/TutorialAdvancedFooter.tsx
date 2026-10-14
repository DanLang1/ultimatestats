import { StyleSheet, View } from 'react-native';

import { getFooterActionHeight } from '@/components/advancedTracking/bottomCard/constants';
import {
  OffenseActions,
  OffenseTapAction,
} from '@/components/advancedTracking/bottomCard/OffenseActions';
import TutorialAnimatedArrow from '@/components/tutorial/TutorialAnimatedArrow';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';

import type { TutorialFooterButton } from './useTutorialAdvancedGameState';

// Frame copied from TrackerActionFooter, which always renders voice and the defense actions.
const FOOTER_BOTTOM_PADDING = 20;
const FOOTER_HORIZONTAL_PADDING = 12;
const FOOTER_TOP_PADDING = 12;

// Slot order matches OffenseActions: T/A, Drop, Goal.
const CUE_SLOTS: (TutorialFooterButton | null)[] = ['throwaway', null, 'goal'];

interface TutorialAdvancedFooterProps {
  oppHasDisc: boolean;
  isRowHidden: boolean;
  cueButton: TutorialFooterButton | null;
  onThrowaway: () => void;
  onArmTapAction: (action: OffenseTapAction) => void;
}

export default function TutorialAdvancedFooter({
  oppHasDisc,
  isRowHidden,
  cueButton,
  onThrowaway,
  onArmTapAction,
}: TutorialAdvancedFooterProps) {
  const { palette } = useTheme();
  const { sizeClass, isCompactHeight } = useLayout();
  const styles = createStyles(sizeClass, isCompactHeight);

  // Defense steps leave the row empty; its height stays reserved so the grid never moves.
  if (oppHasDisc) {
    return (
      <View style={styles.container}>
        <View style={styles.row} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View
        testID="tutorial-offense-row"
        pointerEvents={isRowHidden ? 'none' : 'auto'}
        accessibilityElementsHidden={isRowHidden}
        importantForAccessibility={isRowHidden ? 'no-hide-descendants' : 'auto'}
        style={[styles.row, isRowHidden && styles.hiddenRow]}>
        <OffenseActions
          hasHolder
          canDropOpeningPull={false}
          onThrowaway={onThrowaway}
          onArmTapAction={onArmTapAction}
        />
        {cueButton != null && !isRowHidden && (
          <View pointerEvents="none" style={styles.cueRow}>
            {CUE_SLOTS.map((slot, index) => (
              <View key={slot ?? `slot-${index}`} style={styles.cueSlot}>
                {slot === cueButton && (
                  <TutorialAnimatedArrow
                    direction="down"
                    color={palette.accent}
                    size={scaleBySizeClass(30, sizeClass)}
                  />
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass, isCompactHeight: boolean) {
  return StyleSheet.create({
    container: {
      position: 'relative',
      paddingHorizontal: FOOTER_HORIZONTAL_PADDING,
      paddingTop: FOOTER_TOP_PADDING,
      paddingBottom: scaleBySizeClass(FOOTER_BOTTOM_PADDING, sizeClass),
    },
    row: {
      flexDirection: 'row',
      position: 'relative',
      minHeight: scaleBySizeClass(getFooterActionHeight(isCompactHeight), sizeClass),
    },
    hiddenRow: {
      opacity: 0,
    },
    cueRow: {
      position: 'absolute',
      bottom: '100%',
      left: 0,
      right: 0,
      flexDirection: 'row',
      gap: scaleBySizeClass(8, sizeClass),
      zIndex: 10,
    },
    cueSlot: {
      flex: 1,
      alignItems: 'center',
    },
  });
}
