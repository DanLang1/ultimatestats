import { ThemedView } from '@/components/ThemedView';
import { useAlert } from '@/components/ui/AlertProvider';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useTheme } from '@/context/ThemeContext';
import {
  extractApiErrorMessage,
  fetchImportTeamPayload,
  isImportApiSuccessPayload,
} from '@/lib/import-team/client';
import { buildImportedTeam } from '@/lib/import-team/transform';
import { NAME_FORMAT_OPTIONS, NameFormatOption } from '@/lib/import-team/types';
import { useGameStore } from '@/store/gameStore';
import { MaterialIcons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Clipboard from 'expo-clipboard';
import { router, Stack } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const DISCORD_URL = 'https://discord.gg/AjsmqhZ2GH';

export default function ImportTeamScreen() {
  const { palette } = useTheme();
  const { showAlert } = useAlert();
  const { savedTeams, importTeam, loadTeam } = useGameStore();

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
      loadTeam(importedTeam.id);

      showAlert({
        title: 'Team Imported',
        message: `Imported ${importedTeam.roster.length} players to "${importedTeam.name}".`,
        buttons: [
          {
            text: 'OK',
            style: 'default',
            onPress: () => {
              router.replace({ pathname: '/EditRoster', params: { teamName: importedTeam.name } });
            },
          },
        ],
      });
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

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: palette.overlay10 }]}
          hitSlop={24}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={palette.textInverse} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.textMuted }]}>IMPORT TEAM</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent]}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.textInverse }]}>TEAM LINK</Text>
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
              placeholder="Click button to paste ->"
              placeholderTextColor={palette.textMuted}
            />
            <Pressable
              onPress={handlePasteTeamLink}
              style={({ pressed }) => [
                styles.pasteButton,
                { borderColor: palette.overlay20, backgroundColor: palette.overlay08 },
                pressed && styles.buttonPressed,
              ]}>
              <MaterialCommunityIcons name="content-paste" size={20} color={palette.textInverse} />
              <Text style={[styles.pasteButtonText, { color: palette.textInverse }]}>Paste</Text>
            </Pressable>
          </View>
          {linkError && (
            <Text style={[styles.errorText, { color: palette.danger }]}>{linkError}</Text>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.controls}>
            <SegmentedControl
              label="NAME FORMAT"
              options={NAME_FORMAT_OPTIONS}
              value={nameFormat}
              onChange={(next) => setNameFormat(next as NameFormatOption)}
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
            size={20}
            color={isFetching ? palette.textMuted : palette.textOnAccent}
          />
          <Text
            style={[
              styles.fetchButtonText,
              { color: isFetching ? palette.textMuted : palette.textOnAccent },
            ]}>
            {isFetching ? 'Fetching...' : 'Fetch Roster'}
          </Text>
        </Pressable>

        <View style={[styles.footerNote, { borderTopColor: palette.overlay10 }]}>
          <Text style={[styles.footerNoteText, { color: palette.textMuted }]}>
            Got a different site you want to import from? Message me on Discord and I&apos;ll see
            what I can do
          </Text>
          <Pressable
            onPress={() => Linking.openURL(DISCORD_URL)}
            style={({ pressed }) => [
              styles.discordBanner,
              { backgroundColor: palette.discordBg },
              pressed && styles.buttonPressed,
            ]}>
            <MaterialIcons name="discord" size={24} color={palette.discordText} />
            <View style={styles.discordText}>
              <Text style={[styles.discordTitle, { color: palette.discordText }]}>
                Join U-Stat Discord
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={22}
              color={palette.discordTextMuted}
            />
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={isFetching} transparent animationType="fade">
        <View style={[styles.loadingOverlay, { backgroundColor: palette.overlayDark60 }]}>
          <View
            style={[
              styles.loadingCard,
              { backgroundColor: palette.secondary, borderColor: palette.overlay20 },
            ]}>
            <ActivityIndicator size="large" color={palette.accent} />
            <Text style={[styles.loadingTitle, { color: palette.textInverse }]}>
              Importing Roster
            </Text>
            <Text style={[styles.loadingText, { color: palette.textMuted }]}>
              Importing players, please wait...
            </Text>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    zIndex: 10,
  },
  headerTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    gap: 16,
  },
  section: {
    gap: 8,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  linkInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  pasteButton: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pasteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  controls: {
    gap: 12,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 2,
  },
  fetchButton: {
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  fetchButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  footerNote: {
    marginTop: 8,
    paddingTop: 12,
    gap: 8,
    borderTopWidth: 1,
  },
  footerNoteText: {
    fontSize: 12,
    lineHeight: 17,
  },
  discordBanner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 14,
    marginTop: 2,
  },
  discordText: {
    flex: 1,
    gap: 2,
  },
  discordTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  discordSubtitle: {
    fontSize: 12,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  loadingOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 10,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  loadingText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
