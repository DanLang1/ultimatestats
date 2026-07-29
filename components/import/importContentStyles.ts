import { StyleSheet } from 'react-native';

import { scaleBySizeClass, SizeClass } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';

export function createImportContentStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    content: {
      alignItems: 'center',
      gap: scaleBySizeClass(16, sizeClass),
    },
    title: {
      fontSize: scaleBySizeClass(20, sizeClass),
      fontFamily: Fonts.bold,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: scaleBySizeClass(14, sizeClass),
      textAlign: 'center',
    },
    previewCard: {
      alignItems: 'center',
      gap: scaleBySizeClass(12, sizeClass),
      paddingVertical: scaleBySizeClass(8, sizeClass),
    },
    previewTeams: {
      fontSize: scaleBySizeClass(18, sizeClass),
      fontFamily: Fonts.semiBold,
      textAlign: 'center',
    },
    previewMeta: {
      fontSize: scaleBySizeClass(13, sizeClass),
    },
    buttonRow: {
      flexDirection: 'row',
      gap: scaleBySizeClass(12, sizeClass),
      marginTop: scaleBySizeClass(8, sizeClass),
    },
    button: {
      paddingHorizontal: scaleBySizeClass(28, sizeClass),
      paddingVertical: scaleBySizeClass(12, sizeClass),
      borderRadius: scaleBySizeClass(12, sizeClass),
      minWidth: scaleBySizeClass(100, sizeClass),
      alignItems: 'center',
    },
    buttonText: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontFamily: Fonts.bold,
    },
    gamesList: {
      maxHeight: scaleBySizeClass(200, sizeClass),
      width: '100%',
    },
    gamesListContent: {
      gap: scaleBySizeClass(8, sizeClass),
    },
    gameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: scaleBySizeClass(12, sizeClass),
      paddingVertical: scaleBySizeClass(10, sizeClass),
      borderRadius: scaleBySizeClass(10, sizeClass),
    },
    gameRowInfo: {
      flex: 1,
      marginRight: scaleBySizeClass(12, sizeClass),
      gap: scaleBySizeClass(2, sizeClass),
    },
    gameRowTeams: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
    },
  });
}

export function createImportContentMetrics(sizeClass: SizeClass) {
  return {
    statusIconMedium: scaleBySizeClass(40, sizeClass),
    statusIconLarge: scaleBySizeClass(48, sizeClass),
  };
}
