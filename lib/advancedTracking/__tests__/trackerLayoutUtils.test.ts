import {
  getTrackerChipContentScale,
  getTrackerChipWidth,
  isTrackerChipContentCompact,
  TRACKER_CHIP_FULL_CONTENT_WIDTH,
} from '@/lib/advancedTracking/trackerLayoutUtils';

const baseInput = {
  screenWidth: 393,
  horizontalPadding: 20,
  gap: 12,
  columns: 3,
  maxChipWidth: 180,
  rowCount: 3,
  verticalPadding: 12,
  sideLabelHeight: 20,
};

describe('getTrackerChipWidth', () => {
  it('uses screen width when there is enough vertical space', () => {
    expect(getTrackerChipWidth({ ...baseInput, availableHeight: 500 })).toBe(109);
  });

  it('shrinks chips to fit above the footer on shorter layouts', () => {
    expect(getTrackerChipWidth({ ...baseInput, availableHeight: 320 })).toBe(84);
  });

  it('uses width sizing until the tracking surface has been measured', () => {
    expect(getTrackerChipWidth({ ...baseInput, availableHeight: null })).toBe(109);
  });
});

describe('getTrackerChipContentScale', () => {
  it('keeps full-size content at and above the full content width', () => {
    expect(getTrackerChipContentScale(TRACKER_CHIP_FULL_CONTENT_WIDTH)).toBe(1);
    expect(getTrackerChipContentScale(140)).toBe(1);
  });

  it('shrinks content proportionally for height-limited chips', () => {
    expect(getTrackerChipContentScale(TRACKER_CHIP_FULL_CONTENT_WIDTH / 2)).toBe(0.5);
  });
});

describe('isTrackerChipContentCompact', () => {
  it('is compact only below the full content width', () => {
    expect(isTrackerChipContentCompact(TRACKER_CHIP_FULL_CONTENT_WIDTH - 1)).toBe(true);
    expect(isTrackerChipContentCompact(TRACKER_CHIP_FULL_CONTENT_WIDTH)).toBe(false);
  });
});
