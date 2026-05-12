import {
  ExpoSpeechRecognitionErrorEvent,
  ExpoSpeechRecognitionModule,
  RecognizerIntentExtraLanguageModel,
  TaskHintIOS,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useEffect, useRef, useState } from 'react';

import {
  buildVoiceContextualStrings,
  parseVoiceStatCommand,
  VoiceStatCommand,
  VoiceParticipantContext,
} from '@/lib/advancedTracking/voiceCommandParser';
import { isPossessionOver } from '@/lib/advancedTracking/trackingUtils';
import { PlayerRef, PointPossession } from '@/lib/advancedTracking/types';

const ANDROID_COMPLETE_SILENCE_MS = 400;
const ANDROID_POSSIBLY_COMPLETE_SILENCE_MS = 250;
const RESTART_LISTENING_DELAY_MS = 50;
const VOICE_LISTENING_WINDOW_MS = 3500;

type VoiceCommandStatus = 'idle' | 'listening' | 'recording' | 'unsupported' | 'error';

type VoiceFeedback =
  | { kind: 'idle'; text: string }
  | { kind: 'heard'; text: string }
  | { kind: 'recorded'; text: string }
  | { kind: 'issue'; text: string };

interface UseVoiceStatCommandsInput {
  enabled: boolean;
  activeParticipants: VoiceParticipantContext[];
  pointIsOver: boolean;
  oppHasDisc: boolean;
  possession: PointPossession | null;
  discHolderRef: PlayerRef | null;
  recordThrow: (input: { thrower: PlayerRef; result: 'complete'; toPlayer?: PlayerRef }) => void;
}

export interface VoiceStatCommandsControls {
  status: VoiceCommandStatus;
  transcript: string | null;
  message: string | null;
  feedback: VoiceFeedback;
  isListening: boolean;
  toggleListening: () => Promise<void>;
  stopListening: () => void;
}

export function useVoiceStatCommands(input: UseVoiceStatCommandsInput): VoiceStatCommandsControls {
  const [status, setStatus] = useState<VoiceCommandStatus>('idle');
  const [transcript, setTranscript] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isArmed, setIsArmed] = useState(false);
  const recordedCommandKeyRef = useRef<string | null>(null);
  const shouldListenRef = useRef(false);
  const listeningWindowTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const contextualStrings = buildVoiceContextualStrings(input.activeParticipants);

  const clearListeningWindowTimeout = () => {
    if (listeningWindowTimeoutRef.current == null) return;

    clearTimeout(listeningWindowTimeoutRef.current);
    listeningWindowTimeoutRef.current = null;
  };

  const startListeningWindowTimer = (onTimeout: () => void) => {
    clearListeningWindowTimeout();
    listeningWindowTimeoutRef.current = setTimeout(onTimeout, VOICE_LISTENING_WINDOW_MS);
  };

  useEffect(() => {
    return () => {
      clearListeningWindowTimeout();
      shouldListenRef.current = false;
      ExpoSpeechRecognitionModule.abort();
    };
  }, []);

  useEffect(() => {
    if (input.enabled) return;

    shouldListenRef.current = false;
    clearListeningWindowTimeout();
    setIsArmed(false);
    setStatus('idle');
    setMessage(null);
    setTranscript(null);
    ExpoSpeechRecognitionModule.abort();
  }, [input.enabled]);

  const beginRecognition = () => {
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      maxAlternatives: 1,
      continuous: true,
      requiresOnDeviceRecognition: true,
      addsPunctuation: false,
      contextualStrings,
      iosTaskHint: TaskHintIOS.confirmation,
      androidIntentOptions: {
        EXTRA_LANGUAGE_MODEL: RecognizerIntentExtraLanguageModel.LANGUAGE_MODEL_WEB_SEARCH,
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: ANDROID_COMPLETE_SILENCE_MS,
        EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS:
          ANDROID_POSSIBLY_COMPLETE_SILENCE_MS,
      },
    });
  };

  useSpeechRecognitionEvent('start', () => {
    setStatus('listening');
    setMessage('Listening');
    setTranscript(null);
    recordedCommandKeyRef.current = null;
  });

  useSpeechRecognitionEvent('end', () => {
    if (shouldListenRef.current) {
      setStatus('listening');
      setTimeout(() => {
        if (shouldListenRef.current) beginRecognition();
      }, RESTART_LISTENING_DELAY_MS);
      return;
    }

    setStatus((currentStatus) => (currentStatus === 'listening' ? 'idle' : currentStatus));
  });

  useSpeechRecognitionEvent('nomatch', () => {
    shouldListenRef.current = false;
    clearListeningWindowTimeout();
    setIsArmed(false);
    setStatus('unsupported');
    setMessage('No clear command');
  });

  useSpeechRecognitionEvent('error', (event) => {
    if (shouldListenRef.current && isRestartableSpeechError(event)) {
      setStatus('listening');
      setMessage('Listening');
      setTimeout(() => {
        if (shouldListenRef.current) beginRecognition();
      }, RESTART_LISTENING_DELAY_MS);
      return;
    }

    if (event.error === 'aborted') {
      setStatus('idle');
      setMessage(null);
      return;
    }
    setStatus('error');
    setMessage(getSpeechErrorMessage(event));
  });

  useSpeechRecognitionEvent('result', (event) => {
    const result = event.results[0];
    if (!result?.transcript) return;

    setTranscript(result.transcript);
    if (!event.isFinal) {
      setMessage(result.transcript);
      return;
    }

    const parseResult = parseVoiceStatCommand(result.transcript, input.activeParticipants);
    if (!parseResult.ok) {
      if (event.isFinal) setStatus('unsupported');
      setMessage(parseResult.reason);
      shouldListenRef.current = false;
      setIsArmed(false);
      clearListeningWindowTimeout();
      ExpoSpeechRecognitionModule.abort();
      return;
    }

    const throwerParticipantId = resolveVoiceThrowerParticipantId(input);
    if (throwerParticipantId == null) {
      setStatus('unsupported');
      setMessage('Tap who has the disc first');
      shouldListenRef.current = false;
      setIsArmed(false);
      clearListeningWindowTimeout();
      ExpoSpeechRecognitionModule.abort();
      return;
    }

    const commandKey = `${throwerParticipantId}->${parseResult.command.toParticipantId}`;
    if (recordedCommandKeyRef.current === commandKey) {
      setMessage('Pass recorded');
      return;
    }

    setStatus('recording');
    const commandResult = recordVoicePass(parseResult.command, throwerParticipantId, input);
    shouldListenRef.current = false;
    setIsArmed(false);
    clearListeningWindowTimeout();
    ExpoSpeechRecognitionModule.abort();
    if (commandResult.ok) {
      recordedCommandKeyRef.current = commandKey;
    }
    setStatus(commandResult.ok ? 'idle' : 'unsupported');
    setMessage(commandResult.message);
  });

  const startListening = async () => {
    if (input.pointIsOver) {
      setStatus('unsupported');
      setMessage('Point is over');
      return;
    }

    if (input.oppHasDisc) {
      setStatus('unsupported');
      setMessage('Voice offense paused');
      return;
    }

    if (!input.enabled) {
      setStatus('unsupported');
      setMessage('Voice unavailable');
      return;
    }

    shouldListenRef.current = true;
    setIsArmed(true);
    setStatus('listening');
    setMessage('Listening');

    if (status === 'listening') {
      return;
    }

    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      shouldListenRef.current = false;
      clearListeningWindowTimeout();
      setIsArmed(false);
      setStatus('error');
      setMessage('Voice not available');
      return;
    }

    const permissions = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permissions.granted) {
      shouldListenRef.current = false;
      clearListeningWindowTimeout();
      setIsArmed(false);
      setStatus('error');
      setMessage('Microphone permission needed');
      return;
    }

    if (!shouldListenRef.current) return;

    startListeningWindowTimer(() => {
      shouldListenRef.current = false;
      setIsArmed(false);
      setStatus('unsupported');
      setMessage('No command heard');
      ExpoSpeechRecognitionModule.abort();
    });
    beginRecognition();
  };

  const stopListening = () => {
    shouldListenRef.current = false;
    clearListeningWindowTimeout();
    setIsArmed(false);
    setStatus('idle');
    setMessage(null);
    setTranscript(null);
    ExpoSpeechRecognitionModule.abort();
  };

  const toggleListening = async () => {
    if (isArmed || status === 'listening') {
      stopListening();
      return;
    }

    await startListening();
  };

  return {
    status,
    transcript,
    message,
    feedback: getVoiceFeedback(status, transcript, message),
    isListening: isArmed || status === 'listening',
    toggleListening,
    stopListening,
  };
}

