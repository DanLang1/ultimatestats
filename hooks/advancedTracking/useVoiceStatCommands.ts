import {
  ExpoSpeechRecognitionErrorEvent,
  ExpoSpeechRecognitionModule,
  ExpoSpeechRecognitionResult,
  RecognizerIntentExtraLanguageModel,
  TaskHintIOS,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useEffect, useRef, useState } from 'react';

import { isPossessionOver } from '@/lib/advancedTracking/trackingUtils';
import { PlayerRef, PointPossession } from '@/lib/advancedTracking/types';
import {
  buildVoiceContextualStrings,
  parseVoiceStatCommand,
  VoiceParticipantContext,
  VoiceStatCommand,
} from '@/lib/advancedTracking/voiceCommandParser';

const ANDROID_COMPLETE_SILENCE_MS = 1200;
const ANDROID_ON_DEVICE_RECOGNITION_SERVICE_PACKAGE = 'com.google.android.as';
const ANDROID_POSSIBLY_COMPLETE_SILENCE_MS = 800;
const MAX_SPEECH_ALTERNATIVES = 5;
const RESTART_LISTENING_DELAY_MS = 50;
const VOICE_LISTENING_WINDOW_MS = 5000;

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
  const loggedAudibleVolumeRef = useRef(false);

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
    logVoiceEnvironment();

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
    loggedAudibleVolumeRef.current = false;
    const androidRecognitionServicePackage = getAndroidRecognitionServicePackage();
    logVoiceDebug('start requested', {
      activeParticipantCount: input.activeParticipants.length,
      activeParticipants: input.activeParticipants.map((participant) => ({
        id: participant.id,
        name: participant.name,
        number: participant.number ?? null,
      })),
      androidRecognitionServicePackage,
      contextualStrings,
      continuous: true,
      maxAlternatives: MAX_SPEECH_ALTERNATIVES,
      requiresOnDeviceRecognition: true,
    });
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      maxAlternatives: MAX_SPEECH_ALTERNATIVES,
      continuous: true,
      requiresOnDeviceRecognition: true,
      addsPunctuation: false,
      contextualStrings,
      iosTaskHint: TaskHintIOS.confirmation,
      androidRecognitionServicePackage,
      androidIntentOptions: {
        EXTRA_LANGUAGE_MODEL: RecognizerIntentExtraLanguageModel.LANGUAGE_MODEL_WEB_SEARCH,
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: ANDROID_COMPLETE_SILENCE_MS,
        EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS:
          ANDROID_POSSIBLY_COMPLETE_SILENCE_MS,
      },
    });
  };

  useSpeechRecognitionEvent('start', () => {
    logVoiceDebug('start');
    setStatus('listening');
    setMessage('Listening');
    setTranscript(null);
    recordedCommandKeyRef.current = null;
  });

  useSpeechRecognitionEvent('audiostart', () => {
    logVoiceDebug('audiostart');
  });

  useSpeechRecognitionEvent('soundstart', () => {
    logVoiceDebug('soundstart');
  });

  useSpeechRecognitionEvent('speechstart', () => {
    logVoiceDebug('speechstart');
  });

  useSpeechRecognitionEvent('volumechange', (event) => {
    if (loggedAudibleVolumeRef.current || event.value < 0) return;

    loggedAudibleVolumeRef.current = true;
    logVoiceDebug('audible volume', { value: event.value });
  });

  useSpeechRecognitionEvent('speechend', () => {
    logVoiceDebug('speechend');
  });

  useSpeechRecognitionEvent('soundend', () => {
    logVoiceDebug('soundend');
  });

  useSpeechRecognitionEvent('audioend', () => {
    logVoiceDebug('audioend');
  });

  useSpeechRecognitionEvent('end', () => {
    logVoiceDebug('end', { shouldRestart: shouldListenRef.current });
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
    logVoiceDebug('nomatch');
    shouldListenRef.current = false;
    clearListeningWindowTimeout();
    setIsArmed(false);
    setStatus('unsupported');
    setMessage('No clear command');
  });

  useSpeechRecognitionEvent('error', (event) => {
    logVoiceDebug('error', {
      code: event.code,
      error: event.error,
      message: event.message,
      shouldRestart: shouldListenRef.current && isRestartableSpeechError(event),
    });
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

    if (transcript != null && transcript.trim()) {
      setStatus('unsupported');
      setMessage(transcript.trim());
      return;
    }

    setStatus('error');
    setMessage(getSpeechErrorMessage(event));
  });

  useSpeechRecognitionEvent('result', (event) => {
    logVoiceDebug('result', {
      isFinal: event.isFinal,
      results: event.results.map((result) => ({
        confidence: result.confidence,
        transcript: result.transcript,
      })),
    });
    const transcript = getDisplayTranscript(event.results);
    if (!transcript) {
      if (!event.isFinal) return;

      logVoiceDebug('empty final result');
      return;
    }

    setTranscript(transcript);
    const parseResult = parseBestVoiceStatCommand(event.results, input.activeParticipants);
    logVoiceDebug('parse result', {
      isFinal: event.isFinal,
      ok: parseResult?.result.ok,
      result: parseResult?.result,
      reasonCode: getParseFailureReasonCode(parseResult),
      transcript: parseResult?.transcript,
    });

    if (!event.isFinal && parseResult?.result.ok !== true) {
      setMessage(transcript);
      return;
    }

    if (parseResult == null) {
      if (event.isFinal) setStatus('unsupported');
      setMessage('No command heard');
      shouldListenRef.current = false;
      setIsArmed(false);
      clearListeningWindowTimeout();
      ExpoSpeechRecognitionModule.abort();
      return;
    }

    if (!parseResult.result.ok) {
      if (!event.isFinal) {
        setMessage(transcript);
        return;
      }

      setStatus('unsupported');
      setMessage(`Heard: ${parseResult.transcript}`);
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

    const commandKey = `${throwerParticipantId}->${parseResult.result.command.toParticipantId}`;
    if (recordedCommandKeyRef.current === commandKey) {
      setMessage('Pass recorded');
      return;
    }

    setStatus('recording');
    const commandResult = recordVoicePass(parseResult.result.command, throwerParticipantId, input);
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
      logVoiceDebug('recognition unavailable');
      shouldListenRef.current = false;
      clearListeningWindowTimeout();
      setIsArmed(false);
      setStatus('error');
      setMessage('Voice not available');
      return;
    }

    const permissions = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    logVoiceDebug('permissions', {
      canAskAgain: permissions.canAskAgain,
      granted: permissions.granted,
      restricted: permissions.restricted,
      status: permissions.status,
    });
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
      logVoiceDebug('listening window timeout');
      shouldListenRef.current = false;
      setIsArmed(false);
      setStatus('unsupported');
      setMessage((currentMessage) => currentMessage ?? 'Finishing voice command');
      ExpoSpeechRecognitionModule.stop();
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
    if (message != null && message.trim() && transcript === message) {
      return { kind: 'heard', text: `Heard: ${message}` };
    }

    return { kind: 'issue', text: message ?? 'Voice command not recorded' };
  }

  if (status === 'listening' && transcript != null && transcript.trim()) {
    return { kind: 'heard', text: `Heard: ${transcript.trim()}` };
  }

  if (status === 'listening') {
    return { kind: 'heard', text: 'Listening' };
  }

  return { kind: 'idle', text: 'Tap mic, say number three' };
}

