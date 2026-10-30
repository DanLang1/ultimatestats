import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { DiscordIcon } from '@/components/ui/DiscordIcon';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, useLayout } from '@/hooks/useLayout';
import { DISCORD_URL } from '@/lib/constants';
import { reportError } from '@/lib/sentry';
import { Fonts } from '@/theme/theme';

interface ErrorFallbackProps {
  error: Error;
  actionLabel: string;
  onAction: () => void;
}

/** Shared "Something went wrong" screen rendered by route error boundaries. */
export function ErrorFallback({ error, actionLabel, onAction }: ErrorFallbackProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();

  const openDiscord = () => {
    Linking.openURL(DISCORD_URL).catch((linkError: unknown) => {
      reportError('error-fallback-discord-open', linkError);
    });
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={scaleBySizeClass(48, sizeClass)}
          color={palette.danger}
        />
        <ThemedText
          style={[
            styles.title,
            { color: palette.textInverse, fontSize: scaleBySizeClass(18, sizeClass) },
          ]}>
          Something went wrong
        </ThemedText>
        <ThemedText
          style={[
            styles.message,
            {
              color: palette.textMuted,
              fontSize: scaleBySizeClass(14, sizeClass),
              lineHeight: scaleBySizeClass(20, sizeClass),
            },
          ]}>
          Sorry about that, something weird happened and the app crashed. Feel free to reach out on
          Discord for troubleshooting.
        </ThemedText>
        {__DEV__ && (
          <ThemedText
            style={[
              styles.devMessage,
              {
                color: palette.textMuted,
                fontSize: scaleBySizeClass(12, sizeClass),
                lineHeight: scaleBySizeClass(18, sizeClass),
              },
            ]}
            selectable>
            {error.message}
          </ThemedText>
        )}
        <View style={styles.actions}>
          <Pressable
            onPress={onAction}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: palette.accent },
              pressed && styles.buttonPressed,
            ]}>
            <ThemedText
              style={[
                styles.buttonText,
                { color: palette.textOnAccent, fontSize: scaleBySizeClass(15, sizeClass) },
              ]}>
              {actionLabel}
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={openDiscord}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: palette.overlay08 },
              pressed && styles.buttonPressed,
            ]}>
            <DiscordIcon size={scaleBySizeClass(20, sizeClass)} color={palette.discordBg} />
            <ThemedText
              style={[
                styles.buttonText,
                { color: palette.accent, fontSize: scaleBySizeClass(15, sizeClass) },
              ]}>
              Report on Discord
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 16,
    padding: 32,
    maxWidth: 360,
  },
  title: {
    fontFamily: Fonts.bold,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
  },
  devMessage: {
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  actions: {
    alignSelf: 'stretch',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    fontFamily: Fonts.bold,
  },
});
