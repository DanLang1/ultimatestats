import { palette } from '@/constants/theme';
import { useGameStore } from '@/store/gameStore';
import { router } from 'expo-router';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface GameInfoModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function GameInfoModal({ visible, onClose }: GameInfoModalProps) {
  const {
    gameTo,
    team1Name,
    team2Name,
    team1Timeouts,
    team2Timeouts,
    team1Floater,
    team2Floater,
    statTrackingEnabled,
  } = useGameStore();

  const countTimeouts = (timeouts: boolean[]) => timeouts.filter((t) => t).length;

  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.title}>Game Info</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Game To:</Text>
            <Text style={styles.value}>{gameTo}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Timeouts Left This Half</Text>

            <View style={styles.row}>
              <Text style={styles.label}>{team1Name}:</Text>
              <Text style={styles.value}>
                {countTimeouts(team1Timeouts)} {team1Floater ? '+ Floater' : ''}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>{team2Name}:</Text>
              <Text style={styles.value}>
                {countTimeouts(team2Timeouts)} {team2Floater ? '+ Floater' : ''}
              </Text>
            </View>
          </View>

          {statTrackingEnabled && (
            <Pressable
              style={styles.viewStatsButton}
              onPress={() => {
                onClose();
                router.push('/ViewStats');
              }}>
              <Text style={styles.viewStatsText}>View Stats</Text>
            </Pressable>
          )}

          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: palette.surface,
    borderRadius: 20,
    padding: 25,
    alignItems: 'stretch',
    shadowColor: palette.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 300,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: palette.primary,
  },
  section: {
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: palette.textSecondary,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 5,
  },
  label: {
    fontSize: 16,
    color: palette.textPrimary,
    flex: 1,
  },
  value: {
    fontSize: 18,
    fontWeight: 'bold',
    color: palette.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: palette.border,
    marginVertical: 15,
  },
  closeButton: {
    backgroundColor: palette.primary,
    borderRadius: 10,
    padding: 12,
    elevation: 2,
    marginTop: 20,
    alignItems: 'center',
  },
  closeText: {
    color: palette.textInverse,
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  viewStatsButton: {
    marginTop: 10,
    padding: 12,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: palette.cardBgAlt,
    borderWidth: 1,
    borderColor: palette.primary,
  },
  viewStatsText: {
    color: palette.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
