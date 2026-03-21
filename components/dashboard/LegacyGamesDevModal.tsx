import { AlertModal } from '@/components/ui/AlertModal';
import { useAlert } from '@/components/ui/AlertProvider';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  SAVED_GAMES_QUARANTINE_KEY,
  SAVED_GAMES_STORAGE_KEY,
} from '@/lib/storage/asyncStorageAdapter';
import { parseRawSavedGamesJson, parseSavedGamesJson } from '@/lib/storage/devImport';
import { CURRENT_SCHEMA_VERSION, storage } from '@/lib/storage';
import { useGameStore } from '@/store/gameStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Fonts } from '@/theme/theme';

interface LegacyGamesDevModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function LegacyGamesDevModal({ visible, onClose }: LegacyGamesDevModalProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const { showAlert } = useAlert();
  const loadSavedGames = useGameStore((state) => state.loadSavedGames);
  const savedGames = useGameStore((state) => state.savedGames);
  const [rawJson, setRawJson] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const description =
    'Paste raw saved-game JSON for migration testing. Accepted shapes: a single game, an array of games, a `games` wrapper object, or a persisted store blob with `state.savedGames`.';
  const note =
    'Import Safely runs each game through storage.saveGame(). Append Raw Entries writes directly to AsyncStorage without validation so you can test malformed entries on the next load. Test Corrupt Blob Alert writes invalid JSON and opens Saved Games so you can verify the recovery alert.';

  const handleImport = async () => {
    try {
      setIsImporting(true);

      const games = parseSavedGamesJson(rawJson);
      const importedAt = Date.now();
      const legacyCount = games.filter(
        (game) => (game.schemaVersion ?? 1) < CURRENT_SCHEMA_VERSION,
      ).length;

      for (const game of games) {
        await storage.saveGame({
          ...game,
          createdAt: typeof game.createdAt === 'number' ? game.createdAt : importedAt,
          importedAt,
        });
      }

      await loadSavedGames();
      setRawJson('');
      onClose();

      const gameLabel = games.length === 1 ? 'game' : 'games';
      const upgradeMessage =
        legacyCount > 0
          ? ` ${legacyCount} ${legacyCount === 1 ? 'game was' : 'games were'} upgraded from an older schema during save.`
          : '';

      showAlert({
        title: `Imported ${games.length} ${gameLabel}`,
        message: `Legacy saved-game JSON was imported into local storage.${upgradeMessage}`,
      });
    } catch (error) {
      showAlert({
        title: 'Import Failed',
        message: error instanceof Error ? error.message : 'Unable to import the pasted JSON.',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleAppendRawStorage = async () => {
    try {
      setIsImporting(true);

      const rawGames = parseRawSavedGamesJson(rawJson);
      const existingStorage = await AsyncStorage.getItem(SAVED_GAMES_STORAGE_KEY);
      const existingRawGames = existingStorage ? parseRawSavedGamesJson(existingStorage) : [];
      const combinedRawGames = [...existingRawGames, ...rawGames];

      await AsyncStorage.removeItem(SAVED_GAMES_QUARANTINE_KEY);
      await AsyncStorage.setItem(SAVED_GAMES_STORAGE_KEY, JSON.stringify(combinedRawGames));
      setRawJson('');

      showAlert({
        title: `Appended ${rawGames.length} raw ${rawGames.length === 1 ? 'entry' : 'entries'}`,
        message:
          'Raw saved-game entries were appended to AsyncStorage. Open Saved Games or View Stats to trigger loadGames() and exercise quarantine/migration handling.',
      });
    } catch (error) {
      showAlert({
        title: 'Raw Append Failed',
        message: error instanceof Error ? error.message : 'Unable to append raw saved-game JSON.',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const performReplaceRawStorage = async () => {
    try {
      setIsImporting(true);

      const rawGames = parseRawSavedGamesJson(rawJson);

      await AsyncStorage.removeItem(SAVED_GAMES_QUARANTINE_KEY);
      await AsyncStorage.setItem(SAVED_GAMES_STORAGE_KEY, JSON.stringify(rawGames));
      setRawJson('');

      showAlert({
        title: `Replaced with ${rawGames.length} raw ${rawGames.length === 1 ? 'entry' : 'entries'}`,
        message:
          'Saved-game storage was replaced. Open Saved Games or View Stats to trigger loadGames() and exercise quarantine/migration handling.',
      });
    } catch (error) {
      showAlert({
        title: 'Raw Replace Failed',
        message: error instanceof Error ? error.message : 'Unable to replace raw saved-game JSON.',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleReplaceRawStorage = () => {
    if (isImporting || rawJson.trim().length === 0) {
      return;
    }

    showAlert({
      title: 'Replace Saved Games?',
      message:
        'This overwrites the entire saved-games AsyncStorage blob with the pasted raw entries. Use this only when you intentionally want to discard the current list.',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Replace',
          style: 'destructive',
          onPress: () => {
            void performReplaceRawStorage();
          },
        },
      ],
    });
  };

  const handleLoadSeededGames = async () => {
    try {
      setIsImporting(true);
      const previousGameCount = savedGames.length;
      await loadSavedGames();
      const quarantine = await AsyncStorage.getItem(SAVED_GAMES_QUARANTINE_KEY);
      const quarantinedCount = quarantine
        ? ((JSON.parse(quarantine) as { games?: unknown[] }).games?.length ?? 0)
        : 0;
      const loadedGames = useGameStore.getState().savedGames.length;
      const quarantineSummary =
        quarantinedCount > 0
          ? ` Quarantined ${quarantinedCount} malformed ${quarantinedCount === 1 ? 'entry' : 'entries'}.`
          : '';
      const storeDeltaSummary =
        previousGameCount !== loadedGames
          ? ` Store count changed from ${previousGameCount} to ${loadedGames}.`
          : '';

      showAlert({
        title: 'loadGames() completed',
        message: `Loaded ${loadedGames} saved ${loadedGames === 1 ? 'game' : 'games'} from storage.${quarantineSummary}${storeDeltaSummary}`,
      });
    } catch (error) {
      showAlert({
        title: 'loadGames() failed',
        message:
          error instanceof Error
            ? error.message
            : 'Loading seeded games threw an unexpected error.',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleTestCorruptBlobAlert = async () => {
    try {
      setIsImporting(true);

      await AsyncStorage.removeItem(SAVED_GAMES_QUARANTINE_KEY);
      await AsyncStorage.setItem(SAVED_GAMES_STORAGE_KEY, '{not-json');
      setRawJson('');
      onClose();
      router.push('/SavedGameStats');
    } catch (error) {
      showAlert({
        title: 'Corrupt Blob Test Failed',
        message:
          error instanceof Error
            ? error.message
            : 'Unable to seed invalid saved-games JSON for testing.',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    if (isImporting) {
      return;
    }
    onClose();
  };

  return (
    <AlertModal visible={visible} title="Legacy Game JSON" onClose={handleClose}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <ThemedText style={[styles.message, { color: palette.textMuted }]}>
          {description}
        </ThemedText>

        <ThemedText style={[styles.note, { color: palette.textMuted }]}>{note}</ThemedText>

        <TextInput
          value={rawJson}
          onChangeText={setRawJson}
          editable={!isImporting}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          placeholder='[{"schemaVersion":2,"team1":{"name":"My Team","roster":[]},"team2Name":"Opp","team1Score":8,"team2Score":3,"events":[],"gameTo":13,"gameLength":90,"startingPossession":"team1"}]'
          placeholderTextColor={palette.textMuted}
          style={[
            styles.input,
            {
              color: palette.textInverse,
              borderColor: palette.overlay20,
              backgroundColor: palette.overlay05,
            },
          ]}
          textAlignVertical="top"
        />

        <View style={styles.actions}>
          <Pressable
            onPress={() => setRawJson('')}
            disabled={isImporting || rawJson.length === 0}
            style={({ pressed }) => [
              styles.actionButton,
              {
                backgroundColor: palette.overlay10,
                borderColor: palette.overlay20,
              },
              pressed && styles.buttonPressed,
              (isImporting || rawJson.length === 0) && styles.buttonDisabled,
            ]}>
            <ThemedText style={[styles.secondaryButtonText, { color: palette.textInverse }]}>
              Clear
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={handleImport}
            disabled={isImporting || rawJson.trim().length === 0}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: palette.accent, borderColor: palette.accent },
              pressed && styles.buttonPressed,
              (isImporting || rawJson.trim().length === 0) && styles.buttonDisabled,
            ]}>
            <ThemedText style={[styles.primaryButtonText, { color: palette.textOnAccent }]}>
              {isImporting ? 'Working...' : 'Import Safely'}
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={handleAppendRawStorage}
            disabled={isImporting || rawJson.trim().length === 0}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: palette.warning, borderColor: palette.warning },
              pressed && styles.buttonPressed,
              (isImporting || rawJson.trim().length === 0) && styles.buttonDisabled,
            ]}>
            <ThemedText style={[styles.primaryButtonText, { color: palette.textOnAccent }]}>
              {isImporting ? 'Working...' : 'Append Raw Entries'}
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={handleReplaceRawStorage}
            disabled={isImporting || rawJson.trim().length === 0}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: palette.danger, borderColor: palette.danger },
              pressed && styles.buttonPressed,
              (isImporting || rawJson.trim().length === 0) && styles.buttonDisabled,
            ]}>
            <ThemedText style={[styles.primaryButtonText, { color: palette.textOnAccent }]}>
              {isImporting ? 'Working...' : 'Replace Raw Storage'}
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={handleLoadSeededGames}
            disabled={isImporting}
            style={({ pressed }) => [
              styles.actionButton,
              {
                backgroundColor: palette.overlay10,
                borderColor: palette.overlay20,
              },
              pressed && styles.buttonPressed,
              isImporting && styles.buttonDisabled,
            ]}>
            <ThemedText style={[styles.secondaryButtonText, { color: palette.textInverse }]}>
              {isImporting ? 'Working...' : 'Run loadGames() Now'}
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={handleTestCorruptBlobAlert}
            disabled={isImporting}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: palette.danger, borderColor: palette.danger },
              pressed && styles.buttonPressed,
              isImporting && styles.buttonDisabled,
            ]}>
            <ThemedText style={[styles.primaryButtonText, { color: palette.textOnAccent }]}>
              {isImporting ? 'Working...' : 'Test Corrupt Blob Alert'}
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </AlertModal>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    scroll: {
      maxHeight: scaleBySizeClass(560, sizeClass),
    },
    content: {
      gap: scaleBySizeClass(12, sizeClass),
      paddingBottom: 4,
    },
    message: {
      fontSize: scaleBySizeClass(14, sizeClass),
      lineHeight: scaleBySizeClass(20, sizeClass),
    },
    note: {
      fontSize: scaleBySizeClass(12, sizeClass),
      lineHeight: scaleBySizeClass(18, sizeClass),
    },
    input: {
      minHeight: scaleBySizeClass(220, sizeClass),
      maxHeight: scaleBySizeClass(280, sizeClass),
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: scaleBySizeClass(14, sizeClass),
    },
    actions: {
      gap: scaleBySizeClass(10, sizeClass),
      marginTop: 4,
    },
    actionButton: {
      width: '100%',
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryButtonText: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    primaryButtonText: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.bold,
    },
    buttonPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.98 }],
    },
    buttonDisabled: {
      opacity: 0.5,
    },
  });
}
