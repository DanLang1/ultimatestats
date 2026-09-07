export type TutorialOrigin = 'onboarding' | 'help' | 'tracker';

export function parseTutorialOrigin(origin: string | undefined): TutorialOrigin {
  if (origin === 'onboarding' || origin === 'help' || origin === 'tracker') return origin;
  return 'help';
}

export function getTutorialExitRoute(
  origin: TutorialOrigin,
): '/Dashboard' | '/advancedTracking/Tracker' {
  if (origin === 'tracker') return '/advancedTracking/Tracker';
  return '/Dashboard';
}
