import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, useLayout } from '@/hooks/useLayout';
import { Participant } from '@/lib/advancedTracking/types';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { TurnoverSheetState, TurnoverType } from './types';

interface TurnoverSheetProps {
  state: TurnoverSheetState;
  discHolderName: string | null;
  activeParticipants: Participant[];
  onClose: () => void;
  onSelectType: (type: TurnoverType) => void;
  onSelectReceiver: (participantId: string) => void;
}

const TURNOVER_OPTIONS: {
  type: TurnoverType;
  label: string;
  color: 'danger' | 'warning' | 'muted';
}[] = [
  { type: 'throwaway', label: 'THROWAWAY', color: 'danger' },
  { type: 'drop', label: 'DROP', color: 'warning' },
  { type: 'block', label: 'BLOCK', color: 'muted' },
  { type: 'interception', label: 'INTERCEPTION', color: 'muted' },
  { type: 'fifty-fifty', label: '50 / 50', color: 'warning' },
];

export const TurnoverSheet = ({
  state,
  discHolderName,
  activeParticipants,
  onClose,
  onSelectType,
  onSelectReceiver,
}: TurnoverSheetProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={state !== null} transparent animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <Pressable
          style={[styles.sheetOverlay, { backgroundColor: palette.overlayDark60 }]}
          onPress={onClose}>
          <Pressable
            style={[
              styles.sheet,
              {
                backgroundColor: palette.glassBg,
                borderColor: palette.overlay15,
                paddingBottom: Math.max(insets.bottom, 16),
                boxShadow: `0 -10px 40px ${palette.shadow}80`,
              },
            ]}
            onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle}>
              <View style={[styles.handleBar, { backgroundColor: palette.overlay20 }]} />
            </View>

            {state?.stage === 'type' && (
              <>
                <ThemedText
                  style={[
                    styles.sheetTitle,
                    {
                      color: palette.textInverse,
                      fontSize: scaleBySizeClass(18, sizeClass),
                    },
                  ]}>
                  {discHolderName ? `${discHolderName} — ` : ''}WHAT HAPPENED?
                </ThemedText>
                <View style={styles.turnoverGrid}>
                  {TURNOVER_OPTIONS.map((opt) => {
                    const color =
                      opt.color === 'danger'
                        ? palette.danger
                        : opt.color === 'warning'
                          ? palette.warning
                          : palette.textMuted;
                    return (
                      <Pressable
                        key={opt.type}
                        onPress={() => onSelectType(opt.type)}
                        style={({ pressed }) => [
                          styles.turnoverBtn,
                          { borderColor: color, backgroundColor: color + '10' },
                          pressed && { backgroundColor: color + '25', opacity: 0.8 },
                        ]}>
                        <ThemedText
                          style={[
                            styles.turnoverBtnText,
                            {
                              color,
                              fontSize: scaleBySizeClass(15, sizeClass),
                            },
                          ]}>
                          {opt.label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {state?.stage === 'receiver' && (
              <>
                <ThemedText
                  style={[
                    styles.sheetTitle,
                    {
                      color: palette.warning,
                      fontSize: scaleBySizeClass(18, sizeClass),
                    },
                  ]}>
                  {state.resultType === 'fifty-fifty' ? 'WHO WAS THE TARGET?' : 'WHO DROPPED IT?'}
                </ThemedText>
                <ScrollView
                  style={styles.receiverList}
                  contentContainerStyle={styles.receiverListContent}>
                  {activeParticipants.map((p) => (
                    <Pressable
                      key={p.id}
                      onPress={() => onSelectReceiver(p.id)}
                      style={({ pressed }) => [
                        styles.receiverItem,
                        { borderColor: palette.overlay15, backgroundColor: palette.overlay05 },
                        pressed && { backgroundColor: palette.overlay15, opacity: 0.8 },
                      ]}>
                      <ThemedText
                        style={[
                          styles.receiverName,
                          {
                            color: palette.textInverse,
                            fontSize: scaleBySizeClass(16, sizeClass),
                          },
                        ]}>
                        {p.name}
                      </ThemedText>
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={scaleBySizeClass(20, sizeClass)}
                        color={palette.overlay20}
                      />
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}
          </Pressable>
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  sheetHandle: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  handleBar: {
    width: 48,
    height: 6,
    borderRadius: 3,
  },
  sheetTitle: {
    fontFamily: Fonts.black,
    marginBottom: 20,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  turnoverGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 16,
  },
  turnoverBtn: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 20,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 2,
    alignItems: 'center',
  },
  turnoverBtnText: {
    fontFamily: Fonts.black,
    letterSpacing: 1,
  },
  receiverList: {
    maxHeight: 320,
  },
  receiverListContent: {
    gap: 12,
    paddingBottom: 32,
  },
  receiverItem: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderCurve: 'continuous',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  receiverName: {
    fontFamily: Fonts.extraBold,
    letterSpacing: 0.5,
  },
});
