import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { ThemedText } from '@/components/ThemedText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import { MAX_ADVANCED_GAME_NOTE_LENGTH } from '@/lib/constants';
import { Fonts } from '@/theme/theme';

interface AdvancedGameNoteModalProps {
  initialNote?: string;
  title?: string;
  context?: string;
  testIDPrefix?: string;
  onClose: () => void;
  onSave: (note: string) => void | Promise<void>;
}

export function AdvancedGameNoteModal({
  initialNote = '',
  title = 'Game Note',
  context,
  testIDPrefix = 'advanced-game-note',
  onClose,
  onSave,
}: AdvancedGameNoteModalProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const [note, setNote] = useState(initialNote.slice(0, MAX_ADVANCED_GAME_NOTE_LENGTH));
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const handleChangeText = (nextNote: string) => {
    setNote(nextNote.slice(0, MAX_ADVANCED_GAME_NOTE_LENGTH));
    setSaveError(false);
  };

  const handleClose = () => {
    if (!isSaving) onClose();
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(false);
    try {
      await onSave(note);
      onClose();
    } catch {
      setSaveError(true);
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      supportedOrientations={['portrait', 'landscape']}
      onRequestClose={handleClose}>
      <KeyboardAvoidingView automaticOffset style={styles.keyboardAvoidingView} behavior="height">
        <BottomSheet
          testID={`${testIDPrefix}-editor`}
          onDismiss={handleClose}
          sheetStyle={[styles.sheet, { backgroundColor: palette.primary }]}
          overlayColor={palette.overlayDark88}>
          <View style={styles.content}>
            <View style={[styles.handle, { backgroundColor: palette.overlay20 }]} />

            <View style={styles.header}>
              <View style={styles.headerText}>
                <ThemedText style={[styles.title, { color: palette.textInverse }]}>
                  {title}
                </ThemedText>
                {context != null && (
                  <ThemedText
                    style={[styles.context, { color: palette.textSecondary }]}
                    numberOfLines={2}>
                    {context}
                  </ThemedText>
                )}
                <ThemedText style={[styles.privacyText, { color: palette.textMuted }]}>
                  Private to this device · not shared
                </ThemedText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Close ${title.toLowerCase()} editor`}
                onPress={handleClose}
                hitSlop={12}
                disabled={isSaving}>
                <MaterialCommunityIcons
                  name="close"
                  size={scaleBySizeClass(22, sizeClass)}
                  color={palette.textMuted}
                />
              </Pressable>
            </View>

            <TextInput
              testID={`${testIDPrefix}-input`}
              accessibilityLabel={title}
              style={[
                styles.input,
                {
                  color: palette.textInverse,
                  backgroundColor: palette.overlay05,
                  borderColor: palette.overlay20,
                },
              ]}
              value={note}
              onChangeText={handleChangeText}
              placeholder="Add notes here :)"
              placeholderTextColor={palette.textMuted}
              multiline
              scrollEnabled
              maxLength={MAX_ADVANCED_GAME_NOTE_LENGTH}
              textAlignVertical="top"
              autoFocus
              editable={!isSaving}
            />

            <View style={styles.inputMetaRow}>
              {saveError ? (
                <ThemedText style={[styles.errorText, { color: palette.danger }]}>
                  Could not save the note. Try again.
                </ThemedText>
              ) : (
                <View />
              )}
              <ThemedText style={[styles.characterCount, { color: palette.textMuted }]}>
                {note.length.toLocaleString()} / {MAX_ADVANCED_GAME_NOTE_LENGTH.toLocaleString()}
              </ThemedText>
            </View>

            <View style={styles.actions}>
              <Pressable
                testID={`${testIDPrefix}-cancel`}
                accessibilityRole="button"
                onPress={handleClose}
                disabled={isSaving}
                style={({ pressed }) => [
                  styles.button,
                  { backgroundColor: palette.overlay10, borderColor: palette.overlay20 },
                  pressed && styles.buttonPressed,
                ]}>
                <ThemedText style={[styles.buttonText, { color: palette.textInverse }]}>
                  Cancel
                </ThemedText>
              </Pressable>
              <Pressable
                testID={`${testIDPrefix}-save`}
                accessibilityRole="button"
                onPress={handleSave}
                disabled={isSaving}
                style={({ pressed }) => [
                  styles.button,
                  styles.saveButton,
                  { backgroundColor: palette.accent },
                  pressed && styles.buttonPressed,
                  isSaving && styles.buttonDisabled,
                ]}>
                {isSaving ? (
                  <ActivityIndicator size="small" color={palette.textOnAccent} />
                ) : (
                  <ThemedText style={[styles.buttonText, { color: palette.textOnAccent }]}>
                    Save Note
                  </ThemedText>
                )}
              </Pressable>
            </View>
          </View>
        </BottomSheet>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    keyboardAvoidingView: {
      flex: 1,
    },
    sheet: {
      maxHeight: '88%',
    },
    content: {
      paddingHorizontal: 20,
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
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 16,
    },
    headerText: {
      flex: 1,
      gap: 5,
    },
    title: {
      fontSize: scaleBySizeClass(20, sizeClass),
      fontFamily: Fonts.bold,
    },
    privacyText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.regular,
    },
    context: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    input: {
      minHeight: scaleBySizeClass(180, sizeClass),
      maxHeight: scaleBySizeClass(300, sizeClass),
      borderWidth: 1,
      borderRadius: 14,
      padding: 14,
      fontSize: scaleBySizeClass(15, sizeClass),
      lineHeight: scaleBySizeClass(21, sizeClass),
      fontFamily: Fonts.regular,
    },
    inputMetaRow: {
      minHeight: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    errorText: {
      flex: 1,
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.semiBold,
    },
    characterCount: {
      fontSize: scaleBySizeClass(12, sizeClass),
      fontFamily: Fonts.semiBold,
      textAlign: 'right',
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
    },
    button: {
      minHeight: 46,
      paddingHorizontal: 18,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveButton: {
      minWidth: scaleBySizeClass(118, sizeClass),
      borderWidth: 0,
    },
    buttonPressed: {
      opacity: 0.8,
    },
    buttonDisabled: {
      opacity: 0.65,
    },
    buttonText: {
      fontSize: scaleBySizeClass(14, sizeClass),
      fontFamily: Fonts.bold,
    },
  });
}
