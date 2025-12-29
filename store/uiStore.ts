import { create } from 'zustand';

interface ActionBarPosition {
  x: number;
  y: number;
}

interface UIState {
  // Action Bar Settings
  actionBarPosition: ActionBarPosition;
  actionBarOrientation: 'horizontal' | 'vertical';

  // Actions
  setActionBarPosition: (position: ActionBarPosition) => void;
  toggleActionBarOrientation: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Initial position {0,0} acts as a signal to calculate center on mount
  actionBarPosition: { x: 0, y: 0 },
  actionBarOrientation: 'horizontal',

  setActionBarPosition: (position) => set({ actionBarPosition: position }),

  toggleActionBarOrientation: () =>
    set((state) => ({
      actionBarOrientation: state.actionBarOrientation === 'horizontal' ? 'vertical' : 'horizontal',
    })),
}));
