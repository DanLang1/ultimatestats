import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { reportError } from '@/lib/sentry';
import { darkPalette, lightPalette, Palette } from '@/theme/theme';

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

// The theme most recently loaded or chosen this session. A provider mounted later (the root error
// boundary remounts one after a crash) starts here instead of flashing the default.
let sessionThemeMode: ThemeMode | null = null;

/** Clears the session theme so each test starts from persisted storage. */
export function resetSessionThemeModeForTests() {
  sessionThemeMode = null;
}

export function ThemeProvider({ children, initialTheme }: ThemeProviderProps) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(
    initialTheme ?? sessionThemeMode ?? 'dark',
  );

  useEffect(() => {
    let isActive = true;

    void loadPersistedTheme().then((persistedTheme) => {
      sessionThemeMode = persistedTheme;
      if (isActive) {
        setThemeModeState(persistedTheme);
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

  const setThemeMode = (mode: ThemeMode) => {
    sessionThemeMode = mode;
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, mode).catch((error: unknown) => {
      reportError('theme-persist', error);
    });
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
  try {
    const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' ? 'light' : 'dark';
  } catch (error) {
    reportError('theme-load', error);
    return 'dark';
  }
}
