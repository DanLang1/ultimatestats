import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  FOOTER_ACTION_HEIGHT,
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
import { getActiveSideId } from '@/lib/advancedTracking/trackingDisplayHelpers';
import { areBothSidesFullyTracked } from '@/lib/advancedTracking/trackingModeUtils';
import {
  getCurrentPoint,
  getCurrentPossession,
  hasPointEnded,
} from '@/lib/advancedTracking/trackingUtils';
import { PassModifier } from '@/lib/advancedTracking/types';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { Fonts } from '@/theme/theme';

const FOOTER_BOTTOM_PADDING = 48;
const ANDROID_FOOTER_BOTTOM_PADDING = 20;
const FOOTER_HORIZONTAL_PADDING = 12;
const FOOTER_TOP_PADDING = 12;

interface TrackerActionFooterProps {
  onStartNextPoint: () => void;
  voiceControls: VoiceStatCommandsControls;
  canUseVoice: boolean;
  offenseActions: OffenseActionsProps;
  passModifier: PassModifier;
  isAwaitingMidPointPickup: boolean;
}

export const TrackerActionFooter = ({
  onStartNextPoint,
  voiceControls,
  canUseVoice,
  offenseActions,
  passModifier,
  isAwaitingMidPointPickup,
}: TrackerActionFooterProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const insets = useSafeAreaInsets();

  const game = useAdvancedTrackingStore((state) => state.currentGame);
  const recordCaptureIntent = useAdvancedTrackingStore((state) => state.recordCaptureIntent);
  if (!game) return null;

  const point = getCurrentPoint(game);
  const possession = getCurrentPossession(game);
  const pointIsOver = hasPointEnded(point);
  const activeSideId = getActiveSideId(possession, game);
  const oppHasDisc =
    !areBothSidesFullyTracked(game) && !pointIsOver && activeSideId !== game.focusSideId;
  const styles = createStyles(sizeClass, insets.bottom);

  const handleOppTurnover = () => {
    recordCaptureIntent({ kind: 'anonymous-opponent-turnover' });
  };

  const handleOppScored = () => {
    recordCaptureIntent({ kind: 'anonymous-opponent-goal' });
  };

  let content: React.ReactNode;

  if (pointIsOver) {
    content = (
      <View style={styles.pointOverRow}>
        <Pressable
          testID="tracker-next-point"
          onPress={onStartNextPoint}
          style={({ pressed }) => [
            styles.nextPointBtn,
            {
              backgroundColor: palette.successOverlay10,
              borderColor: palette.successOverlay15,
            },
            pressed && { opacity: 0.7 },
          ]}>
          <MaterialCommunityIcons
            name="arrow-right-circle"
            size={scaleBySizeClass(20, sizeClass)}
            color={palette.success}
            style={{ marginRight: 8 }}
          />
          <ThemedText style={[styles.btnText, { color: palette.success }]}>NEXT POINT</ThemedText>
        </Pressable>
      </View>
    );
  } else {
    // A modifier (More menu, Goal, or Drop) owns the next tap. Hide the row but keep its
    // space so the player grid does not resize under the user's finger.
    const isRowHidden = passModifier !== null;
    const rowVisibilityProps = {
      pointerEvents: isRowHidden ? ('none' as const) : ('auto' as const),
      accessibilityElementsHidden: isRowHidden,
      importantForAccessibility: isRowHidden ? ('no-hide-descendants' as const) : ('auto' as const),
    };
    let offenseRowContent: React.ReactNode = (
      <>
        <View pointerEvents="none" style={styles.voiceFeedbackOverlay}>
          <TrackerVoiceFeedbackPill controls={voiceControls} />
        </View>
        <TrackerVoiceButton controls={voiceControls} disabled={!canUseVoice} />
        <OffenseActions {...offenseActions} />
      </>
    );
    // A mid-point pickup has nothing to act on but the player grid, so a prompt replaces the
    // disabled buttons.
    if (isAwaitingMidPointPickup) {
      offenseRowContent = (
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
      );
    }
    content = oppHasDisc ? (
      <View
        testID="tracker-defense-row"
        {...rowVisibilityProps}
        style={[styles.defenseRow, isRowHidden && styles.hiddenRow]}>
        <DefenseActions onOppScored={handleOppScored} onOppTurnover={handleOppTurnover} />
      </View>
    ) : (
      <View
        testID="tracker-offense-row"
        {...rowVisibilityProps}
        style={[styles.offenseRow, isRowHidden && styles.hiddenRow]}>
        {offenseRowContent}
      </View>
    );
  }

  // Always render the container so bottom safe-area padding is preserved.
  return <View style={styles.container}>{content}</View>;
};

function createStyles(sizeClass: SizeClass, bottomInset: number) {
  let footerBottomPadding = FOOTER_BOTTOM_PADDING;
  if (Platform.OS === 'android') {
    footerBottomPadding = ANDROID_FOOTER_BOTTOM_PADDING;
  }

  return StyleSheet.create({
    container: {
      position: 'relative',
      paddingHorizontal: FOOTER_HORIZONTAL_PADDING,
      paddingTop: FOOTER_TOP_PADDING,
      paddingBottom: bottomInset + scaleBySizeClass(footerBottomPadding, sizeClass),
    },
    defenseRow: {
      flex: 1,
      flexDirection: 'row',
    },
    offenseRow: {
      flex: 1,
      flexDirection: 'row',
      position: 'relative',
      gap: scaleBySizeClass(8, sizeClass),
    },
    hiddenRow: {
      opacity: 0,
    },
    pickupPrompt: {
      flex: 1,
      minHeight: scaleBySizeClass(FOOTER_ACTION_HEIGHT, sizeClass),
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
    pointOverRow: {
      flex: 1,
      flexDirection: 'row',
    },
    nextPointBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: scaleBySizeClass(FOOTER_ACTION_HEIGHT, sizeClass),
      borderRadius: 16,
      borderCurve: 'continuous',
      borderWidth: 1,
      paddingHorizontal: scaleBySizeClass(12, sizeClass),
    },
    btnText: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(14, sizeClass),
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
  });
}
