import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { EditableSettingCard } from '@/components/pre-game-confirm/EditableSettingCard';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { GameSide, Participant } from '@/lib/advancedTracking/types';
import { useAdvancedTrackingStore } from '@/store/advancedTrackingStore';
import { useGameStore } from '@/store/gameStore';
import { useNumberPickerStore } from '@/store/numberPickerStore';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

export const FOCUS_SIDE_ID = 'focus-side';
export const OPP_SIDE_ID = 'opp-side';

export default function AdvancedPreGameConfirm() {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const currentTeam = useGameStore((s) => s.currentTeam);
  const team2Name = useGameStore((s) => s.team2Name);
  const gameTo = useGameStore((s) => s.gameTo);
  const setGameTo = useGameStore((s) => s.setGameTo);

  const { resetCurrentGame, createGame } = useAdvancedTrackingStore();

  const openPicker = useNumberPickerStore((s) => s.open);

  const [receivingTeam, setReceivingTeam] = useState<'us' | 'them' | ''>('');

  const canContinue = receivingTeam !== '';

  const handleSetLine = () => {
    const sides: GameSide[] = [
      {
        id: FOCUS_SIDE_ID,
        label: currentTeam.name,
        sourceTeamId: currentTeam.id,
        trackingMode: 'full-roster',
      },
      { id: OPP_SIDE_ID, label: team2Name, trackingMode: 'anonymous' },
    ];

    const participants: Participant[] = (currentTeam?.roster ?? [])
      .filter((p) => p.isActive)
      .map((p) => ({
        id: p.id,
        name: p.name,
        sourcePlayerId: p.id,
        matchingType: p.matchingType,
        role: p.role,
      }));

    const initialReceivingSideId = receivingTeam === 'us' ? FOCUS_SIDE_ID : OPP_SIDE_ID;

    resetCurrentGame();
    createGame({
      focusSideId: FOCUS_SIDE_ID,
      initialReceivingSideId,
      sides,
      participants,
      format: { gameTo },
    });

    router.push('/advanced/LineEditor');
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title="ADVANCED TRACKER"
        onBack={() => router.back()}
        titleColor={palette.textMuted}
        backButtonBackgroundColor={palette.overlay10}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText style={[styles.sectionTitle, { color: palette.textMuted }]}>
          GAME SETTINGS
        </ThemedText>
        <View style={styles.settingsGrid}>
          <EditableSettingCard
            icon="trophy-outline"
            label="Game To"
            onPress={() => {
              openPicker({
                value: gameTo,
                min: 1,
                max: 99,
                label: 'Game To',
                quickOptions: [13, 15],
                onChange: setGameTo,
              });
              router.push('/NumberPickerModal');
            }}
            sizeClass={sizeClass}>
            <ThemedText style={[styles.settingValue, { color: palette.textInverse }]}>
              {gameTo}
            </ThemedText>
          </EditableSettingCard>

          <EditableSettingCard icon="account-group-outline" label="Opponent" sizeClass={sizeClass}>
            <ThemedText
              style={[styles.settingValue, { color: palette.textInverse }]}
              numberOfLines={1}>
              {team2Name || '—'}
            </ThemedText>
          </EditableSettingCard>
        </View>

        <ThemedText style={[styles.sectionTitle, { color: palette.textMuted }]}>
          STARTING OPTIONS
        </ThemedText>
        <SegmentedControl
          label="WHO IS RECEIVING?"
          options={[
            { value: 'us', label: currentTeam?.name ?? 'Us' },
            { value: 'them', label: team2Name || 'Them' },
          ]}
          value={receivingTeam}
          onChange={(val) => setReceivingTeam(val as 'us' | 'them')}
          showRequired={receivingTeam === ''}
          highlightBorder={receivingTeam === ''}
          highlightColor={palette.warning}
        />

        <Pressable
          onPress={handleSetLine}
          disabled={!canContinue}
          style={({ pressed }) => [
            styles.continueButton,
            { backgroundColor: canContinue ? palette.accent : palette.overlay10 },
            pressed && canContinue && { opacity: 0.85, transform: [{ scale: 0.98 }] },
          ]}>
          <ThemedText
            style={[
              styles.continueButtonText,
              { color: canContinue ? palette.textOnAccent : palette.textMuted },
            ]}>
            Set Line
          </ThemedText>
          <MaterialCommunityIcons
            name="chevron-right"
            size={scaleBySizeClass(22, sizeClass)}
            color={canContinue ? palette.textOnAccent : palette.textMuted}
          />
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      paddingTop: 8,
      gap: 16,
    },
    sectionTitle: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 1.5,
    },
    settingsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    settingValue: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.bold,
      marginTop: 1,
    },
    continueButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      height: 52,
      borderRadius: 14,
      marginTop: 8,
    },
    continueButtonText: {
      fontSize: scaleBySizeClass(18, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 0.5,
    },
  });
}
