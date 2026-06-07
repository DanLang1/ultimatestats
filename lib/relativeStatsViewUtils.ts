import { formatMinutesPlayed } from '@/lib/playingTimeStatsUtils';
import {
  RelativePlayerMetric,
  RelativePlayingTimeMetric,
  RelativePlayingTimeMetricKey,
} from '@/lib/statsUtils';

export type RelativeMode = 'avg' | 'max';
export type RelativeEventRow = RelativePlayerMetric & { category: 'event' };
export type RelativePlayingTimeRow = RelativePlayingTimeMetric & { category: 'playingTime' };
export type RelativeRowMetric = RelativeEventRow | RelativePlayingTimeRow;

const PLAYING_TIME_USAGE_KEYS = new Set<RelativePlayingTimeMetricKey>([
  'pointsPlayed',
  'minutesPlayed',
  'playingTimePercent',
]);

export function isPlayingTimeMetric(metric: RelativeRowMetric): metric is RelativePlayingTimeRow {
  return metric.category === 'playingTime';
}

export function getMetricTone(metric: RelativeRowMetric): 'good' | 'bad' | 'neutral' {
  const percentDelta =
    isPlayingTimeMetric(metric) && metric.format === 'percent'
      ? getRoundedPercentDelta(metric)
      : metric.deltaFromAvg;
  const advantage = metric.higherIsBetter ? percentDelta : -percentDelta;
  const neutralThreshold = isPlayingTimeMetric(metric) && metric.format === 'percent' ? 0.5 : 0.05;

  if (Math.abs(advantage) < neutralThreshold) {
    return 'neutral';
  }

  return advantage > 0 ? 'good' : 'bad';
}

export function getRelativeLabel(metric: RelativeRowMetric, mode: RelativeMode): string {
  if (isPlayingTimeMetric(metric)) {
    return getPlayingTimeRelativeLabel(metric, mode);
  }

  if (mode === 'avg') {
    if (isEffectivelyEqual(metric.deltaFromAvg)) {
      return 'even with avg';
    }

    if (metric.key === 'plusMinus') {
      return `${formatSigned(metric.deltaFromAvg)} vs avg`;
    }

    if (!metric.higherIsBetter) {
      return `${formatSigned(metric.deltaFromAvg)} vs avg`;
    }

    if (metric.ratioToAvg === null) {
      return metric.raw > 0 ? 'team avg 0' : 'even with avg';
    }

    return `${formatCompact(metric.ratioToAvg)}x avg`;
  }

  if (!metric.higherIsBetter) {
    const deltaFromBest = metric.raw - metric.teamMin;
    if (isEffectivelyEqual(deltaFromBest)) {
      return 'at team best';
    }
    return `${formatSigned(deltaFromBest)} vs best`;
  }

  if (metric.pctOfMax !== null) {
    return `${Math.round(metric.pctOfMax * 100)}% of best`;
  }

  if (metric.key === 'plusMinus') {
    return `team best ${formatSigned(metric.teamMax)}`;
  }

  return `team best ${formatCompact(metric.teamMax)}`;
}

export function getSampleWarningLabel(metric: RelativeRowMetric): string | null {
  if (!isPlayingTimeMetric(metric)) {
    return null;
  }

  if (metric.key === 'pointWinRate') {
    return getSingleSampleWarning(metric.detail, 'pt');
  }

  if (metric.key === 'oEfficiency') {
    return getSingleSampleWarning(metric.detail, 'O-pt');
  }

  if (metric.key === 'dEfficiency') {
    return getSingleSampleWarning(metric.detail, 'D-pt');
  }

  return null;
}

export function getContextLabel(metric: RelativeRowMetric, mode: RelativeMode): string {
  if (isPlayingTimeMetric(metric)) {
    return getPlayingTimeContextLabel(metric, mode);
  }

  if (mode === 'avg') {
    return `Team avg ${formatCompact(metric.teamAvg)}`;
  }

  if (!metric.higherIsBetter) {
    return `Team best ${formatCompact(metric.teamMin)}`;
  }

  return `Team best ${formatCompact(metric.teamMax)}`;
}

