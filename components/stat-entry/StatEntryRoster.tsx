import { PlayerChip } from '@/components/ui/PlayerChip';
import { useTheme } from '@/context/ThemeContext';
import { Player } from '@/lib/storage/types';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

type EntryStep = 'goal' | 'assist';

interface StatEntryRosterProps {
  roster: Player[];
  step: EntryStep;
  selectedGoalId?: string | null;
  onSelect: (playerId: string) => void;
  maxHeight?: number;
}

export function StatEntryRoster({
  roster,
  step,
  selectedGoalId,
  onSelect,
  maxHeight = 120,
}: StatEntryRosterProps) {
  const { palette } = useTheme();

  // Sort roster alphabetically by name
  const sortedRoster = [...roster].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <View style={[styles.scrollWrapper, { maxHeight }]}>
      <ScrollView
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.chipsContainer}
        keyboardShouldPersistTaps="handled">
        {sortedRoster.length === 0 ? (
          <Text style={[styles.emptyText, { color: palette.textMuted }]}>
            No players yet. Add one!
          </Text>
        ) : (
          sortedRoster.map((player) => (
            <PlayerChip
              key={player.id}
              name={player.name}
              matchingType={player.matchingType}
              selected={step === 'goal' ? false : player.id === selectedGoalId}
              onPress={() => onSelect(player.id)}
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
    fontStyle: 'italic',
    width: '100%',
    textAlign: 'center',
    marginTop: 10,
  },
});
