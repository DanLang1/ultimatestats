import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AdvancedTurnoverCorrectionField } from '@/components/advancedTracking/corrections/AdvancedTurnoverCorrectionField';
import { AdvancedTurnoverRolePicker } from '@/components/advancedTracking/corrections/AdvancedTurnoverRolePicker';
import { ThemedText } from '@/components/ThemedText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useTheme } from '@/context/ThemeContext';
import { scaleBySizeClass, SizeClass, useLayout } from '@/hooks/useLayout';
import {
  ADVANCED_TURNOVER_EDITOR_RESULTS,
  type AdvancedTurnoverCorrectionContext,
  type AdvancedTurnoverEditorResult,
  type CorrectAdvancedTurnoverInput,
} from '@/lib/advancedTracking/advancedTurnoverCorrectionUtils';
import { getEligibleThrowTypes, THROW_TYPES } from '@/lib/advancedTracking/types';
import type { Participant, ThrowType } from '@/lib/advancedTracking/types';
import { Fonts } from '@/theme/theme';

interface AdvancedTurnoverCorrectionModalProps {
  context: AdvancedTurnoverCorrectionContext;
  focusSideId: string;
  onClose: () => void;
  onSave: (input: CorrectAdvancedTurnoverInput) => void | Promise<void>;
}

const RESULT_LABELS: Record<AdvancedTurnoverEditorResult, string> = {
  drop: 'Drop',
  'fifty-fifty': '50/50',
  throwaway: 'Throwaway',
  block: 'Block',
  pressure: 'Pressure',
  stall: 'Stall',
};

const THROW_TYPE_OPTIONS = [undefined, ...THROW_TYPES] as const;

type ActiveField = 'result' | 'thrower' | 'role' | 'classification' | null;

function getResultLabel(
  result: AdvancedTurnoverEditorResult,
  isFocusSideTurnover: boolean,
): string {
  if (isFocusSideTurnover && result === 'block') return 'Opp Block';
  if (isFocusSideTurnover && result === 'pressure') return 'Opp Pressure';
  return RESULT_LABELS[result];
}

function getParticipantName(participants: Participant[], participantId: string | null): string {
  if (participantId == null) return 'Unknown';
  return participants.find((participant) => participant.id === participantId)?.name ?? 'Unknown';
}

function getThrowTypeLabel(type: ThrowType | undefined): string {
  if (type == null) return 'None';
  return type === 'huck' ? 'Huck' : 'Backfield Reset';
}

function getApplicableRoleId(
  result: AdvancedTurnoverEditorResult,
  receiverId: string | null,
  defenderId: string | null,
): string | null {
  if (result === 'drop' || result === 'fifty-fifty') return receiverId;
  if (result === 'block' || result === 'pressure' || result === 'stall') return defenderId;
  return null;
}

function canUseUntrackedRole(
  result: AdvancedTurnoverEditorResult,
  context: AdvancedTurnoverCorrectionContext,
): boolean {
  if (result === 'throwaway' || result === 'pressure') return false;

  if (result === 'drop' || result === 'fifty-fifty') {
    return context.receiver.currentRef?.refType === 'untracked' || !context.receiver.isFullRoster;
  }

  if (result === 'block' || result === 'stall') {
    return context.defender.currentRef?.refType === 'untracked' || !context.defender.isFullRoster;
  }

  return false;
}

