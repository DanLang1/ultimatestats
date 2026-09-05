import { Redirect, router, Stack } from 'expo-router';
import { useState } from 'react';

import { TrackerLineContinuationMenu } from '@/components/advancedTracking/TrackerLineContinuationMenu';
import { TrackerLineScreen } from '@/components/advancedTracking/TrackerLineScreen';
import { useAlert } from '@/components/ui/AlertProvider';
import { useLiveRosterParticipants } from '@/hooks/advancedTracking/useLiveRosterParticipants';
import {
  getActiveSideId,
  getActiveStoppage,
  getEffectiveLineParticipantIds,
  getLineParticipantIdsBeforeSub,
} from '@/lib/advancedTracking/trackingDisplayHelpers';
import { areBothSidesFullyTracked } from '@/lib/advancedTracking/trackingModeUtils';
import {
  getCurrentPoint,
  getCurrentPossession,
  getOtherSideId,
  getParticipantIdsUsedBySide,
  getScrimmageLineSelectionGroups,
  hasInjurySubChanges,
  haveSameParticipantIds,
} from '@/lib/advancedTracking/trackingUtils';
import {
  persistCurrentLiveGame,
  useAdvancedTrackingStore,
} from '@/store/advancedTracking/trackingStore';
import type { InjurySubChange } from '@/store/advancedTracking/trackingStore.types';

export default function TrackerInjurySubScreen() {
  const {
    currentGameId,
    currentGame: game,
    recordInjurySubs,
    updateInjurySubs,
  } = useAdvancedTrackingStore();
  const { showAlert } = useAlert();
  const [sideIndex, setSideIndex] = useState(0);
  const [draftLinesBySide, setDraftLinesBySide] = useState<Record<string, string[]>>({});
  const [showContinuationMenu, setShowContinuationMenu] = useState(false);
  const participants = useLiveRosterParticipants(game?.participants ?? []);
  const point = game ? getCurrentPoint(game) : null;
  const possession = game ? getCurrentPossession(game) : null;
  const existingStoppage = getActiveStoppage(possession);
  const isEdit = existingStoppage?.reason === 'injury';

  if (!currentGameId || !game || !point) {
    return <Redirect href="/Dashboard" />;
  }

  const tracksBothSides = areBothSidesFullyTracked(game);
  const isScrimmage = game.gameType === 'scrimmage';
  const firstSideId = tracksBothSides ? getActiveSideId(possession, game) : game.focusSideId;
  const selectedSideIds = tracksBothSides
    ? [firstSideId, getOtherSideId(game, firstSideId)]
    : [firstSideId];
  const sideId = selectedSideIds[sideIndex];
  const sideLabel = game.sides.find((side) => side.id === sideId)?.label ?? 'Side';
  const otherSideId = tracksBothSides ? selectedSideIds[1] : null;
  const otherSideLabel = game.sides.find((side) => side.id === otherSideId)?.label ?? 'other side';
  const effectiveLine = draftLinesBySide[sideId] ?? getEffectiveLineParticipantIds(point, sideId);
  const otherSide = game.sides.find((side) => side.id !== sideId);
  const otherSideParticipantIds =
    otherSide == null ? [] : getParticipantIdsUsedBySide(point, otherSide.id);
  const unavailableParticipantIds = new Set([
    ...otherSideParticipantIds,
    ...(otherSide == null ? [] : (draftLinesBySide[otherSide.id] ?? [])),
  ]);
  const eligibleParticipants = tracksBothSides
    ? participants.filter((participant) => !unavailableParticipantIds.has(participant.id))
    : participants;
  const { defaultParticipants, otherSideLabels } = getScrimmageLineSelectionGroups(
    game,
    sideId,
    eligibleParticipants,
  );

  const getBaselineIds = (candidateSideId: string) => {
    if (!isEdit || existingStoppage == null) {
      return getEffectiveLineParticipantIds(point, candidateSideId);
    }
    return getLineParticipantIdsBeforeSub(point, candidateSideId, existingStoppage.id);
  };

  const buildChanges = (linesBySide: Record<string, string[]>): InjurySubChange[] =>
    game.sides.map((side) => {
      const baselineIds = getBaselineIds(side.id);
      const selectedIds = linesBySide[side.id] ?? getEffectiveLineParticipantIds(point, side.id);
      return {
        sideId: side.id,
        inIds: selectedIds.filter((id) => !baselineIds.includes(id)),
        outIds: baselineIds.filter((id) => !selectedIds.includes(id)),
      };
    });

  const saveChanges = async (linesBySide: Record<string, string[]>) => {
    const changes = buildChanges(linesBySide);
    const changedSides = changes.filter(hasInjurySubChanges);

    try {
      if (isEdit && existingStoppage != null) {
        updateInjurySubs({ stoppageActionId: existingStoppage.id, changes });
      } else {
        recordInjurySubs({
          sideId: changedSides.length === 1 ? changedSides[0].sideId : undefined,
          changes,
        });
      }
      await persistCurrentLiveGame();
      router.back();
    } catch (error) {
      showAlert({
        title: 'Unable to save substitution',
        message: error instanceof Error ? error.message : 'The line changes are invalid.',
      });
    }
  };

  const handleConfirm = async (nextIds: string[]) => {
    const nextDraftLines = { ...draftLinesBySide, [sideId]: nextIds };
    setDraftLinesBySide(nextDraftLines);

    if (tracksBothSides && sideIndex === 0) {
      const lineChanged = !haveSameParticipantIds(nextIds, getBaselineIds(sideId));
      if (!lineChanged) {
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
    router.back();
  };

  const firstSideLine =
    draftLinesBySide[firstSideId] ?? getEffectiveLineParticipantIds(point, firstSideId);
  const firstSideHasChanges = !haveSameParticipantIds(firstSideLine, getBaselineIds(firstSideId));
  const requireChanges = !tracksBothSides || (sideIndex > 0 && !isEdit && !firstSideHasChanges);
  const confirmLabel = tracksBothSides && sideIndex === 0 ? 'CONTINUE' : 'CONFIRM SUB';

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <TrackerLineScreen
        key={sideId}
        participants={defaultParticipants}
        allParticipants={isScrimmage ? eligibleParticipants : undefined}
        rosterParticipants={participants}
        playerStatusLabels={otherSideLabels}
        initialSelectedIds={effectiveLine}
        title={tracksBothSides ? `Injury Sub · ${sideLabel}` : 'Injury Sub'}
        confirmLabel={confirmLabel}
        requireChanges={requireChanges}
        onBack={handleBack}
        onConfirm={handleConfirm}
      />
      <TrackerLineContinuationMenu
        visible={showContinuationMenu}
        kind="injury-sub"
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
