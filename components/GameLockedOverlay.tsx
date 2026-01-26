import { useTheme } from '@/context/ThemeContext';
import { useGameStore } from '@/store/gameStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

export default function GameLockedOverlay() {
  const { palette } = useTheme();
  const { resetGame, gameLocked, undoLastAction } = useGameStore();

  if (!gameLocked) return null;

  return (
    <View style={[styles.overlay, { backgroundColor: palette.overlayDark60 }]}>
      <Animated.View entering={FadeIn} style={styles.content}>
        <MaterialCommunityIcons name="lock" size={64} color={palette.lockScreenText} />
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
              size={20}
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
              <MaterialCommunityIcons name="home" size={20} color={palette.lockScreenText} />
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
              <MaterialCommunityIcons name="chart-bar" size={20} color={palette.lockScreenText} />
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
              <MaterialCommunityIcons name="undo" size={20} color={palette.lockScreenText} />
              <Text style={[styles.buttonText, { color: palette.lockScreenText }]}>Undo</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 28,
    fontWeight: '800',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 16,
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
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
