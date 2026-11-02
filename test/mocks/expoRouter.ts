import { DependencyList, EffectCallback, useEffect } from 'react';

export const router = {
  push: jest.fn(),
  navigate: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  dismiss: jest.fn(),
  dismissTo: jest.fn(),
  canGoBack: jest.fn(() => canGoBack),
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
let segments: string[] = [];
let canGoBack = false;

export function setMockSearchParams(params: Record<string, string | undefined>) {
  searchParams = params;
}

export function setMockPathname(nextPathname: string) {
  pathname = nextPathname;
}

export function setMockSegments(nextSegments: string[]) {
  segments = nextSegments;
}

export function setMockCanGoBack(nextCanGoBack: boolean) {
  canGoBack = nextCanGoBack;
}

export function resetMockRouter() {
  canGoBack = false;
  searchParams = {};
  pathname = '/';
  segments = [];
}

export function useLocalSearchParams() {
  return searchParams;
}

export function usePathname() {
  return pathname;
}

export function useSegments() {
  return segments;
}

export function useFocusEffect(effect: EffectCallback, _dependencies?: DependencyList) {
  // A route is focused for the lifetime of these isolated screen tests.
  // eslint-disable-next-line react/exhaustive-deps
  useEffect(effect, []);
}
