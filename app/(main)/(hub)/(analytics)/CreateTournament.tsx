import DateTimePicker, {
  DateTimePickerAndroid,
  DateTimePickerChangeEvent,
} from '@react-native-community/datetimepicker';
import { router, Stack } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { MAX_TOURNAMENT_NAME_LENGTH } from '@/lib/constants';
import { formatDateForDisplay, toISODate } from '@/lib/dateUtils';
import { useTournamentStore } from '@/store/tournamentStore';
import { Fonts } from '@/theme/theme';

export default function CreateTournamentScreen() {
  const { palette, themeMode } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const { addTournament, tournaments } = useTournamentStore();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const trimmedName = name.trim();
  const isDuplicate = tournaments.some((t) => t.name.toLowerCase() === trimmedName.toLowerCase());
  const isSaveDisabled = !trimmedName || isDuplicate;

  const handleStartDateChange = (_event: DateTimePickerChangeEvent, selected: Date) => {
    selected.setHours(0, 0, 0, 0);
    setStartDate(selected);
    if (selected > endDate) {
      setEndDate(selected);
    }
  };

  const handleEndDateChange = (_event: DateTimePickerChangeEvent, selected: Date) => {
    selected.setHours(0, 0, 0, 0);
    if (selected < startDate) return;
    setEndDate(selected);
  };

  const handleOpenAndroidStartPicker = () => {
    DateTimePickerAndroid.open({
      value: startDate,
      mode: 'date',
      onValueChange: (_event, date) => {
        date.setHours(0, 0, 0, 0);
        setStartDate(date);
        if (date > endDate) {
          setEndDate(date);
        }
      },
    });
  };

  const handleOpenAndroidEndPicker = () => {
    DateTimePickerAndroid.open({
      value: endDate,
      mode: 'date',
      minimumDate: startDate,
      onValueChange: (_event, date) => {
        date.setHours(0, 0, 0, 0);
        setEndDate(date);
      },
    });
  };

  const handleSave = async () => {
    if (!trimmedName || isDuplicate) return;
    await addTournament(trimmedName, toISODate(startDate), toISODate(endDate));
    router.back();
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenHeader
        title="NEW TOURNAMENT"
        onBack={() => router.back()}
        titleColor={palette.textMuted}
        backButtonBackgroundColor={palette.overlay10}
        centerTitleInLandscape={false}
      />

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Name */}
          <View style={styles.field}>
            <ThemedText style={[styles.label, { color: palette.textMuted }]}>NAME</ThemedText>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: palette.overlay05, color: palette.textInverse },
              ]}
              placeholder="Tournament name"
              placeholderTextColor={palette.textMuted}
              value={name}
              onChangeText={setName}
              maxLength={MAX_TOURNAMENT_NAME_LENGTH}
              autoFocus
            />
            {isDuplicate && trimmedName.length > 0 && (
              <ThemedText style={[styles.errorText, { color: palette.danger }]}>
                A tournament with this name already exists
              </ThemedText>
            )}
          </View>

          {/* Start Date */}
          <View style={styles.field}>
            <ThemedText style={[styles.label, { color: palette.textMuted }]}>START DATE</ThemedText>
            {Platform.OS === 'ios' ? (
              <View
                style={[
                  styles.dateCard,
                  { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
                ]}>
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display="compact"
                  onValueChange={handleStartDateChange}
                  themeVariant={themeMode}
                  accentColor={palette.accent}
                />
              </View>
            ) : (
              <Pressable
                style={({ pressed }) => [
                  styles.dateCard,
                  { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
                  pressed && styles.dateCardPressed,
                ]}
                onPress={handleOpenAndroidStartPicker}>
                <ThemedText style={[styles.dateValue, { color: palette.textInverse }]}>
                  {formatDateForDisplay(startDate)}
                </ThemedText>
              </Pressable>
            )}
          </View>

          {/* End Date */}
          <View style={styles.field}>
            <ThemedText style={[styles.label, { color: palette.textMuted }]}>END DATE</ThemedText>
            {Platform.OS === 'ios' ? (
              <View
                style={[
                  styles.dateCard,
                  { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
                ]}>
                <DateTimePicker
                  value={endDate}
                  mode="date"
                  display="compact"
                  minimumDate={startDate}
                  onValueChange={handleEndDateChange}
                  themeVariant={themeMode}
                  accentColor={palette.accent}
                />
              </View>
            ) : (
              <Pressable
                style={({ pressed }) => [
                  styles.dateCard,
                  { backgroundColor: palette.overlay05, borderColor: palette.overlay10 },
                  pressed && styles.dateCardPressed,
                ]}
                onPress={handleOpenAndroidEndPicker}>
                <ThemedText style={[styles.dateValue, { color: palette.textInverse }]}>
                  {formatDateForDisplay(endDate)}
                </ThemedText>
              </Pressable>
            )}
          </View>

          {/* Save Button */}
          <Pressable
            style={[
              styles.saveButton,
              { backgroundColor: palette.accent },
              isSaveDisabled && { opacity: 0.5 },
            ]}
            onPress={handleSave}
            disabled={isSaveDisabled}>
            <ThemedText style={[styles.saveButtonText, { color: palette.textOnAccent }]}>
              Create Tournament
            </ThemedText>
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
    content: {
      padding: 24,
      gap: 24,
    },
    field: {
      gap: 8,
    },
    label: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.semiBold,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    errorText: {
      fontSize: scaleBySizeClass(13, sizeClass),
      marginTop: 4,
    },
    input: {
      borderRadius: 12,
      padding: 16,
      fontSize: scaleBySizeClass(16, sizeClass),
    },
    dateCard: {
      borderRadius: 12,
      borderWidth: 1,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
    },
    dateCardPressed: {
      opacity: 0.7,
    },
    dateValue: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    saveButton: {
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    saveButtonText: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.bold,
    },
  });
}
