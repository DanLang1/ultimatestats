import { EditableSettingCard } from '@/components/pre-game-confirm/EditableSettingCard';
import { TimeoutSettingCard } from '@/components/pre-game-confirm/TimeoutSettingCard';
import { ThemedView } from '@/components/ThemedView';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ScreenHeader } from '@/components/ui/ScreenHeader';

import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { getContrastingTextColor } from '@/lib/colorUtils';
import { formatRatioFull, GenderRatio } from '@/lib/genderRatioUtils';
import { shouldShowLinePrompt } from '@/lib/linePromptUtils';
import { useGameStore } from '@/store/gameStore';
import { useNumberPickerStore } from '@/store/numberPickerStore';
import { useSettingsStore } from '@/store/settingsStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Redirect, router, Stack } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function PreGameConfirm() {
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass);

  const {
    possession,
    statTrackingEnabled,
    currentTeam,
    team2Name,
    setPossession,
    gameTo,
    setGameTo,
    gameLength,
    setGameLength,
    softCapMins,
    setSoftCapMins,
    team1Timeouts,
    autoHalftimeEnabled,
    setAutoHalftimeEnabled,
    floaterEnabled,
    setFloaterEnabled,
    pointTimerEnabled,
    setPointTimerEnabled,
    setStatTrackingEnabled,
    resetTimeouts,
    team1BgColor,
    team2BgColor,
  } = useGameStore();

  const {
    genderRatioEnabled,
    setGenderRatioEnabled,
    setFirstPointRatio,
    firstPointRatio,
    lineCallingEnabled,
    setLineCallingEnabled,
    numPlayers,
    setNumPlayers,
  } = useSettingsStore();

  const openPicker = useNumberPickerStore((s) => s.open);

  const team1Name = currentTeam?.name ?? 'Team 1';

  // Determine what's needed
  const needPossession = statTrackingEnabled && possession === null;
  const needRatio = genderRatioEnabled && firstPointRatio === null;

  const [selectedTeam, setSelectedTeam] = useState<'team1' | 'team2' | ''>(possession ?? '');
  const [selectedRatio, setSelectedRatio] = useState<GenderRatio | ''>(firstPointRatio ?? '');
  const [teamOrbitRunKey, setTeamOrbitRunKey] = useState(0);
  const [ratioOrbitRunKey, setRatioOrbitRunKey] = useState(0);

  // If nothing is needed, don't show the page
  if (!needPossession && !needRatio) {
    return <Redirect href="/" />;
  }

  // Derived values
  const softCapTime = gameLength - softCapMins;
  const timeoutCount = team1Timeouts.length;

  // Determine if the start button should be enabled
  const possessionReady = !needPossession || selectedTeam !== '';
  const ratioReady = !needRatio || selectedRatio !== '';
  const canStart = possessionReady && ratioReady;

  // Derived colors
  const t1Color = team1BgColor || palette.primary;
  const t2Color = team2BgColor || palette.accent;
  const t1TextColor = getContrastingTextColor(t1Color);
  const t2TextColor = getContrastingTextColor(t2Color);
  const fmpTextColor = getContrastingTextColor(palette.fmpColor);
  const mmpTextColor = getContrastingTextColor(palette.mmpColor);
  const selectedTeamOrbitColor = selectedTeam === 'team2' ? t2Color : t1Color;
  const selectedRatioOrbitColor =
    selectedRatio === 'more-men' ? palette.mmpColor : palette.fmpColor;

  // Button text depends on whether line calling chains next
  const showSetLine = statTrackingEnabled && lineCallingEnabled;
  const buttonLabel = showSetLine ? 'Set Line' : 'Start Game';
  const buttonIcon = showSetLine ? 'clipboard-check-outline' : 'play';

  const handleStart = () => {
    if (needPossession && selectedTeam) {
      setPossession(selectedTeam as 'team1' | 'team2');
    }
    if (needRatio && selectedRatio) {
      setFirstPointRatio(selectedRatio as GenderRatio);
    }

    // Chain to LineEditor for first point line selection
    if (shouldShowLinePrompt()) {
      router.replace('/LineEditor');
    } else {
      router.dismissTo('/');
    }
  };

  const handleBack = () => {
    router.replace('/Dashboard');
  };

  // Number picker helpers
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
    <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenHeader
        title="PRE-GAME"
        onBack={handleBack}
        backHitSlop={24}
        titleColor={palette.textMuted}
        backButtonBackgroundColor={palette.overlay10}
        titleOverlayPaddingPortrait={88}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Lock Warning */}
        <View style={[styles.lockInfo, { backgroundColor: palette.dangerOverlay15 }]}>
          <MaterialCommunityIcons
            name="lock-outline"
            size={scaleBySizeClass(16, sizeClass)}
            color={palette.danger}
          />
          <Text style={[styles.lockText, { color: palette.danger }]}>
            Settings lock once the game starts
          </Text>
        </View>

        <View key={isLandscape ? 'landscape' : 'portrait'} style={styles.columnsContainer}>
          {/* Left Column: Settings */}
          <View style={styles.column}>
            <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>GAME SETTINGS</Text>
            <View style={styles.settingsGrid}>
              {/* Game To */}
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
                }
                sizeClass={sizeClass}>
                <Text style={[styles.settingValue, { color: palette.textInverse }]}>{gameTo}</Text>
              </EditableSettingCard>

              {/* Hard Cap */}
              <EditableSettingCard
                icon="clock-outline"
                label="Hard Cap"
                onPress={() =>
                  openNumberPicker({
                    value: gameLength,
                    min: 1,
                    max: 180,
                    label: 'Hard Cap',
                    suffix: 'min',
                    quickOptions: [90, 105, 110, 120],
                    onChange: (val) => {
                      setGameLength(val);
                      // Clamp soft cap if needed
                      if (softCapMins > val) {
                        setSoftCapMins(val);
                      }
                    },
                  })
                }
                sizeClass={sizeClass}>
                <Text style={[styles.settingValue, { color: palette.textInverse }]}>
                  {gameLength} min
                </Text>
              </EditableSettingCard>

              {/* Soft Cap */}
              <EditableSettingCard
                icon="clock-alert-outline"
                label="Soft Cap"
                onPress={() =>
                  openNumberPicker({
                    value: softCapTime,
                    min: 0,
                    max: gameLength,
                    label: 'Soft Cap',
                    suffix: 'min',
                    onChange: (val) => setSoftCapMins(gameLength - val),
                  })
                }
                sizeClass={sizeClass}>
                <Text style={[styles.settingValue, { color: palette.textInverse }]}>
                  {softCapTime} min
                </Text>
              </EditableSettingCard>

              {/* Players */}
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
                }
                sizeClass={sizeClass}>
                <Text style={[styles.settingValue, { color: palette.textInverse }]}>
                  {numPlayers}v{numPlayers}
                </Text>
              </EditableSettingCard>

              {/* Halftime */}
              <EditableSettingCard
                icon="swap-vertical"
                label="Halftime"
                isActive={autoHalftimeEnabled}
                onPress={() => {
                  setAutoHalftimeEnabled(!autoHalftimeEnabled);
                  if (autoHalftimeEnabled) setFloaterEnabled(false);
                }}
                sizeClass={sizeClass}>
                <Text
                  style={[
                    styles.settingValue,
                    { color: autoHalftimeEnabled ? palette.accent : palette.textMuted },
                  ]}>
                  {autoHalftimeEnabled ? 'ON' : 'OFF'}
                </Text>
              </EditableSettingCard>

              {/* Timeouts */}
              <TimeoutSettingCard
                timeoutCount={timeoutCount}
                autoHalftimeEnabled={autoHalftimeEnabled}
                floaterEnabled={floaterEnabled}
                onResetTimeouts={resetTimeouts}
                onSetFloaterEnabled={setFloaterEnabled}
                sizeClass={sizeClass}
              />

              {/* Stat Tracking */}
              <EditableSettingCard
                icon="chart-bar"
                label="Stat Tracking"
                isActive={statTrackingEnabled}
                onPress={() => {
                  setStatTrackingEnabled(!statTrackingEnabled);
                  if (statTrackingEnabled) {
                    setPointTimerEnabled(false);
                    setLineCallingEnabled(false);
                  }
                }}
                sizeClass={sizeClass}>
                <Text
                  style={[
                    styles.settingValue,
                    { color: statTrackingEnabled ? palette.accent : palette.textMuted },
                  ]}>
                  {statTrackingEnabled ? 'ON' : 'OFF'}
                </Text>
              </EditableSettingCard>

              {/* Line Calling - only when stat tracking enabled */}
              {statTrackingEnabled && (
                <EditableSettingCard
                  icon="clipboard-list-outline"
                  label="Line Calling"
                  isActive={lineCallingEnabled}
                  onPress={() => setLineCallingEnabled(!lineCallingEnabled)}
                  sizeClass={sizeClass}>
                  <Text
                    style={[
                      styles.settingValue,
                      { color: lineCallingEnabled ? palette.accent : palette.textMuted },
                    ]}>
                    {lineCallingEnabled ? 'ON' : 'OFF'}
                  </Text>
                </EditableSettingCard>
              )}

              {/* Gender Ratio */}
              <EditableSettingCard
                icon="account-group"
                label="Gender Ratio"
                isActive={genderRatioEnabled}
                onPress={() => setGenderRatioEnabled(!genderRatioEnabled)}
                sizeClass={sizeClass}>
                <Text
                  style={[
                    styles.settingValue,
                    { color: genderRatioEnabled ? palette.accent : palette.textMuted },
                  ]}>
                  {genderRatioEnabled ? 'ON' : 'OFF'}
                </Text>
              </EditableSettingCard>

              {/* Point Timer - only when stat tracking enabled */}
              {statTrackingEnabled && (
                <EditableSettingCard
                  icon="timer-outline"
                  label="Point Timer"
                  isActive={pointTimerEnabled}
                  onPress={() => setPointTimerEnabled(!pointTimerEnabled)}
                  sizeClass={sizeClass}>
                  <Text
                    style={[
                      styles.settingValue,
                      { color: pointTimerEnabled ? palette.accent : palette.textMuted },
                    ]}>
                    {pointTimerEnabled ? 'ON' : 'OFF'}
                  </Text>
                </EditableSettingCard>
              )}
            </View>
          </View>

          {/* Right Column: Game Start Choices */}
          <View style={styles.column}>
            <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>
              STARTING OPTIONS
            </Text>

            {/* Receiving Team Selection */}
            {statTrackingEnabled && (
              <View style={styles.choiceGroup}>
                <SegmentedControl
                  label="WHO IS RECEIVING?"
                  options={[
                    {
                      value: 'team1',
                      label: team1Name,
                      activeColor: t1Color,
                      activeTextColor: t1TextColor,
                    },
                    {
                      value: 'team2',
                      label: team2Name,
                      activeColor: t2Color,
                      activeTextColor: t2TextColor,
                    },
                  ]}
                  value={selectedTeam}
                  onChange={(val) => {
                    setSelectedTeam(val as 'team1' | 'team2');
                    setTeamOrbitRunKey((prev) => prev + 1);
                  }}
                  showRequired={needPossession && selectedTeam === ''}
                  highlightBorder={needPossession && selectedTeam === ''}
                  highlightColor={palette.warning}
                  highlightLeftColor={needPossession && selectedTeam === '' ? t1Color : undefined}
                  highlightRightColor={needPossession && selectedTeam === '' ? t2Color : undefined}
                  attentionColor={selectedTeamOrbitColor}
                  attentionRunKey={teamOrbitRunKey}
                />
              </View>
            )}

            {/* Gender Ratio Selection */}
            {genderRatioEnabled && (
              <View style={styles.choiceGroup}>
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
                  value={selectedRatio}
                  onChange={(val) => {
                    setSelectedRatio(val as GenderRatio);
                    setRatioOrbitRunKey((prev) => prev + 1);
                  }}
                  showRequired={needRatio && selectedRatio === ''}
                  highlightBorder={needRatio && selectedRatio === ''}
                  highlightColor={palette.warning}
                  highlightLeftColor={
                    needRatio && selectedRatio === '' ? palette.fmpColor : undefined
                  }
                  highlightRightColor={
                    needRatio && selectedRatio === '' ? palette.mmpColor : undefined
                  }
                  attentionColor={selectedRatioOrbitColor}
                  attentionRunKey={ratioOrbitRunKey}
                />
              </View>
            )}

            {/* Start Game Button */}
            <Pressable
              onPress={handleStart}
              disabled={!canStart}
              style={({ pressed }) => [
                styles.startButton,
                { backgroundColor: canStart ? palette.success : palette.overlay10 },
                pressed && canStart && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}>
              <MaterialCommunityIcons
                name={buttonIcon}
                size={scaleBySizeClass(22, sizeClass)}
                color={canStart ? palette.textOnAccent : palette.textMuted}
              />
              <Text
                style={[
                  styles.startButtonText,
                  { color: canStart ? palette.textOnAccent : palette.textMuted },
                ]}>
                {buttonLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function createStyles(isLandscape: boolean, sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      padding: 24,
      paddingTop: 8,
    },
    columnsContainer: {
      flexDirection: isLandscape ? 'row' : 'column',
      gap: 24,
      alignItems: isLandscape ? 'flex-start' : 'stretch',
    },
    column: {
      flex: isLandscape ? 1 : 0,
      width: isLandscape ? undefined : '100%',
      gap: 16,
    },
    sectionTitle: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontWeight: '700',
      letterSpacing: 1.5,
      marginBottom: -4,
    },
    settingsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    settingValue: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontWeight: '700',
      marginTop: 1,
    },
    lockInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
    },
    lockText: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontWeight: '600',
    },
    choiceGroup: {
      gap: 6,
    },
    startButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      height: 52,
      borderRadius: 14,
      marginTop: 8,
    },
    startButtonText: {
      fontSize: scaleBySizeClass(18, sizeClass),
      fontWeight: '700',
      letterSpacing: 0.5,
    },
  });
}
