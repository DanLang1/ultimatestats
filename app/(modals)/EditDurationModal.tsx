import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { getSizeClassValue, scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  computePointByPointEvents,
  getEventTimeValidationError,
  getPointDurationValidationError,
} from '@/lib/basic/timelineUtils';
import { MAX_POINT_DURATION_MINUTES, MODAL_MAX_WIDTH_PICKER } from '@/lib/constants';
import { useGameStore } from '@/store/basic/gameStore';
import { Fonts } from '@/theme/theme';

type ActiveField = 'minutes' | 'seconds';

export default function EditDurationModal() {
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass);
  const params = useLocalSearchParams<{
    eventIndex: string;
    gameId: string;
    currentDurationMs?: string;
    editorType?: 'point' | 'event';
    title?: string;
  }>();

  const {
    events,
    startingPossession,
    gameTo: currentGameTo,
    autoHalftimeEnabled: currentAutoHalftimeEnabled,
    savedGames,
    updateEvent,
    updateSavedGameEvent,
  } = useGameStore();

  const eventIndex = parseInt(params.eventIndex, 10);
  const gameId = params.gameId;
  const currentMs = params.currentDurationMs ? parseInt(params.currentDurationMs, 10) : 0;
  const editorType = params.editorType === 'event' ? 'event' : 'point';
  const isSavedGame = gameId !== 'current';
  const savedGame = isSavedGame ? savedGames.find((g) => g.id === gameId) : null;

  const activeEvents = savedGame?.events ?? events;
  const activeStartingPossession = savedGame?.startingPossession ?? startingPossession;
  const activeGameTo = savedGame?.gameTo ?? currentGameTo;
  const activeAutoHalftimeEnabled = savedGame?.autoHalftimeEnabled ?? currentAutoHalftimeEnabled;

  const pointEvents = computePointByPointEvents(
    activeEvents,
    activeStartingPossession,
    activeGameTo,
    undefined,
    undefined,
    activeAutoHalftimeEnabled,
  );
  const editedPoint = pointEvents.find(
    (point) =>
      point.goalEventIndex === eventIndex ||
      point.turnovers.some((turnover) => turnover.eventIndex === eventIndex) ||
      point.timeouts.some((timeout) => timeout.eventIndex === eventIndex),
  );

  const initialTotalSeconds = Math.round(currentMs / 1000);
  const initialMinutes = Math.floor(initialTotalSeconds / 60);
  const initialSeconds = initialTotalSeconds % 60;

  const [activeField, setActiveField] = useState<ActiveField>(
    initialMinutes === 0 ? 'seconds' : 'minutes',
  );
  const [minutesStr, setMinutesStr] = useState(initialMinutes > 0 ? initialMinutes.toString() : '');
  const [secondsStr, setSecondsStr] = useState(initialSeconds > 0 ? initialSeconds.toString() : '');

  const currentMinutes = minutesStr === '' ? 0 : parseInt(minutesStr, 10);
  const currentSeconds = secondsStr === '' ? 0 : parseInt(secondsStr, 10);
  const totalMs = (currentMinutes * 60 + currentSeconds) * 1000;
  const validationError =
    editorType === 'point'
      ? getPointDurationValidationError(editedPoint, totalMs)
      : getEventTimeValidationError(editedPoint, eventIndex, totalMs);
  const isSaveDisabled = validationError !== null;
  const title =
    params.title ?? (editorType === 'point' ? 'Edit Point Duration' : 'Edit Event Time');

  const handleDigitPress = (digit: number) => {
    if (activeField === 'minutes') {
      const newStr = minutesStr + digit.toString();
      const newValue = parseInt(newStr, 10);
      if (newValue <= MAX_POINT_DURATION_MINUTES) {
        setMinutesStr(newStr);
      }
    } else {
      const newStr = secondsStr + digit.toString();
      const newValue = parseInt(newStr, 10);
      if (newValue <= 59) {
        setSecondsStr(newStr);
      }
    }
  };

  const handleBackspace = () => {
    if (activeField === 'minutes') {
      setMinutesStr((prev) => prev.slice(0, -1));
    } else {
      setSecondsStr((prev) => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    if (activeField === 'minutes') {
      setMinutesStr('');
    } else {
      setSecondsStr('');
    }
  };

  const handleDismiss = () => {
    router.back();
  };

  const handleSave = async () => {
    if (validationError) return;
    const elapsedMs = totalMs > 0 ? totalMs : null;
    if (gameId === 'current') {
      updateEvent(eventIndex, { elapsedMs });
    } else {
      await updateSavedGameEvent(gameId, eventIndex, { elapsedMs });
    }
    router.back();
  };

  const handleClearDuration = () => {
    setMinutesStr('');
    setSecondsStr('');
  };

  const keypadRows = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
  ] as const;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable
        style={[styles.overlay, { backgroundColor: palette.overlayModal }]}
        onPress={handleDismiss}>
        <Pressable
          style={[
            styles.container,
            { backgroundColor: palette.modalBg, borderColor: palette.overlay15 },
          ]}
          onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <ThemedText style={[styles.title, { color: palette.modalText }]}>{title}</ThemedText>
          </View>

          {/* Main Content */}
          <View style={styles.content}>
            {/* Two-field display */}
            <View style={styles.fieldsRow}>
              <Pressable
                onPress={() => setActiveField('minutes')}
                style={[
                  styles.fieldContainer,
                  {
                    borderBottomColor:
                      activeField === 'minutes' ? palette.accent : palette.overlay15,
                  },
                ]}>
                <ThemedText
                  style={[
                    styles.fieldValue,
                    {
                      color: palette.modalText,
                      opacity: minutesStr ? 1 : 0.4,
                    },
                  ]}>
                  {minutesStr || '0'}
                </ThemedText>
                <ThemedText
                  style={[styles.fieldSuffix, { color: palette.modalText, opacity: 0.6 }]}>
                  min
                </ThemedText>
              </Pressable>

              <ThemedText
                style={[styles.fieldSeparator, { color: palette.modalText, opacity: 0.4 }]}>
                :
              </ThemedText>

              <Pressable
                onPress={() => setActiveField('seconds')}
                style={[
                  styles.fieldContainer,
                  {
                    borderBottomColor:
                      activeField === 'seconds' ? palette.accent : palette.overlay15,
                  },
                ]}>
                <ThemedText
                  style={[
                    styles.fieldValue,
                    {
                      color: palette.modalText,
                      opacity: secondsStr ? 1 : 0.4,
                    },
                  ]}>
                  {secondsStr || '0'}
                </ThemedText>
                <ThemedText
                  style={[styles.fieldSuffix, { color: palette.modalText, opacity: 0.6 }]}>
                  sec
                </ThemedText>
              </Pressable>
            </View>

            {/* Numpad */}
            {isLandscape ? (
              <View style={styles.numpadContainer}>
                <View style={styles.numpadRow}>
                  {[1, 2, 3, 4, 5].map((digit) => (
                    <Pressable
                      key={digit}
                      onPress={() => handleDigitPress(digit)}
                      style={({ pressed }) => [
                        styles.numpadButton,
                        { backgroundColor: palette.overlay15 },
                        pressed && { opacity: 0.6 },
                      ]}>
                      <ThemedText style={[styles.numpadText, { color: palette.modalText }]}>
                        {digit}
                      </ThemedText>
                    </Pressable>
                  ))}
                  <Pressable
                    onPress={handleBackspace}
                    style={({ pressed }) => [
                      styles.numpadButton,
                      { backgroundColor: palette.overlay20 },
                      pressed && { opacity: 0.6 },
                    ]}>
                    <MaterialCommunityIcons
                      name="backspace-outline"
                      size={scaleBySizeClass(24, sizeClass)}
                      color={palette.modalText}
                    />
                  </Pressable>
                </View>
                <View style={styles.numpadRow}>
                  {[6, 7, 8, 9, 0].map((digit) => (
                    <Pressable
                      key={digit}
                      onPress={() => handleDigitPress(digit)}
                      style={({ pressed }) => [
                        styles.numpadButton,
                        { backgroundColor: palette.overlay15 },
                        pressed && { opacity: 0.6 },
                      ]}>
                      <ThemedText style={[styles.numpadText, { color: palette.modalText }]}>
                        {digit}
                      </ThemedText>
                    </Pressable>
                  ))}
                  <Pressable
                    onPress={handleClear}
                    style={({ pressed }) => [
                      styles.numpadButton,
                      { backgroundColor: palette.overlay20 },
                      pressed && { opacity: 0.6 },
                    ]}>
                    <ThemedText
                      style={[styles.numpadText, { color: palette.modalText, opacity: 0.6 }]}>
                      C
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.numpadContainerPortrait}>
                {keypadRows.map((row) => (
                  <View key={row.join('-')} style={styles.numpadRow}>
                    {row.map((digit) => (
                      <Pressable
                        key={digit}
                        onPress={() => handleDigitPress(digit)}
                        style={({ pressed }) => [
                          styles.numpadButtonPortrait,
                          { backgroundColor: palette.overlay15 },
                          pressed && { opacity: 0.6 },
                        ]}>
                        <ThemedText style={[styles.numpadText, { color: palette.modalText }]}>
                          {digit}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                ))}
                <View style={styles.numpadRow}>
                  <Pressable
                    onPress={handleClear}
                    style={({ pressed }) => [
                      styles.numpadButtonPortrait,
                      { backgroundColor: palette.overlay20 },
                      pressed && { opacity: 0.6 },
                    ]}>
                    <ThemedText
                      style={[styles.numpadText, { color: palette.modalText, opacity: 0.6 }]}>
                      C
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => handleDigitPress(0)}
                    style={({ pressed }) => [
                      styles.numpadButtonPortrait,
                      { backgroundColor: palette.overlay15 },
                      pressed && { opacity: 0.6 },
                    ]}>
                    <ThemedText style={[styles.numpadText, { color: palette.modalText }]}>
                      0
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={handleBackspace}
                    style={({ pressed }) => [
                      styles.numpadButtonPortrait,
                      { backgroundColor: palette.overlay20 },
                      pressed && { opacity: 0.6 },
                    ]}>
                    <MaterialCommunityIcons
                      name="backspace-outline"
                      size={scaleBySizeClass(24, sizeClass)}
                      color={palette.modalText}
                    />
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          {validationError && (
            <ThemedText style={[styles.validationError, { color: palette.danger }]}>
              {validationError}
            </ThemedText>
          )}

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <Pressable
              onPress={handleClearDuration}
              style={({ pressed }) => [
                styles.actionButton,
                styles.clearButton,
                { borderColor: palette.danger },
                pressed && { opacity: 0.7 },
              ]}>
              <ThemedText style={[styles.actionButtonText, { color: palette.danger }]}>
                Clear
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={handleDismiss}
              style={({ pressed }) => [
                styles.actionButton,
                styles.cancelButton,
                { borderColor: palette.overlay15 },
                pressed && { opacity: 0.7 },
              ]}>
              <ThemedText style={[styles.actionButtonText, { color: palette.accent }]}>
                Cancel
              </ThemedText>
            </Pressable>
            <Pressable
              disabled={isSaveDisabled}
              onPress={handleSave}
              style={({ pressed }) => [
                styles.actionButton,
                styles.saveButton,
                {
                  backgroundColor: isSaveDisabled ? palette.overlay15 : palette.accent,
                },
                pressed && !isSaveDisabled && { opacity: 0.8 },
              ]}>
              <ThemedText
                style={[
                  styles.actionButtonText,
                  { color: isSaveDisabled ? palette.textMuted : palette.textOnAccent },
                ]}>
                Save
              </ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </View>
  );
}

function createStyles(isLandscape: boolean, sizeClass: SizeClass) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    container: {
      borderRadius: 16,
      borderWidth: 1,
      width: isLandscape ? undefined : '92%',
      maxWidth: isLandscape ? undefined : getSizeClassValue(MODAL_MAX_WIDTH_PICKER, sizeClass),
      paddingHorizontal: isLandscape ? 20 : 14,
      paddingVertical: 16,
      gap: 12,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.bold,
    },
    content: {
      flexDirection: isLandscape ? 'row' : 'column',
      alignItems: isLandscape ? 'center' : 'stretch',
      gap: isLandscape ? 24 : 14,
    },
    fieldsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      minWidth: isLandscape ? 160 : 0,
    },
    fieldContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'center',
      borderBottomWidth: 2,
      paddingVertical: 4,
      paddingHorizontal: 8,
      gap: 4,
    },
    fieldValue: {
      fontSize: scaleBySizeClass(isLandscape ? 40 : 34, sizeClass),
      fontFamily: Fonts.bold,
      fontVariant: ['tabular-nums'],
    },
    fieldSuffix: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    fieldSeparator: {
      fontSize: scaleBySizeClass(28, sizeClass),
      fontFamily: Fonts.bold,
    },
    numpadContainer: {
      gap: 6,
    },
    numpadContainerPortrait: {
      gap: 6,
    },
    numpadRow: {
      flexDirection: 'row',
      gap: 6,
    },
    numpadButton: {
      width: 44,
      height: 44,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    numpadButtonPortrait: {
      flex: 1,
      height: 48,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    numpadText: {
      fontSize: scaleBySizeClass(20, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 12,
    },
    validationError: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.semiBold,
      textAlign: 'center',
      marginTop: scaleBySizeClass(6, sizeClass),
      marginBottom: scaleBySizeClass(2, sizeClass),
      paddingHorizontal: scaleBySizeClass(6, sizeClass),
    },
    actionButton: {
      flex: 1,
      height: 40,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    clearButton: {
      borderWidth: 1,
      backgroundColor: 'transparent',
    },
    cancelButton: {
      borderWidth: 1,
      backgroundColor: 'transparent',
    },
    saveButton: {},
    actionButtonText: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.semiBold,
    },
  });
}
