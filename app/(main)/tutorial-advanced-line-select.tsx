import { router, useLocalSearchParams } from 'expo-router';

import TutorialAdvancedLineSelection from '@/components/tutorial/TutorialAdvancedLineSelection';
import {
  exitAdvancedTutorial,
  parseTutorialAdvancedVariant,
  parseTutorialOrigin,
} from '@/components/tutorial/tutorialNavigation';

export default function TutorialAdvancedLineSelectRoute() {
  const { origin: rawOrigin, variant: rawVariant } = useLocalSearchParams<{
    origin?: string;
    variant?: string;
  }>();
  const origin = parseTutorialOrigin(rawOrigin);
  const variant = parseTutorialAdvancedVariant(rawVariant);

  return (
    <TutorialAdvancedLineSelection
      onBack={() => exitAdvancedTutorial(origin)}
      onComplete={() =>
        router.replace({ pathname: '/tutorial-advanced-tracker', params: { origin, variant } })
      }
    />
  );
}
