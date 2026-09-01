import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { getSizeClassValue, scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { RecentLine } from '@/lib/lineUtils';
import { LinePreset, Player } from '@/lib/storage/types';
import { Fonts } from '@/theme/theme';

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
  const { sizeClass, isLandscape } = useLayout();
  const styles = createStyles(sizeClass, isLandscape);
  const insets = useSafeAreaInsets();
  const editIconSize = scaleBySizeClass(14, sizeClass);
  const checkIconSize = scaleBySizeClass(16, sizeClass);
  const hasBothSections = recentLines.length > 0 && presets.length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      supportedOrientations={['portrait', 'landscape']}
      onRequestClose={onClose}>
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
              <ThemedText style={[styles.sheetTitle, { color: palette.modalText }]}>
                Load Line
              </ThemedText>
              <Pressable
                onPress={onEditPresets}
                style={({ pressed }) => [styles.editPresetsHeaderBtn, pressed && { opacity: 0.7 }]}>
                <MaterialCommunityIcons
                  name="pencil"
                  size={editIconSize}
                  color={palette.modalTextMuted}
                />
                <ThemedText
                  style={[styles.editPresetsHeaderText, { color: palette.modalTextMuted }]}>
                  Edit Presets
                </ThemedText>
              </Pressable>
            </View>

            <ScrollView
              style={styles.presetList}
              contentContainerStyle={styles.presetListContent}
              showsVerticalScrollIndicator={false}>
              {/* Presets Section */}
              {hasBothSections && (
                <ThemedText style={[styles.sectionHeader, { color: palette.modalTextMuted }]}>
                  Presets
                </ThemedText>
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
                      <ThemedText
                        style={[
                          styles.presetListItemText,
                          {
                            color:
                              selectedPresetId === preset.id ? palette.accent : palette.modalText,
                          },
                        ]}
                        numberOfLines={1}>
                        {preset.name}
                      </ThemedText>
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
                  <ThemedText style={[styles.emptyText, { color: palette.modalTextMuted }]}>
                    No presets yet. Tap Edit Presets to add some.
                  </ThemedText>
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
                    <ThemedText style={[styles.sectionHeader, { color: palette.modalTextMuted }]}>
                      Recent
                    </ThemedText>
                  )}
                  {recentLines.map((recent) => {
                    const isSelected = selectedRecentPointNumber === recent.pointNumber;
                    return (
                      <Pressable
                        key={`recent-${recent.pointNumber}`}
                        testID={`line-select-recent-${recent.pointNumber}`}
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
                          <ThemedText
                            style={[
                              styles.recentPointLabel,
                              { color: isSelected ? palette.accent : palette.modalText },
                            ]}>
                            Pt {recent.pointNumber}
                          </ThemedText>
                          <ThemedText
                            style={[styles.recentPlayerNames, { color: palette.modalTextMuted }]}
                            numberOfLines={1}>
                            {getFirstNames(recent.playerIds, roster)}
                          </ThemedText>
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

function createStyles(sizeClass: SizeClass, isLandscape: boolean) {
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
      maxHeight: isLandscape ? '90%' : '75%',
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
      fontFamily: Fonts.bold,
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
      fontFamily: Fonts.semiBold,
    },
    presetList: {
      flexShrink: 1,
    },
    presetListContent: {
      gap: 6,
      paddingBottom: 8,
    },
    sectionHeader: {
      fontSize: scaleBySizeClass(11, sizeClass),
      fontFamily: Fonts.bold,
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
      fontFamily: Fonts.bold,
      flexShrink: 0,
    },
    recentPlayerNames: {
      fontSize: scaleBySizeClass(13, sizeClass),
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
      fontFamily: Fonts.semiBold,
      flex: 1,
    },
    emptyText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontStyle: 'italic',
      paddingVertical: 8,
    },
  });
}
