import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { EditableSettingCard } from '@/components/pre-game-confirm/EditableSettingCard';
import { TimeoutSettingCard } from '@/components/pre-game-confirm/TimeoutSettingCard';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { GameSide, Participant } from '@/lib/advancedTracking/types';
import { getContrastingTextColor } from '@/lib/colorUtils';
import { formatRatioFull } from '@/lib/genderRatioUtils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { useGameStore } from '@/store/gameStore';
import { useNumberPickerStore } from '@/store/numberPickerStore';
import { useSettingsStore } from '@/store/settingsStore';
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

  const {
    currentTeam,
    team2Name,
    gameTo,
    setGameTo,
    setTimerTimeLeft,
    team1Timeouts,
    autoHalftimeEnabled,
    setAutoHalftimeEnabled,
    floaterEnabled,
    setFloaterEnabled,
    resetTimeouts,
  } = useGameStore();

  const {
    genderRatioEnabled,
    setGenderRatioEnabled,
    firstPointRatio,
    setFirstPointRatio,
    numPlayers,
    setNumPlayers,
    hardCapMins,
    setHardCapMins,
    softCapMins,
    setSoftCapMins,
  } = useSettingsStore();

  const fmpTextColor = getContrastingTextColor(palette.fmpColor);
  const mmpTextColor = getContrastingTextColor(palette.mmpColor);

  const { resetCurrentGame, createGame } = useAdvancedTrackingStore();

  const openPicker = useNumberPickerStore((s) => s.open);

  const softCapTime = hardCapMins - softCapMins;
  const timeoutCount = team1Timeouts.length;

  const [receivingTeam, setReceivingTeam] = useState<'us' | 'them' | ''>('');

  const canContinue = receivingTeam !== '' && (!genderRatioEnabled || firstPointRatio !== null);

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

    const floaterEnabledForGame = floaterEnabled && autoHalftimeEnabled;

    resetCurrentGame();
    createGame({
      focusSideId: FOCUS_SIDE_ID,
      initialReceivingSideId,
      sides,
      participants,
      format: {
        gameTo,
        halftimeEnabled: autoHalftimeEnabled,
        timeoutsPerHalf: timeoutCount,
        floaterEnabled: floaterEnabledForGame,
      },
    });

    router.push('/advancedTracking/TrackerLineSelect');
  };

  const openNumberPicker = (config: {
    value: number;
    min: number;
    max: number;
    label: string;
    suffix?: string;
    quickOptions?: number[];
    onChange: (value: number) => void;
  }) => {
    openPicker(config);
    router.push('/NumberPickerModal');
  };

  return (
    <ThemedView testID="advanced-tracker-pregame-screen" style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title="ADVANCED TRACKER"
        onBack={() => router.back()}
        titleColor={palette.textMuted}
        backButtonBackgroundColor={palette.overlay10}
        rightSlot={
          <Pressable
            onPress={() => router.push('/Settings')}
            style={({ pressed }) => [
              styles.headerIconButton,
              { backgroundColor: palette.overlay10 },
              pressed && styles.headerIconButtonPressed,
            ]}
            hitSlop={12}>
            <MaterialCommunityIcons
              name="cog-outline"
              size={scaleBySizeClass(22, sizeClass)}
              color={palette.textInverse}
            />
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.lockInfo, { backgroundColor: palette.dangerOverlay15 }]}>
          <MaterialCommunityIcons
            name="lock-outline"
            size={scaleBySizeClass(16, sizeClass)}
            color={palette.danger}
          />
          <ThemedText style={[styles.lockText, { color: palette.danger }]}>
            Settings lock once the game starts
          </ThemedText>
        </View>

        <ThemedText style={[styles.sectionTitle, { color: palette.textMuted }]}>
          GAME SETTINGS
        </ThemedText>
        <View style={styles.settingsGrid}>
          <EditableSettingCard
            icon="trophy-outline"
            label="Game To"
            onPress={() =>
              openNumberPicker({
                value: gameTo,
                min: 1,
                max: 99,
                label: 'Game To',
                quickOptions: [13, 15],
                onChange: setGameTo,
              })
            }>
            <ThemedText style={[styles.settingValue, { color: palette.textInverse }]}>
              {gameTo}
            </ThemedText>
          </EditableSettingCard>

          <EditableSettingCard
            icon="clock-outline"
            label="Hard Cap"
            onPress={() =>
              openNumberPicker({
                value: hardCapMins,
                min: 1,
                max: 180,
                label: 'Hard Cap',
                suffix: 'min',
                quickOptions: [90, 105, 110, 120],
                onChange: (val) => {
                  setHardCapMins(val);
                  setTimerTimeLeft(val * 60);
                  if (softCapMins > val) setSoftCapMins(val);
                },
              })
            }>
            <ThemedText style={[styles.settingValue, { color: palette.textInverse }]}>
              {hardCapMins} min
            </ThemedText>
          </EditableSettingCard>

          <EditableSettingCard
            icon="clock-alert-outline"
            label="Soft Cap"
            onPress={() =>
              openNumberPicker({
                value: softCapTime,
                min: 0,
                max: hardCapMins,
                label: 'Soft Cap',
                suffix: 'min',
                onChange: (val) => setSoftCapMins(hardCapMins - val),
              })
            }>
            <ThemedText style={[styles.settingValue, { color: palette.textInverse }]}>
              {softCapTime} min
            </ThemedText>
          </EditableSettingCard>

          <EditableSettingCard
            icon="account-multiple-outline"
            label="Players"
            onPress={() =>
              openNumberPicker({
                value: numPlayers,
                min: 1,
                max: 7,
                label: 'Players',
                quickOptions: [3, 5, 7],
                onChange: setNumPlayers,
              })
            }>
            <ThemedText style={[styles.settingValue, { color: palette.textInverse }]}>
              {numPlayers}v{numPlayers}
            </ThemedText>
          </EditableSettingCard>

          <EditableSettingCard
            icon="swap-vertical"
            label="Halftime"
            isActive={autoHalftimeEnabled}
            onPress={() => {
              setAutoHalftimeEnabled(!autoHalftimeEnabled);
              if (autoHalftimeEnabled) setFloaterEnabled(false);
            }}>
            <ThemedText
              style={[
                styles.settingValue,
                { color: autoHalftimeEnabled ? palette.accent : palette.textMuted },
              ]}>
              {autoHalftimeEnabled ? 'ON' : 'OFF'}
            </ThemedText>
          </EditableSettingCard>

          <TimeoutSettingCard
            timeoutCount={timeoutCount}
            autoHalftimeEnabled={autoHalftimeEnabled}
            floaterEnabled={floaterEnabled}
            onResetTimeouts={resetTimeouts}
            onSetFloaterEnabled={setFloaterEnabled}
          />

          <EditableSettingCard
            icon="gender-male-female"
            label="Gender Ratio"
            isActive={genderRatioEnabled}
            onPress={() => setGenderRatioEnabled(!genderRatioEnabled)}>
            <ThemedText
              style={[
                styles.settingValue,
                { color: genderRatioEnabled ? palette.accent : palette.textMuted },
              ]}>
              {genderRatioEnabled ? 'ON' : 'OFF'}
            </ThemedText>
          </EditableSettingCard>
        </View>

        {genderRatioEnabled && (
          <SegmentedControl
            label="STARTING GENDER RATIO"
            options={[
              {
                value: 'more-women',
                label: formatRatioFull('more-women'),
                activeColor: palette.fmpColor,
                activeTextColor: fmpTextColor,
              },
              {
                value: 'more-men',
                label: formatRatioFull('more-men'),
                activeColor: palette.mmpColor,
                activeTextColor: mmpTextColor,
              },
            ]}
            value={firstPointRatio ?? ''}
            onChange={setFirstPointRatio}
            showRequired={firstPointRatio === null}
            highlightBorder={firstPointRatio === null}
            highlightColor={palette.warning}
          />
        )}

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
          onChange={setReceivingTeam}
          showRequired={receivingTeam === ''}
          highlightBorder={receivingTeam === ''}
          highlightColor={palette.warning}
        />

        <Pressable
          onPress={handleSetLine}
          disabled={!canContinue}
          testID="advanced-tracker-set-line-button"
          style={({ pressed }) => [
            styles.continueButton,
            { backgroundColor: canContinue ? palette.accent : palette.overlay10 },
            pressed && canContinue && { opacity: 0.85, transform: [{ scale: 0.98 }] },
          ]}>
          <ThemedText
            testID="advanced-tracker-set-line-text"
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
    lockInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
    },
    lockText: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    headerIconButton: {
      padding: 8,
      borderRadius: 20,
    },
    headerIconButtonPressed: {
      opacity: 0.8,
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
