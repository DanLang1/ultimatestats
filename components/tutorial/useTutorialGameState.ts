import { EventToastData } from '@/components/toast/EventToast';
import { useCountdown } from '@/hooks/useCountdown';
import { EVENT_RECORDED_TOAST_DURATION_MS } from '@/lib/constants';
import { useEffect, useRef, useState } from 'react';

type TutorialAction =
  | { type: 'score-team1' }
  | { type: 'score-team2' }
  | { type: 'timeout'; team: 'team1' | 'team2'; index: number }
  | { type: 'undo' };

export interface TutorialStepDef {
  title: string;
  message?: string;
  expectedAction: 'score-any' | 'timeout' | 'undo' | 'play' | 'none';
  tooltipTarget: 'team1' | 'team2' | 'timeouts' | 'undo' | 'play' | 'center';
}

const TUTORIAL_STEPS: TutorialStepDef[] = [
  {
    title: 'Tap either side to score',
    expectedAction: 'score-any',
    tooltipTarget: 'center',
  },
  {
    title: 'Undo Mistakes',
    message: 'Made a mistake? Tap the undo button to reverse it.',
    expectedAction: 'undo',
    tooltipTarget: 'undo',
  },
  {
    title: 'Game Timer',
    message: 'Tap play to start the game clock.',
    expectedAction: 'play',
    tooltipTarget: 'play',
  },
  {
    title: 'Track Timeouts',
    message: 'Tap a timeout circle to mark it as used.',
    expectedAction: 'timeout',
    tooltipTarget: 'timeouts',
  },
];

const TEAM1_NAME = 'USA';
const TEAM2_NAME = 'Canada';
const INITIAL_SCORE_TEAM1 = 0;
const INITIAL_SCORE_TEAM2 = 0;
const INITIAL_TIME_LEFT = 90 * 60;

export default function useTutorialGameState(onComplete?: () => void) {
  const [team1Score, setTeam1Score] = useState(INITIAL_SCORE_TEAM1);
  const [team2Score, setTeam2Score] = useState(INITIAL_SCORE_TEAM2);
  const [team1Timeouts, setTeam1Timeouts] = useState([
    { active: true, isFloater: false },
    { active: true, isFloater: false },
  ]);
  const [team2Timeouts, setTeam2Timeouts] = useState([
    { active: true, isFloater: false },
    { active: true, isFloater: false },
  ]);
  const [currentStep, setCurrentStep] = useState(0);
  const [actionHistory, setActionHistory] = useState<TutorialAction[]>([]);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timeLeft = useCountdown(INITIAL_TIME_LEFT, isTimerRunning);
  const [toast, setToast] = useState<EventToastData>({
    visible: false,
    message: '',
    tone: 'success',
    icon: { library: 'material', name: 'check-circle' },
  });
  const [toastInstanceId, setToastInstanceId] = useState(0);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const step = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  const advanceStep = () => {
    if (!isLastStep) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onComplete?.();
    }
  };

  const applyAction = (action: TutorialAction) => {
    switch (action.type) {
      case 'score-team1':
        setTeam1Score((s) => s + 1);
        break;
      case 'score-team2':
        setTeam2Score((s) => s + 1);
        break;
      case 'timeout': {
        const setter = action.team === 'team1' ? setTeam1Timeouts : setTeam2Timeouts;
        setter((prev) =>
          prev.map((t, i) => (i === action.index ? { ...t, active: !t.active } : t)),
        );
        break;
      }
    }
  };

  const reverseAction = (action: TutorialAction) => {
    switch (action.type) {
      case 'score-team1':
        setTeam1Score((s) => s - 1);
        break;
      case 'score-team2':
        setTeam2Score((s) => s - 1);
        break;
      case 'timeout': {
        const setter = action.team === 'team1' ? setTeam1Timeouts : setTeam2Timeouts;
        setter((prev) =>
          prev.map((t, i) => (i === action.index ? { ...t, active: !t.active } : t)),
        );
        break;
      }
    }
  };

  const showToast = (message: string, tone: EventToastData['tone'], iconName: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ visible: true, message, tone, icon: { library: 'material', name: iconName } });
    setToastInstanceId((prev) => prev + 1);
    toastTimerRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, EVENT_RECORDED_TOAST_DURATION_MS);
  };

  const handleScore = (isTeam1: boolean) => {
    const action: TutorialAction = { type: isTeam1 ? 'score-team1' : 'score-team2' };
    applyAction(action);
    setActionHistory((prev) => [...prev, action]);
    showToast(
      isTeam1 ? `${TEAM1_NAME} scored!` : `${TEAM2_NAME} scored!`,
      'success',
      'check-circle',
    );

    if (step?.expectedAction === 'score-any') {
      advanceStep();
    }
  };

  const handleTimeout = (team: 'team1' | 'team2', index: number) => {
    const timeouts = team === 'team1' ? team1Timeouts : team2Timeouts;
    if (!timeouts[index]?.active) return;

    const action: TutorialAction = { type: 'timeout', team, index };
    applyAction(action);
    setActionHistory((prev) => [...prev, action]);

    if (step?.expectedAction === 'timeout') {
      advanceStep();
    }
  };

  const handleUndo = () => {
    const lastAction = actionHistory[actionHistory.length - 1];
    if (!lastAction) return;

    reverseAction(lastAction);
    setActionHistory((prev) => prev.slice(0, -1));

    if (lastAction.type === 'score-team1') {
      showToast(`${TEAM1_NAME} goal undone`, 'neutral', 'undo-variant');
    } else if (lastAction.type === 'score-team2') {
      showToast(`${TEAM2_NAME} goal undone`, 'neutral', 'undo-variant');
    }

    if (step?.expectedAction === 'undo') {
      advanceStep();
    }
  };

  const handlePlay = () => {
    if (step?.expectedAction === 'play') {
      setIsTimerRunning(true);
      advanceStep();
    } else if (isTimerRunning) {
      setIsTimerRunning(false);
    } else {
      setIsTimerRunning(true);
    }
  };

  // True once the play step has been completed (timer ever started)
  const hasTimerStarted = timeLeft < INITIAL_TIME_LEFT || isTimerRunning;

  return {
    team1Score,
    team2Score,
    team1Timeouts,
    team2Timeouts,
    timeLeft,
    isTimerRunning,
    hasTimerStarted,
    toast,
    toastInstanceId,
    currentStep,
    step,
    canUndo: actionHistory.length > 0,
    handleScore,
    handleTimeout,
    handleUndo,
    handlePlay,
  };
}
