import type {
  AdvancedTrackedGame,
  Participant,
  PlayerRef,
  PointLine,
  PullResult,
} from '@/lib/advancedTracking/types';
import type { GenderRatio } from '@/lib/genderRatioUtils';
import type { RecordPullInput } from '@/store/advancedTracking/trackingStore.types';

export const PULL_RESULTS: { value: PullResult; label: string }[] = [
  { value: 'inbound', label: 'INBOUNDS PULL' },
  { value: 'ob', label: 'OB PULL' },
  { value: 'roller', label: 'ROLLER PULL' },
  { value: 'dropped', label: 'DROPPED PULL' },
];

export function formatHangtime(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

export function getPullingSideTitle(isOurPull: boolean, sideLabel?: string): string {
  if (sideLabel) return `${sideLabel.toUpperCase()} IS PULLING`;
  if (isOurPull) return 'WE ARE PULLING';
  return 'THEY ARE PULLING';
}

export function getFlowParticipants(
  game: AdvancedTrackedGame,
  participantIds: string[],
): Participant[] {
  return game.participants.filter((participant) => participantIds.includes(participant.id));
}

export function getPullerName(
  participants: Participant[],
  selectedPullerId: string | null | undefined,
): string | null {
  if (selectedPullerId === undefined) return null;
  if (selectedPullerId === null) return 'Unknown';
  const participant = participants.find((candidate) => candidate.id === selectedPullerId);
  return participant?.name ?? null;
}

function getPullerRef(
  selectedPullerId: string | null | undefined,
  isPullerTracked: boolean,
): PlayerRef {
  if (selectedPullerId != null) {
    return { refType: 'participant', participantId: selectedPullerId };
  }
  if (isPullerTracked) {
    return { refType: 'unknown' };
  }
  return { refType: 'untracked' };
}

export function buildRecordPullInput(params: {
  lines: PointLine[];
  isPullerTracked: boolean;
  selectedPullerId: string | null | undefined;
  hangTimeMs: number;
  result: PullResult;
  receiverId?: string | null;
  genderRatio?: GenderRatio;
}): RecordPullInput {
  const { lines, isPullerTracked, selectedPullerId, hangTimeMs, result, receiverId, genderRatio } =
    params;

  const recordPullInput: RecordPullInput = {
    lines,
    puller: getPullerRef(selectedPullerId, isPullerTracked),
    result,
    genderRatio,
  };

  if (hangTimeMs > 0) {
    recordPullInput.hangTimeMs = hangTimeMs;
  }

  if (receiverId !== undefined) {
    recordPullInput.receiver =
      receiverId == null
        ? { refType: 'unknown' }
        : { refType: 'participant', participantId: receiverId };
  }

  return recordPullInput;
}
