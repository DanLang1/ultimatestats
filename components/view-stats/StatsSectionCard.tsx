import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useAlert } from '@/components/ui/AlertProvider';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, type SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts, type Palette } from '@/theme/theme';

export interface SectionCardInfo {
  accessibilityLabel: string;
  title: string;
  message: string;
}

interface StatsSectionCardProps {
  title: string;
  testID?: string;
  info?: SectionCardInfo;
  children: ReactNode;
}

/**
 * Shared card shell for team analytics sections in both basic and advanced
 * stats views: header with the card background bleeding to the edges, plus an
 * optional info button.
 */
export default function StatsSectionCard({ title, testID, info, children }: StatsSectionCardProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const { showAlert } = useAlert();
  const styles = createStyles(sizeClass, palette);

  return (
    <View
      testID={testID}
      style={[
        styles.card,
        { backgroundColor: palette.statsCardBg, borderColor: palette.overlay10 },
      ]}>
      {info ? (
        <View style={[styles.headerRow, { backgroundColor: palette.statsHeaderBg }]}>
          <ThemedText style={[styles.headerTitle, { color: palette.textInverse }]}>
            {title}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={info.accessibilityLabel}
            style={styles.infoButton}
            hitSlop={8}
            onPress={() => showAlert({ title: info.title, message: info.message })}>
            <MaterialCommunityIcons
              name="information-outline"
              size={scaleBySizeClass(15, sizeClass)}
              color={palette.textMuted}
            />
          </Pressable>
        </View>
      ) : (
        <ThemedText style={[styles.headerTitleBlock, { color: palette.textInverse }]}>
          {title}
        </ThemedText>
      )}
      {children}
    </View>
  );
}

function createStyles(sizeClass: SizeClass, palette: Palette) {
  return StyleSheet.create({
    card: {
      shadowColor: palette.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.07,
      shadowRadius: 8,
      elevation: 2,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      marginBottom: 16,
    },
    headerTitleBlock: {
      backgroundColor: palette.statsHeaderBg,
      marginHorizontal: -16,
      marginTop: -16,
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderTopLeftRadius: 15,
      borderTopRightRadius: 15,
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.bold,
      marginBottom: 12,
    },
    headerRow: {
      marginHorizontal: -16,
      marginTop: -16,
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderTopLeftRadius: 15,
      borderTopRightRadius: 15,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 12,
    },
    infoButton: {
      height: scaleBySizeClass(44, sizeClass),
      width: scaleBySizeClass(44, sizeClass),
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      flex: 1,
      fontSize: scaleBySizeClass(15, sizeClass),
      fontFamily: Fonts.bold,
    },
  });
}
