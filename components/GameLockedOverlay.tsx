import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { useGameStore } from '@/store/gameStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

export default function GameLockedOverlay() {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const { resetGame, gameLocked, undoLastAction } = useGameStore();
  const lockIconSize = scaleBySizeClass(64, sizeClass);
  const actionIconSize = scaleBySizeClass(20, sizeClass);

  if (!gameLocked) return null;

  return (
    <View style={[styles.overlay, { backgroundColor: palette.overlayDark60 }]}>
      <Animated.View entering={FadeIn} style={styles.content}>
        <MaterialCommunityIcons name="lock" size={lockIconSize} color={palette.lockScreenText} />
        <Text style={[styles.title, { color: palette.lockScreenText }]}>Game Complete</Text>
        <Text style={[styles.subtitle, { color: palette.lockScreenText }]}>
          Start a new game to continue
        </Text>

        <View style={styles.buttons}>
          <Pressable
            style={[styles.button, { backgroundColor: palette.lockScreenBtnPrimaryBg }]}
            onPress={() => resetGame()}>
            <MaterialCommunityIcons
              name="restart"
              size={actionIconSize}
              color={palette.lockScreenBtnPrimaryText}
            />
            <Text style={[styles.buttonText, { color: palette.lockScreenBtnPrimaryText }]}>
              Start New Game
            </Text>
          </Pressable>

          <View style={styles.buttonsRow}>
            <Pressable
              style={[
                styles.button,
                styles.buttonHalf,
                {
                  backgroundColor: palette.lockScreenBtnSecondaryBg,
                  borderWidth: 1,
                  borderColor: palette.lockScreenBtnSecondaryBorder,
                },
              ]}
              onPress={() => router.push('/Dashboard')}>
              <MaterialCommunityIcons
                name="home"
                size={actionIconSize}
                color={palette.lockScreenText}
              />
              <Text style={[styles.buttonText, { color: palette.lockScreenText }]}>Home</Text>
            </Pressable>

            <Pressable
              style={[
                styles.button,
                styles.buttonHalf,
                {
                  backgroundColor: palette.lockScreenBtnSecondaryBg,
                  borderWidth: 1,
                  borderColor: palette.lockScreenBtnSecondaryBorder,
                },
              ]}
              onPress={() => router.push('/ViewStats')}>
              <MaterialCommunityIcons
                name="chart-bar"
                size={actionIconSize}
                color={palette.lockScreenText}
              />
              <Text style={[styles.buttonText, { color: palette.lockScreenText }]}>Stats</Text>
            </Pressable>

            <Pressable
              style={[
                styles.button,
                styles.buttonHalf,
                {
                  backgroundColor: palette.lockScreenBtnSecondaryBg,
                  borderWidth: 1,
                  borderColor: palette.lockScreenBtnSecondaryBorder,
                },
              ]}
              onPress={undoLastAction}>
              <MaterialCommunityIcons
                name="undo"
                size={actionIconSize}
                color={palette.lockScreenText}
              />
              <Text style={[styles.buttonText, { color: palette.lockScreenText }]}>Undo</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: 24,
    },
    content: {
      alignItems: 'center',
      gap: 16,
      width: '100%',
      maxWidth: 500,
    },
    title: {
      fontSize: scaleBySizeClass(28, sizeClass),
      fontWeight: '800',
      marginTop: 8,
    },
    subtitle: {
      fontSize: scaleBySizeClass(16, sizeClass),
      opacity: 0.8,
      marginBottom: 16,
    },
    buttons: {
      gap: 12,
      width: '100%',
    },
    buttonsRow: {
      flexDirection: 'row',
      gap: 12,
    },
    buttonHalf: {
      flex: 1,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: scaleBySizeClass(14, sizeClass),
      paddingHorizontal: scaleBySizeClass(20, sizeClass),
      borderRadius: scaleBySizeClass(12, sizeClass),
    },
    buttonText: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontWeight: '600',
    },
  });
}
