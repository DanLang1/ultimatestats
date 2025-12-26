import { darkPalette, lightPalette, Palette } from '@/theme/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useState } from 'react';

type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  palette: Palette;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_STORAGE_KEY = 'ultimatestats-theme-mode';

interface ThemeProviderProps {
  children: ReactNode;
  initialTheme?: ThemeMode;
}

export function ThemeProvider({ children, initialTheme = 'dark' }: ThemeProviderProps) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(initialTheme);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
  };

  const palette = themeMode === 'light' ? lightPalette : darkPalette;

  return (
    <ThemeContext.Provider value={{ palette, themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export async function loadPersistedTheme(): Promise<ThemeMode> {
  const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'light' ? 'light' : 'dark';
}
