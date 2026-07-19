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
    // eslint-disable-next-line react/react-compiler
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
  }, [autoDismiss, feedbackText]);

  return dismissed;
}