function getVoiceFeedback(
  status: VoiceCommandStatus,
  transcript: string | null,
  message: string | null,
): VoiceFeedback {
  if (message === 'Pass recorded') {
    return { kind: 'recorded', text: 'Recorded pass' };
  }

  if (status === 'error' || status === 'unsupported') {
    return { kind: 'issue', text: message ?? 'Voice command not recorded' };
  }

  if (status === 'listening' && transcript != null && transcript.trim()) {
    return { kind: 'heard', text: `Heard: ${transcript.trim()}` };
  }

  if (status === 'listening') {
    return { kind: 'heard', text: 'Listening' };
  }

  return { kind: 'idle', text: 'Tap mic, say receiver' };
}

function recordVoicePass(
  command: VoiceStatCommand,
  throwerParticipantId: string,
  input: UseVoiceStatCommandsInput,
): { ok: true; message: string } | { ok: false; message: string } {
  if (input.pointIsOver) {
    return { ok: false, message: 'Point is over' };
  }

  if (input.oppHasDisc) {
    return { ok: false, message: 'Voice offense paused' };
  }

  if (!input.possession || isPossessionOver(input.possession)) {
    return { ok: false, message: 'Tap who has the disc first' };
  }

  if (command.toParticipantId === throwerParticipantId) {
    return { ok: false, message: 'Receiver already has disc' };
  }

  input.recordThrow({
    thrower: participantRef(throwerParticipantId),
    result: 'complete',
    toPlayer: participantRef(command.toParticipantId),
  });
  return { ok: true, message: 'Pass recorded' };
}

function resolveVoiceThrowerParticipantId(input: UseVoiceStatCommandsInput): string | null {
  if (input.discHolderRef?.refType !== 'participant') return null;
  return input.discHolderRef.participantId;
}

function participantRef(participantId: string): PlayerRef {
  return { refType: 'participant', participantId };
}

function getSpeechErrorMessage(event: ExpoSpeechRecognitionErrorEvent): string {
  if (event.error === 'no-speech' || event.error === 'speech-timeout') {
    return 'No command heard';
  }
  if (event.error === 'not-allowed') {
    return 'Microphone permission needed';
  }
  if (event.error === 'language-not-supported' || event.error === 'service-not-allowed') {
    return 'Offline voice unavailable';
  }
  return 'Voice command failed';
}

function isRestartableSpeechError(event: ExpoSpeechRecognitionErrorEvent): boolean {
  return event.error === 'no-speech' || event.error === 'speech-timeout';
}
