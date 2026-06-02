import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { getSizeClassValue, scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Participant } from '@/lib/advancedTracking/types';
import { Fonts } from '@/theme/theme';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

const DROP_LABEL_FONT_SIZE: Record<SizeClass, number> = { small: 11, medium: 14, large: 18 };
const DROP_CHIP_FONT_SIZE: Record<SizeClass, number> = { small: 14, medium: 16, large: 18 };
const DROP_CHIP_PAD_H: Record<SizeClass, number> = { small: 16, medium: 20, large: 24 };
const DROP_CHIP_PAD_V: Record<SizeClass, number> = { small: 12, medium: 14, large: 16 };
const DROP_CHIP_RADIUS: Record<SizeClass, number> = { small: 12, medium: 13, large: 14 };

interface PullDropperStepProps {
  activeParticipants: Participant[];
  onComplete: (receiverId: string | null) => void;
  onBack: () => void;
}

export const PullDropperStep = ({
  activeParticipants,
  onComplete,
  onBack,
}: PullDropperStepProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title="DROPPED PULL" titleColor={palette.textInverse} onBack={onBack} />

      <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
        <ThemedText style={[styles.label, { color: palette.textMuted }]}>
          WHO DROPPED IT?
        </ThemedText>
        <View style={styles.chipGrid}>
          {activeParticipants.map((participant) => (
            <Pressable
              key={participant.id}
              testID={`pull-dropper-${participant.name}`}
              onPress={() => onComplete(participant.id)}
              style={[
                styles.chip,
                { borderColor: palette.overlay20, backgroundColor: palette.overlay05 },
              ]}>
              <ThemedText style={[styles.chipText, { color: palette.textInverse }]}>
                {participant.name}
              </ThemedText>
            </Pressable>
          ))}
          <Pressable
            testID="pull-dropper-unknown"
            onPress={() => onComplete(null)}
            style={[
              styles.chip,
              { borderColor: palette.overlay20, backgroundColor: palette.overlay05 },
            ]}>
            <ThemedText style={[styles.chipText, { color: palette.textMuted }]}>Unknown</ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
};

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: { flex: 1 },
    flex: { flex: 1 },
    content: { padding: 20, paddingTop: 24, flexGrow: 1 },
    label: {
      fontFamily: Fonts.bold,
      fontSize: getSizeClassValue(DROP_LABEL_FONT_SIZE, sizeClass),
      letterSpacing: scaleBySizeClass(1.5, sizeClass, { rounding: 'none' }),
      marginBottom: 12,
    },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    chip: {
      paddingHorizontal: getSizeClassValue(DROP_CHIP_PAD_H, sizeClass),
      paddingVertical: getSizeClassValue(DROP_CHIP_PAD_V, sizeClass),
      borderRadius: getSizeClassValue(DROP_CHIP_RADIUS, sizeClass),
      borderWidth: 1,
    },
    chipText: {
      fontFamily: Fonts.bold,
      fontSize: getSizeClassValue(DROP_CHIP_FONT_SIZE, sizeClass),
    },
  });
}
