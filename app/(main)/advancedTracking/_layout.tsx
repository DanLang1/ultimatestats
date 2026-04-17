import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack } from 'expo-router';
import type { ErrorBoundaryProps } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

export function ErrorBoundary({ error }: ErrorBoundaryProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
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
        <Pressable
          onPress={() => router.dismissTo('/Dashboard')}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: palette.accent },
            pressed && { opacity: 0.85 },
          ]}>
          <ThemedText
            style={[
              styles.buttonText,
              { color: palette.textOnAccent, fontSize: scaleBySizeClass(15, sizeClass) },
            ]}>
            Go to Dashboard
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

export default function AdvancedTrackingLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'none' }} />;
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
    maxWidth: 320,
  },
  title: {
    fontFamily: Fonts.bold,
    textAlign: 'center',
  },
  devMessage: {
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
    marginTop: 8,
  },
  buttonText: {
    fontFamily: Fonts.bold,
  },
});
