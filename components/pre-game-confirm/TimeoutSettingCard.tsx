import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { EditableSettingCard } from '@/components/pre-game-confirm/EditableSettingCard';
import { ThemedText } from '@/components/ThemedText';
import { AlertModal } from '@/components/ui/AlertModal';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Switch } from '@/components/ui/Switch';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

interface TimeoutSettingCardProps {
  timeoutCount: number;
  autoHalftimeEnabled: boolean;
  floaterEnabled: boolean;
  onResetTimeouts: (count: number) => void;
  onSetFloaterEnabled: (enabled: boolean) => void;
}

export function TimeoutSettingCard({
  timeoutCount,
  autoHalftimeEnabled,
  floaterEnabled,
  onResetTimeouts,
  onSetFloaterEnabled,
}: TimeoutSettingCardProps) {
  const { sizeClass } = useLayout();
  const { palette } = useTheme();
  const styles = createStyles(sizeClass);
  const [modalVisible, setModalVisible] = useState(false);

  const summaryParts = [`${timeoutCount}`];
  if (autoHalftimeEnabled) summaryParts.push('/ half');
  if (floaterEnabled) summaryParts.push('+ Floater');
  const summary = summaryParts.join(' ');

  return (
    <>
      <EditableSettingCard icon="timer-sand" label="Timeouts" onPress={() => setModalVisible(true)}>
        <ThemedText style={[styles.value, { color: palette.textInverse }]}>{summary}</ThemedText>
      </EditableSettingCard>

      <AlertModal visible={modalVisible} title="Timeouts" onClose={() => setModalVisible(false)}>
        <View style={styles.modalContent}>
          <SegmentedControl
            label="TIMEOUTS PER HALF"
            options={[
              { value: '1', label: '1' },
              { value: '2', label: '2' },
            ]}
            value={String(timeoutCount)}
            onChange={(val) => onResetTimeouts(Number(val))}
          />

          {autoHalftimeEnabled && (
            <Switch
              label="FLOATER TIMEOUT"
              value={floaterEnabled}
              onValueChange={onSetFloaterEnabled}
            />
          )}
        </View>
      </AlertModal>
    </>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    value: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.bold,
      marginTop: 1,
    },
    modalContent: {
      gap: 8,
    },
  });
}
