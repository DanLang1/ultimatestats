import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Participant } from '@/lib/advancedTracking/types';
import { Fonts } from '@/theme/theme';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

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
      fontSize: scaleBySizeClass(11, sizeClass),
      letterSpacing: scaleBySizeClass(1.5, sizeClass, { rounding: 'none' }),
      marginBottom: 12,
    },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    chip: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
    chipText: { fontFamily: Fonts.bold, fontSize: scaleBySizeClass(14, sizeClass) },
  });
}
