import { useEffect, useRef, useState } from 'react';

const AUTO_DISMISS_MS = 2500;

export function useAutoDismissFeedback(autoDismiss: boolean, feedbackText: string): boolean {
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Reset immediately when the feedback text changes so the new message is visible.
    // eslint-disable-next-line react/set-state-in-effect
    setDismissed(false);

    if (autoDismiss) {
      timerRef.current = setTimeout(() => setDismissed(true), AUTO_DISMISS_MS);
      return () => {
        if (timerRef.current != null) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      };
    }

    return undefined;
    // eslint-disable-next-line react/exhaustive-effect-dependencies -- feedbackText intentionally restarts dismissal when new feedback arrives.
  }, [autoDismiss, feedbackText]);

  return dismissed;
}
