import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useState } from 'react';
import { Pressable, StyleSheet, useColorScheme } from 'react-native';

export default function BasicScoreboard() {
  const colorScheme = useColorScheme();
  const [darkScore, setDarkScore] = useState(0);
  const [lightScore, setLightScore] = useState(0);

  return (
    <>
      {/* Dark Team */}
      <ThemedView style={styles.container}>
        <ThemedText type="title">Dark</ThemedText>
      </ThemedView>
      <ThemedView style={styles.team}>
        <Pressable onPress={() => setDarkScore(Math.max(0, lightScore - 1))}>
          <ThemedText type="title">-</ThemedText>
        </Pressable>

        <ThemedText type="title">{darkScore}</ThemedText>

        <Pressable onPress={() => setDarkScore(darkScore + 1)}>
          <ThemedText type="title">+</ThemedText>
        </Pressable>
      </ThemedView>

      {/* Light Team */}
      <ThemedView style={styles.container}>
        <ThemedText type="title">Light</ThemedText>
      </ThemedView>
      <ThemedView style={styles.team}>
        <Pressable onPress={() => setLightScore(Math.max(0, lightScore - 1))}>
          <ThemedText type="title">-</ThemedText>
        </Pressable>

        <ThemedText type="title">{lightScore}</ThemedText>

        <Pressable onPress={() => setLightScore(lightScore + 1)}>
          <ThemedText type="title">+</ThemedText>
        </Pressable>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 10,
  },
  team: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginVertical: 10,
  },
});
