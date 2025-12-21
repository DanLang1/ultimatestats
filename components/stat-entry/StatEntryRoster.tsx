import { PlayerChip } from '@/components/ui/PlayerChip';
import { palette } from '@/constants/theme';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

type EntryStep = 'goal' | 'assist';

interface StatEntryRosterProps {
  roster: string[];
  step: EntryStep;
  selectedGoal: string | null;
  onSelect: (name: string) => void;
  maxHeight?: number;
}

export function StatEntryRoster({
  roster,
  step,
  selectedGoal,
  onSelect,
  maxHeight = 120,
}: StatEntryRosterProps) {
  return (
    <View style={[styles.scrollWrapper, { maxHeight }]}>
      <ScrollView
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.chipsContainer}
        keyboardShouldPersistTaps="handled">
        {roster.length === 0 ? (
          <Text style={styles.emptyText}>No players yet. Add one!</Text>
        ) : (
          roster.map((player) => (
            <PlayerChip
              key={player}
              name={player}
              selected={step === 'goal' ? false : player === selectedGoal}
              onPress={() => onSelect(player)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollWrapper: {
    width: '100%',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 10,
  },
  emptyText: {
    fontSize: 14,
    color: palette.textMuted,
    fontStyle: 'italic',
    width: '100%',
    textAlign: 'center',
    marginTop: 10,
  },
});
