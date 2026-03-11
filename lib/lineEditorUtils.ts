type LoadLineButtonPreset = {
  id: string;
  name: string;
};

type GetLoadLineButtonStateParams = {
  presets: LoadLineButtonPreset[];
  quickPresetIds: string[];
  selectedPresetId: string | null;
  selectedRecentPointNumber: number | null;
};

export type LoadLineButtonState = {
  active: boolean;
  label: string;
};

export function getLoadLineButtonState({
  presets,
  quickPresetIds,
  selectedPresetId,
  selectedRecentPointNumber,
}: GetLoadLineButtonStateParams): LoadLineButtonState {
  if (selectedRecentPointNumber !== null) {
    return {
      active: true,
      label: `Pt ${selectedRecentPointNumber}`,
    };
  }

  if (selectedPresetId === null || quickPresetIds.includes(selectedPresetId)) {
    return {
      active: false,
      label: 'Load Line',
    };
  }

  const selectedPreset = presets.find((preset) => preset.id === selectedPresetId);
  return {
    active: true,
    label: selectedPreset?.name ?? 'Preset',
  };
}
