import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  createFormatSections,
  formatAdvancedHalftime,
  formatBasicHalftime,
  formatBasicReceiver,
  formatGenderRatio,
  FormatRow,
  formatTimeouts,
  formatValue,
} from '@/lib/gameFormatUtils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { useGameSessionStore } from '@/store/gameSessionStore';
import { useGameStore } from '@/store/gameStore';
import { useNumberPickerStore } from '@/store/numberPickerStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Redirect, router, Stack } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

export default function GameFormatScreen() {
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass);
  const activeGameType = useGameSessionStore((state) => state.activeGameType);

  const {
    currentTeam,
    team2Name,
    gameTo,
    team1Score,
    team2Score,
    team1Timeouts,
    autoHalftimeEnabled,
    floaterEnabled,
    gameHalf,
    isSoftCap,
    softCapPending,
    statTrackingEnabled,
    pointTimerEnabled,
    startingPossession,
    baseGameTo,
    events,
    setGameToInGame,
  } = useGameStore();
  const { currentGame: advancedGame } = useAdvancedTrackingStore();
  const openPicker = useNumberPickerStore((state) => state.open);
  const { hardCapMins, softCapMins, genderRatioEnabled, firstPointRatio, lineCallingEnabled } =
    useSettingsStore();
  if (activeGameType === null) {
    return <Redirect href="/Dashboard" />;
  }
  if (activeGameType === 'advanced' && !advancedGame) {
    return <Redirect href="/advancedTracking/Tracker" />;
  }

  const softCapTime = hardCapMins - softCapMins;
  const team1Name = currentTeam?.name ?? 'Team 1';
  const format = advancedGame?.settings.format;
  const focusSide = advancedGame?.sides.find((side) => side.id === advancedGame.focusSideId);
  const opponentSide = advancedGame?.sides.find((side) => side.id !== advancedGame.focusSideId);
  const initialReceivingSide = advancedGame?.sides.find(
    (side) => side.id === advancedGame.initialReceivingSideId,
  );
  let title: string;
  let rows: FormatRow[];
  if (activeGameType === 'advanced' && advancedGame) {
    title = 'Advanced Tracker';
    rows = [
      { label: 'My Team', value: focusSide?.label ?? team1Name },
      {
        label: 'Opponent',
        value: opponentSide?.label ?? team2Name,
      },
      { label: 'Game To', value: formatValue(format?.gameTo) },
      { label: 'Hard Cap', value: `${hardCapMins} min` },
      { label: 'Soft Cap', value: `${softCapTime} min` },
      {
        label: 'Halftime',
        value: formatAdvancedHalftime(advancedGame),
      },
      {
        label: 'Timeouts',
        value: formatTimeouts(
          format?.timeoutsPerHalf,
          format?.floaterEnabled,
          format?.halftimeAt != null,
        ),
      },
      {
        label: 'Initial Receiver',
        value: initialReceivingSide?.label ?? 'Not set',
      },
      {
        label: 'Gender Ratio',
        value: formatGenderRatio(genderRatioEnabled, firstPointRatio),
      },
    ];
  } else {
    title = 'Basic Scoreboard';
    const maxScore = Math.max(team1Score, team2Score);
    const canEditBasicGameTo = gameHalf === 1 && !isSoftCap && !softCapPending;
    let gameToMin = 1;
    if (canEditBasicGameTo) {
      gameToMin = autoHalftimeEnabled ? 2 * maxScore + 1 : maxScore + 1;
    }
    const gameToHelperText = autoHalftimeEnabled
      ? 'Adjustable during first half'
      : 'Adjustable until soft cap';
    const gameToValidationText = autoHalftimeEnabled
      ? `Must be at least ${gameToMin} to keep halftime reachable`
      : `Must be at least ${gameToMin}`;
    const openGameToPicker = () => {
      if (!canEditBasicGameTo) return;
      openPicker({
        value: gameTo,
        min: gameToMin,
        max: 99,
        label: 'Game To',
        helperText: gameToValidationText,
        onChange: setGameToInGame,
      });
      router.push('/NumberPickerModal');
    };
    rows = [
      { label: 'My Team', value: team1Name },
      { label: 'Opponent', value: team2Name },
      {
        label: 'Game To',
        value: formatValue(gameTo),
        helperText: gameToHelperText,
        onPress: openGameToPicker,
        disabled: !canEditBasicGameTo,
      },
      { label: 'Hard Cap', value: `${hardCapMins} min` },
      { label: 'Soft Cap', value: `${softCapTime} min` },
      {
        label: 'Halftime',
        value: formatBasicHalftime(events, autoHalftimeEnabled, baseGameTo),
      },
      {
        label: 'Timeouts',
        value: formatTimeouts(team1Timeouts.length, floaterEnabled, autoHalftimeEnabled),
      },
      {
        label: 'Initial Receiver',
        value: formatBasicReceiver(startingPossession, team1Name, team2Name),
      },
      { label: 'Stat Tracking', value: statTrackingEnabled ? 'On' : 'Off' },
      { label: 'Point Timer', value: pointTimerEnabled ? 'On' : 'Off' },
      {
        label: 'Line Calling',
        value: lineCallingEnabled ? 'On' : 'Off',
      },
      {
        label: 'Gender Ratio',
        value: formatGenderRatio(genderRatioEnabled, firstPointRatio),
      },
    ];
  }
  const sections = createFormatSections(rows);

  return (
    <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title="GAME FORMAT"
        onBack={() => router.back()}
        titleColor={palette.textMuted}
        backButtonBackgroundColor={palette.overlay10}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.summaryHeader, { borderBottomColor: palette.overlay10 }]}>
          <View style={[styles.summaryIcon, { backgroundColor: palette.accentOverlay10 }]}>
            <MaterialCommunityIcons
              name={
                activeGameType === 'advanced' ? 'clipboard-pulse-outline' : 'scoreboard-outline'
              }
              size={scaleBySizeClass(22, sizeClass)}
              color={palette.accent}
            />
          </View>
          <View style={styles.summaryCopy}>
            <ThemedText style={[styles.summaryTitle, { color: palette.textInverse }]}>
              {title}
            </ThemedText>
            <ThemedText style={[styles.summarySubtitle, { color: palette.textMuted }]}>
              Active game setup
            </ThemedText>
          </View>
        </View>

        <View style={styles.sections}>
          {sections.map((section) => (
            <View key={section.title} style={styles.section}>
              <ThemedText style={[styles.sectionTitle, { color: palette.textMuted }]}>
                {section.title}
              </ThemedText>
              <View
                style={[
                  styles.sectionCard,
                  { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
                ]}>
                {section.rows.map((row, index) => {
                  const isEditable = row.onPress && !row.disabled;
                  const isLastRow = index === section.rows.length - 1;

                  return (
                    <Pressable
                      key={row.label}
                      onPress={row.onPress}
                      disabled={!row.onPress || row.disabled}
                      style={({ pressed }) => [
                        styles.row,
                        !isLastRow && {
                          borderBottomColor: palette.overlay10,
                          borderBottomWidth: 1,
                        },
                        isEditable && {
                          backgroundColor: palette.accentOverlay10,
                          borderColor: palette.accentOverlay30,
                          borderWidth: 1,
                        },
                        isEditable && pressed && { backgroundColor: palette.accentOverlay15 },
                        row.disabled && styles.rowDisabled,
                      ]}>
                      <View style={styles.rowLabelGroup}>
                        <ThemedText style={[styles.rowLabel, { color: palette.textMuted }]}>
                          {row.label}
                        </ThemedText>
                        {row.helperText && (
                          <ThemedText style={[styles.rowHelper, { color: palette.textMuted }]}>
                            {row.helperText}
                          </ThemedText>
                        )}
                      </View>
                      <View style={styles.rowValueGroup}>
                        <ThemedText
                          style={[
                            styles.rowValue,
                            { color: isEditable ? palette.accent : palette.textInverse },
                          ]}>
                          {row.value}
                        </ThemedText>
                        {isEditable && (
                          <MaterialCommunityIcons
                            name="chevron-right"
                            size={scaleBySizeClass(20, sizeClass)}
                            color={palette.accent}
                          />
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
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
      padding: scaleBySizeClass(24, sizeClass),
      paddingTop: scaleBySizeClass(8, sizeClass),
      gap: scaleBySizeClass(18, sizeClass),
    },
    summaryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(12, sizeClass),
      paddingBottom: scaleBySizeClass(16, sizeClass),
      borderBottomWidth: 1,
      maxWidth: isLandscape ? scaleBySizeClass(760, sizeClass) : undefined,
      width: '100%',
      alignSelf: 'center',
    },
    summaryIcon: {
      width: scaleBySizeClass(42, sizeClass),
      height: scaleBySizeClass(42, sizeClass),
      borderRadius: scaleBySizeClass(8, sizeClass),
      alignItems: 'center',
      justifyContent: 'center',
    },
    summaryCopy: {
      flex: 1,
      gap: scaleBySizeClass(3, sizeClass),
    },
    summaryTitle: {
      fontSize: scaleBySizeClass(18, sizeClass),
      fontFamily: Fonts.bold,
    },
    summarySubtitle: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    sections: {
      gap: scaleBySizeClass(18, sizeClass),
      maxWidth: isLandscape ? scaleBySizeClass(760, sizeClass) : undefined,
      width: '100%',
      alignSelf: 'center',
    },
    section: {
      gap: scaleBySizeClass(8, sizeClass),
    },
    sectionTitle: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 1.2,
      paddingHorizontal: scaleBySizeClass(4, sizeClass),
    },
    sectionCard: {
      borderWidth: 1,
      borderRadius: scaleBySizeClass(8, sizeClass),
      overflow: 'hidden',
    },
    row: {
      minHeight: scaleBySizeClass(58, sizeClass),
      paddingHorizontal: scaleBySizeClass(14, sizeClass),
      paddingVertical: scaleBySizeClass(11, sizeClass),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: scaleBySizeClass(14, sizeClass),
    },
    rowDisabled: {
      opacity: 0.65,
    },
    rowLabelGroup: {
      flex: 1,
      gap: scaleBySizeClass(3, sizeClass),
      minWidth: 0,
    },
    rowLabel: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    rowHelper: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    rowValueGroup: {
      flex: 1.2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: scaleBySizeClass(4, sizeClass),
      minWidth: 0,
    },
    rowValue: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.bold,
      textAlign: 'right',
      flexShrink: 1,
    },
  });
}
