import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, RenderOptions } from '@testing-library/react-native';
import { ReactElement, ReactNode } from 'react';
import { SafeAreaFrameContext, SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { AlertProvider } from '@/components/ui/AlertProvider';
import { ThemeProvider } from '@/context/ThemeContext';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { gcTime: Infinity, retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
}

function TestProviders({
  children,
  queryClient,
}: {
  children: ReactNode;
  queryClient: QueryClient;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaFrameContext.Provider value={{ x: 0, y: 0, width: 390, height: 844 }}>
        <SafeAreaInsetsContext.Provider value={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <ThemeProvider initialTheme="dark">
            <AlertProvider>{children}</AlertProvider>
          </ThemeProvider>
        </SafeAreaInsetsContext.Provider>
      </SafeAreaFrameContext.Provider>
    </QueryClientProvider>
  );
}

type RenderScreenOptions = Omit<RenderOptions, 'wrapper'> & {
  queryClient?: QueryClient;
};

export function renderScreen(ui: ReactElement, options: RenderScreenOptions = {}) {
  const { queryClient = createTestQueryClient(), ...renderOptions } = options;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <TestProviders queryClient={queryClient}>{children}</TestProviders>
  );

  return render(ui, { wrapper, ...renderOptions });
}
