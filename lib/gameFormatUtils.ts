import type { AdvancedTrackedGame } from './advancedTracking/types';
import { getScoreThroughPoint } from './advancedTracking/trackingUtils';
import type { GenderRatio } from './genderRatioUtils';
import { getActualHalftimeScore } from './halftimeUtils';
import type { GameEvent } from '@/store/gameStore.types';

export type FormatRow = {
  label: string;
  value: string;
  helperText?: string;
  onPress?: () => void;
  disabled?: boolean;
};

export type FormatSection = {
  title: string;
  rows: FormatRow[];
};

export function formatValue(value: number | undefined): string {
  return value == null ? 'Not set' : String(value);
}

export function formatTimeouts(
  count: number | undefined,
  floaterEnabled: boolean | undefined,
  useHalves: boolean,
): string {
  const timeoutCount = count ?? 0;
  const suffix = useHalves ? ' / half' : '';
  return floaterEnabled ? `${timeoutCount}${suffix} + floater` : `${timeoutCount}${suffix}`;
}

export function formatGenderRatio(enabled: boolean, firstPointRatio: GenderRatio | null): string {
  if (!enabled) return 'Off';
  if (firstPointRatio == null) return 'On';
  return firstPointRatio === 'more-women' ? 'FMP' : 'MMP';
}

export function formatBasicReceiver(
  startingPossession: 'team1' | 'team2' | null,
  team1Name: string,
  team2Name: string,
): string {
  if (startingPossession === 'team1') return team1Name;
  if (startingPossession === 'team2') return team2Name;
  return 'Not set';
}

export function createFormatSections(rows: FormatRow[]): FormatSection[] {
  return [
    {
      title: 'TEAMS',
      rows: rows.filter((row) => ['My Team', 'Opponent', 'Initial Receiver'].includes(row.label)),
    },
    {
      title: 'GAME RULES',
      rows: rows.filter((row) =>
        [
          'Game To',
          'Hard Cap',
          'Soft Cap',
          'Halftime',
          'Timeouts',
          'On Field',
          'Gender Ratio',
        ].includes(row.label),
      ),
    },
    {
      title: 'FEATURES',
      rows: rows.filter((row) =>
        ['Stat Tracking', 'Point Timer', 'Line Calling'].includes(row.label),
      ),
    },
  ].filter((section) => section.rows.length > 0);
}

export function formatHalftimeDisplay(
  enabled: boolean,
  scheduledScore: number | undefined,
  actualScore: number | null,
  triggeredEarly: boolean,
): string {
  if (!enabled) return 'Off';
  if (scheduledScore == null) return 'On';
  if (triggeredEarly && actualScore != null) {
    return `At ${actualScore} (early)`;
  }
  return `At ${scheduledScore}`;
}

export function formatBasicHalftime(
  events: GameEvent[],
  autoHalftimeEnabled: boolean,
  baseGameTo: number,
): string {
  const scheduledScore = autoHalftimeEnabled ? Math.ceil(baseGameTo / 2) : undefined;
  const result = getActualHalftimeScore(events, scheduledScore ?? 0);
  return formatHalftimeDisplay(
    autoHalftimeEnabled,
    scheduledScore,
    result?.score ?? null,
    result?.triggeredEarly ?? false,
  );
}

export function formatAdvancedHalftime(game: AdvancedTrackedGame): string {
  const halftimeAt = game.settings.format?.halftimeAt;
  const halftimeTransition = game.gameTransitions?.find((t) => t.transitionType === 'halftime');
  const triggeredEarly = halftimeTransition?.triggeredEarly === true;
  let actualScore: number | null = null;
  if (triggeredEarly) {
    const score = getScoreThroughPoint(game, halftimeTransition.afterPointId);
    actualScore = Math.max(...Object.values(score));
  }
  return formatHalftimeDisplay(halftimeAt != null, halftimeAt, actualScore, triggeredEarly);
}
