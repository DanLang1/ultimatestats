# Stat-First Experimental UI (Archived)

> **Status**: Archived - Code removed for now, can be regenerated from this doc.
> **Date**: 2025-12-28

## Overview

An experimental "stat-first" UI paradigm where stat action buttons (GOAL/DROP/BLOCK/THROW) are primary, with score as a derived/compact display. Contrasts with the current scoreboard-first design.

### Design Philosophy

**Current App (Scoreboard-first):**

```
Tap score → Score increments → Modal asks for stats
```

**Experimental (Stat-first):**

```
Tap stat button → Select player(s) → Score updates automatically
```

## Known Limitations

- No way to record opponent scores
- Possession tracking less intuitive than tap-to-flip scoreboard
- Stats are easier to tap, but overall flow needs refinement

---

## Files to Create

### 1. Route: `app/StatTracker.tsx`

Main experimental screen with compact score and stat buttons.

```tsx
import { CompactScorebar } from '@/components/stat-tracker/CompactScorebar';
import { StatActionBar, StatActionType } from '@/components/stat-tracker/StatActionBar';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/context/ThemeContext';
import { useGameStore } from '@/store/gameStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function StatTracker() {
  const { palette } = useTheme();
  const { possession, triggerTurnover } = useGameStore();

  const handleAction = (action: StatActionType) => {
    if (action === 'goal') {
      router.push({ pathname: '/StatTrackerEntryModal', params: { action: 'goal' } });
    } else {
      triggerTurnover();
      router.push({ pathname: '/StatTrackerEntryModal', params: { action } });
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: palette.overlay10 }]}
          hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={palette.textInverse} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.textMuted }]}>STAT TRACKER</Text>
        <View style={styles.headerSpacer} />
        <Text
          style={[
            styles.betaBadge,
            { backgroundColor: palette.accentOverlay15, color: palette.accent },
          ]}>
          BETA
        </Text>
      </View>

      <CompactScorebar />

      <View style={styles.possessionRow}>
        <Text style={[styles.possessionLabel, { color: palette.textMuted }]}>
          {possession === 'team1'
            ? '🟢 My team has the disc'
            : possession === 'team2'
              ? '🔴 Opponent has the disc'
              : '⚪ Tap an action to begin'}
        </Text>
      </View>

      <StatActionBar onAction={handleAction} disabled={false} />

      <View style={styles.instructions}>
        <Text style={[styles.instructionsText, { color: palette.textMuted }]}>
          Tap a stat button above to record a play
        </Text>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backButton: { padding: 8, borderRadius: 20 },
  headerTitle: { fontSize: 14, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  headerSpacer: { flex: 1 },
  betaBadge: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  possessionRow: { paddingHorizontal: 20, paddingVertical: 8, alignItems: 'center' },
  possessionLabel: { fontSize: 13, fontWeight: '500' },
  instructions: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  instructionsText: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
```

---

### 2. Modal: `app/StatTrackerEntryModal.tsx`

Player selection modal for stat entry.

