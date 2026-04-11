import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TrackerActionBar } from '@/components/advanced/TrackerActionBar';
import { TrackerPlayerGrid } from '@/components/advanced/TrackerPlayerGrid';
import { TrackerScoreBar } from '@/components/advanced/TrackerScoreBar';
import { TrackerStatusBar } from '@/components/advanced/TrackerStatusBar';
import { TurnoverSheet } from '@/components/advanced/TurnoverSheet';
import { TurnoverSheetState } from '@/components/advanced/types';
import { useTheme } from '@/context/ThemeContext';
import { SizeClass, useLayout } from '@/hooks/useLayout';
import {
  getActiveSideId,
  getDiscHolderId,
  getPassChainText,
  getSideTimeoutsUsed,
} from '@/lib/advancedTracking/trackingDisplayHelpers';
import {
  getCurrentPoint,
  getCurrentPossession,
  getGameScore,
  hasPointEnded,
  isPossessionOver,
} from '@/lib/advancedTracking/trackingUtils';
import { ThrowResult } from '@/lib/advancedTracking/types';
import { useAdvancedTrackingStore } from '@/store/advancedTrackingStore';
import { router, Stack } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FOCUS_SIDE_ID, OPP_SIDE_ID } from './PreGameConfirm';

const MAX_TIMEOUTS = 2;
export default function AdvancedTrackerScreen() {
  const { palette } = useTheme();
  const { sizeClass } = useLayout();
  const styles = createStyles(sizeClass);
  const insets = useSafeAreaInsets();

  const { currentGameId, savedGames, recordPull, recordThrow, recordPickup, undoLastOperation } =
    useAdvancedTrackingStore();

  const game = savedGames.find((g) => g.id === currentGameId);
  const [goalPending, setGoalPending] = useState(false);
  const [turnoverSheet, setTurnoverSheet] = useState<TurnoverSheetState>(null);

  if (!game) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.content, { justifyContent: 'center', alignItems: 'center' }]}>
          <ThemedText style={{ color: palette.textMuted }}>
            No active game. Go back and set one up.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  const score = getGameScore(game);
  const focusScore = score[game.focusSideId] ?? 0;
  const oppSide = game.sides.find((s) => s.id !== game.focusSideId);
  const oppScore = oppSide ? (score[oppSide.id] ?? 0) : 0;
  const focusSideName = game.sides.find((s) => s.id === game.focusSideId)?.label ?? 'Us';
  const oppSideName = oppSide?.label ?? 'Them';

  const focusTimeoutsUsed = getSideTimeoutsUsed(game, game.focusSideId);

  const point = getCurrentPoint(game);
  const pointIsOver = hasPointEnded(point);
  const possession = getCurrentPossession(game);
  const activeSideId = getActiveSideId(possession, game);
  const oppHasDisc = !pointIsOver && activeSideId !== game.focusSideId;

  const myLine = point?.lines.find((l) => l.sideId === game.focusSideId);
  const activeParticipants = game.participants.filter((p) => myLine?.participantIds.includes(p.id));

  const discHolderId = getDiscHolderId(possession, game.focusSideId);

  const handleStartNextPoint = () => {
    const lines = [{ sideId: FOCUS_SIDE_ID, participantIds: myLine?.participantIds ?? [] }];
    if (oppSide) {
      lines.push({ sideId: oppSide.id, participantIds: [] });
    }
    recordPull({
      lines,
      puller: { refType: 'untracked' },
      result: 'landed_in_bounds',
    });
  };

  const handlePlayerTap = (participantId: string) => {
    if (pointIsOver) return;
    if (oppHasDisc) {
      // "We got it back" — bridge opp possession then record our pickup
      if (!possession || isPossessionOver(possession)) {
        // Opp hasn't picked up yet after our turnover
        recordPickup({ sideId: OPP_SIDE_ID, player: { refType: 'untracked' } });
        recordThrow({ thrower: { refType: 'untracked' }, result: 'throwaway' });
      } else {
        // Opp has active possession
        recordThrow({ thrower: { refType: 'untracked' }, result: 'throwaway' });
      }
      recordPickup({ sideId: FOCUS_SIDE_ID, player: { refType: 'participant', participantId } });
      return;
    }

    if (!possession || isPossessionOver(possession)) {
      recordPickup({ sideId: FOCUS_SIDE_ID, player: { refType: 'participant', participantId } });
      return;
    }
    if (discHolderId === null) {
      recordPickup({ sideId: FOCUS_SIDE_ID, player: { refType: 'participant', participantId } });
      return;
    }
    if (discHolderId === participantId) return;

    recordThrow({
      thrower: { refType: 'participant', participantId: discHolderId },
      toPlayer: { refType: 'participant', participantId },
      result: goalPending ? 'goal' : 'complete',
    });
    if (goalPending) setGoalPending(false);
  };

  const handleTurnoverRecord = (args: {
    result: ThrowResult;
    toParticipantId?: string;
    splitAttribution?: boolean;
  }) => {
    if (!discHolderId) return;
    recordThrow({
      thrower: { refType: 'participant', participantId: discHolderId },
      toPlayer: args.toParticipantId
        ? { refType: 'participant', participantId: args.toParticipantId }
        : undefined,
      result: args.result,
      splitAttribution: args.splitAttribution,
    });
    setTurnoverSheet(null);
  };

  const handleOppTurnover = () => {
    if (!possession || isPossessionOver(possession)) {
      recordPickup({ sideId: OPP_SIDE_ID, player: { refType: 'untracked' } });
    }
    recordThrow({ thrower: { refType: 'untracked' }, result: 'throwaway' });
  };

  const handleOppScored = () => {
    if (!possession || isPossessionOver(possession)) {
      recordPickup({ sideId: OPP_SIDE_ID, player: { refType: 'untracked' } });
    }
    recordThrow({ thrower: { refType: 'untracked' }, result: 'goal' });
  };

  const passChainText = getPassChainText(oppHasDisc ? null : possession, game.participants);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <TrackerScoreBar
        focusSideName={focusSideName}
        focusScore={focusScore}
        focusTimeoutsUsed={focusTimeoutsUsed}
        maxTimeouts={MAX_TIMEOUTS}
        oppSideName={oppSideName}
        oppScore={oppScore}
        onHomePress={() => router.dismissTo('/Dashboard')}
        topInset={insets.top}
      />

      <TrackerPlayerGrid
        activeParticipants={activeParticipants}
        discHolderId={discHolderId}
        oppHasDisc={oppHasDisc}
        onPlayerTap={handlePlayerTap}
      />

      <TrackerStatusBar
        pointIsOver={pointIsOver}
        oppHasDisc={oppHasDisc}
        passChainText={passChainText}
      />

      <TrackerActionBar
        pointIsOver={pointIsOver}
        oppHasDisc={oppHasDisc}
        goalPending={goalPending}
        discHolderId={discHolderId}
        onStartNextPoint={handleStartNextPoint}
        onOppScored={handleOppScored}
        onOppTurnover={handleOppTurnover}
        onGoalPress={() => setGoalPending(!goalPending)}
        onTurnoverPress={() => discHolderId && setTurnoverSheet({ stage: 'type' })}
        onUndoLastOperation={undoLastOperation}
        bottomInset={insets.bottom}
      />

      <TurnoverSheet
        state={turnoverSheet}
        discHolderName={
          discHolderId ? (game.participants.find((p) => p.id === discHolderId)?.name ?? null) : null
        }
        activeParticipants={activeParticipants.filter((p) => p.id !== discHolderId)}
        onClose={() => setTurnoverSheet(null)}
        onSelectType={(resultType) => {
          if (resultType === 'drop' || resultType === 'fifty-fifty') {
            setTurnoverSheet({ stage: 'receiver', resultType });
          } else {
            const resultMap: Record<string, ThrowResult> = {
              throwaway: 'throwaway',
              block: 'block',
              interception: 'interception',
            };
            handleTurnoverRecord({ result: resultMap[resultType] });
          }
        }}
        onSelectReceiver={(participantId) => {
          if (!turnoverSheet || turnoverSheet.stage !== 'receiver') return;
          handleTurnoverRecord({
            result: 'drop',
            toParticipantId: participantId,
            splitAttribution: turnoverSheet.resultType === 'fifty-fifty',
          });
        }}
      />
    </ThemedView>
  );
}

// --- Styles ---

function createStyles(_sizeClass: SizeClass) {
  return StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1 },
  });
}
