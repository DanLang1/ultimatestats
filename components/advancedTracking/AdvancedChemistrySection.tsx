import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import AdvancedChemistryMap from '@/components/advancedTracking/AdvancedChemistryMap';
import AdvancedPassConnections from '@/components/advancedTracking/AdvancedPassConnections';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useTheme } from '@/context/ThemeContext';
import {
  AdvancedChemistryConnection,
  AdvancedChemistryMode,
  AdvancedPassConnection,
  getVisibleAdvancedChemistryMode,
} from '@/lib/advancedTracking/advancedChemistryUtils';
import { hasItems } from '@/lib/utils';

interface AdvancedChemistrySectionProps {
  participantName: string;
  chemistry: AdvancedChemistryConnection[];
  passConnections: AdvancedPassConnection[];
}

export default function AdvancedChemistrySection({
  participantName,
  chemistry,
  passConnections,
}: AdvancedChemistrySectionProps) {
  const { palette } = useTheme();
  const [chemistryMode, setChemistryMode] = useState<AdvancedChemistryMode>('scoring');

  const hasChemistry = hasItems(chemistry);
  const hasPassConnections = hasItems(passConnections);
  const hasBothChemistryModes = hasChemistry && hasPassConnections;
  const visibleChemistryMode = getVisibleAdvancedChemistryMode(
    chemistryMode,
    hasChemistry,
    hasPassConnections,
  );

  if (!hasChemistry && !hasPassConnections) {
    return null;
  }

  return (
    <>
      {hasBothChemistryModes && (
        <View style={styles.control}>
          <SegmentedControl<AdvancedChemistryMode>
            options={[
              { value: 'scoring', label: 'Scoring' },
              { value: 'passing', label: 'Passing', activeColor: palette.success },
            ]}
            value={visibleChemistryMode}
            onChange={setChemistryMode}
          />
        </View>
      )}
      {visibleChemistryMode === 'scoring' ? (
        <AdvancedChemistryMap participantName={participantName} connections={chemistry} />
      ) : (
        <AdvancedPassConnections connections={passConnections} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  control: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
});
