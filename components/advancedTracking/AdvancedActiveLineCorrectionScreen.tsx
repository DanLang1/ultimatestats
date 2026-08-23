import { useState } from 'react';

import { TrackerLineContinuationMenu } from '@/components/advancedTracking/TrackerLineContinuationMenu';
import { TrackerLineScreen } from '@/components/advancedTracking/TrackerLineScreen';
import { useAlert } from '@/components/ui/AlertProvider';
import {
  type AdvancedLineCorrectionDraft,
  type AdvancedLineCorrectionRestriction,
  getAdvancedLineCorrectionRestrictions,
  reconcileAdvancedLineCorrectionDraft,
  type CorrectAdvancedPointActiveLinesInput,
} from '@/lib/advancedTracking/advancedPointLineCorrectionUtils';
import { getParticipantName } from '@/lib/advancedTracking/participantUtils';
import { getFullyTrackedSideIds } from '@/lib/advancedTracking/trackingModeUtils';
import {
  getEffectiveLineParticipantIds,
  getParticipantIdsUsedBySide,
  getScrimmageLineSelectionGroups,
  haveSameParticipantIds,
} from '@/lib/advancedTracking/trackingUtils';
import type { AdvancedTrackedGame, Participant, TrackedPoint } from '@/lib/advancedTracking/types';
import { getSequenceNumber } from '@/lib/genderRatioUtils';

type CorrectionBoundary = 'current' | 'final';
type LineCorrectionRestriction =
  | AdvancedLineCorrectionRestriction
  | { reason: 'selected-other-side'; sideId: string };

interface AdvancedActiveLineCorrectionScreenProps {
  game: AdvancedTrackedGame;
  point: TrackedPoint;
  availableParticipants: Participant[];
  preferredFirstSideId: string;
  boundary: CorrectionBoundary;
  destinationLabel: string;
  onBack: () => void;
  onSave: (input: CorrectAdvancedPointActiveLinesInput) => Promise<void>;
}

function getOrderedTrackedSideIds(
  game: AdvancedTrackedGame,
  preferredFirstSideId: string,
): string[] {
  const trackedSideIds = getFullyTrackedSideIds(game);
  if (!trackedSideIds.includes(preferredFirstSideId)) return trackedSideIds;
  return [
    preferredFirstSideId,
    ...trackedSideIds.filter((sideId) => sideId !== preferredFirstSideId),
  ];
}

