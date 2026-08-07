import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Clipboard from 'expo-clipboard';
import { router, Stack } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAlert } from '@/components/ui/AlertProvider';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useTheme } from '@/context/ThemeContext';
import { useIsGameActive } from '@/hooks/basic/useIsGameActive';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  extractApiErrorMessage,
  fetchImportTeamPayload,
  isImportApiSuccessPayload,
} from '@/lib/import-team/client';
import { buildImportedTeam } from '@/lib/import-team/transform';
import { NAME_FORMAT_OPTIONS, NameFormatOption } from '@/lib/import-team/types';
import { useGameStore } from '@/store/basic/gameStore';
import { Fonts } from '@/theme/theme';

export default function ImportTeamScreen() {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const metrics = createMetrics(sizeClass);
  const { showAlert } = useAlert();
  const { savedTeams, importTeam, loadTeam } = useGameStore();
  const gameActive = useIsGameActive();

  const [nameFormat, setNameFormat] = useState<NameFormatOption>('first');
  const [teamLink, setTeamLink] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  const isUsauDomainLink = (value: string) => value.toLowerCase().includes('play.usaultimate.org');

  const handlePasteTeamLink = async () => {
    try {
      const clipboardValue = (await Clipboard.getStringAsync()).trim();

      if (!clipboardValue) {
        showAlert({
          title: 'Clipboard Empty',
          message: 'Copy a USA Ultimate team link first, then tap Paste.',
          buttons: [{ text: 'OK', style: 'default' }],
        });
        return;
      }

      setTeamLink(clipboardValue);
      if (linkError && isUsauDomainLink(clipboardValue)) {
        setLinkError(null);
      }
    } catch (error) {
      console.error('[ImportTeam] clipboard read error', error);
      showAlert({
        title: 'Paste Failed',
        message: 'Could not read clipboard text. Try again.',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    }
  };

  const handleFetchRoster = async () => {
    const trimmedLink = teamLink.trim();
    if (!trimmedLink) {
      setLinkError('Paste a team link to continue.');
      return;
    }

    if (!isUsauDomainLink(trimmedLink)) {
      setLinkError('Must be a USA Ultimate link');
      return;
    }
    setLinkError(null);

    try {
      setIsFetching(true);
      const response = await fetchImportTeamPayload(trimmedLink, nameFormat);
      const parsedPayload = response.payload;

      if (!response.ok) {
        const message = extractApiErrorMessage(parsedPayload);
        showAlert({
          title: 'Import Request Failed',
          message: message ?? `Request failed (${response.status}).`,
          buttons: [{ text: 'OK', style: 'default' }],
        });
        return;
      }

      if (!isImportApiSuccessPayload(parsedPayload)) {
        showAlert({
          title: 'Unexpected Response',
          message: 'Import completed, but response format was not recognized.',
          buttons: [{ text: 'OK', style: 'default' }],
        });
        return;
      }

      const importedTeam = buildImportedTeam(parsedPayload, savedTeams, 'Imported Team');

      if (importedTeam.roster.length === 0) {
        showAlert({
          title: 'No Players Found',
          message: 'Import completed, but no player names were found in the response.',
          buttons: [{ text: 'OK', style: 'default' }],
        });
        return;
      }

      await importTeam(importedTeam);

      if (gameActive) {
        showAlert({
          title: 'Team Imported',
          message: `Imported ${importedTeam.roster.length} players to "${importedTeam.name}". You can switch to it from Edit Roster after the game.`,
          buttons: [
            {
              text: 'OK',
              style: 'default',
              onPress: () => {
                router.back();
              },
            },
          ],
        });
      } else {
        loadTeam(importedTeam.id);
        router.replace({
          pathname: '/EditRoster',
          params: { teamName: importedTeam.name },
        });
      }
    } catch (error) {
      console.error('[ImportTeam] API request error', error);
      showAlert({
        title: 'Network Error',
        message: 'Could not reach local import API. Send a message to the dev.',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScreenHeader
        title="IMPORT TEAM"
        onBack={() => router.back()}
        backHitSlop={24}
        titleColor={palette.textMuted}
        backButtonBackgroundColor={palette.overlay10}
      />

      <ScrollView contentContainerStyle={[styles.scrollContent]}>
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: palette.textInverse }]}>
            TEAM LINK
          </ThemedText>
          <View style={styles.linkRow}>
            <TextInput
              style={[
                styles.linkInput,
                {
                  borderColor: linkError ? palette.danger : palette.overlay20,
                  color: palette.textInverse,
                  backgroundColor: palette.overlay08,
                },
              ]}
              value={teamLink}
              onChangeText={(nextValue) => {
                setTeamLink(nextValue);
                if (linkError && isUsauDomainLink(nextValue.trim())) {
                  setLinkError(null);
                }
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder="USAU Team URL"
              placeholderTextColor={palette.textMuted}
            />
            <Pressable
              onPress={handlePasteTeamLink}
              style={({ pressed }) => [
                styles.pasteButton,
                { borderColor: palette.overlay20, backgroundColor: palette.overlay08 },
                pressed && styles.buttonPressed,
              ]}>
              <MaterialCommunityIcons
                name="content-paste"
                size={metrics.actionIconSize}
                color={palette.textInverse}
              />
              <ThemedText style={[styles.pasteButtonText, { color: palette.textInverse }]}>
                Paste
              </ThemedText>
            </Pressable>
          </View>
          {linkError && (
            <ThemedText style={[styles.errorText, { color: palette.danger }]}>
              {linkError}
            </ThemedText>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.controls}>
            <SegmentedControl
              label="NAME FORMAT"
              options={NAME_FORMAT_OPTIONS}
              value={nameFormat}
              onChange={setNameFormat}
            />
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.fetchButton,
            { backgroundColor: isFetching ? palette.overlay20 : palette.accent },
            pressed && styles.buttonPressed,
          ]}
          onPress={handleFetchRoster}
          disabled={isFetching}>
          <MaterialCommunityIcons
            name="cloud-download-outline"
            size={metrics.actionIconSize}
            color={isFetching ? palette.textMuted : palette.textOnAccent}
          />
          <ThemedText
            style={[
              styles.fetchButtonText,
              { color: isFetching ? palette.textMuted : palette.textOnAccent },
            ]}>
            {isFetching ? 'Fetching...' : 'Fetch Roster'}
          </ThemedText>
        </Pressable>
      </ScrollView>

      <Modal
        visible={isFetching}
        transparent
        animationType="fade"
        supportedOrientations={['portrait', 'landscape']}>
        <View style={[styles.loadingOverlay, { backgroundColor: palette.overlayDark60 }]}>
          <View
            style={[
              styles.loadingCard,
              { backgroundColor: palette.secondary, borderColor: palette.overlay20 },
            ]}>
            <ActivityIndicator size="large" color={palette.accent} />
            <ThemedText style={[styles.loadingTitle, { color: palette.textInverse }]}>
              Importing Roster
            </ThemedText>
            <ThemedText style={[styles.loadingText, { color: palette.textMuted }]}>
              Importing players, please wait...
            </ThemedText>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: scaleBySizeClass(24, sizeClass),
      paddingTop: scaleBySizeClass(8, sizeClass),
      gap: scaleBySizeClass(16, sizeClass),
    },
    section: {
      gap: scaleBySizeClass(8, sizeClass),
    },
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scaleBySizeClass(8, sizeClass),
    },
    linkInput: {
      flex: 1,
      height: scaleBySizeClass(48, sizeClass),
      borderWidth: 1,
      borderRadius: scaleBySizeClass(10, sizeClass),
      paddingHorizontal: scaleBySizeClass(14, sizeClass),
      fontSize: scaleBySizeClass(16, sizeClass),
    },
    pasteButton: {
      height: scaleBySizeClass(48, sizeClass),
      borderRadius: scaleBySizeClass(10, sizeClass),
      borderWidth: 1,
      paddingHorizontal: scaleBySizeClass(14, sizeClass),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: scaleBySizeClass(8, sizeClass),
    },
    pasteButtonText: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.semiBold,
      letterSpacing: scaleBySizeClass(0.2, sizeClass, { rounding: 'none' }),
    },
    sectionTitle: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: scaleBySizeClass(1.5, sizeClass, { rounding: 'none' }),
    },
    controls: {
      gap: scaleBySizeClass(12, sizeClass),
    },
    errorText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      marginTop: scaleBySizeClass(4, sizeClass),
      marginLeft: scaleBySizeClass(2, sizeClass),
    },
    fetchButton: {
      height: scaleBySizeClass(48, sizeClass),
      borderRadius: scaleBySizeClass(12, sizeClass),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: scaleBySizeClass(8, sizeClass),
    },
    fetchButtonText: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.bold,
    },
    buttonPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.98 }],
    },
    loadingOverlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: scaleBySizeClass(24, sizeClass),
    },
    loadingCard: {
      width: '100%',
      maxWidth: scaleBySizeClass(360, sizeClass),
      borderRadius: scaleBySizeClass(14, sizeClass),
      borderWidth: 1,
      paddingHorizontal: scaleBySizeClass(20, sizeClass),
      paddingVertical: scaleBySizeClass(18, sizeClass),
      alignItems: 'center',
      gap: scaleBySizeClass(10, sizeClass),
    },
    loadingTitle: {
      fontSize: scaleBySizeClass(18, sizeClass),
      fontFamily: Fonts.bold,
    },
    loadingText: {
      fontSize: scaleBySizeClass(13, sizeClass),
      textAlign: 'center',
      lineHeight: scaleBySizeClass(18, sizeClass),
    },
  });
}

function createMetrics(sizeClass: SizeClass) {
  return {
    actionIconSize: scaleBySizeClass(20, sizeClass),
  };
}
