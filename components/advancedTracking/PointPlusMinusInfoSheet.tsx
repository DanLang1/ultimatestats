import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  POINT_PLUS_MINUS_BREAK_VALUE,
  POINT_PLUS_MINUS_BROKEN_VALUE,
  POINT_PLUS_MINUS_HOLD_VALUE,
  POINT_PLUS_MINUS_OPP_HOLD_VALUE,
} from '@/lib/advancedTracking/statConstants';
import { Fonts } from '@/theme/theme';

interface PointPlusMinusInfoSheetProps {
  visible: boolean;
  onDismiss: () => void;
}

const OUTCOMES = [
  {
    label: 'Hold',
    value: POINT_PLUS_MINUS_HOLD_VALUE,
  },
  {
    label: 'Broken',
    value: POINT_PLUS_MINUS_BROKEN_VALUE,
  },
  {
    label: 'Break',
    value: POINT_PLUS_MINUS_BREAK_VALUE,
  },
  {
    label: 'Opponent hold',
    value: POINT_PLUS_MINUS_OPP_HOLD_VALUE,
  },
];

function formatSignedValue(value: number): string {
  if (value > 0) return `+${value}`;
  return String(value);
}

export function PointPlusMinusInfoSheet({ visible, onDismiss }: PointPlusMinusInfoSheetProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const formula = `(Holds × ${POINT_PLUS_MINUS_HOLD_VALUE}) + (Broken × ${POINT_PLUS_MINUS_BROKEN_VALUE}) + (Breaks × ${POINT_PLUS_MINUS_BREAK_VALUE}) + (Opponent holds × ${POINT_PLUS_MINUS_OPP_HOLD_VALUE})`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      supportedOrientations={['portrait', 'landscape']}
      onRequestClose={onDismiss}>
      <BottomSheet
        onDismiss={onDismiss}
        sheetStyle={[styles.sheet, { backgroundColor: palette.modalBg }]}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.titleGroup}>
              <ThemedText style={[styles.title, { color: palette.modalText }]}>
                Point +/-
              </ThemedText>
              <ThemedText style={[styles.subtitle, { color: palette.modalTextMuted }]}>
                Weighted result of every point the player played
              </ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close Point Plus/Minus explanation"
              onPress={onDismiss}
              hitSlop={12}>
              <MaterialCommunityIcons
                name="close"
                size={scaleBySizeClass(22, sizeClass)}
                color={palette.modalTextMuted}
              />
            </Pressable>
          </View>

          <View style={styles.outcomes}>
            {OUTCOMES.map((outcome) => {
              const isPositive = outcome.value > 0;
              return (
                <View
                  key={outcome.label}
                  style={[styles.outcomeRow, { borderBottomColor: palette.overlay10 }]}>
                  <View style={styles.outcomeText}>
                    <ThemedText style={[styles.outcomeLabel, { color: palette.modalText }]}>
                      {outcome.label}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.valueChip,
                      {
                        backgroundColor: isPositive
                          ? palette.successOverlay10
                          : palette.dangerOverlay10,
                      },
                    ]}>
                    <ThemedText
                      style={[
                        styles.value,
                        { color: isPositive ? palette.success : palette.danger },
                      ]}>
                      {formatSignedValue(outcome.value)}
                    </ThemedText>
                  </View>
                </View>
              );
            })}
          </View>

          <View
            style={[
              styles.formulaCard,
              { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
            ]}>
            <ThemedText style={[styles.formulaLabel, { color: palette.modalTextMuted }]}>
              FORMULA
            </ThemedText>
            <ThemedText style={[styles.formula, { color: palette.modalText }]}>
              {formula}
            </ThemedText>
          </View>

          <Pressable
            testID="point-plus-minus-info-close"
            onPress={onDismiss}
            style={[styles.closeButton, { backgroundColor: palette.accent }]}>
            <ThemedText style={[styles.closeButtonText, { color: palette.textOnAccent }]}>
              GOT IT
            </ThemedText>
          </Pressable>
        </View>
      </BottomSheet>
    </Modal>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    sheet: {
      maxHeight: '85%',
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 8,
      gap: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 16,
    },
    titleGroup: {
      flex: 1,
      gap: 4,
    },
    title: {
      fontSize: scaleBySizeClass(20, sizeClass),
      fontFamily: Fonts.black,
    },
    subtitle: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.regular,
      lineHeight: scaleBySizeClass(18, sizeClass),
    },
    outcomes: {
      gap: 0,
    },
    outcomeRow: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderBottomWidth: 1,
    },
    outcomeText: {
      flex: 1,
    },
    outcomeLabel: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.bold,
    },
    valueChip: {
      minWidth: 48,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 10,
      alignItems: 'center',
    },
    value: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.extraBold,
    },
    formulaCard: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      gap: 6,
    },
    formulaLabel: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 0.8,
    },
    formula: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.semiBold,
      lineHeight: scaleBySizeClass(18, sizeClass),
    },
    closeButton: {
      minHeight: 46,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeButtonText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.black,
      letterSpacing: 0.5,
    },
  });
}
