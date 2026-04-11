import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

interface TrackerActionBarProps {
  pointIsOver: boolean;
  oppHasDisc: boolean;
  goalPending: boolean;
  discHolderId: string | null;
  onStartNextPoint: () => void;
  onOppScored: () => void;
  onOppTurnover: () => void;
  onGoalPress: () => void;
  onTurnoverPress: () => void;
  onUndoLastOperation: () => void;
  bottomInset: number;
}

export const TrackerActionBar = ({
  pointIsOver,
  oppHasDisc,
  goalPending,
  discHolderId,
  onStartNextPoint,
  onOppScored,
  onOppTurnover,
  onGoalPress,
  onTurnoverPress,
  onUndoLastOperation,
  bottomInset,
}: TrackerActionBarProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  return (
    <View
      style={[
        styles.actionBar,
        {
          backgroundColor: palette.glassBg,
          borderColor: palette.overlay15,
          paddingBottom: Math.max(bottomInset, 20),
          boxShadow: `0 -8px 32px ${palette.overlay10}`,
        },
      ]}>
      {pointIsOver ? (
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
      ) : oppHasDisc ? (
        <>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              { borderColor: palette.danger, backgroundColor: palette.danger + '10' },
              pressed && { opacity: 0.7 },
            ]}
            onPress={onOppScored}>
            <ThemedText style={[styles.actionBtnText, { color: palette.danger }]}>
              OPP SCORED
            </ThemedText>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              { borderColor: palette.warning, backgroundColor: palette.warning + '10' },
              pressed && { opacity: 0.7 },
            ]}
            onPress={onOppTurnover}>
            <ThemedText style={[styles.actionBtnText, { color: palette.warning }]}>
              OPP TURNOVER
            </ThemedText>
          </Pressable>
        </>
      ) : (
        <>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              {
                borderColor: goalPending ? palette.success : palette.overlay20,
                backgroundColor: goalPending ? palette.success + '20' : palette.overlay05,
                boxShadow: goalPending ? `0 0 16px ${palette.success}40` : undefined,
              },
              pressed && { opacity: 0.7 },
            ]}
            onPress={onGoalPress}>
            <ThemedText
              style={[
                styles.actionBtnText,
                { color: goalPending ? palette.success : palette.textInverse },
              ]}>
              GOAL
            </ThemedText>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              {
                borderColor: discHolderId ? palette.danger : palette.overlay20,
                backgroundColor: discHolderId ? palette.danger + '10' : palette.overlay05,
                opacity: discHolderId ? 1 : 0.4,
                boxShadow: discHolderId ? `0 0 16px ${palette.danger}30` : undefined,
              },
              pressed && { opacity: 0.7 },
            ]}
            onPress={onTurnoverPress}>
            <ThemedText
              style={[
                styles.actionBtnText,
                { color: discHolderId ? palette.danger : palette.textMuted },
              ]}>
              TURNOVER
            </ThemedText>
          </Pressable>
        </>
      )}
      <Pressable
        style={({ pressed }) => [
          styles.actionBtn,
          { borderColor: palette.overlay20, backgroundColor: palette.overlay05 },
          pressed && { opacity: 0.7 },
        ]}
        onPress={onUndoLastOperation}>
        <ThemedText style={[styles.actionBtnText, { color: palette.textInverse }]}>UNDO</ThemedText>
      </Pressable>
    </View>
  );
};

function createStyles(sizeClass: SizeClass) {
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
    actionBtn: {
      flex: 1,
      paddingVertical: 18,
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
    },
  });
}
