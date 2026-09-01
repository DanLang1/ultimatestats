import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { EditableSettingCard } from '@/components/pre-game-confirm/EditableSettingCard';
import { TimeoutSettingCard } from '@/components/pre-game-confirm/TimeoutSettingCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useTheme } from '@/context/ThemeContext';
import { useStatsTutorialPending } from '@/hooks/basic/useStatsTutorialPending';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { shouldShowLinePrompt } from '@/lib/basic/linePromptUtils';
import { getContrastingTextColor } from '@/lib/colorUtils';
import { formatRatioFull, GenderRatio } from '@/lib/genderRatioUtils';
import { useGameStore } from '@/store/basic/gameStore';
import { useNumberPickerStore } from '@/store/numberPickerStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTutorialStore } from '@/store/tutorialStore';
import { Fonts } from '@/theme/theme';

export default function PreGameConfirm() {
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const {
    possession,
    statTrackingEnabled,
    currentTeam,
    team2Name,
    setPossession,
    gameTo,
    setGameTo,
    setTimerTimeLeft,
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
    hardCapMins,
    setHardCapMins,
    softCapMins,
    setSoftCapMins,
  } = useSettingsStore();
  const { hasSeenStatsTutorial, queueStatsTutorialForNextGameStart } = useTutorialStore();
  const statsTutorialPending = useStatsTutorialPending();

  const openPicker = useNumberPickerStore((s) => s.open);

  const team1Name = currentTeam.name;

  // Determine what's needed
  const needPossession = statTrackingEnabled && possession === null;
  const needRatio = genderRatioEnabled && firstPointRatio === null;

  const [selectedTeam, setSelectedTeam] = useState<'team1' | 'team2' | ''>(possession ?? '');
  const [selectedRatio, setSelectedRatio] = useState<GenderRatio | ''>(firstPointRatio ?? '');
  const [teamOrbitRunKey, setTeamOrbitRunKey] = useState(0);
  const [ratioOrbitRunKey, setRatioOrbitRunKey] = useState(0);

  // Derived values
  const softCapTime = hardCapMins - softCapMins;
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
      setPossession(selectedTeam);
    }
    if (needRatio && selectedRatio) {
      setFirstPointRatio(selectedRatio);
    }

    if (statsTutorialPending) {
      router.replace('/TutorialStatIntro');
      return;
    }

    // Chain to LineEditor for first point line selection
    if (shouldShowLinePrompt()) {
      router.replace('/LineEditor');
    } else {
      router.dismissTo('/Scoreboard');
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
        title="BASIC SCOREBOARD"
        onBack={handleBack}
        backHitSlop={24}
        titleColor={palette.textMuted}
        backButtonBackgroundColor={palette.overlay10}
        titleOverlayPaddingPortrait={88}
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
        {/* Lock Warning */}
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

        <View key={isLandscape ? 'landscape' : 'portrait'} style={styles.columnsContainer}>
          {/* Left Column: Settings */}
          <View style={styles.column}>
            <ThemedText style={[styles.sectionTitle, { color: palette.textMuted }]}>
              GAME SETTINGS
            </ThemedText>
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
                }>
                <ThemedText style={[styles.settingValue, { color: palette.textInverse }]}>
                  {gameTo}
                </ThemedText>
              </EditableSettingCard>

              {/* Hard Cap */}
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
                      // Clamp soft cap if needed
                      if (softCapMins > val) {
                        setSoftCapMins(val);
                      }
                    },
                  })
                }>
                <ThemedText style={[styles.settingValue, { color: palette.textInverse }]}>
                  {hardCapMins} min
                </ThemedText>
              </EditableSettingCard>

              {/* Soft Cap */}
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
                }>
                <ThemedText style={[styles.settingValue, { color: palette.textInverse }]}>
                  {numPlayers}v{numPlayers}
                </ThemedText>
              </EditableSettingCard>

              {/* Halftime */}
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

              {/* Timeouts */}
              <TimeoutSettingCard
                timeoutCount={timeoutCount}
                autoHalftimeEnabled={autoHalftimeEnabled}
                floaterEnabled={floaterEnabled}
                onResetTimeouts={resetTimeouts}
                onSetFloaterEnabled={setFloaterEnabled}
              />

              {/* Stat Tracking */}
              <EditableSettingCard
                icon="chart-bar"
                label="Stat Tracking"
                isActive={statTrackingEnabled}
                onPress={() => {
                  if (!statTrackingEnabled && !hasSeenStatsTutorial) {
                    queueStatsTutorialForNextGameStart();
                  }
                  setStatTrackingEnabled(!statTrackingEnabled);
                  if (statTrackingEnabled) {
                    setPointTimerEnabled(false);
                    setLineCallingEnabled(false);
                  }
                }}>
                <ThemedText
                  style={[
                    styles.settingValue,
                    { color: statTrackingEnabled ? palette.accent : palette.textMuted },
                  ]}>
                  {statTrackingEnabled ? 'ON' : 'OFF'}
                </ThemedText>
              </EditableSettingCard>

              {/* Line Calling - only when stat tracking enabled */}
              {statTrackingEnabled && (
                <EditableSettingCard
                  icon="clipboard-list-outline"
                  label="Line Calling"
                  isActive={lineCallingEnabled}
                  onPress={() => setLineCallingEnabled(!lineCallingEnabled)}>
                  <ThemedText
                    style={[
                      styles.settingValue,
                      { color: lineCallingEnabled ? palette.accent : palette.textMuted },
                    ]}>
                    {lineCallingEnabled ? 'ON' : 'OFF'}
                  </ThemedText>
                </EditableSettingCard>
              )}

              {/* Gender Ratio */}
              <EditableSettingCard
                icon="account-group"
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

              {/* Point Timer - only when stat tracking enabled */}
              {statTrackingEnabled && (
                <EditableSettingCard
                  icon="timer-outline"
                  label="Point Timer"
                  isActive={pointTimerEnabled}
                  onPress={() => setPointTimerEnabled(!pointTimerEnabled)}>
                  <ThemedText
                    style={[
                      styles.settingValue,
                      { color: pointTimerEnabled ? palette.accent : palette.textMuted },
                    ]}>
                    {pointTimerEnabled ? 'ON' : 'OFF'}
                  </ThemedText>
                </EditableSettingCard>
              )}
            </View>
          </View>

          {/* Right Column: Game Start Choices */}
          <View style={styles.column}>
            <ThemedText style={[styles.sectionTitle, { color: palette.textMuted }]}>
              STARTING OPTIONS
            </ThemedText>

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
                    setSelectedTeam(val);
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
                    setSelectedRatio(val);
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
              <ThemedText
                style={[
                  styles.startButtonText,
                  { color: canStart ? palette.textOnAccent : palette.textMuted },
                ]}>
                {buttonLabel}
              </ThemedText>
            </Pressable>
          </View>
        </View>
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
      padding: 24,
      paddingTop: 8,
    },
    columnsContainer: {
      flexDirection: 'column',
      gap: 24,
    },
    column: {
      width: '100%',
      gap: 16,
    },
    sectionTitle: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.bold,
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
      fontFamily: Fonts.bold,
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
      fontFamily: Fonts.semiBold,
    },
    choiceGroup: {
      gap: 6,
    },
    headerIconButton: {
      padding: 8,
      borderRadius: 20,
    },
    headerIconButtonPressed: {
      opacity: 0.8,
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
      fontFamily: Fonts.bold,
      letterSpacing: 0.5,
    },
  });
}
