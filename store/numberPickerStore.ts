import { create } from 'zustand';

interface NumberPickerState {
  isActive: boolean;
  value: number;
  min: number;
  max: number;
  label: string;
  helperText?: string;
  suffix?: string;
  quickOptions?: number[];
  onChange: ((value: number) => void) | null;

  open: (config: {
    value: number;
    min: number;
    max: number;
    label: string;
    helperText?: string;
    suffix?: string;
    quickOptions?: number[];
    onChange: (value: number) => void;
  }) => void;

  close: () => void;
  save: (value: number) => void;
}

export const useNumberPickerStore = create<NumberPickerState>((set, get) => ({
  isActive: false,
  value: 0,
  min: 0,
  max: 999,
  label: '',
  helperText: undefined,
  suffix: undefined,
  quickOptions: undefined,
  onChange: null,

  open: (config) => {
    set({
      isActive: true,
      value: config.value,
      min: config.min,
      max: config.max,
      label: config.label,
      helperText: config.helperText,
      suffix: config.suffix,
      quickOptions: config.quickOptions,
      onChange: config.onChange,
    });
  },

  close: () => {
    set({ isActive: false, helperText: undefined, onChange: null });
  },

  save: (value: number) => {
    const { onChange } = get();
    if (onChange) {
      onChange(value);
    }
    set({ isActive: false, helperText: undefined, onChange: null });
  },
}));
