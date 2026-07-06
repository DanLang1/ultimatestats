import { DefenseActions } from '@/components/advancedTracking/bottomCard/DefenseActions';
import { TrackerVoiceButton } from '@/components/advancedTracking/TrackerVoiceButton';
import { TrackerVoiceFeedbackPill } from '@/components/advancedTracking/TrackerVoiceFeedbackPill';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { VoiceStatCommandsControls } from '@/hooks/advancedTracking/useVoiceStatCommands';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { getActiveSideId } from '@/lib/advancedTracking/trackingDisplayHelpers';
import {
  getCurrentPoint,
  getCurrentPossession,
  hasPointEnded,
  isPossessionOver,
} from '@/lib/advancedTracking/trackingUtils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const NEXT_POINT_BUTTON_HEIGHT = 62;
const FOOTER_BOTTOM_PADDING = 48;
const ANDROID_FOOTER_BOTTOM_PADDING = 20;
const VOICE_FOOTER_BOTTOM_PADDING = 0;
const FOOTER_HORIZONTAL_PADDING = 12;
const FOOTER_TOP_PADDING = 8;

interface TrackerActionFooterProps {
  getPointElapsedMs: () => number;
  onStartNextPoint: () => void;
  voiceControls?: VoiceStatCommandsControls;
}

export const TrackerActionFooter = ({
  getPointElapsedMs,
  onStartNextPoint,
  voiceControls,
}: TrackerActionFooterProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const insets = useSafeAreaInsets();

  const game = useAdvancedTrackingStore((state) => state.currentGame);
  const recordPickup = useAdvancedTrackingStore((state) => state.recordPickup);
  const recordThrow = useAdvancedTrackingStore((state) => state.recordThrow);
  if (!game) return null;

  const oppSide = game.sides.find((s) => s.id !== game.focusSideId);
  if (!oppSide) return null;

  const point = getCurrentPoint(game);
  const possession = getCurrentPossession(game);
  const pointIsOver = hasPointEnded(point);
  const activeSideId = getActiveSideId(possession, game);
  const oppHasDisc = !pointIsOver && activeSideId !== game.focusSideId;
  const isVoiceFooter = !pointIsOver && !oppHasDisc && voiceControls != null;
  const styles = createStyles(sizeClass, insets.bottom, isVoiceFooter);

  const handleOppTurnover = async () => {
    if (!possession || isPossessionOver(possession)) {
      await recordPickup({ sideId: oppSide.id, player: { refType: 'untracked' } });
    }
    await recordThrow({ thrower: { refType: 'untracked' }, result: 'throwaway' });
  };

  const handleOppScored = async () => {
    if (!possession || isPossessionOver(possession)) {
      await recordPickup({ sideId: oppSide.id, player: { refType: 'untracked' } });
    }
    await recordThrow({
      thrower: { refType: 'untracked' },
      result: 'goal',
      timerElapsedMs: getPointElapsedMs(),
    });
  };

  let content: React.ReactNode = null;

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
  } else if (oppHasDisc) {
    content = <DefenseActions onOppScored={handleOppScored} onOppTurnover={handleOppTurnover} />;
  } else if (voiceControls != null) {
    content = (
      <View style={styles.voiceStack}>
        <View pointerEvents="none" style={styles.voiceFeedbackOverlay}>
          <TrackerVoiceFeedbackPill controls={voiceControls} />
        </View>
        <TrackerVoiceButton controls={voiceControls} disabled={false} />
      </View>
    );
  }

  // Always render the container so bottom safe-area padding is preserved.
  return <View style={styles.container}>{content}</View>;
};

function createStyles(sizeClass: SizeClass, bottomInset: number, isVoiceFooter: boolean) {
  let footerBottomPadding = FOOTER_BOTTOM_PADDING;
  if (Platform.OS === 'android') {
    footerBottomPadding = ANDROID_FOOTER_BOTTOM_PADDING;
  } else if (isVoiceFooter) {
    footerBottomPadding = VOICE_FOOTER_BOTTOM_PADDING;
  }

  return StyleSheet.create({
    container: {
      position: 'relative',
      paddingHorizontal: FOOTER_HORIZONTAL_PADDING,
      paddingTop: FOOTER_TOP_PADDING,
      paddingBottom: bottomInset + scaleBySizeClass(footerBottomPadding, sizeClass),
    },
    voiceStack: {
      position: 'relative',
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
      minHeight: scaleBySizeClass(NEXT_POINT_BUTTON_HEIGHT, sizeClass),
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
