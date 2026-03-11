import { getLoadLineButtonState } from '../lineEditorUtils';

describe('getLoadLineButtonState', () => {
  const presets = [
    { id: 'preset-1', name: 'O-Line' },
    { id: 'preset-2', name: 'D-Line' },
    { id: 'preset-3', name: 'Junk' },
  ];

  it('shows the selected recent point when a recent line is selected', () => {
    expect(
      getLoadLineButtonState({
        presets,
        quickPresetIds: ['preset-1', 'preset-2'],
        selectedPresetId: 'preset-3',
        selectedRecentPointNumber: 7,
      }),
    ).toEqual({
      active: true,
      label: 'Pt 7',
    });
  });

  it('stays inactive for quick preset selections', () => {
    expect(
      getLoadLineButtonState({
        presets,
        quickPresetIds: ['preset-1', 'preset-2'],
        selectedPresetId: 'preset-1',
        selectedRecentPointNumber: null,
      }),
    ).toEqual({
      active: false,
      label: 'Load Line',
    });
  });

  it('shows the preset name for a non-quick preset selection', () => {
    expect(
      getLoadLineButtonState({
        presets,
        quickPresetIds: ['preset-1', 'preset-2'],
        selectedPresetId: 'preset-3',
        selectedRecentPointNumber: null,
      }),
    ).toEqual({
      active: true,
      label: 'Junk',
    });
  });

  it('falls back to a generic preset label when the preset is missing', () => {
    expect(
      getLoadLineButtonState({
        presets,
        quickPresetIds: ['preset-1', 'preset-2'],
        selectedPresetId: 'missing',
        selectedRecentPointNumber: null,
      }),
    ).toEqual({
      active: true,
      label: 'Preset',
    });
  });

  it('uses the default state when nothing is selected', () => {
    expect(
      getLoadLineButtonState({
        presets,
        quickPresetIds: ['preset-1', 'preset-2'],
        selectedPresetId: null,
        selectedRecentPointNumber: null,
      }),
    ).toEqual({
      active: false,
      label: 'Load Line',
    });
  });
});
