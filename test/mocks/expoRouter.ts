import { DependencyList, EffectCallback, useEffect } from 'react';

export const router = {
  push: jest.fn(),
  navigate: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  dismiss: jest.fn(),
  dismissTo: jest.fn(),
};

type RedirectProps = {
  href: unknown;
  relativeToDirectory?: boolean;
  withAnchor?: boolean;
};

export const Redirect = jest.fn(function MockRedirect({
  href,
  relativeToDirectory,
  withAnchor,
}: RedirectProps) {
  useEffect(() => {
    router.replace(href, { relativeToDirectory, withAnchor });
  }, [href, relativeToDirectory, withAnchor]);

  return null;
});

export const Stack = Object.assign(() => null, {
  Screen: () => null,
});

export const Tabs = Object.assign(() => null, {
  Screen: () => null,
});

let searchParams: Record<string, string | undefined> = {};
let pathname = '/';

export function setMockSearchParams(params: Record<string, string | undefined>) {
  searchParams = params;
}

export function setMockPathname(nextPathname: string) {
  pathname = nextPathname;
}

export function resetMockRouter() {
  searchParams = {};
  pathname = '/';
}

export function useLocalSearchParams() {
  return searchParams;
}

export function usePathname() {
  return pathname;
}

export function useFocusEffect(effect: EffectCallback, _dependencies?: DependencyList) {
  // A route is focused for the lifetime of these isolated screen tests.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(effect, []);
}