function getDisplayTranscript(results: ExpoSpeechRecognitionResult[]): string | null {
  const [result] = results;
  const transcript = result?.transcript.trim();
  return transcript || null;
}

function parseBestVoiceStatCommand(
  results: ExpoSpeechRecognitionResult[],
  activeParticipants: VoiceParticipantContext[],
): {
  transcript: string;
  result: ReturnType<typeof parseVoiceStatCommand>;
} | null {
  const candidates = results
    .map((result) => result.transcript.trim())
    .filter(Boolean)
    .map((transcript) => ({
      transcript,
      result: parseVoiceStatCommand(transcript, activeParticipants),
    }))
    .sort((left, right) => getVoiceParseCandidateScore(right) - getVoiceParseCandidateScore(left));

  return candidates.find((candidate) => candidate.result.ok) ?? candidates[0] ?? null;
}

function getVoiceParseCandidateScore(candidate: {
  transcript: string;
  result: ReturnType<typeof parseVoiceStatCommand>;
}): number {
  if (!candidate.result.ok) return 0;

  const normalizedTranscriptLength = candidate.transcript
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const matchedPhraseLength = candidate.result.matchedPhrase.split(/\s+/).filter(Boolean).length;
  const matchKindWeight = candidate.result.matchKind === 'number' ? 100 : 50;

  return matchKindWeight + matchedPhraseLength * 10 + normalizedTranscriptLength;
}

function getParseFailureReasonCode(
  parseResult: ReturnType<typeof parseBestVoiceStatCommand>,
): string | undefined {
  if (parseResult == null || parseResult.result.ok) return undefined;

  return parseResult.result.reasonCode;
}

function logVoiceDebug(event: string, data?: Record<string, unknown>) {
  if (!__DEV__) return;
  //console.log('[voice]', event, data ?? '');
}

function getAndroidRecognitionServicePackage(): string | undefined {
  const services = ExpoSpeechRecognitionModule.getSpeechRecognitionServices();
  if (services.includes(ANDROID_ON_DEVICE_RECOGNITION_SERVICE_PACKAGE)) {
    return ANDROID_ON_DEVICE_RECOGNITION_SERVICE_PACKAGE;
  }

  return undefined;
}

function logVoiceEnvironment() {
  if (!__DEV__) return;

  logVoiceDebug('environment', {
    defaultRecognitionService: ExpoSpeechRecognitionModule.getDefaultRecognitionService(),
    recognitionAvailable: ExpoSpeechRecognitionModule.isRecognitionAvailable(),
    services: ExpoSpeechRecognitionModule.getSpeechRecognitionServices(),
    supportsOnDeviceRecognition: ExpoSpeechRecognitionModule.supportsOnDeviceRecognition(),
  });
  ExpoSpeechRecognitionModule.getSupportedLocales({
    androidRecognitionServicePackage: ANDROID_ON_DEVICE_RECOGNITION_SERVICE_PACKAGE,
  })
    .then((supportedLocales) => {
      logVoiceDebug('supported locales', {
        googleAsInstalledLocales: supportedLocales.installedLocales,
        googleAsLocales: supportedLocales.locales,
      });
    })
    .catch((error: unknown) => {
      logVoiceDebug('supported locales failed', { error: String(error) });
    });
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
  if (event.error === 'network') {
    return 'Voice network unavailable';
  }
  if (event.error === 'busy') {
    return 'Voice recognizer busy';
  }
  if (event.error === 'audio-capture') {
    return 'Microphone unavailable';
  }
  if (event.error === 'client' || event.error === 'unknown') {
    return "Couldn't catch that";
  }
  return 'Voice command failed';
}

function isRestartableSpeechError(event: ExpoSpeechRecognitionErrorEvent): boolean {
  return event.error === 'no-speech' || event.error === 'speech-timeout';
}
