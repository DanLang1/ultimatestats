import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Redirect, router, Stack } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { getCapThresholdMinutes } from '@/lib/advancedTracking/capUtils';
import type { AdvancedTrackedGame } from '@/lib/advancedTracking/types';
import {
  createFormatSections,
  formatAdvancedHalftime,
  formatBasicHalftime,
  formatBasicReceiver,
  FormatRow,
  formatGenderRatio,
  formatTimeouts,
  formatValue,
} from '@/lib/gameFormatUtils';
import type { GenderRatio } from '@/lib/genderRatioUtils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { useGameStore } from '@/store/basic/gameStore';
import type { GameEvent } from '@/store/basic/gameStore.types';
import { useGameSessionStore } from '@/store/gameSessionStore';
import { useNumberPickerStore } from '@/store/numberPickerStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Fonts } from '@/theme/theme';

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
    currentPoint,
    startingPossession,
    baseGameTo,
    events,
    setGameToInGame,
  } = useGameStore();
  const { currentGame: advancedGame } = useAdvancedTrackingStore();
  const openPicker = useNumberPickerStore((state) => state.open);
  const {
    hardCapMins,
    softCapMins,
    advancedSoftCapAtMins,
    genderRatioEnabled,
    firstPointRatio,
    lineCallingEnabled,
  } = useSettingsStore();
  if (activeGameType === null) {
    return <Redirect href="/Dashboard" />;
  }
  if (activeGameType === 'advanced' && !advancedGame) {
    return <Redirect href="/advancedTracking/Tracker" />;
  }

  const softCapTime = hardCapMins - softCapMins;
  const team1Name = currentTeam.name;
  const isAdvancedGame = activeGameType === 'advanced' && advancedGame !== null;
  const title = isAdvancedGame ? 'Advanced Tracker' : 'Basic Scoreboard';
  const canEditBasicGameTo = gameHalf === 1 && !isSoftCap && !softCapPending;
  const rows = isAdvancedGame
    ? buildAdvancedFormatRows({
        game: advancedGame,
        team1Name,
        team2Name,
        advancedSoftCapAtMins,
        hardCapMins,
        genderRatioEnabled,
        firstPointRatio,
      })
    : buildBasicFormatRows({
        team1Name,
        team2Name,
        gameTo,
        team1Timeouts,
        autoHalftimeEnabled,
        floaterEnabled,
        canEditGameTo: canEditBasicGameTo,
        hardCapMins,
        softCapTime,
        statTrackingEnabled,
        pointTimerEnabled,
        currentPoint,
        startingPossession,
        baseGameTo,
        events,
        lineCallingEnabled,
        genderRatioEnabled,
        firstPointRatio,
        onEditGameTo: () => {
          if (!canEditBasicGameTo) return;
          const maxScore = Math.max(team1Score, team2Score);
          const gameToMin = autoHalftimeEnabled ? 2 * maxScore + 1 : maxScore + 1;
          const helperText = autoHalftimeEnabled
            ? `Must be at least ${gameToMin} to keep halftime reachable`
            : `Must be at least ${gameToMin}`;
          openPicker({
            value: gameTo,
            min: gameToMin,
            max: 99,
            label: 'Game To',
            helperText,
            onChange: setGameToInGame,
          });
          router.push('/NumberPickerModal');
        },
      });
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

interface AdvancedFormatRowsInput {
  game: AdvancedTrackedGame;
  team1Name: string;
  team2Name: string;
  advancedSoftCapAtMins: number;
  hardCapMins: number;
  genderRatioEnabled: boolean;
  firstPointRatio: GenderRatio | null;
}

function buildAdvancedFormatRows({
  game,
  team1Name,
  team2Name,
  advancedSoftCapAtMins,
  hardCapMins,
  genderRatioEnabled,
  firstPointRatio,
}: AdvancedFormatRowsInput): FormatRow[] {
  const format = game.settings.format;
  const focusSide = game.sides.find((side) => side.id === game.focusSideId);
  const opponentSide = game.sides.find((side) => side.id !== game.focusSideId);
  const initialReceivingSide = game.sides.find((side) => side.id === game.initialReceivingSideId);
  const capThresholds = getCapThresholdMinutes(game, {
    softCapAtMinutes: advancedSoftCapAtMins,
    hardCapAtMinutes: hardCapMins,
  });

  return [
    { label: 'My Team', value: focusSide?.label ?? team1Name },
    { label: 'Opponent', value: opponentSide?.label ?? team2Name },
    { label: 'Game To', value: formatValue(format?.gameTo) },
    {
      label: 'Hard Cap',
      value:
        capThresholds.hardCapAtMinutes == null ? 'Off' : `${capThresholds.hardCapAtMinutes} min`,
    },
    {
      label: 'Soft Cap',
      value:
        capThresholds.softCapAtMinutes == null ? 'Off' : `${capThresholds.softCapAtMinutes} min`,
    },
    { label: 'Halftime', value: formatAdvancedHalftime(game) },
    {
      label: 'Timeouts',
      value: formatTimeouts(
        format?.timeoutsPerHalf,
        format?.floaterEnabled,
        format?.halftimeAt != null,
      ),
    },
    { label: 'Initial Receiver', value: initialReceivingSide?.label ?? 'Not set' },
    {
      label: 'Gender Ratio',
      value: formatGenderRatio(
        genderRatioEnabled,
        firstPointRatio,
        Math.max(game.points.length, 1),
      ),
    },
  ];
}

interface BasicFormatRowsInput {
  team1Name: string;
  team2Name: string;
  gameTo: number;
  team1Timeouts: boolean[];
  autoHalftimeEnabled: boolean;
  floaterEnabled: boolean;
  canEditGameTo: boolean;
  hardCapMins: number;
  softCapTime: number;
  statTrackingEnabled: boolean;
  pointTimerEnabled: boolean;
  currentPoint: number;
  startingPossession: 'team1' | 'team2' | null;
  baseGameTo: number;
  events: GameEvent[];
  lineCallingEnabled: boolean;
  genderRatioEnabled: boolean;
  firstPointRatio: GenderRatio | null;
  onEditGameTo: () => void;
}

function buildBasicFormatRows({
  team1Name,
  team2Name,
  gameTo,
  team1Timeouts,
  autoHalftimeEnabled,
  floaterEnabled,
  canEditGameTo,
  hardCapMins,
  softCapTime,
  statTrackingEnabled,
  pointTimerEnabled,
  currentPoint,
  startingPossession,
  baseGameTo,
  events,
  lineCallingEnabled,
  genderRatioEnabled,
  firstPointRatio,
  onEditGameTo,
}: BasicFormatRowsInput): FormatRow[] {
  const gameToHelperText = autoHalftimeEnabled
    ? 'Adjustable during first half'
    : 'Adjustable until soft cap';

  return [
    { label: 'My Team', value: team1Name },
    { label: 'Opponent', value: team2Name },
    {
      label: 'Game To',
      value: formatValue(gameTo),
      helperText: gameToHelperText,
      onPress: onEditGameTo,
      disabled: !canEditGameTo,
    },
    { label: 'Hard Cap', value: `${hardCapMins} min` },
    { label: 'Soft Cap', value: `${softCapTime} min` },
    { label: 'Halftime', value: formatBasicHalftime(events, autoHalftimeEnabled, baseGameTo) },
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
    { label: 'Line Calling', value: lineCallingEnabled ? 'On' : 'Off' },
    {
      label: 'Gender Ratio',
      value: formatGenderRatio(genderRatioEnabled, firstPointRatio, currentPoint),
    },
  ];
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
