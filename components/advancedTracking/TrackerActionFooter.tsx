import { ThemedText } from '@/components/ThemedText';
import { DefenseActions } from '@/components/advancedTracking/bottomCard/DefenseActions';
import { TrackerVoiceButton } from '@/components/advancedTracking/TrackerVoiceButton';
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
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TrackerActionFooterProps {
  pointElapsedMs: number;
  onStartNextPoint: () => void;
  voiceControls?: VoiceStatCommandsControls;
}

export const TrackerActionFooter = ({
  pointElapsedMs,
  onStartNextPoint,
  voiceControls,
}: TrackerActionFooterProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const insets = useSafeAreaInsets();
  const styles = createStyles(sizeClass, insets.bottom);

  const { currentGameId, savedGames, recordPickup, recordThrow } = useAdvancedTrackingStore();

  const game = savedGames.find((g) => g.id === currentGameId);
  if (!game) return null;

  const oppSide = game.sides.find((s) => s.id !== game.focusSideId);
  if (!oppSide) return null;

  const point = getCurrentPoint(game);
  const possession = getCurrentPossession(game);
  const pointIsOver = hasPointEnded(point);
  const activeSideId = getActiveSideId(possession, game);
  const oppHasDisc = !pointIsOver && activeSideId !== game.focusSideId;

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
      timerElapsedMs: pointElapsedMs,
    });
  };

  let content: React.ReactNode = null;

  if (pointIsOver) {
    content = (
      <Pressable
        testID="tracker-next-point"
        onPress={onStartNextPoint}
        style={({ pressed }) => [
          styles.nextPointBtn,
          { backgroundColor: palette.successOverlay10 },
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
    );
  } else if (oppHasDisc) {
    content = <DefenseActions onOppScored={handleOppScored} onOppTurnover={handleOppTurnover} />;
  } else if (voiceControls != null) {
    content = <TrackerVoiceButton controls={voiceControls} disabled={false} />;
  }

  // Always render the container so bottom safe-area padding is preserved.
  return <View style={styles.container}>{content}</View>;
};

function createStyles(sizeClass: SizeClass, bottomInset: number) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: bottomInset + 24,
    },
    nextPointBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: scaleBySizeClass(62, sizeClass),
      borderRadius: 16,
      borderCurve: 'continuous',
    },
    btnText: {
      fontFamily: Fonts.black,
      fontSize: scaleBySizeClass(14, sizeClass),
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
  });
}
