import {
  ExpoSpeechRecognitionErrorEvent,
  ExpoSpeechRecognitionModule,
  ExpoSpeechRecognitionResult,
  RecognizerIntentExtraLanguageModel,
  TaskHintIOS,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { CaptureIntent, CaptureIntentResult } from '@/lib/advancedTracking/captureIntentUtils';
import { isPossessionOver } from '@/lib/advancedTracking/trackingUtils';
import { PlayerRef, PointPossession } from '@/lib/advancedTracking/types';
import { planVoicePassIntent } from '@/lib/advancedTracking/voiceCaptureIntentUtils';
import {
  buildVoiceContextualStrings,
  parseVoiceStatCommand,
  VoiceParticipantContext,
  VoiceStatCommand,
} from '@/lib/advancedTracking/voiceCommandParser';

const ANDROID_ON_DEVICE_RECOGNITION_SERVICE_PACKAGE = 'com.google.android.as';
const MAX_SPEECH_ALTERNATIVES = 5;
const VOICE_LISTENING_WINDOW_MS = 10000;

type ListeningWindowTimeoutRef = {
  current: ReturnType<typeof setTimeout> | null;
};

function clearListeningWindowTimeout(timeoutRef: ListeningWindowTimeoutRef): void {
  if (timeoutRef.current == null) return;

  clearTimeout(timeoutRef.current);
  timeoutRef.current = null;
}

type VoiceCommandStatus = 'idle' | 'listening' | 'recording' | 'unsupported' | 'error';

type VoiceFeedback =
  | { kind: 'idle'; text: string }
  | { kind: 'heard'; text: string }
  | { kind: 'recorded'; text: string }
  | { kind: 'issue'; text: string; persistent?: boolean };

interface UseVoiceStatCommandsInput {
  enabled: boolean;
  activeParticipants: VoiceParticipantContext[];
  pointIsOver: boolean;
  oppHasDisc: boolean;
  possession: PointPossession | null;
  discHolderRef: PlayerRef | null;
  recordCaptureIntent: (intent: CaptureIntent) => CaptureIntentResult;
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
  const recognitionCompletedRef = useRef(false);

  const contextualStrings = buildVoiceContextualStrings(input.activeParticipants);

  const startListeningWindowTimer = (onTimeout: () => void) => {
    clearListeningWindowTimeout(listeningWindowTimeoutRef);
    listeningWindowTimeoutRef.current = setTimeout(onTimeout, VOICE_LISTENING_WINDOW_MS);
  };

  useEffect(() => {
    logVoiceEnvironment();

    return () => {
      clearListeningWindowTimeout(listeningWindowTimeoutRef);
      shouldListenRef.current = false;
      ExpoSpeechRecognitionModule.abort();
    };
  }, []);

  useEffect(() => {
    if (input.enabled) return;

    shouldListenRef.current = false;
    clearListeningWindowTimeout(listeningWindowTimeoutRef);
    recognitionCompletedRef.current = true;
    ExpoSpeechRecognitionModule.abort();

    // Recognition was just aborted; keep UI state in lockstep with the external module.
    /* eslint-disable react/set-state-in-effect */
    setIsArmed(false);
    setStatus('idle');
    setMessage(null);
    setTranscript(null);
    /* eslint-enable react/set-state-in-effect */
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
      continuous: false,
      maxAlternatives: MAX_SPEECH_ALTERNATIVES,
      requiresOnDeviceRecognition: true,
    });
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      maxAlternatives: MAX_SPEECH_ALTERNATIVES,
      continuous: false,
      requiresOnDeviceRecognition: true,
      addsPunctuation: false,
      contextualStrings,
      iosTaskHint: TaskHintIOS.confirmation,
      androidRecognitionServicePackage,
      androidIntentOptions: {
        EXTRA_LANGUAGE_MODEL: RecognizerIntentExtraLanguageModel.LANGUAGE_MODEL_WEB_SEARCH,
      },
    });
  };

  useSpeechRecognitionEvent('start', () => {
    logVoiceDebug('start');
    setStatus('listening');
    setMessage('Listening');
    setTranscript(null);
    recognitionCompletedRef.current = false;
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
    logVoiceDebug('end', { recognitionCompleted: recognitionCompletedRef.current });
    shouldListenRef.current = false;
    clearListeningWindowTimeout(listeningWindowTimeoutRef);
    setIsArmed(false);
    if (recognitionCompletedRef.current) return;

    setStatus('unsupported');
    setMessage((currentMessage) => {
      if (
        currentMessage &&
        currentMessage !== 'Listening' &&
        currentMessage !== 'Finishing command'
      ) {
        return currentMessage;
      }

      return 'No final command heard';
    });
  });

  useSpeechRecognitionEvent('nomatch', () => {
    logVoiceDebug('nomatch');
    recognitionCompletedRef.current = true;
    shouldListenRef.current = false;
    clearListeningWindowTimeout(listeningWindowTimeoutRef);
    setIsArmed(false);
    setStatus('unsupported');
    setMessage('No clear command');
  });

  useSpeechRecognitionEvent('error', (event) => {
    logVoiceDebug('error', {
      code: event.code,
      error: event.error,
      message: event.message,
      platform: Platform.OS,
      recognitionAvailable: ExpoSpeechRecognitionModule.isRecognitionAvailable(),
      shouldListen: shouldListenRef.current,
      supportsOnDeviceRecognition: ExpoSpeechRecognitionModule.supportsOnDeviceRecognition(),
    });

    if (event.error === 'aborted') {
      if (recognitionCompletedRef.current) return;

      recognitionCompletedRef.current = true;
      setStatus('idle');
      setMessage(null);
      return;
    }

    recognitionCompletedRef.current = true;
    shouldListenRef.current = false;
    clearListeningWindowTimeout(listeningWindowTimeoutRef);
    setIsArmed(false);

    if (transcript != null && transcript.trim()) {
      setStatus('unsupported');
      setMessage(transcript.trim());
      return;
    }

    setStatus('error');
    setMessage(getSpeechErrorMessage(event));
  });

  useSpeechRecognitionEvent('result', (event) => {
    if (recognitionCompletedRef.current) {
      logVoiceDebug('ignored result after command completed', { isFinal: event.isFinal });
      return;
    }

    logVoiceDebug('result', {
      isFinal: event.isFinal,
      results: event.results.map((result) => ({
        confidence: result.confidence,
        transcript: result.transcript,
      })),
    });
    const displayTranscript = getDisplayTranscript(event.results);
    if (!displayTranscript) {
      if (!event.isFinal) return;

      logVoiceDebug('empty final result');
      return;
    }

    setTranscript(displayTranscript);
    const parseResult = parseBestVoiceStatCommand(event.results, input.activeParticipants);
    const resultConfidence = event.isFinal ? getAvailableConfidence(parseResult?.confidence) : null;
    logVoiceDebug('parse result', {
      confidence: resultConfidence,
      isFinal: event.isFinal,
      ok: parseResult?.result.ok,
      result: parseResult?.result,
      reasonCode: getParseFailureReasonCode(parseResult),
      transcript: parseResult?.transcript,
    });

    const canRecordInterimNumber =
      !event.isFinal &&
      parseResult?.result.ok === true &&
      parseResult.result.matchKind === 'number' &&
      !isCurrentDiscHolder(parseResult.result.command.toParticipantId, input.discHolderRef);
    if (!event.isFinal && !canRecordInterimNumber) {
      setMessage(transcript);
      return;
    }

    recognitionCompletedRef.current = true;

    if (parseResult == null) {
      if (event.isFinal) setStatus('unsupported');
      setMessage('No command heard');
      shouldListenRef.current = false;
      setIsArmed(false);
      clearListeningWindowTimeout(listeningWindowTimeoutRef);
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
      clearListeningWindowTimeout(listeningWindowTimeoutRef);
      ExpoSpeechRecognitionModule.abort();
      return;
    }

    const throwerParticipantId = resolveVoiceThrowerParticipantId(input);
    if (throwerParticipantId == null) {
      setStatus('unsupported');
      setMessage('Tap who has the disc first');
      shouldListenRef.current = false;
      setIsArmed(false);
      clearListeningWindowTimeout(listeningWindowTimeoutRef);
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
    clearListeningWindowTimeout(listeningWindowTimeoutRef);
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
      clearListeningWindowTimeout(listeningWindowTimeoutRef);
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
      clearListeningWindowTimeout(listeningWindowTimeoutRef);
      setIsArmed(false);
      setStatus('error');
      setMessage('Microphone permission needed');
      return;
    }

    if (!shouldListenRef.current) return;

    startListeningWindowTimer(() => {
      logVoiceDebug('listening window timeout');
      shouldListenRef.current = false;
      setMessage('Finishing command');
      ExpoSpeechRecognitionModule.stop();
    });
    beginRecognition();
  };

  const stopListening = () => {
    shouldListenRef.current = false;
    clearListeningWindowTimeout(listeningWindowTimeoutRef);
    setIsArmed(false);
    setStatus('idle');
    setMessage(null);
    setTranscript(null);
    recognitionCompletedRef.current = true;
    ExpoSpeechRecognitionModule.abort();
  };

  const toggleListening = async () => {
    if (isArmed || status === 'listening') {
      stopListening();
      return;
    }

    try {
      await startListening();
    } catch (error) {
      console.error('Failed to start voice recognition', error);
      recognitionCompletedRef.current = true;
      shouldListenRef.current = false;
      clearListeningWindowTimeout(listeningWindowTimeoutRef);
      setIsArmed(false);
      setStatus('error');
      setMessage('Voice not available');
    }
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

    return {
      kind: 'issue',
      text: message ?? 'Voice command not recorded',
      persistent: isPersistentVoiceIssue(message),
    };
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
  confidence: number;
  result: ReturnType<typeof parseVoiceStatCommand>;
} | null {
  const candidates = results
    .map((recognitionResult) => ({
      transcript: recognitionResult.transcript.trim(),
      confidence: recognitionResult.confidence,
    }))
    .filter((recognitionResult) => Boolean(recognitionResult.transcript))
    .map((recognitionResult) => ({
      ...recognitionResult,
      result: parseVoiceStatCommand(recognitionResult.transcript, activeParticipants),
    }))
    .sort((left, right) => getVoiceParseCandidateScore(right) - getVoiceParseCandidateScore(left));

  return candidates.find((candidate) => candidate.result.ok) ?? candidates[0] ?? null;
}

function getVoiceParseCandidateScore(candidate: {
  transcript: string;
  confidence: number;
  result: ReturnType<typeof parseVoiceStatCommand>;
}): number {
  if (!candidate.result.ok) return 0;

  const normalizedTranscriptLength = candidate.transcript
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const matchedPhraseLength = candidate.result.matchedPhrase.split(/\s+/).filter(Boolean).length;
  const matchKindWeight = candidate.result.matchKind === 'number' ? 100 : 50;
  const confidenceWeight = getAvailableConfidence(candidate.confidence) ?? 0;

  return matchKindWeight + matchedPhraseLength * 10 + normalizedTranscriptLength + confidenceWeight;
}

function getAvailableConfidence(confidence: number | undefined): number | null {
  if (confidence == null || confidence <= 0 || confidence > 1) return null;

  return confidence;
}

function getParseFailureReasonCode(
  parseResult: ReturnType<typeof parseBestVoiceStatCommand>,
): string | undefined {
  if (parseResult == null || parseResult.result.ok) return undefined;

  return parseResult.result.reasonCode;
}

function logVoiceDebug(_event: string, _data?: Record<string, unknown>) {
  if (!__DEV__) return;
  // console.log('[voice]', event, data ?? '');
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
    locale: 'en-US',
    platform: Platform.OS,
    defaultRecognitionService: ExpoSpeechRecognitionModule.getDefaultRecognitionService(),
    recognitionAvailable: ExpoSpeechRecognitionModule.isRecognitionAvailable(),
    requiresOnDeviceRecognition: true,
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

  const voicePlan = planVoicePassIntent(throwerParticipantId, command.toParticipantId);
  if (!voicePlan.ok) {
    return { ok: false, message: 'Receiver already has disc' };
  }

  const result = input.recordCaptureIntent(voicePlan.intent);
  if (!result.ok) return { ok: false, message: getCaptureRejectionMessage(result.reason) };
  return { ok: true, message: 'Pass recorded' };
}

function getCaptureRejectionMessage(
  reason: Exclude<CaptureIntentResult, { ok: true }>['reason'],
): string {
  if (reason === 'point-over') return 'Point is over';
  if (
    reason === 'point-not-started' ||
    reason === 'holder-required' ||
    reason === 'possession-over'
  )
    return 'Tap who has the disc first';
  return 'Pass could not be recorded';
}

function resolveVoiceThrowerParticipantId(input: UseVoiceStatCommandsInput): string | null {
  if (input.discHolderRef?.refType !== 'participant') return null;
  return input.discHolderRef.participantId;
}

function isCurrentDiscHolder(participantId: string, discHolderRef: PlayerRef | null): boolean {
  return discHolderRef?.refType === 'participant' && discHolderRef.participantId === participantId;
}

function getSpeechErrorMessage(event: ExpoSpeechRecognitionErrorEvent): string {
  if (event.error === 'no-speech' || event.error === 'speech-timeout') {
    return 'No command heard';
  }
  if (event.error === 'not-allowed') {
    return 'Microphone permission needed';
  }
  if (Platform.OS === 'ios' && event.error === 'service-not-allowed') {
    return 'Enable/use keyboard Dictation once, then retry';
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

function isPersistentVoiceIssue(message: string | null): boolean {
  return message === 'Enable/use keyboard Dictation once, then retry';
}
