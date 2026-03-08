import { useTheme } from '@/context/ThemeContext';
import { getSizeClassValue, scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { RecentLine } from '@/lib/lineUtils';
import { LinePreset, Player } from '@/lib/storage/types';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

interface PresetPickerModalProps {
  visible: boolean;
  onClose: () => void;
  presets: LinePreset[];
  selectedPresetId: string | null;
  onSelectPreset: (preset: LinePreset) => void;
  onEditPresets: () => void;
  recentLines: RecentLine[];
  selectedRecentPointNumber: number | null;
  onSelectRecentLine: (recent: RecentLine) => void;
  roster: Player[];
}

function getFirstNames(playerIds: string[], roster: Player[]): string {
  return playerIds
    .map((id) => {
      const name = roster.find((p) => p.id === id)?.name ?? '?';
      return name.split(' ')[0];
    })
    .join(', ');
}

export function PresetPickerModal({
  visible,
  onClose,
  presets,
  selectedPresetId,
  onSelectPreset,
  onEditPresets,
  recentLines,
  selectedRecentPointNumber,
  onSelectRecentLine,
  roster,
}: PresetPickerModalProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const insets = useSafeAreaInsets();
  const editIconSize = scaleBySizeClass(14, sizeClass);
  const checkIconSize = scaleBySizeClass(16, sizeClass);
  const hasBothSections = recentLines.length > 0 && presets.length > 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafeArea} edges={['top', 'left', 'right']}>
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: palette.overlayDark40 }]}
          onPress={onClose}>
          <Pressable
            style={[
              styles.bottomSheet,
              { backgroundColor: palette.modalBg, paddingBottom: Math.max(insets.bottom, 16) },
            ]}
            onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle}>
              <View style={[styles.handleBar, { backgroundColor: palette.overlay15 }]} />
            </View>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: palette.modalText }]}>Load Line</Text>
              <Pressable
                onPress={onEditPresets}
                style={({ pressed }) => [styles.editPresetsHeaderBtn, pressed && { opacity: 0.7 }]}>
                <MaterialCommunityIcons
                  name="pencil"
                  size={editIconSize}
                  color={palette.modalTextMuted}
                />
                <Text style={[styles.editPresetsHeaderText, { color: palette.modalTextMuted }]}>
                  Edit Presets
                </Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.presetList}
              contentContainerStyle={styles.presetListContent}
              showsVerticalScrollIndicator={false}>
              {/* Presets Section */}
              {hasBothSections && (
                <Text style={[styles.sectionHeader, { color: palette.modalTextMuted }]}>
                  Presets
                </Text>
              )}
              {presets.length > 0 ? (
                <View style={styles.presetGrid}>
                  {presets.map((preset) => (
                    <Pressable
                      key={preset.id}
                      onPress={() => onSelectPreset(preset)}
                      style={({ pressed }) => [
                        styles.presetListItem,
                        {
                          backgroundColor:
                            selectedPresetId === preset.id ? palette.accent + '20' : 'transparent',
                          borderColor: palette.overlay15,
                        },
                        pressed && { opacity: 0.8 },
                      ]}>
                      <Text
                        style={[
                          styles.presetListItemText,
                          {
                            color:
                              selectedPresetId === preset.id ? palette.accent : palette.modalText,
                          },
                        ]}
                        numberOfLines={1}>
                        {preset.name}
                      </Text>
                      {selectedPresetId === preset.id && (
                        <MaterialCommunityIcons
                          name="check"
                          size={checkIconSize}
                          color={palette.accent}
                        />
                      )}
                    </Pressable>
                  ))}
                </View>
              ) : (
                recentLines.length === 0 && (
                  <Text style={[styles.emptyText, { color: palette.modalTextMuted }]}>
                    No presets yet. Tap Edit Presets to add some.
                  </Text>
                )
              )}

              {/* Divider between sections */}
              {hasBothSections && (
                <View style={[styles.sectionDivider, { backgroundColor: palette.overlay15 }]} />
              )}

              {/* Recent Lines Section */}
              {recentLines.length > 0 && (
                <>
                  {hasBothSections && (
                    <Text style={[styles.sectionHeader, { color: palette.modalTextMuted }]}>
                      Recent
                    </Text>
                  )}
                  {recentLines.map((recent) => {
                    const isSelected = selectedRecentPointNumber === recent.pointNumber;
                    return (
                      <Pressable
                        key={`recent-${recent.pointNumber}`}
                        onPress={() => onSelectRecentLine(recent)}
                        style={({ pressed }) => [
                          styles.recentListItem,
                          {
                            backgroundColor: isSelected ? palette.accent + '20' : 'transparent',
                            borderColor: palette.overlay15,
                          },
                          pressed && { opacity: 0.8 },
                        ]}>
                        <View style={styles.recentItemLeft}>
                          <MaterialCommunityIcons
                            name="history"
                            size={scaleBySizeClass(14, sizeClass)}
                            color={isSelected ? palette.accent : palette.modalTextMuted}
                          />
                          <Text
                            style={[
                              styles.recentPointLabel,
                              { color: isSelected ? palette.accent : palette.modalText },
                            ]}>
                            Pt {recent.pointNumber}
                          </Text>
                          <Text
                            style={[styles.recentPlayerNames, { color: palette.modalTextMuted }]}
                            numberOfLines={1}>
                            {getFirstNames(recent.playerIds, roster)}
                          </Text>
                        </View>
                        {isSelected && (
                          <MaterialCommunityIcons
                            name="check"
                            size={checkIconSize}
                            color={palette.accent}
                          />
                        )}
                      </Pressable>
                    );
                  })}
                </>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    modalSafeArea: {
      flex: 1,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    bottomSheet: {
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingHorizontal: 16,
      maxHeight: '75%',
      width: getSizeClassValue({ small: '100%', medium: '75%', large: '60%' }, sizeClass),
      alignSelf: 'center',
    },
    sheetHandle: {
      alignItems: 'center',
      paddingVertical: 12,
    },
    handleBar: {
      width: 36,
      height: 4,
      borderRadius: 2,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    sheetTitle: {
      fontSize: scaleBySizeClass(16, sizeClass),
      fontWeight: '700',
    },
    editPresetsHeaderBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    editPresetsHeaderText: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontWeight: '600',
    },
    presetList: {
      flexGrow: 0,
    },
    presetListContent: {
      gap: 6,
      paddingBottom: 8,
    },
    sectionHeader: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontWeight: '700',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      marginBottom: 4,
      marginTop: 2,
    },
    sectionDivider: {
      height: 1,
      marginVertical: 10,
    },
    recentListItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 11,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
    },
    recentItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
      minWidth: 0,
    },
    recentPointLabel: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontWeight: '700',
      flexShrink: 0,
    },
    recentPlayerNames: {
      fontSize: scaleBySizeClass(13, sizeClass),
      fontWeight: '400',
      flex: 1,
    },
    presetGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    presetListItem: {
      width: '48.5%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
    },
    presetListItemText: {
      fontSize: scaleBySizeClass(15, sizeClass),
      fontWeight: '600',
      flex: 1,
    },
    emptyText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontStyle: 'italic',
      paddingVertical: 8,
    },
  });
}
