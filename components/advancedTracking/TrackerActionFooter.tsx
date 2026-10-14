import React from 'react';
import { StyleSheet, View } from 'react-native';

import {
  getFooterActionHeight,
  PICKUP_PROMPT_TEXT,
} from '@/components/advancedTracking/bottomCard/constants';
import { DefenseActions } from '@/components/advancedTracking/bottomCard/DefenseActions';
import {
  OffenseActions,
  OffenseActionsProps,
} from '@/components/advancedTracking/bottomCard/OffenseActions';
import { TrackerVoiceButton } from '@/components/advancedTracking/TrackerVoiceButton';
import { TrackerVoiceFeedbackPill } from '@/components/advancedTracking/TrackerVoiceFeedbackPill';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { VoiceStatCommandsControls } from '@/hooks/advancedTracking/useVoiceStatCommands';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { TrackerFooterMode } from '@/lib/advancedTracking/trackerSessionView';
import { Fonts } from '@/theme/theme';

const FOOTER_BOTTOM_PADDING = 20;
const FOOTER_HORIZONTAL_PADDING = 12;
const FOOTER_TOP_PADDING = 12;

interface TrackerActionFooterProps {
  mode: TrackerFooterMode;
  voiceControls: VoiceStatCommandsControls;
  canUseVoice: boolean;
  offenseActions: OffenseActionsProps;
  onOppScored: () => void;
  onOppTurnover: () => void;
}

export const TrackerActionFooter = ({
  mode,
  voiceControls,
  canUseVoice,
  offenseActions,
  onOppScored,
  onOppTurnover,
}: TrackerActionFooterProps) => {
  const { palette } = useTheme();
  const { sizeClass, isCompactHeight } = useLayout();
  const styles = createStyles(sizeClass, isCompactHeight);

  // A modifier (More menu, Goal, or Drop) owns the next tap. Hide the row but keep its
  // space so the player grid does not resize under the user's finger.
  const isRowHidden = mode.hidden;
  const rowVisibilityProps = {
    pointerEvents: isRowHidden ? ('none' as const) : ('auto' as const),
    accessibilityElementsHidden: isRowHidden,
    importantForAccessibility: isRowHidden ? ('no-hide-descendants' as const) : ('auto' as const),
  };

  let content: React.ReactNode;
  if (mode.kind === 'defense') {
    content = (
      <View
        testID="tracker-defense-row"
        {...rowVisibilityProps}
        style={[styles.defenseRow, isRowHidden && styles.hiddenRow]}>
        <DefenseActions onOppScored={onOppScored} onOppTurnover={onOppTurnover} />
      </View>
    );
  } else {
    content = (
      <View
        testID="tracker-offense-row"
        {...rowVisibilityProps}
        style={[styles.offenseRow, isRowHidden && styles.hiddenRow]}>
        {mode.kind === 'pickup' ? (
          // A mid-point pickup has nothing to act on but the player grid, so a prompt replaces
          // the disabled buttons.
          <View
            testID="tracker-pickup-prompt"
            accessibilityRole="text"
            style={[styles.pickupPrompt, { borderColor: palette.overlay10 }]}>
            <ThemedText
              numberOfLines={1}
              style={[styles.pickupPromptText, { color: palette.textMuted }]}>
              {PICKUP_PROMPT_TEXT}
            </ThemedText>
          </View>
        ) : (
          <>
            <View pointerEvents="none" style={styles.voiceFeedbackOverlay}>
              <TrackerVoiceFeedbackPill controls={voiceControls} />
            </View>
            <TrackerVoiceButton controls={voiceControls} disabled={!canUseVoice} />
            <OffenseActions {...offenseActions} />
          </>
        )}
      </View>
    );
  }

  // Always render the container so the footer's bottom padding is preserved.
  return <View style={styles.container}>{content}</View>;
};

function createStyles(sizeClass: SizeClass, isCompactHeight: boolean) {
  return StyleSheet.create({
    container: {
      position: 'relative',
      paddingHorizontal: FOOTER_HORIZONTAL_PADDING,
      paddingTop: FOOTER_TOP_PADDING,
      paddingBottom: scaleBySizeClass(FOOTER_BOTTOM_PADDING, sizeClass),
    },
    // No `flex: 1` on the rows: in this auto-height container a zero flex basis lets Yoga size
    // the footer without the row, so the buttons overflow the screen instead of shrinking the grid.
    defenseRow: {
      flexDirection: 'row',
    },
    offenseRow: {
      flexDirection: 'row',
      position: 'relative',
      gap: scaleBySizeClass(8, sizeClass),
    },
    hiddenRow: {
      opacity: 0,
    },
    pickupPrompt: {
      flex: 1,
      minHeight: scaleBySizeClass(getFooterActionHeight(isCompactHeight), sizeClass),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 16,
      borderCurve: 'continuous',
      borderWidth: 1,
      borderStyle: 'dashed',
      paddingHorizontal: scaleBySizeClass(12, sizeClass),
    },
    pickupPromptText: {
      fontFamily: Fonts.bold,
      fontSize: scaleBySizeClass(13, sizeClass),
      letterSpacing: 0.8,
    },
    voiceFeedbackOverlay: {
      position: 'absolute',
      bottom: '100%',
      left: 0,
      right: 0,
      paddingBottom: 8,
      zIndex: 20,
    },
  });
}
