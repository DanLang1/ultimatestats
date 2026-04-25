import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
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
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { TrackerMoreBtn, TrackerUndoBtn } from './TrackerActionBarBtns';

interface TrackerActionBarProps {
  pointElapsedMs: number;
  onStartNextPoint: () => void;
  onMorePress: () => void;
}

export const TrackerActionBar = ({
  pointElapsedMs,
  onStartNextPoint,
  onMorePress,
}: TrackerActionBarProps) => {
  const { palette } = useTheme();
  const { sizeClass, isLandscape } = useLayout();
  const styles = createStyles(sizeClass, isLandscape);
  // const insets = useSafeAreaInsets();

  const { currentGameId, savedGames, recordPickup, recordThrow, undoLastOperation } =
    useAdvancedTrackingStore();
  const game = savedGames.find((g) => g.id === currentGameId);
  if (!game) return null;

  const oppSide = game.sides.find((s) => s.id !== game.focusSideId);
  if (!oppSide) return null;

  const point = getCurrentPoint(game);
  const possession = getCurrentPossession(game);
  const pointIsOver = hasPointEnded(point);
  const activeSideId = getActiveSideId(possession, game);
  const oppHasDisc = !pointIsOver && activeSideId !== game.focusSideId;

  const handleOppTurnover = () => {
    if (!possession || isPossessionOver(possession)) {
      recordPickup({ sideId: oppSide.id, player: { refType: 'untracked' } });
    }
    recordThrow({ thrower: { refType: 'untracked' }, result: 'throwaway' });
  };

  const handleOppScored = () => {
    if (!possession || isPossessionOver(possession)) {
      recordPickup({ sideId: oppSide.id, player: { refType: 'untracked' } });
    }
    recordThrow({
      thrower: { refType: 'untracked' },
      result: 'goal',
      timerElapsedMs: pointElapsedMs,
    });
  };

  let barContent: React.ReactNode;
  if (pointIsOver) {
    barContent = (
      <>
        <Pressable
          style={({ pressed }) => [
            styles.actionBtn,
            {
              borderColor: palette.success,
              backgroundColor: palette.success + '15',
              boxShadow: `0 0 16px ${palette.success}30`,
            },
            pressed && { opacity: 0.7 },
          ]}
          onPress={onStartNextPoint}>
          <ThemedText style={[styles.actionBtnText, { color: palette.success }]}>
            NEXT POINT
          </ThemedText>
        </Pressable>
        <TrackerUndoBtn onPress={undoLastOperation} isLandscape={isLandscape} />
        <TrackerMoreBtn onPress={onMorePress} isLandscape={isLandscape} />
      </>
    );
  } else if (oppHasDisc) {
    barContent = (
      <>
        <Pressable
          style={({ pressed }) => [
            styles.actionBtn,
            { borderColor: palette.danger, backgroundColor: palette.danger + '10' },
            pressed && { opacity: 0.7 },
          ]}
          onPress={handleOppScored}>
          <ThemedText style={[styles.actionBtnText, { color: palette.danger }]}>
            OPP GOAL
          </ThemedText>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.actionBtn,
            { borderColor: palette.success, backgroundColor: palette.success + '10' },
            pressed && { opacity: 0.7 },
          ]}
          onPress={handleOppTurnover}>
          <ThemedText style={[styles.actionBtnText, { color: palette.success }]}>
            OPP TURN
          </ThemedText>
        </Pressable>
        <TrackerUndoBtn onPress={undoLastOperation} isLandscape={isLandscape} />
        <TrackerMoreBtn onPress={onMorePress} isLandscape={isLandscape} />
      </>
    );
  } else {
    barContent = (
      <>
        <TrackerUndoBtn onPress={undoLastOperation} isLandscape={isLandscape} />
        <TrackerMoreBtn onPress={onMorePress} isLandscape={isLandscape} />
      </>
    );
  }

  return (
    <View
      style={[
        isLandscape ? styles.actionBarLandscape : styles.actionBar,
        { paddingBottom: 12},
      ]}>
      {barContent}
    </View>
  );
};

function createStyles(sizeClass: SizeClass, isLandscape: boolean) {
  return StyleSheet.create({
    actionBar: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingTop: 12,
      gap: 12,
    },
    actionBarLandscape: {
      flexDirection: 'column',
      paddingHorizontal: 12,
      paddingTop: 4,
      gap: 6,
    },
    actionBtn: {
      flex: 1,
      paddingVertical: isLandscape ? 6 : 18,
      paddingHorizontal: 8,
      borderWidth: 1,
      borderRadius: 20,
      borderCurve: 'continuous',
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionBtnText: {
      fontFamily: Fonts.black,
      letterSpacing: 1,
      fontSize: scaleBySizeClass(13, sizeClass),
      textAlign: 'center',
    },
  });
}