export function AdvancedActiveLineCorrectionScreen({
  game,
  point,
  availableParticipants,
  preferredFirstSideId,
  boundary,
  destinationLabel,
  onBack,
  onSave,
}: AdvancedActiveLineCorrectionScreenProps) {
  const { showAlert } = useAlert();
  const [sideIndex, setSideIndex] = useState(0);
  const [draftLinesBySide, setDraftLinesBySide] = useState<AdvancedLineCorrectionDraft>({});
  const [showContinuationMenu, setShowContinuationMenu] = useState(false);
  const selectedSideIds = getOrderedTrackedSideIds(game, preferredFirstSideId);
  const sideId = selectedSideIds[sideIndex];
  const tracksBothSides = selectedSideIds.length === 2;
  const sideLabel = game.sides.find((side) => side.id === sideId)?.label ?? 'Side';
  const otherSideId = selectedSideIds.find((candidate) => candidate !== sideId) ?? null;
  const otherSideLabel = game.sides.find((side) => side.id === otherSideId)?.label ?? 'other side';
  const pointNumber = game.points.findIndex((candidate) => candidate.id === point.id) + 1;
  const sequenceNumber = point.genderRatio != null ? getSequenceNumber(pointNumber) : undefined;
  const activeLinesBySide = Object.fromEntries(
    selectedSideIds.map((selectedSideId) => [
      selectedSideId,
      getEffectiveLineParticipantIds(point, selectedSideId),
    ]),
  );
  const selectedIds = draftLinesBySide[sideId] ?? activeLinesBySide[sideId];

  const activeParticipantIds = new Set(Object.values(activeLinesBySide).flat());
  const availableParticipantIds = new Set(
    availableParticipants.map((participant) => participant.id),
  );
  const eligibleParticipants = game.participants.filter(
    (participant) =>
      availableParticipantIds.has(participant.id) || activeParticipantIds.has(participant.id),
  );
  const { defaultParticipants, otherSideLabels: scrimmageSideLabels } =
    getScrimmageLineSelectionGroups(game, sideId, eligibleParticipants);
  const playerStatusLabels = new Map(scrimmageSideLabels);
  for (const side of game.sides) {
    if (side.id === sideId) continue;
    for (const participantId of getParticipantIdsUsedBySide(point, side.id)) {
      playerStatusLabels.set(participantId, side.label);
    }
  }

  const restrictions = new Map<string, LineCorrectionRestriction>(
    getAdvancedLineCorrectionRestrictions(game, point, sideId),
  );
  for (const confirmedSideId of selectedSideIds.slice(0, sideIndex)) {
    const confirmedIds = draftLinesBySide[confirmedSideId] ?? activeLinesBySide[confirmedSideId];
    for (const participantId of confirmedIds) {
      restrictions.set(participantId, {
        reason: 'selected-other-side',
        sideId: confirmedSideId,
      });
    }
  }

  const lockedParticipantIds = selectedIds.filter((participantId) => {
    const reason = restrictions.get(participantId)?.reason;
    return reason === 'recorded-action' || reason === 'recorded-injury';
  });
  const restrictedParticipantIds = [...restrictions.keys()];

  const getSelectedIds = (candidateSideId: string, linesBySide: AdvancedLineCorrectionDraft) =>
    linesBySide[candidateSideId] ?? activeLinesBySide[candidateSideId];

  const hasChanges = (linesBySide: AdvancedLineCorrectionDraft) =>
    selectedSideIds.some(
      (candidateSideId) =>
        !haveSameParticipantIds(
          getSelectedIds(candidateSideId, linesBySide),
          activeLinesBySide[candidateSideId],
        ),
    );

  const saveChanges = async (linesBySide: AdvancedLineCorrectionDraft) => {
    if (!hasChanges(linesBySide)) {
      onBack();
      return;
    }

    try {
      await onSave({
        pointId: point.id,
        activeLines: selectedSideIds.map((selectedSideId) => ({
          sideId: selectedSideId,
          participantIds: getSelectedIds(selectedSideId, linesBySide),
        })),
      });
      onBack();
    } catch (error) {
      showAlert({
        title: 'Unable to correct lineup',
        message: error instanceof Error ? error.message : 'The corrected active lines are invalid.',
      });
    }
  };

  const handleConfirm = async (nextIds: string[]) => {
    const nextDraftLines = reconcileAdvancedLineCorrectionDraft({
      activeLinesBySide,
      draftLinesBySide,
      selectedSideId: sideId,
      selectedParticipantIds: nextIds,
    });
    setDraftLinesBySide(nextDraftLines);

    if (tracksBothSides && sideIndex === 0) {
      const otherSelectedIds = getSelectedIds(selectedSideIds[1], nextDraftLines);
      const expectedOtherLineSize = activeLinesBySide[selectedSideIds[1]].length;
      if (
        haveSameParticipantIds(nextIds, activeLinesBySide[sideId]) ||
        otherSelectedIds.length !== expectedOtherLineSize
      ) {
        setSideIndex(1);
        return;
      }
      setShowContinuationMenu(true);
      return;
    }

    await saveChanges(nextDraftLines);
  };

  const handleBack = () => {
    if (sideIndex > 0) {
      setSideIndex(sideIndex - 1);
      return;
    }
    onBack();
  };

  const handleRestrictedParticipantPress = (participantId: string) => {
    const participantName = getParticipantName(game, participantId);
    const restriction = restrictions.get(participantId);
    let message = `${participantName} is unavailable for this lineup correction.`;
    if (restriction?.reason === 'recorded-action') {
      message = `${participantName} recorded an action this point and cannot be removed or moved.`;
    } else if (restriction?.reason === 'recorded-injury') {
      message = `${participantName}'s status is preserved by a recorded injury substitution.`;
    } else if (restriction?.reason === 'opposing-history') {
      const historicalSide = game.sides.find((side) => side.id === restriction.sideId);
      message = `${participantName} has recorded history for ${historicalSide?.label ?? 'the other side'} and cannot be moved.`;
    } else if (restriction?.reason === 'selected-other-side') {
      const selectedSide = game.sides.find((side) => side.id === restriction.sideId);
      message = `${participantName} is already selected for ${selectedSide?.label ?? 'the other side'}.`;
    }
    showAlert({ title: 'Player locked', message });
  };

  const firstSideHasChanges = !haveSameParticipantIds(
    draftLinesBySide[selectedSideIds[0]] ?? activeLinesBySide[selectedSideIds[0]],
    activeLinesBySide[selectedSideIds[0]],
  );
  const requireChanges = !tracksBothSides || (sideIndex > 0 && !firstSideHasChanges);
  const boundaryLabel = boundary === 'current' ? 'Current' : 'Final';
  const title = tracksBothSides
    ? `Correct ${boundaryLabel} · ${sideLabel}`
    : `Correct ${boundaryLabel} Lineup`;

  return (
    <>
      <TrackerLineScreen
        key={sideId}
        participants={defaultParticipants}
        allParticipants={game.gameType === 'scrimmage' ? eligibleParticipants : undefined}
        rosterParticipants={game.participants}
        playerStatusLabels={playerStatusLabels}
        initialSelectedIds={selectedIds}
        title={title}
        confirmLabel={tracksBothSides && sideIndex === 0 ? 'CONTINUE' : 'SAVE LINE'}
        expectedRatio={point.genderRatio}
        sequenceNumber={sequenceNumber}
        requireChanges={requireChanges}
        participantRestrictions={{
          lockedIds: lockedParticipantIds,
          restrictedIds: restrictedParticipantIds,
          onPress: handleRestrictedParticipantPress,
        }}
        onBack={handleBack}
        onConfirm={handleConfirm}
      />
      <TrackerLineContinuationMenu
        visible={showContinuationMenu}
        kind="line-correction"
        destinationLabel={destinationLabel}
        currentSideLabel={sideLabel}
        otherSideLabel={otherSideLabel}
        onClose={() => setShowContinuationMenu(false)}
        onFinish={() => {
          setShowContinuationMenu(false);
          void saveChanges(draftLinesBySide);
        }}
        onEditOtherSide={() => {
          setShowContinuationMenu(false);
          setSideIndex(1);
        }}
      />
    </>
  );
}
