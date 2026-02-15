import { ThemedView } from '@/components/ThemedView';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { useLayout } from '@/hooks/useLayout';
import { getContrastingTextColor } from '@/lib/colorUtils';
import { formatRatioFull, GenderRatio } from '@/lib/genderRatioUtils';
import { shouldShowLinePrompt } from '@/lib/linePromptUtils';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Redirect, router, Stack } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type SettingItem = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
};

export default function PreGameConfirm() {
  const { palette } = useTheme();
  const { isLandscape } = useLayout();
  const styles = createStyles(isLandscape);

  const {
    possession,
    statTrackingEnabled,
    currentTeam,
    team2Name,
    setPossession,
    gameTo,
    gameLength,
    softCapMins,
    team1Timeouts,
    autoHalftimeEnabled,
    floaterEnabled,
    pointTimerEnabled,
    team1BgColor,
    team2BgColor,
  } = useGameStore();

  const {
    genderRatioEnabled,
    setFirstPointRatio,
    firstPointRatio,
    lineCallingEnabled,
    numPlayers,
  } = useSettingsStore();

  const team1Name = currentTeam?.name ?? 'Team 1';

  // Determine what's needed
  const needPossession = statTrackingEnabled && possession === null;
  const needRatio = genderRatioEnabled && firstPointRatio === null;

  const [selectedTeam, setSelectedTeam] = useState<'team1' | 'team2' | ''>(possession ?? '');
  const [selectedRatio, setSelectedRatio] = useState<GenderRatio | ''>(firstPointRatio ?? '');

  // If nothing is needed, don't show the page
  if (!needPossession && !needRatio) {
    return <Redirect href="/" />;
  }

  // Derived values
  const softCapTime = gameLength - softCapMins;
  const timeoutsLabel = `${team1Timeouts.length}${autoHalftimeEnabled ? ' / half' : ''}${floaterEnabled ? ' + Floater' : ''}`;

  // Build settings list — only show enabled/relevant settings
  const settings: SettingItem[] = [
    { icon: 'trophy-outline', label: 'Game To', value: `${gameTo}` },
    { icon: 'clock-outline', label: 'Hard Cap', value: `${gameLength} min` },
    { icon: 'clock-alert-outline', label: 'Soft Cap', value: `${softCapTime} min` },
    { icon: 'timer-sand', label: 'Timeouts', value: timeoutsLabel },
    { icon: 'account-multiple-outline', label: 'Players', value: `${numPlayers}v${numPlayers}` },
  ];

  settings.push({
    icon: 'swap-vertical',
    label: 'Halftime',
    value: autoHalftimeEnabled ? 'On' : 'Off',
  });

  if (statTrackingEnabled) {
    settings.push({ icon: 'chart-bar', label: 'Stat Tracking', value: 'On' });
  }

  if (statTrackingEnabled && lineCallingEnabled) {
    settings.push({ icon: 'clipboard-list-outline', label: 'Line Calling', value: 'On' });
  }

  if (genderRatioEnabled) {
    settings.push({ icon: 'account-group', label: 'Gender Ratio', value: 'On' });
  }

  if (statTrackingEnabled && pointTimerEnabled) {
    settings.push({ icon: 'timer-outline', label: 'Point Timer', value: 'On' });
  }

  // Determine if the start button should be enabled
  const possessionReady = !needPossession || selectedTeam !== '';
  const ratioReady = !needRatio || selectedRatio !== '';
  const canStart = possessionReady && ratioReady;

  // Derived colors
  const t1Color = team1BgColor || palette.primary;
  const t2Color = team2BgColor || palette.accent;
  const t1TextColor = getContrastingTextColor(t1Color);
  const t2TextColor = getContrastingTextColor(t2Color);

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

    // Chain to PointTransition for first point line selection
    if (shouldShowLinePrompt()) {
      router.replace('/PointTransition');
    } else {
      router.dismissTo('/');
    }
  };

  const handleEditSettings = () => {
    router.replace('/Settings');
  };

  const handleBack = () => {
    router.replace('/Dashboard');
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
        rightSlot={
          <Pressable
            onPress={handleEditSettings}
            style={({ pressed }) => [
              styles.editButton,
              {
                backgroundColor: palette.accentOverlay10,
                borderColor: palette.accentOverlay30,
              },
              pressed && { opacity: 0.8 },
            ]}>
            <MaterialCommunityIcons
              name="pencil"
              size={isLandscape ? 14 : 18}
              color={palette.accent}
            />
            {isLandscape && (
              <Text style={[styles.editButtonText, { color: palette.accent }]}>Edit Settings</Text>
            )}
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Lock Warning */}
        <View style={[styles.lockInfo, { backgroundColor: palette.dangerOverlay15 }]}>
          <MaterialCommunityIcons name="lock-outline" size={16} color={palette.danger} />
          <Text style={[styles.lockText, { color: palette.danger }]}>
            Settings lock once the game starts
          </Text>
        </View>

        <View key={isLandscape ? 'landscape' : 'portrait'} style={styles.columnsContainer}>
          {/* Left Column: Settings Summary */}
          <View style={styles.column}>
            {/* Settings Grid */}
            <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>GAME SETTINGS</Text>
            <View style={styles.settingsGrid}>
              {settings.map((setting, index) => (
                <View
                  key={index}
                  style={[styles.settingCard, { backgroundColor: palette.overlay05 }]}>
                  <MaterialCommunityIcons name={setting.icon} size={16} color={palette.textMuted} />
                  <View style={styles.settingTextContainer}>
                    <Text style={[styles.settingLabel, { color: palette.textMuted }]}>
                      {setting.label}
                    </Text>
                    <Text style={[styles.settingValue, { color: palette.textInverse }]}>
                      {setting.value}
                    </Text>
                  </View>
                </View>
              ))}
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
                  onChange={(val) => setSelectedTeam(val as 'team1' | 'team2')}
                />
              </View>
            )}

            {/* Gender Ratio Selection */}
            {genderRatioEnabled && (
              <View style={styles.choiceGroup}>
                <SegmentedControl
                  label="STARTING GENDER RATIO"
                  options={[
                    { value: 'more-women', label: formatRatioFull('more-women') },
                    { value: 'more-men', label: formatRatioFull('more-men') },
                  ]}
                  value={selectedRatio}
                  onChange={(val) => setSelectedRatio(val as GenderRatio)}
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
                size={22}
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

function createStyles(isLandscape: boolean) {
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
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.5,
      marginBottom: -4,
    },
    settingsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    settingCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      width: '48%',
    },
    settingTextContainer: {
      flex: 1,
    },
    settingLabel: {
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 0.5,
    },
    settingValue: {
      fontSize: 16,
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
    editButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: isLandscape ? 8 : 0,
      height: 40,
      width: isLandscape ? undefined : 40,
      paddingHorizontal: isLandscape ? 16 : 0,
      borderRadius: 10,
      borderWidth: 1,
    },
    editButtonText: {
      fontSize: 14,
      fontWeight: '600',
    },
    lockText: {
      fontSize: 13,
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
      fontSize: 18,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
  });
}
