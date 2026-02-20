import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { MAX_POINT_DURATION_MINUTES } from '@/lib/constants';
import { useGameStore } from '@/store/gameStore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type ActiveField = 'minutes' | 'seconds';

export default function EditDurationModal() {
  const { palette } = useTheme();
  const { isLandscape, sizeClass } = useLayout();
  const styles = createStyles(isLandscape, sizeClass);
  const params = useLocalSearchParams<{
    eventIndex: string;
    gameId: string;
    currentDurationMs?: string;
  }>();

  const { updateEvent, updateSavedGameEvent } = useGameStore();

  const eventIndex = parseInt(params.eventIndex, 10);
  const gameId = params.gameId;
  const currentMs = params.currentDurationMs ? parseInt(params.currentDurationMs, 10) : 0;

  const initialTotalSeconds = Math.round(currentMs / 1000);
  const initialMinutes = Math.floor(initialTotalSeconds / 60);
  const initialSeconds = initialTotalSeconds % 60;

  const [activeField, setActiveField] = useState<ActiveField>('minutes');
  const [minutesStr, setMinutesStr] = useState(initialMinutes > 0 ? initialMinutes.toString() : '');
  const [secondsStr, setSecondsStr] = useState(initialSeconds > 0 ? initialSeconds.toString() : '');

  const currentMinutes = minutesStr === '' ? 0 : parseInt(minutesStr, 10);
  const currentSeconds = secondsStr === '' ? 0 : parseInt(secondsStr, 10);

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

  const handleSave = () => {
    const totalMs = (currentMinutes * 60 + currentSeconds) * 1000;
    const elapsedMs = totalMs > 0 ? totalMs : null;
    if (gameId === 'current') {
      updateEvent(eventIndex, { elapsedMs });
    } else {
      updateSavedGameEvent(gameId, eventIndex, { elapsedMs });
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
            <Text style={[styles.title, { color: palette.modalText }]}>Edit Point Duration</Text>
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
                <Text
                  style={[
                    styles.fieldValue,
                    {
                      color: palette.modalText,
                      opacity: minutesStr ? 1 : 0.4,
                    },
                  ]}>
                  {minutesStr || '0'}
                </Text>
                <Text style={[styles.fieldSuffix, { color: palette.modalText, opacity: 0.6 }]}>
                  min
                </Text>
              </Pressable>

              <Text style={[styles.fieldSeparator, { color: palette.modalText, opacity: 0.4 }]}>
                :
              </Text>

              <Pressable
                onPress={() => setActiveField('seconds')}
                style={[
                  styles.fieldContainer,
                  {
                    borderBottomColor:
                      activeField === 'seconds' ? palette.accent : palette.overlay15,
                  },
                ]}>
                <Text
                  style={[
                    styles.fieldValue,
                    {
                      color: palette.modalText,
                      opacity: secondsStr ? 1 : 0.4,
                    },
                  ]}>
                  {secondsStr || '0'}
                </Text>
                <Text style={[styles.fieldSuffix, { color: palette.modalText, opacity: 0.6 }]}>
                  sec
                </Text>
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
                      <Text style={[styles.numpadText, { color: palette.modalText }]}>{digit}</Text>
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
                      <Text style={[styles.numpadText, { color: palette.modalText }]}>{digit}</Text>
                    </Pressable>
                  ))}
                  <Pressable
                    onPress={handleClear}
                    style={({ pressed }) => [
                      styles.numpadButton,
                      { backgroundColor: palette.overlay20 },
                      pressed && { opacity: 0.6 },
                    ]}>
                    <Text style={[styles.numpadText, { color: palette.modalText, opacity: 0.6 }]}>
                      C
                    </Text>
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
                        <Text style={[styles.numpadText, { color: palette.modalText }]}>
                          {digit}
                        </Text>
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
                    <Text style={[styles.numpadText, { color: palette.modalText, opacity: 0.6 }]}>
                      C
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleDigitPress(0)}
                    style={({ pressed }) => [
                      styles.numpadButtonPortrait,
                      { backgroundColor: palette.overlay15 },
                      pressed && { opacity: 0.6 },
                    ]}>
                    <Text style={[styles.numpadText, { color: palette.modalText }]}>0</Text>
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
              <Text style={[styles.actionButtonText, { color: palette.danger }]}>Clear</Text>
            </Pressable>
            <Pressable
              onPress={handleDismiss}
              style={({ pressed }) => [
                styles.actionButton,
                styles.cancelButton,
                { borderColor: palette.overlay15 },
                pressed && { opacity: 0.7 },
              ]}>
              <Text style={[styles.actionButtonText, { color: palette.accent }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [
                styles.actionButton,
                styles.saveButton,
                { backgroundColor: palette.accent },
                pressed && { opacity: 0.8 },
              ]}>
              <Text style={[styles.actionButtonText, { color: palette.textOnAccent }]}>Save</Text>
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
      maxWidth: isLandscape ? undefined : 420,
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
      fontWeight: '700',
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
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    fieldSuffix: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontWeight: '500',
    },
    fieldSeparator: {
      fontSize: scaleBySizeClass(28, sizeClass),
      fontWeight: '700',
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
      fontWeight: '600',
    },
    actionRow: {
      flexDirection: 'row',
      gap: 12,
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
      fontWeight: '600',
    },
  });
}