export function formatRawValue(metric: RelativeRowMetric): string {
  if (isPlayingTimeMetric(metric)) {
    return formatPlayingTimeValue(metric);
  }

  if (metric.key === 'plusMinus') {
    return formatSigned(metric.raw);
  }
  return formatCompact(metric.raw);
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function getRoundedPercentagePointDelta(raw: number, comparison: number): number {
  return Math.round(raw * 100) - Math.round(comparison * 100);
}

export function getRoundedDecimalDelta(raw: number, comparison: number): number {
  return (Math.round(raw * 10) - Math.round(comparison * 10)) / 10;
}

function getSingleSampleWarning(detail: string | undefined, unitLabel: string): string | null {
  if (!detail) {
    return null;
  }

  const [, denominatorText] = detail.split('/');
  const sampleSize = Number(denominatorText);
  if (!Number.isFinite(sampleSize) || sampleSize !== 1) {
    return null;
  }

  return `1 ${unitLabel} sample`;
}

function getPlayingTimeRelativeLabel(metric: RelativePlayingTimeRow, mode: RelativeMode): string {
  if (mode === 'avg') {
    if (metric.format === 'percent') {
      const roundedPercentDelta = getRoundedPercentDelta(metric);
      if (roundedPercentDelta === 0) {
        return 'even with avg';
      }
      return `${formatSignedWhole(roundedPercentDelta)} vs avg`;
    }

    if (isEffectivelyEqual(metric.deltaFromAvg, metric.format)) {
      return 'even with avg';
    }

    if (metric.format === 'duration') {
      return `${formatSignedMinutes(metric.deltaFromAvg)} vs avg`;
    }

    if (metric.ratioToAvg === null) {
      return metric.raw > 0 ? 'team avg 0' : 'even with avg';
    }
    return `${formatCompact(metric.ratioToAvg)}x avg`;
  }

  if (metric.pctOfMax !== null) {
    return `${Math.round(metric.pctOfMax * 100)}% of ${
      PLAYING_TIME_USAGE_KEYS.has(metric.key) ? 'high' : 'best'
    }`;
  }

  const targetLabel = PLAYING_TIME_USAGE_KEYS.has(metric.key) ? 'high' : 'best';
  return metric.format === 'duration'
    ? `team ${targetLabel} ${formatMinutesPlayed(metric.teamMax)}`
    : `team ${targetLabel} ${formatPlayingTimeValue(metric)}`;
}

function getPlayingTimeContextLabel(metric: RelativePlayingTimeRow, mode: RelativeMode): string {
  if (mode === 'avg') {
    return `Team avg ${formatPlayingTimeValue({ ...metric, raw: metric.teamAvg })}`;
  }

  const targetLabel = PLAYING_TIME_USAGE_KEYS.has(metric.key) ? 'high' : 'best';
  return `Team ${targetLabel} ${formatPlayingTimeValue({ ...metric, raw: metric.teamMax })}`;
}

function formatPlayingTimeValue(metric: Pick<RelativePlayingTimeMetric, 'raw' | 'format'>): string {
  if (metric.format === 'percent') {
    return `${Math.round(metric.raw)}%`;
  }
  if (metric.format === 'duration') {
    return formatMinutesPlayed(metric.raw);
  }
  return formatCompact(metric.raw);
}

function formatSigned(value: number): string {
  const formatted = formatCompact(value);
  if (value > 0) {
    return `+${formatted}`;
  }
  return formatted;
}

function formatSignedWhole(value: number): string {
  const rounded = Math.round(value);
  if (rounded > 0) {
    return `+${rounded}`;
  }
  return `${rounded}`;
}

function formatSignedMinutes(value: number): string {
  const totalSeconds = Math.round(Math.abs(value) * 60);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  let prefix = '';
  if (value > 0) {
    prefix = '+';
  } else if (value < 0) {
    prefix = '-';
  }
  return `${prefix}${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatCompact(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
}

function isEffectivelyEqual(value: number, format?: RelativePlayingTimeMetric['format']): boolean {
  if (format === 'percent') {
    return Math.abs(value) < 0.5;
  }
  if (format === 'duration') {
    return Math.abs(value) < 1 / 60;
  }
  return Math.abs(value) < 0.05;
}

function getRoundedPercentDelta(
  metric: Pick<RelativePlayingTimeMetric, 'raw' | 'teamAvg'>,
): number {
  return Math.round(metric.raw) - Math.round(metric.teamAvg);
}
