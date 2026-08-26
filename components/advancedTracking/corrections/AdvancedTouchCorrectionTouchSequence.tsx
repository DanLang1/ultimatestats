import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import type { AdvancedTouchOccurrence } from '@/lib/advancedTracking/advancedTouchCorrectionUtils';
import type { Participant } from '@/lib/advancedTracking/types';
import { Fonts } from '@/theme/theme';

import { AdvancedTouchCorrectionTouchOption } from './AdvancedTouchCorrectionTouchOption';

interface AdvancedTouchCorrectionTouchSequenceProps {
  touches: AdvancedTouchOccurrence[];
  participants: Participant[];
  selectedTouchId: string | null;
  selectedParticipant: Participant | undefined;
  isSaving: boolean;
  onSelectTouch: (touch: AdvancedTouchOccurrence) => void;
}

export function AdvancedTouchCorrectionTouchSequence({
  touches,
  participants,
  selectedTouchId,
  selectedParticipant,
  isSaving,
  onSelectTouch,
}: AdvancedTouchCorrectionTouchSequenceProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  return (
    <View style={styles.section}>
      <ThemedText style={[styles.sectionLabel, { color: palette.modalTextMuted }]}>
        SELECT A TOUCH
      </ThemedText>
      <View style={styles.touchRow}>
        {touches.map((touch, index) => (
          <AdvancedTouchCorrectionTouchOption
            key={touch.touchId}
            index={index}
            touch={touch}
            participants={participants}
            selectedTouchId={selectedTouchId}
            selectedParticipant={selectedParticipant}
            isSaving={isSaving}
            onPress={() => onSelectTouch(touch)}
          />
        ))}
      </View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    section: {
      gap: 10,
    },
    sectionLabel: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 0.8,
    },
    touchRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 6,
    },
  });
}
