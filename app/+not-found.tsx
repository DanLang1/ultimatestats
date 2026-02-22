import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { MaterialIcons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack } from 'expo-router';
import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

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
        <Text style={[styles.headerTitle, { color: palette.textMuted }]}>NOT FOUND</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <MaterialCommunityIcons
          name="link-off"
          size={scaleBySizeClass(64, sizeClass)}
          color={palette.textMuted}
        />

        <Text style={[styles.title, { color: palette.textInverse }]}>Page Not Found</Text>

        <Text style={[styles.message, { color: palette.textMuted }]}>
          If you came from a share link, it may have expired.
        </Text>

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
            <Text style={[styles.primaryButtonText, { color: palette.textOnAccent }]}>Go Home</Text>
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
            <Text style={[styles.secondaryButtonText, { color: palette.accent }]}>
              Report Issue
            </Text>
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
      fontWeight: '700',
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
      fontWeight: '700',
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
      fontWeight: '600',
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
      fontWeight: '600',
    },
    buttonPressed: {
      opacity: 0.8,
    },
  });
}
