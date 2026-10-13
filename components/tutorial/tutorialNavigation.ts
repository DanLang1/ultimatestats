import { router } from 'expo-router';

import { useTutorialStore } from '@/store/tutorialStore';

export type TutorialOrigin = 'onboarding' | 'help' | 'tracker';

/** Which input the advanced tutorial teaches: footer buttons or chip swipe gestures. */
export type TutorialAdvancedVariant = 'buttons' | 'gestures';

export function parseTutorialOrigin(origin: string | undefined): TutorialOrigin {
  if (origin === 'onboarding' || origin === 'help' || origin === 'tracker') return origin;
  return 'help';
}

export function parseTutorialAdvancedVariant(variant: string | undefined): TutorialAdvancedVariant {
  if (variant === 'buttons' || variant === 'gestures') return variant;
  return 'gestures';
}

export function getTutorialExitRoute(
  origin: TutorialOrigin,
): '/Dashboard' | '/advancedTracking/Tracker' {
  if (origin === 'tracker') return '/advancedTracking/Tracker';
  return '/Dashboard';
}

/** Leaves the advanced tutorial early. Skipping first-run onboarding is permanent. */
export function exitAdvancedTutorial(origin: TutorialOrigin) {
  if (origin === 'onboarding') useTutorialStore.getState().completeAdvancedOnboarding();
  router.replace(getTutorialExitRoute(origin));
}
