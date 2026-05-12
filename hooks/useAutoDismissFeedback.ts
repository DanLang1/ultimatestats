import { useEffect, useRef, useState } from 'react';

const AUTO_DISMISS_MS = 2500;

export function useAutoDismissFeedback(autoDismiss: boolean, feedbackText: string): boolean {
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (autoDismiss) {
      setDismissed(false);
      timerRef.current = setTimeout(() => setDismissed(true), AUTO_DISMISS_MS);
      return () => {
        if (timerRef.current != null) clearTimeout(timerRef.current);
      };
    }
    setDismissed(false);
  }, [autoDismiss, feedbackText]);

  return dismissed;
}
