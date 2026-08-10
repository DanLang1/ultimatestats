import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  type FocusEvent,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { EditableSettingCard } from '@/components/pre-game-confirm/EditableSettingCard';
import { FlipSelection } from '@/components/pre-game-confirm/FlipSelection';
import { TimeoutSettingCard } from '@/components/pre-game-confirm/TimeoutSettingCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useTheme } from '@/context/ThemeContext';
import { useGameSessionActions } from '@/hooks/useGameSessionActions';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  FlipChoice,
  FlipResult,
  GameFlip,
  GameSide,
  Participant,
} from '@/lib/advancedTracking/types';
import { getContrastingTextColor } from '@/lib/colorUtils';
import { MAX_TEAM_NAME_LENGTH } from '@/lib/constants';
import { formatRatioFull } from '@/lib/genderRatioUtils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import { useGameStore } from '@/store/basic/gameStore';
import { useNumberPickerStore } from '@/store/numberPickerStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Fonts } from '@/theme/theme';

export const FOCUS_SIDE_ID = 'focus-side';
export const OPP_SIDE_ID = 'opp-side';

function buildGameFlip(result: FlipResult | null, choice: FlipChoice | null): GameFlip | undefined {
  if (result === null) return undefined;
  if (result === 'lost' || choice === null) return { result };
  return { result, choice };
}

