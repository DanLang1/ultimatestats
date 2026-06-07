import { ThemedText } from '@/components/ThemedText';
import { BottomSheetActionRow } from '@/components/ui/BottomSheetActionRow';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { Fonts } from '@/theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

interface TrackerHomeMenuProps {
  visible: boolean;
  onClose: () => void;
  canPauseGameClock: boolean;
  canStartSecondHalfEarly: boolean;
  onGameClockPause: () => void;
  onStartSecondHalfEarly: () => void;
  onEndGameEarly: () => void;
  onAdvancedTutorial: () => void;
}

export const TrackerHomeMenu = ({
  visible,
  onClose,
  canPauseGameClock,
  canStartSecondHalfEarly,
  onGameClockPause,
  onStartSecondHalfEarly,
  onEndGameEarly,
  onAdvancedTutorial,
}: TrackerHomeMenuProps) => {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);

  const handleGoHome = () => {
    onClose();
    router.dismissTo('/Dashboard');
  };

  const handleViewStats = () => {
    onClose();
    router.push('/ViewStats');
  };

  const handleGameFormat = () => {
    onClose();
    router.push('/GameFormat');
  };

  const handleGameClockPause = () => {
    onClose();
    onGameClockPause();
  };

  const handleStartSecondHalfEarly = () => {
    onClose();
    onStartSecondHalfEarly();
  };

  const handleEndGameEarly = () => {
    onClose();
    onEndGameEarly();
  };

  const handleAdvancedTutorial = () => {
    onClose();
    onAdvancedTutorial();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BottomSheet
        onDismiss={onClose}
        overlayColor={palette.overlayDark88}
        sheetStyle={[styles.sheet, { backgroundColor: palette.primary }]}
        minBottomPadding={12}>
        <View accessible={false} style={styles.content}>
          <View
            accessible={false}
            style={[styles.handle, { backgroundColor: palette.overlay20 }]}
          />

          <View
            accessible={false}
            style={[styles.header, { borderBottomColor: palette.overlay10 }]}>
            <ThemedText style={[styles.title, { color: palette.textMuted }]}>MENU</ThemedText>
            <Pressable onPress={onClose} hitSlop={12}>
              <MaterialCommunityIcons
                name="close"
                size={scaleBySizeClass(22, sizeClass)}
                color={palette.textMuted}
              />
            </Pressable>
          </View>

          <BottomSheetActionRow
            testID="tracker-menu-home"
            icon="home-outline"
            label="Home"
            onPress={handleGoHome}
          />

          <BottomSheetActionRow
            testID="tracker-menu-view-stats"
            icon="chart-bar"
            label="View Stats"
            onPress={handleViewStats}
          />

          <BottomSheetActionRow
            testID="tracker-menu-advanced-tutorial"
            icon="gesture-swipe-vertical"
            label="Advanced Tutorial"
            onPress={handleAdvancedTutorial}
          />

          <View style={[styles.section, { borderTopColor: palette.overlay10 }]}>
            <ThemedText style={[styles.sectionTitle, { color: palette.textMuted }]}>
              GAME MANAGEMENT
            </ThemedText>
            <BottomSheetActionRow
              testID="tracker-menu-game-pause"
              disabled={!canPauseGameClock}
              icon="pause-circle-outline"
              label="Pause Game"
              onPress={handleGameClockPause}
            />
            <BottomSheetActionRow
              testID="tracker-menu-game-format"
              icon="clipboard-text-outline"
              label="Game Format"
              onPress={handleGameFormat}
            />
            {canStartSecondHalfEarly && (
              <BottomSheetActionRow
                testID="tracker-menu-start-second-half-early"
                icon="skip-next-circle-outline"
                label="Start 2nd Half Early"
                tone="warning"
                onPress={handleStartSecondHalfEarly}
              />
            )}
            <BottomSheetActionRow
              testID="tracker-menu-end-game"
              icon="stop-circle-outline"
              label="End Game"
              tone="danger"
              onPress={handleEndGameEarly}
            />
          </View>
        </View>
      </BottomSheet>
    </Modal>
  );
};

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    sheet: {
      maxHeight: '82%',
    },
    content: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      gap: 14,
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 999,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 12,
      borderBottomWidth: 1,
    },
    title: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 1,
    },
    section: {
      borderTopWidth: 1,
      paddingTop: 12,
      gap: 12,
    },
    sectionTitle: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 1,
    },
  });
}
