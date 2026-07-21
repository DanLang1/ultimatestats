import { useEffect, useState } from 'react';

import { loadPersistedTheme } from '@/context/ThemeContext';

type InitialTheme = 'light' | 'dark';

export function useInitialTheme(): InitialTheme | null {
  const [initialTheme, setInitialTheme] = useState<InitialTheme | null>(null);

  useEffect(() => {
    let isActive = true;

    void loadPersistedTheme().then((theme) => {
      if (isActive) {
        setInitialTheme(theme);
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

  return initialTheme;
}