export function AdvancedTurnoverCorrectionModal({
  context,
  focusSideId,
  onClose,
  onSave,
}: AdvancedTurnoverCorrectionModalProps) {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const [selectedResult, setSelectedResult] = useState<AdvancedTurnoverEditorResult>(
    context.currentResult,
  );
  const [selectedThrowerId, setSelectedThrowerId] = useState<string | null>(
    context.thrower.currentParticipantId,
  );
  const [selectedReceiverId, setSelectedReceiverId] = useState<string | null>(
    context.receiver.currentParticipantId,
  );
  const [selectedDefenderId, setSelectedDefenderId] = useState<string | null>(
    context.defender.currentParticipantId,
  );
  const [selectedThrowType, setSelectedThrowType] = useState<ThrowType | undefined>(
    context.currentThrowType,
  );
  const [activeField, setActiveField] = useState<ActiveField>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const selectedThrowTypes = getEligibleThrowTypes(
    selectedResult === 'fifty-fifty' ? 'drop' : selectedResult,
  );
  const effectiveThrowType =
    selectedThrowType != null && selectedThrowTypes.includes(selectedThrowType)
      ? selectedThrowType
      : undefined;
  const currentRoleId = getApplicableRoleId(
    context.currentResult,
    context.receiver.currentParticipantId,
    context.defender.currentParticipantId,
  );
  const selectedRoleId = getApplicableRoleId(
    selectedResult,
    selectedReceiverId,
    selectedDefenderId,
  );
  const canUseSelectedUntrackedRole = canUseUntrackedRole(selectedResult, context);
  const hasRoleConfiguration =
    selectedResult === 'throwaway' || selectedRoleId != null || canUseSelectedUntrackedRole;
  const resultChanged = selectedResult !== context.currentResult;
  const throwerChanged = selectedThrowerId !== context.thrower.currentParticipantId;
  const roleChanged = selectedRoleId !== currentRoleId;
  const throwTypeChanged = effectiveThrowType !== context.currentThrowType;
  const canSave =
    !isSaving &&
    hasRoleConfiguration &&
    (resultChanged || throwerChanged || roleChanged || throwTypeChanged);
  const selectedThrowerName = getParticipantName(
    context.thrower.eligibleParticipants,
    selectedThrowerId,
  );
  const selectedReceiverName = getParticipantName(
    context.receiver.eligibleParticipants,
    selectedReceiverId,
  );
  const selectedDefenderName = getParticipantName(
    context.defender.eligibleParticipants,
    selectedDefenderId,
  );
  const currentThrowerName = getParticipantName(
    context.thrower.eligibleParticipants,
    context.thrower.currentParticipantId,
  );
  const hasLinkedHolderPreview =
    context.holderTouch != null &&
    selectedThrowerId != null &&
    selectedThrowerId !== context.thrower.currentParticipantId;
  const isThrowerReadOnly =
    !context.thrower.isFullRoster && context.thrower.currentRef?.refType !== 'participant';
  const hasReceiverRole = selectedResult === 'drop' || selectedResult === 'fifty-fifty';
  const hasDefenderRole =
    selectedResult === 'block' || selectedResult === 'pressure' || selectedResult === 'stall';
  const roleLabel = hasReceiverRole ? 'Receiver' : 'Defender';
  const selectedRoleName = hasReceiverRole ? selectedReceiverName : selectedDefenderName;
  const isRoleReadOnly = hasReceiverRole
    ? !context.receiver.isFullRoster
    : !context.defender.isFullRoster;

  const toggleField = (field: Exclude<ActiveField, null>) => {
    setActiveField((current) => (current === field ? null : field));
    setSaveError(false);
  };

  const handleClose = () => {
    if (!isSaving) onClose();
  };

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    setSaveError(false);
    const input: CorrectAdvancedTurnoverInput = {
      pointId: context.point.id,
      possessionId: context.possession.id,
      actionId: context.action.id,
      result: selectedResult,
      throwerParticipantId: selectedThrowerId ?? undefined,
      receiverParticipantId:
        selectedResult === 'drop' || selectedResult === 'fifty-fifty'
          ? selectedReceiverId
          : undefined,
      defenderParticipantId:
        selectedResult === 'block' || selectedResult === 'pressure' || selectedResult === 'stall'
          ? selectedDefenderId
          : undefined,
      throwType: effectiveThrowType,
    };
    try {
      await onSave(input);
      onClose();
    } catch {
      setSaveError(true);
      setIsSaving(false);
    }
  };

  const visibleResults = ADVANCED_TURNOVER_EDITOR_RESULTS.filter((result) =>
    context.availableResults.includes(result),
  );
  const isFocusSideTurnover = context.action.sideId === focusSideId;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      supportedOrientations={['portrait', 'landscape']}
      onRequestClose={handleClose}>
      <BottomSheet
        testID="advanced-turnover-editor"
        onDismiss={handleClose}
        sheetStyle={[styles.sheet, { backgroundColor: palette.modalBg }]}
        overlayColor={palette.overlayDark88}>
        <View style={styles.content}>
          <View style={[styles.handle, { backgroundColor: palette.overlay20 }]} />
          <View style={styles.header}>
            <ThemedText style={[styles.title, { color: palette.modalText }]}>
              Edit Turnover
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close turnover editor"
              onPress={handleClose}
              hitSlop={12}
              disabled={isSaving}>
              <MaterialCommunityIcons
                name="close"
                size={scaleBySizeClass(22, sizeClass)}
                color={palette.modalTextMuted}
              />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            <AdvancedTurnoverCorrectionField
              testID="advanced-turnover-field-result"
              label="Result"
              value={getResultLabel(selectedResult, isFocusSideTurnover)}
              expanded={activeField === 'result'}
              disabled={isSaving}
              onPress={() => toggleField('result')}>
              <View style={styles.resultGrid}>
                {visibleResults.map((result) => {
                  const selected = selectedResult === result;
                  return (
                    <Pressable
                      key={result}
                      testID={`advanced-turnover-result-${result}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => {
                        setSelectedResult(result);
                        setActiveField(null);
                        setSaveError(false);
                      }}
                      disabled={isSaving}
                      style={({ pressed }) => [
                        styles.resultButton,
                        {
                          backgroundColor: selected ? palette.accent : palette.overlay12,
                          borderColor: selected ? palette.accent : palette.overlay20,
                        },
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText
                        style={[
                          styles.resultButtonText,
                          { color: selected ? palette.textOnAccent : palette.modalText },
                        ]}>
                        {getResultLabel(result, isFocusSideTurnover)}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </AdvancedTurnoverCorrectionField>

            <AdvancedTurnoverCorrectionField
              testID="advanced-turnover-field-thrower"
              label="Thrower"
              value={isThrowerReadOnly ? 'Untracked' : selectedThrowerName}
              expanded={activeField === 'thrower'}
              disabled={isSaving || isThrowerReadOnly}
              onPress={() => toggleField('thrower')}>
              <AdvancedTurnoverRolePicker
                originalParticipantId={context.thrower.currentParticipantId}
                selectedParticipantId={selectedThrowerId}
                participants={context.thrower.eligibleParticipants}
                isSaving={isSaving}
                onSelect={(participantId) => {
                  setSelectedThrowerId(participantId);
                  setActiveField(null);
                  setSaveError(false);
                }}
              />
            </AdvancedTurnoverCorrectionField>

            {(hasReceiverRole || hasDefenderRole) && (
              <AdvancedTurnoverCorrectionField
                testID="advanced-turnover-field-role"
                label={roleLabel}
                value={isRoleReadOnly ? 'Untracked' : selectedRoleName}
                expanded={activeField === 'role'}
                disabled={isSaving || isRoleReadOnly}
                onPress={() => toggleField('role')}>
                <AdvancedTurnoverRolePicker
                  originalParticipantId={
                    hasReceiverRole
                      ? context.receiver.currentParticipantId
                      : context.defender.currentParticipantId
                  }
                  selectedParticipantId={hasReceiverRole ? selectedReceiverId : selectedDefenderId}
                  participants={
                    hasReceiverRole
                      ? context.receiver.eligibleParticipants
                      : context.defender.eligibleParticipants
                  }
                  isSaving={isSaving}
                  onSelect={(participantId) => {
                    if (hasReceiverRole) {
                      setSelectedReceiverId(participantId);
                    } else {
                      setSelectedDefenderId(participantId);
                    }
                    setActiveField(null);
                    setSaveError(false);
                  }}
                />
              </AdvancedTurnoverCorrectionField>
            )}

            {context.canClassify && (
              <AdvancedTurnoverCorrectionField
                testID="advanced-turnover-field-classification"
                label="Classification"
                value={getThrowTypeLabel(effectiveThrowType)}
                expanded={activeField === 'classification'}
                disabled={isSaving}
                onPress={() => toggleField('classification')}>
                <View style={styles.resultGrid}>
                  {THROW_TYPE_OPTIONS.map((type) => {
                    const isEligible = type == null || selectedThrowTypes.includes(type);
                    if (!isEligible) return null;
                    const selected = effectiveThrowType === type;
                    const label = getThrowTypeLabel(type);
                    return (
                      <Pressable
                        key={label}
                        testID={`advanced-turnover-type-${type ?? 'none'}`}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => {
                          setSelectedThrowType(type);
                          setActiveField(null);
                          setSaveError(false);
                        }}
                        disabled={isSaving}
                        style={({ pressed }) => [
                          styles.resultButton,
                          {
                            backgroundColor: selected ? palette.accent : palette.overlay12,
                            borderColor: selected ? palette.accent : palette.overlay20,
                          },
                          pressed && styles.pressed,
                        ]}>
                        <ThemedText
                          style={[
                            styles.resultButtonText,
                            { color: selected ? palette.textOnAccent : palette.modalText },
                          ]}>
                          {label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </AdvancedTurnoverCorrectionField>
            )}

            {selectedResult === 'stall' && selectedThrowType != null && (
              <ThemedText style={[styles.warningText, { color: palette.warning }]}>
                {selectedThrowType === 'huck' ? 'Huck' : 'Backfield Reset'} will be removed because
                stalls are not throws.
              </ThemedText>
            )}

            {hasLinkedHolderPreview && (
              <View style={[styles.preview, { backgroundColor: palette.accentOverlay10 }]}>
                <ThemedText style={[styles.previewTitle, { color: palette.accent }]}>
                  LINKED CHANGE
                </ThemedText>
                <ThemedText style={[styles.previewText, { color: palette.modalText }]}>
                  Changing the thrower to {selectedThrowerName} will also change the preceding
                  pickup or completion receiver from {currentThrowerName}.
                </ThemedText>
              </View>
            )}

            {saveError && (
              <ThemedText style={[styles.errorText, { color: palette.danger }]}>
                Could not save the turnover correction. Try again.
              </ThemedText>
            )}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              testID="advanced-turnover-cancel"
              accessibilityRole="button"
              onPress={handleClose}
              disabled={isSaving}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: 'transparent', borderColor: palette.overlay20 },
                pressed && styles.pressed,
              ]}>
              <ThemedText style={[styles.buttonText, { color: palette.modalText }]}>
                Cancel
              </ThemedText>
            </Pressable>
            <Pressable
              testID="advanced-turnover-save"
              accessibilityRole="button"
              accessibilityLabel="Save turnover correction"
              onPress={handleSave}
              disabled={!canSave}
              style={({ pressed }) => [
                styles.button,
                styles.saveButton,
                { backgroundColor: palette.accent, borderColor: palette.accent },
                pressed && styles.pressed,
                !canSave && styles.disabled,
              ]}>
              {isSaving ? (
                <ActivityIndicator size="small" color={palette.textOnAccent} />
              ) : (
                <ThemedText style={[styles.buttonText, { color: palette.textOnAccent }]}>
                  Save
                </ThemedText>
              )}
            </Pressable>
          </View>
        </View>
      </BottomSheet>
    </Modal>
  );
}

function createStyles(sizeClass: SizeClass) {
  return StyleSheet.create({
    sheet: { maxHeight: '94%' },
    content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, gap: 14 },
    handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 999 },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 16,
    },
    title: { flex: 1, fontSize: scaleBySizeClass(20, sizeClass), fontFamily: Fonts.bold },
    scroll: { maxHeight: scaleBySizeClass(560, sizeClass) },
    scrollContent: { gap: 10, paddingBottom: 4 },
    resultGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    resultButton: {
      minHeight: 44,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    resultButtonText: { fontSize: scaleBySizeClass(13, sizeClass), fontFamily: Fonts.semiBold },
    warningText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      lineHeight: scaleBySizeClass(17, sizeClass),
    },
    preview: { padding: 12, borderRadius: 10, gap: 5 },
    previewTitle: {
      fontSize: scaleBySizeClass(10, sizeClass),
      fontFamily: Fonts.bold,
      letterSpacing: 0.8,
    },
    previewText: {
      fontSize: scaleBySizeClass(12, sizeClass),
      lineHeight: scaleBySizeClass(17, sizeClass),
    },
    errorText: { fontSize: scaleBySizeClass(12, sizeClass), fontFamily: Fonts.semiBold },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
    button: {
      minHeight: 48,
      paddingHorizontal: 18,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveButton: { minWidth: scaleBySizeClass(132, sizeClass) },
    pressed: { opacity: 0.8 },
    disabled: { opacity: 0.45 },
    buttonText: { fontSize: scaleBySizeClass(14, sizeClass), fontFamily: Fonts.bold },
  });
}