```tsx
import { PlayerChip } from '@/components/ui/PlayerChip';
import { useTheme } from '@/context/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';
import { useGameStore } from '@/store/gameStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

type Step = 'player1' | 'player2';

export default function StatTrackerEntryModal() {
  const { action } = useLocalSearchParams<{ action: string }>();
  const { palette } = useTheme();
  const { triggerScoreHaptic, triggerTurnoverHaptic } = useHaptics();
  const { team1Roster, addPlayer, addStatRecord, addTurnoverRecord, incrementScore } =
    useGameStore();

  const [step, setStep] = useState<Step>('player1');
  const [player1, setPlayer1] = useState<string | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [showAddPlayer, setShowAddPlayer] = useState(false);

  const isGoal = action === 'goal';
  const isBlock = action === 'block';

  const getStepLabel = () => {
    if (isGoal) return step === 'player1' ? 'Who scored?' : 'Who threw the assist?';
    if (isBlock) return 'Who got the block?';
    return action === 'drop' ? 'Who dropped it?' : 'Who threw it away?';
  };

  const getActionLabel = () => {
    switch (action) {
      case 'goal':
        return 'GOAL';
      case 'block':
        return 'BLOCK';
      case 'drop':
        return 'DROP';
      case 'throwaway':
        return 'THROWAWAY';
      default:
        return '';
    }
  };

  const handlePlayerSelect = (playerName: string) => {
    triggerTurnoverHaptic();
    if (isGoal) {
      if (step === 'player1') {
        setPlayer1(playerName);
        setStep('player2');
      } else {
        triggerScoreHaptic();
        incrementScore(true);
        addStatRecord({ team: 'team1', goal: player1, assist: playerName });
        router.back();
      }
    } else {
      addTurnoverRecord({
        team: 'team1',
        type: action as 'block' | 'drop' | 'throwaway',
        player: playerName,
      });
      router.back();
    }
  };

  const handleAddPlayer = () => {
    const trimmed = newPlayerName.trim();
    if (trimmed) {
      addPlayer(trimmed);
      handlePlayerSelect(trimmed);
      setNewPlayerName('');
      setShowAddPlayer(false);
    }
  };

  const handleSkip = () => {
    if (isGoal) {
      triggerScoreHaptic();
      incrementScore(true);
      addStatRecord({ team: 'team1', goal: step === 'player1' ? null : player1, assist: null });
    }
    router.back();
  };

  const sortedRoster = [...team1Roster].sort((a, b) => a.localeCompare(b));

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable
        style={[styles.overlay, { backgroundColor: palette.overlayDark40 }]}
        onPress={handleSkip}>
        <Pressable style={[styles.sheet, { backgroundColor: palette.modalBg }]}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text
                style={[
                  styles.actionBadge,
                  { backgroundColor: palette.accentOverlay15, color: palette.accent },
                ]}>
                {getActionLabel()}
              </Text>
              <Text style={[styles.stepLabel, { color: palette.modalText }]}>{getStepLabel()}</Text>
            </View>
            <Pressable
              onPress={() => router.back()}
              style={[styles.cancelButton, { backgroundColor: palette.overlay10 }]}>
              <Text style={[styles.cancelText, { color: palette.textMuted }]}>Cancel</Text>
            </Pressable>
          </View>

          {isGoal && step === 'player2' && player1 && (
            <View style={[styles.goalBadge, { backgroundColor: palette.successOverlay15 }]}>
              <Text style={[styles.goalBadgeText, { color: palette.success }]}>
                Goal: {player1}
              </Text>
            </View>
          )}

          <ScrollView
            style={styles.rosterScroll}
            contentContainerStyle={styles.rosterContainer}
            keyboardShouldPersistTaps="handled">
            {sortedRoster.map((player) => (
              <PlayerChip
                key={player}
                name={player}
                selected={step === 'player2' && player === player1}
                onPress={() => handlePlayerSelect(player)}
              />
            ))}
            {!showAddPlayer && (
              <Pressable
                style={[styles.addButton, { borderColor: palette.overlay20 }]}
                onPress={() => setShowAddPlayer(true)}>
                <MaterialCommunityIcons name="plus" size={20} color={palette.textMuted} />
              </Pressable>
            )}
          </ScrollView>

          {showAddPlayer && (
            <View style={styles.addPlayerRow}>
              <TextInput
                style={[
                  styles.addPlayerInput,
                  {
                    backgroundColor: palette.overlay08,
                    borderColor: palette.overlay20,
                    color: palette.modalText,
                  },
                ]}
                placeholder="Player name"
                placeholderTextColor={palette.textMuted}
                value={newPlayerName}
                onChangeText={setNewPlayerName}
                onSubmitEditing={handleAddPlayer}
                autoFocus
              />
              <Pressable
                style={[styles.addPlayerSubmit, { backgroundColor: palette.accent }]}
                onPress={handleAddPlayer}>
                <Text style={[styles.addPlayerSubmitText, { color: palette.textOnAccent }]}>
                  Add
                </Text>
              </Pressable>
              <Pressable
                style={[styles.addPlayerCancel, { backgroundColor: palette.overlay10 }]}
                onPress={() => {
                  setShowAddPlayer(false);
                  setNewPlayerName('');
                }}>
                <MaterialCommunityIcons name="close" size={18} color={palette.textMuted} />
              </Pressable>
            </View>
          )}

          <Pressable
            style={[styles.skipButton, { backgroundColor: palette.overlay10 }]}
            onPress={handleSkip}>
            <Text style={[styles.skipText, { color: palette.textMuted }]}>Skip</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sheet: { width: '80%', maxWidth: 500, maxHeight: '80%', borderRadius: 20, padding: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: { flex: 1, gap: 4 },
  actionBadge: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  stepLabel: { fontSize: 20, fontWeight: '600' },
  cancelButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  cancelText: { fontSize: 14, fontWeight: '500' },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  goalBadgeText: { fontSize: 14, fontWeight: '600' },
  rosterScroll: { maxHeight: 150 },
  rosterContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 8 },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPlayerRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  addPlayerInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  addPlayerSubmit: {
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPlayerSubmitText: { fontSize: 14, fontWeight: '600' },
  addPlayerCancel: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: { marginTop: 16, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  skipText: { fontSize: 14, fontWeight: '600' },
});
```

---

### 3. Component: `components/stat-tracker/CompactScorebar.tsx`