export default function AdvancedPreGameConfirm() {
  const { gameType } = useLocalSearchParams<{ gameType?: 'scrimmage' }>();
  const isScrimmage = gameType === 'scrimmage';
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const { finishActiveGameSession } = useGameSessionActions();

  const {
    currentTeam,
    team2Name,
    setTeam2Name,
    gameTo,
    setGameTo,
    setTimerTimeLeft,
    team1Timeouts,
    autoHalftimeEnabled,
    setAutoHalftimeEnabled,
    floaterEnabled,
    setFloaterEnabled,
    resetTimeouts,
    team1BgColor,
    team2BgColor,
  } = useGameStore();

  const {
    genderRatioEnabled,
    setGenderRatioEnabled,
    firstPointRatio,
    setFirstPointRatio,
    hardCapMins,
    setHardCapMins,
    softCapMins,
    setSoftCapMins,
    advancedSoftCapAtMins,
    setAdvancedSoftCapAtMins,
    advancedHardCapEnabled,
    setAdvancedHardCapEnabled,
    advancedSoftCapEnabled,
    setAdvancedSoftCapEnabled,
  } = useSettingsStore();

  const fmpTextColor = getContrastingTextColor(palette.fmpColor);
  const mmpTextColor = getContrastingTextColor(palette.mmpColor);
  const t1Color = team1BgColor || palette.primary;
  const t2Color = team2BgColor || palette.accent;
  const t1TextColor = getContrastingTextColor(t1Color);
  const t2TextColor = getContrastingTextColor(t2Color);

  const { createGame } = useAdvancedTrackingStore();

  const openPicker = useNumberPickerStore((s) => s.open);

  const timeoutCount = team1Timeouts.length;

  const [receivingTeam, setReceivingTeam] = useState<'us' | 'them' | ''>('');
  const [flipResult, setFlipResult] = useState<FlipResult | null>(null);
  const [flipChoice, setFlipChoice] = useState<FlipChoice | null>(null);
  const [opponentNameDraft, setOpponentNameDraft] = useState(team2Name);
  const [isEditingOpponentName, setIsEditingOpponentName] = useState(false);
  const [teamOrbitRunKey, setTeamOrbitRunKey] = useState(0);
  const [ratioOrbitRunKey, setRatioOrbitRunKey] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const activePlayerCount = currentTeam.roster.filter((player) => player.isActive).length;
  const hasEnoughScrimmagePlayers = !isScrimmage || activePlayerCount >= 14;
  const canContinue =
    receivingTeam !== '' &&
    hasEnoughScrimmagePlayers &&
    (!genderRatioEnabled || firstPointRatio !== null);
  const selectedTeamOrbitColor = receivingTeam === 'them' ? t2Color : t1Color;
  const selectedRatioOrbitColor =
    firstPointRatio === 'more-men' ? palette.mmpColor : palette.fmpColor;

  const handleSetLine = () => {
    const sides: GameSide[] = [
      {
        id: FOCUS_SIDE_ID,
        label: isScrimmage ? 'Light' : currentTeam.name,
        sourceTeamId: currentTeam.id,
        trackingMode: 'full-roster',
      },
      {
        id: OPP_SIDE_ID,
        label: isScrimmage ? 'Dark' : team2Name,
        sourceTeamId: isScrimmage ? currentTeam.id : undefined,
        trackingMode: isScrimmage ? 'full-roster' : 'anonymous',
      },
    ];

    const participants: Participant[] = currentTeam.roster
      .filter((p) => p.isActive)
      .map((p) => ({
        id: p.id,
        name: p.name,
        number: p.number,
        sourcePlayerId: p.id,
        matchingType: p.matchingType,
        role: p.role,
      }));

    const initialReceivingSideId = receivingTeam === 'us' ? FOCUS_SIDE_ID : OPP_SIDE_ID;

    const floaterEnabledForGame = floaterEnabled && autoHalftimeEnabled;
    const flip = isScrimmage ? undefined : buildGameFlip(flipResult, flipChoice);

    createGame({
      gameType: isScrimmage ? 'scrimmage' : 'game',
      focusSideId: FOCUS_SIDE_ID,
      initialReceivingSideId,
      flip,
      sides,
      participants,
      format: {
        gameTo,
        halftimeEnabled: autoHalftimeEnabled,
        softCapEnabled: advancedSoftCapEnabled,
        hardCapEnabled: advancedHardCapEnabled,
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

  const handleOpponentNameCommit = () => {
    const newName = opponentNameDraft.trim();
    if (newName) {
      setTeam2Name(newName);
    } else {
      setOpponentNameDraft(team2Name);
    }
    setIsEditingOpponentName(false);
  };

  const handleOpponentNameFocus = (event: FocusEvent) => {
    scrollViewRef.current?.scrollResponderScrollNativeHandleToKeyboard(event.target, 16, true);
  };

  const handleHardCapToggle = () => {
    const nextEnabled = !advancedHardCapEnabled;
    setAdvancedHardCapEnabled(nextEnabled);
    if (nextEnabled && advancedSoftCapAtMins > hardCapMins) {
      setAdvancedSoftCapAtMins(hardCapMins);
    }
  };

  const handleReceivingTeamChange = (value: 'us' | 'them') => {
    setReceivingTeam(value);
    setTeamOrbitRunKey((prev) => prev + 1);

    const contradictsOffenseChoice = flipChoice === 'offense' && value !== 'us';
    const contradictsDefenseChoice = flipChoice === 'defense' && value !== 'them';
    if (contradictsOffenseChoice || contradictsDefenseChoice) {
      setFlipChoice(null);
    }
  };

  const handleFlipChoiceChange = (choice: FlipChoice | null) => {
    setFlipChoice(choice);
    if (choice === 'offense') {
      setReceivingTeam('us');
      setTeamOrbitRunKey((prev) => prev + 1);
      return;
    }
    if (choice === 'defense') {
      setReceivingTeam('them');
      setTeamOrbitRunKey((prev) => prev + 1);
    }
  };

  return (
    <ThemedView testID="advanced-tracker-pregame-screen" style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title={isScrimmage ? 'SCRIMMAGE' : 'ADVANCED TRACKER'}
        onBack={() => {
          finishActiveGameSession();
          router.dismissTo('/Dashboard');
        }}
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

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
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
              isActive={advancedHardCapEnabled}
              onPress={handleHardCapToggle}>
              <ThemedText style={[styles.settingValue, { color: palette.textInverse }]}>
                {advancedHardCapEnabled ? 'ON' : 'OFF'}
              </ThemedText>
            </EditableSettingCard>

            {advancedHardCapEnabled && (
              <EditableSettingCard
                icon="timer-outline"
                label="Hard Cap Time"
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
                      if (advancedSoftCapAtMins > val) setAdvancedSoftCapAtMins(val);
                    },
                  })
                }>
                <ThemedText style={[styles.settingValue, { color: palette.textInverse }]}>
                  {hardCapMins} min
                </ThemedText>
              </EditableSettingCard>
            )}

            <EditableSettingCard
              icon="clock-alert-outline"
              label="Soft Cap"
              isActive={advancedSoftCapEnabled}
              onPress={() => setAdvancedSoftCapEnabled(!advancedSoftCapEnabled)}>
              <ThemedText style={[styles.settingValue, { color: palette.textInverse }]}>
                {advancedSoftCapEnabled ? 'ON' : 'OFF'}
              </ThemedText>
            </EditableSettingCard>

            {advancedSoftCapEnabled && (
              <EditableSettingCard
                icon="timer-sand"
                label="Soft Cap Time"
                onPress={() =>
                  openNumberPicker({
                    value: advancedSoftCapAtMins,
                    min: 0,
                    max: advancedHardCapEnabled ? hardCapMins : 180,
                    label: 'Soft Cap',
                    suffix: 'min',
                    onChange: setAdvancedSoftCapAtMins,
                  })
                }>
                <ThemedText style={[styles.settingValue, { color: palette.textInverse }]}>
                  {advancedSoftCapAtMins} min
                </ThemedText>
              </EditableSettingCard>
            )}

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

          {!isScrimmage && (
            <FlipSelection
              result={flipResult}
              choice={flipChoice}
              onResultChange={setFlipResult}
              onChoiceChange={handleFlipChoiceChange}
            />
          )}

          <SegmentedControl
            label="WHO IS RECEIVING?"
            options={[
              {
                value: 'us',
                label: isScrimmage ? 'Light' : currentTeam.name,
                testID: 'advanced-tracker-receiving-focus',
                activeColor: t1Color,
                activeTextColor: t1TextColor,
              },
              {
                value: 'them',
                label: isScrimmage ? 'Dark' : team2Name || 'Them',
                testID: 'advanced-tracker-receiving-opponent',
                activeColor: t2Color,
                activeTextColor: t2TextColor,
                actionIcon: !isScrimmage ? 'pencil-outline' : undefined,
                actionTestID: !isScrimmage ? 'advanced-tracker-opponent-name-edit' : undefined,
                onAction: !isScrimmage
                  ? () => {
                      setOpponentNameDraft(team2Name || 'Them');
                      setIsEditingOpponentName(true);
                    }
                  : undefined,
                isEditing: !isScrimmage && isEditingOpponentName,
                editValue: !isScrimmage ? opponentNameDraft : undefined,
                editTestID: !isScrimmage ? 'advanced-tracker-opponent-name-input' : undefined,
                onEditValueChange: !isScrimmage ? setOpponentNameDraft : undefined,
                onEditComplete: !isScrimmage ? handleOpponentNameCommit : undefined,
                onEditFocus: !isScrimmage ? handleOpponentNameFocus : undefined,
                maxEditLength: !isScrimmage ? MAX_TEAM_NAME_LENGTH : undefined,
              },
            ]}
            value={receivingTeam}
            onChange={handleReceivingTeamChange}
            showRequired={receivingTeam === ''}
            highlightBorder={receivingTeam === ''}
            highlightColor={palette.warning}
            highlightLeftColor={receivingTeam === '' ? t1Color : undefined}
            highlightRightColor={receivingTeam === '' ? t2Color : undefined}
            attentionColor={selectedTeamOrbitColor}
            attentionRunKey={teamOrbitRunKey}
          />

          {!hasEnoughScrimmagePlayers && (
            <View style={[styles.lockInfo, { backgroundColor: palette.warningOverlay15 }]}>
              <MaterialCommunityIcons
                name="account-alert-outline"
                size={scaleBySizeClass(16, sizeClass)}
                color={palette.warning}
              />
              <ThemedText style={[styles.lockText, { color: palette.warning }]}>
                Scrimmage mode requires at least 14 active players. This roster has{' '}
                {activePlayerCount}.
              </ThemedText>
            </View>
          )}

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
              onChange={(value) => {
                setFirstPointRatio(value);
                setRatioOrbitRunKey((prev) => prev + 1);
              }}
              showRequired={firstPointRatio === null}
              highlightBorder={firstPointRatio === null}
              highlightColor={palette.warning}
              highlightLeftColor={firstPointRatio === null ? palette.fmpColor : undefined}
              highlightRightColor={firstPointRatio === null ? palette.mmpColor : undefined}
              attentionColor={selectedRatioOrbitColor}
              attentionRunKey={ratioOrbitRunKey}
            />
          )}

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
              {isScrimmage ? 'Set Lines' : 'Set Line'}
            </ThemedText>
            <MaterialCommunityIcons
              name="chevron-right"
              size={scaleBySizeClass(22, sizeClass)}
              color={canContinue ? palette.textOnAccent : palette.textMuted}
            />
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    keyboardAvoid: {
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
