import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, type SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

export type AdvancedGameStatsOrigin = 'gameComplete';

export default function AdvancedGameRecoveryScreen({
  isLoading,
  from,
}: {
  isLoading: boolean;
  from?: AdvancedGameStatsOrigin;
}) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const emptyStateText = isLoading ? 'Loading game...' : 'Game not found.';
  const handleBack = () => {
    if (from === 'gameComplete') router.replace('/dashboard');
    else router.back();
  };
  return (
    <ThemedView style={[styles.container, { backgroundColor: palette.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title="ADVANCED GAME"
        onBack={handleBack}
        titleColor={palette.textMuted}
        backButtonBackgroundColor={palette.overlay10}
        centerTitleInLandscape={false}
      />
      <View style={styles.centeredState}>
        {isLoading ? (
          <ActivityIndicator color={palette.accent} size="large" />
        ) : (
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={scaleBySizeClass(42, sizeClass)}
            color={palette.textMuted}
          />
        )}
        <ThemedText style={[styles.stateText, { color: palette.textMuted }]}>
          {emptyStateText}
        </ThemedText>
        {!isLoading && (
          <Pressable
            onPress={() => router.replace('/saved-game-stats')}
            style={[styles.recoverButton, { backgroundColor: palette.overlay10 }]}>
            <ThemedText style={[styles.recoverButtonText, { color: palette.accent }]}>
              Go to Saved Games
            </ThemedText>
          </Pressable>
        )}
      </View>
    </ThemedView>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    container: { flex: 1 },
    centeredState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      paddingHorizontal: 24,
    },
    stateText: {
      fontSize: scaleBySizeClass(15, sizeClass),
      textAlign: 'center',
      fontFamily: Fonts.semiBold,
    },
    recoverButton: {
      marginTop: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
    },
    recoverButtonText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.bold,
    },
  });
}
