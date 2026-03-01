import { EditableSettingCard } from '@/components/pre-game-confirm/EditableSettingCard';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Switch } from '@/components/ui/Switch';
import { AlertModal } from '@/components/ui/AlertModal';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass } from '@/hooks/useLayout';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface TimeoutSettingCardProps {
  timeoutCount: number;
  autoHalftimeEnabled: boolean;
  floaterEnabled: boolean;
  onResetTimeouts: (count: number) => void;
  onSetFloaterEnabled: (enabled: boolean) => void;
  sizeClass?: SizeClass;
}

export function TimeoutSettingCard({
  timeoutCount,
  autoHalftimeEnabled,
  floaterEnabled,
  onResetTimeouts,
  onSetFloaterEnabled,
  sizeClass = 'small',
}: TimeoutSettingCardProps) {
  const { palette } = useTheme();
  const styles = createStyles(sizeClass);
  const [modalVisible, setModalVisible] = useState(false);

  const summaryParts = [`${timeoutCount}`];
  if (autoHalftimeEnabled) summaryParts.push('/ half');
  if (floaterEnabled) summaryParts.push('+ Floater');
  const summary = summaryParts.join(' ');

  return (
    <>
      <EditableSettingCard
        icon="timer-sand"
        label="Timeouts"
        onPress={() => setModalVisible(true)}
        sizeClass={sizeClass}>
        <Text style={[styles.value, { color: palette.textInverse }]}>{summary}</Text>
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
            sizeClass={sizeClass}
          />

          {autoHalftimeEnabled && (
            <Switch
              label="FLOATER TIMEOUT"
              value={floaterEnabled}
              onValueChange={onSetFloaterEnabled}
              sizeClass={sizeClass}
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
      fontWeight: '700',
      marginTop: 1,
    },
    modalContent: {
      gap: 8,
    },
  });
}
