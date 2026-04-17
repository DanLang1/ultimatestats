import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

interface TrackerActionBarProps {
  pointIsOver: boolean;
  oppHasDisc: boolean;
  discHolderId: string | null;
  activeStoppageId: string | null;
  onStartNextPoint: () => void;
  onOppScored: () => void;
  onOppTurnover: () => void;
  onThrowaway: () => void;
  onMorePress: () => void;
  onResumeStoppage: () => void;
  onUndoLastOperation: () => void;
  bottomInset: number;
  isLandscape?: boolean;
}

export const TrackerActionBar = ({
  pointIsOver,
  oppHasDisc,
  discHolderId,
  activeStoppageId,
  onStartNextPoint,
  onOppScored,
  onOppTurnover,
  onThrowaway,
  onMorePress,
  onResumeStoppage,
  onUndoLastOperation,
  bottomInset,
  isLandscape = false,
}: TrackerActionBarProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass, isLandscape);

  const UndoBtn = () => (
    <Pressable
      style={({ pressed }) => [
        styles.actionBtn,
        { borderColor: palette.overlay20, backgroundColor: palette.overlay05 },
        pressed && { opacity: 0.7 },
      ]}
      onPress={onUndoLastOperation}>
      <ThemedText style={[styles.actionBtnText, { color: palette.textInverse }]}>UNDO</ThemedText>
    </Pressable>
  );

  const MoreBtn = () => (
    <Pressable
      style={({ pressed }) => [
        styles.moreBtn,
        { borderColor: palette.overlay20, backgroundColor: palette.overlay05 },
        pressed && { opacity: 0.7 },
      ]}
      onPress={onMorePress}>
      <ThemedText style={[styles.actionBtnText, { color: palette.textMuted }]}>•••</ThemedText>
    </Pressable>
  );

  let barContent: React.ReactNode;
  if (activeStoppageId) {
    barContent = (
      <>
        <Pressable
          style={({ pressed }) => [
            styles.actionBtn,
            styles.actionBtnFlex,
            {
              borderColor: palette.warning,
              backgroundColor: palette.warning + '15',
              boxShadow: `0 0 16px ${palette.warning}30`,
            },
            pressed && { opacity: 0.7 },
          ]}
          onPress={onResumeStoppage}>
          <ThemedText style={[styles.actionBtnText, { color: palette.warning }]}>RESUME</ThemedText>
        </Pressable>
        <UndoBtn />
      </>
    );
  } else if (pointIsOver) {
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
        <UndoBtn />
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
          onPress={onOppScored}>
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
          onPress={onOppTurnover}>
          <ThemedText style={[styles.actionBtnText, { color: palette.success }]}>
            OPP TURN
          </ThemedText>
        </Pressable>
        <MoreBtn />
        <UndoBtn />
      </>
    );
  } else {
    barContent = (
      <>
        <Pressable
          disabled={!discHolderId}
          style={({ pressed }) => [
            styles.actionBtn,
            {
              borderColor: discHolderId ? palette.danger : palette.overlay20,
              backgroundColor: discHolderId ? palette.danger + '10' : palette.overlay05,
              opacity: discHolderId ? 1 : 0.35,
            },
            pressed && discHolderId && { opacity: 0.7 },
          ]}
          onPress={onThrowaway}>
          <ThemedText
            style={[
              styles.actionBtnText,
              { color: discHolderId ? palette.danger : palette.textMuted },
            ]}>
            T/A
          </ThemedText>
        </Pressable>
        <UndoBtn />
        <MoreBtn />
      </>
    );
  }

  return (
    <View
      style={[
        isLandscape ? styles.actionBarLandscape : styles.actionBar,
        isLandscape
          ? { paddingBottom: Math.max(bottomInset, 12) }
          : {
              backgroundColor: palette.glassBg,
              borderColor: palette.overlay15,
              paddingBottom: Math.max(bottomInset, 20),
              boxShadow: `0 -8px 32px ${palette.overlay10}`,
            },
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
      paddingTop: 20,
      gap: 12,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      borderCurve: 'continuous',
      borderWidth: 1,
      borderBottomWidth: 0,
    },
    actionBarLandscape: {
      flexDirection: 'column',
      paddingHorizontal: 12,
      paddingTop: 4,
      gap: 6,
    },
    actionBtnFlex: {
      flexGrow: 1,
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
    moreBtn: {
      paddingVertical: isLandscape ? 6 : 18,
      paddingHorizontal: isLandscape ? 10 : 14,
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