```tsx
import { useTheme } from '@/context/ThemeContext';
import { useGameStore } from '@/store/gameStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function CompactScorebar() {
  const { palette } = useTheme();
  const { team1Name, team2Name, team1Score, team2Score, possession } = useGameStore();

  return (
    <View style={[styles.container, { backgroundColor: palette.overlay05 }]}>
      <View style={styles.teamSection}>
        <View style={styles.teamNameRow}>
          {possession === 'team1' && (
            <MaterialCommunityIcons
              name="disc"
              size={14}
              color={palette.accent}
              style={styles.discIcon}
            />
          )}
          <Text style={[styles.teamName, { color: palette.textInverse }]} numberOfLines={1}>
            {team1Name}
          </Text>
        </View>
        <Text style={[styles.score, { color: palette.textInverse }]}>{team1Score}</Text>
      </View>
      <View style={[styles.divider, { backgroundColor: palette.overlay20 }]} />
      <View style={styles.teamSection}>
        <View style={styles.teamNameRow}>
          {possession === 'team2' && (
            <MaterialCommunityIcons
              name="disc"
              size={14}
              color={palette.accent}
              style={styles.discIcon}
            />
          )}
          <Text style={[styles.teamName, { color: palette.textMuted }]} numberOfLines={1}>
            {team2Name}
          </Text>
        </View>
        <Text style={[styles.score, { color: palette.textMuted }]}>{team2Score}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
  },
  teamSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamNameRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  discIcon: { marginRight: 6 },
  teamName: { fontSize: 16, fontWeight: '600', flex: 1 },
  score: { fontSize: 28, fontWeight: '700', marginLeft: 12 },
  divider: { width: 1, height: 40, marginHorizontal: 16 },
});
```

---

### 4. Component: `components/stat-tracker/StatActionBar.tsx`

```tsx
import { useTheme } from '@/context/ThemeContext';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type StatActionType = 'goal' | 'drop' | 'block' | 'throwaway';

interface StatActionBarProps {
  onAction: (action: StatActionType) => void;
  disabled?: boolean;
}

export function StatActionBar({ onAction, disabled = false }: StatActionBarProps) {
  const { palette } = useTheme();

  const actions: { type: StatActionType; label: string; color: string; bgColor: string }[] = [
    { type: 'goal', label: 'GOAL', color: palette.success, bgColor: palette.successOverlay15 },
    { type: 'block', label: 'BLOCK', color: palette.accent, bgColor: palette.accentOverlay15 },
    { type: 'drop', label: 'DROP', color: palette.danger, bgColor: palette.dangerOverlay15 },
    { type: 'throwaway', label: 'THROW', color: palette.warning, bgColor: palette.overlay15 },
  ];

  return (
    <View style={styles.container}>
      {actions.map((action) => (
        <Pressable
          key={action.type}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: action.bgColor, borderColor: action.color },
            pressed && styles.buttonPressed,
            disabled && styles.buttonDisabled,
          ]}
          onPress={() => onAction(action.type)}
          disabled={disabled}>
          <Text style={[styles.buttonText, { color: action.color }]}>{action.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    minWidth: 90,
    alignItems: 'center',
  },
  buttonText: { fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  buttonPressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
  buttonDisabled: { opacity: 0.5 },
});
```

---

## Modifications to Existing Files

### `app/_layout.tsx`

Add modal route registration:

```tsx
<Stack.Screen
  name="StatTrackerEntryModal"
  options={{
    presentation: 'transparentModal',
    animation: 'fade',
    gestureEnabled: false,
    contentStyle: { backgroundColor: 'transparent' },
  }}
/>
```

### `app/Settings.tsx`

Add experimental section button (in left column, after display settings):

```tsx
{/* Experimental Stat Tracker */}
<View style={[styles.divider, dividerStyle]} />
<Text style={[styles.sectionTitle, textInverseStyle]}>EXPERIMENTAL</Text>
<Pressable
  style={({ pressed }) => [
    styles.experimentalButton,
    { backgroundColor: palette.accentOverlay15, borderColor: palette.accentOverlay30 },
    pressed && styles.buttonPressed,
  ]}
  onPress={() => router.push('/StatTracker')}>
  <MaterialCommunityIcons name="test-tube" size={20} color={palette.accent} />
  <Text style={[styles.experimentalButtonText, { color: palette.accent }]}>
    Try Stat Tracker (Beta)
  </Text>
</Pressable>
```

Add styles:

```tsx
experimentalButton: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  paddingHorizontal: 16,
  paddingVertical: 12,
  borderRadius: 10,
  borderWidth: 1,
},
experimentalButtonText: {
  fontSize: 14,
  fontWeight: '600',
},
```

---

## Files to Delete (for cleanup)

```bash
rm app/StatTracker.tsx
rm app/StatTrackerEntryModal.tsx
rm -r components/stat-tracker/
```

---

## Future Ideas

- Make CompactScorebar tappable for opponent scoring
- Add "THEIR GOAL" button to StatActionBar
- Consider hybrid approach: scoreboard layout with stat buttons overlaid
