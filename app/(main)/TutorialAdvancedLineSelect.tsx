import { router, useLocalSearchParams } from 'expo-router';

import TutorialAdvancedLineSelection from '@/components/tutorial/TutorialAdvancedLineSelection';
import {
  getTutorialExitRoute,
  parseTutorialOrigin,
} from '@/components/tutorial/tutorialNavigation';

export default function TutorialAdvancedLineSelectRoute() {
  const { origin: rawOrigin } = useLocalSearchParams<{ origin?: string }>();
  const origin = parseTutorialOrigin(rawOrigin);

  return (
    <TutorialAdvancedLineSelection
      onBack={() => router.replace(getTutorialExitRoute(origin))}
      onComplete={() =>
        router.replace({ pathname: '/TutorialAdvancedTracker', params: { origin } })
      }
    />
  );
}
