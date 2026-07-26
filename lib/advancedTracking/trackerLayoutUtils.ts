export interface GetTrackerChipWidthInput {
  screenWidth: number;
  horizontalPadding: number;
  gap: number;
  columns: number;
  maxChipWidth: number;
  availableHeight: number | null;
  rowCount: number;
  verticalPadding: number;
  sideLabelHeight: number;
}

export function getTrackerChipWidth({
  screenWidth,
  horizontalPadding,
  gap,
  columns,
  maxChipWidth,
  availableHeight,
  rowCount,
  verticalPadding,
  sideLabelHeight,
}: GetTrackerChipWidthInput): number {
  const totalHorizontalPadding = horizontalPadding * 2;
  const widthLimitedChipWidth = Math.floor(
    (screenWidth - totalHorizontalPadding - gap * (columns - 1)) / columns,
  );
  let chipWidth = Math.min(widthLimitedChipWidth, maxChipWidth);
  if (availableHeight == null || availableHeight <= 0) return chipWidth;

  const heightForChips =
    availableHeight - sideLabelHeight - verticalPadding * 2 - gap * Math.max(0, rowCount - 1);
  const heightLimitedChipWidth = Math.max(1, Math.floor(heightForChips / rowCount));
  chipWidth = Math.min(chipWidth, heightLimitedChipWidth);
  return chipWidth;
}
