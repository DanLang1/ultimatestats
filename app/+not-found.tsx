import { MaterialIcons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack } from 'expo-router';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

const DISCORD_URL = 'https://discord.gg/AjsmqhZ2GH';

export default function NotFoundScreen() {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  return (
    <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.replace('/')}
          style={[styles.backButton, { backgroundColor: palette.overlay10 }]}
          hitSlop={12}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={scaleBySizeClass(24, sizeClass)}
            color={palette.textInverse}
          />
        </Pressable>
        <ThemedText style={[styles.headerTitle, { color: palette.textMuted }]}>
          NOT FOUND
        </ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <MaterialCommunityIcons
          name="link-off"
          size={scaleBySizeClass(64, sizeClass)}
          color={palette.textMuted}
        />

        <ThemedText style={[styles.title, { color: palette.textInverse }]}>
          Page Not Found
        </ThemedText>

        <ThemedText style={[styles.message, { color: palette.textMuted }]}>
          If you came from a share link, it may have expired.
        </ThemedText>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            onPress={() => router.replace('/')}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: palette.accent },
              pressed && styles.buttonPressed,
            ]}>
            <MaterialCommunityIcons
              name="home"
              size={scaleBySizeClass(20, sizeClass)}
              color={palette.textOnAccent}
            />
            <ThemedText style={[styles.primaryButtonText, { color: palette.textOnAccent }]}>
              Go Home
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => Linking.openURL(DISCORD_URL)}
            style={({ pressed }) => [
              styles.secondaryButton,
              { backgroundColor: palette.overlay08 },
              pressed && styles.buttonPressed,
            ]}>
            <MaterialIcons
              name="discord"
              size={scaleBySizeClass(20, sizeClass)}
              color={palette.accent}
            />
            <ThemedText style={[styles.secondaryButtonText, { color: palette.accent }]}>
              Report Issue
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </ThemedView>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
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
    },
    headerTitle: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    headerSpacer: {
      width: 40,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
      paddingBottom: 80,
      gap: 16,
    },
    title: {
      fontSize: scaleBySizeClass(24, sizeClass),
      fontFamily: Fonts.bold,
      marginTop: 8,
    },
    message: {
      fontSize: scaleBySizeClass(15, sizeClass),
      textAlign: 'center',
      lineHeight: scaleBySizeClass(22, sizeClass),
      maxWidth: 300,
    },
    actions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 24,
    },
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      gap: 8,
    },
    primaryButtonText: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    secondaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      gap: 8,
    },
    secondaryButtonText: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    buttonPressed: {
      opacity: 0.8,
    },
  });
}
