import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { useLayout } from '@/hooks/useLayout';

import { createImportContentMetrics, createImportContentStyles } from './importContentStyles';

type ImportStatusContentProps =
  | { status: 'loading' }
  | { status: 'error'; message: string; onDismiss: () => void };

export function ImportStatusContent(props: ImportStatusContentProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createImportContentStyles(sizeClass);
  const metrics = createImportContentMetrics(sizeClass);

  if (props.status === 'loading') {
    return (
      <View style={styles.content}>
        <ActivityIndicator size="large" color={palette.accent} />
        <ThemedText style={[styles.title, { color: palette.modalText }]}>
          Loading shared data...
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.content}>
      <MaterialCommunityIcons
        name="alert-circle-outline"
        size={metrics.statusIconLarge}
        color={palette.danger}
      />
      <ThemedText style={[styles.title, { color: palette.modalText }]}>Import Failed</ThemedText>
      <ThemedText style={[styles.subtitle, { color: palette.modalTextMuted }]}>
        {props.message}
      </ThemedText>
      <Pressable
        style={[styles.button, { backgroundColor: palette.overlay10 }]}
        onPress={props.onDismiss}>
        <ThemedText style={[styles.buttonText, { color: palette.modalText }]}>OK</ThemedText>
      </Pressable>
    </View>
  );
}
