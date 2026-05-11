import {
  ExpoSpeechRecognitionErrorEvent,
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useRef, useState } from 'react';
import { Platform } from 'react-native';

import {
  buildVoiceContextualStrings,
  parseVoiceStatCommand,
  VoiceStatCommand,
} from '@/lib/advancedTracking/voiceCommandParser';
import { isPossessionOver } from '@/lib/advancedTracking/trackingUtils';
import { PlayerRef, Participant, PointPossession } from '@/lib/advancedTracking/types';

type VoiceCommandStatus = 'idle' | 'listening' | 'recording' | 'unsupported' | 'error';

type VoiceFeedback =
  | { kind: 'idle'; text: string }
  | { kind: 'heard'; text: string }
  | { kind: 'recorded'; text: string }
  | { kind: 'issue'; text: string };

interface UseVoiceStatCommandsInput {
  activeParticipants: Participant[];
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
  startListening: () => Promise<void>;
  stopListening: () => void;
}

export function useVoiceStatCommands(input: UseVoiceStatCommandsInput): VoiceStatCommandsControls {
  const [status, setStatus] = useState<VoiceCommandStatus>('idle');
  const [transcript, setTranscript] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const recordedCommandKeyRef = useRef<string | null>(null);

  const contextualStrings = buildVoiceContextualStrings(input.activeParticipants);

  useSpeechRecognitionEvent('start', () => {
    setStatus('listening');
    setMessage('Listening');
    setTranscript(null);
    recordedCommandKeyRef.current = null;
  });

  useSpeechRecognitionEvent('end', () => {
    setStatus((currentStatus) => (currentStatus === 'listening' ? 'idle' : currentStatus));
  });

  useSpeechRecognitionEvent('nomatch', () => {
    setStatus('unsupported');
    setMessage('No clear command');
  });

  useSpeechRecognitionEvent('error', (event) => {
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
      return;
    }

    const commandKey = `${parseResult.command.fromParticipantId}->${parseResult.command.toParticipantId}`;
    if (recordedCommandKeyRef.current === commandKey) {
      setMessage('Pass recorded');
      return;
    }

    setStatus('recording');
    const commandResult = recordVoicePass(parseResult.command, input);
    if (commandResult.ok) {
      recordedCommandKeyRef.current = commandKey;
      ExpoSpeechRecognitionModule.stop();
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

    if (status === 'listening') {
      ExpoSpeechRecognitionModule.stop();
      return;
    }

    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      setStatus('error');
      setMessage('Voice not available');
      return;
    }

    const permissions = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permissions.granted) {
      setStatus('error');
      setMessage('Microphone permission needed');
      return;
    }

    const requiresOnDeviceRecognition =
      Platform.OS !== 'web' && ExpoSpeechRecognitionModule.supportsOnDeviceRecognition();

    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      maxAlternatives: 1,
      continuous: false,
      requiresOnDeviceRecognition,
      addsPunctuation: false,
      contextualStrings,
    });
  };

  const stopListening = () => {
    ExpoSpeechRecognitionModule.stop();
  };

  return {
    status,
    transcript,
    message,
    feedback: getVoiceFeedback(status, transcript, message),
    isListening: status === 'listening',
    startListening,
    stopListening,
  };
}

function getVoiceFeedback(
  status: VoiceCommandStatus,
  transcript: string | null,
  message: string | null,
): VoiceFeedback {
  if (status === 'error' || status === 'unsupported') {
    return { kind: 'issue', text: message ?? 'Voice command not recorded' };
  }

  if (message === 'Pass recorded') {
    return { kind: 'recorded', text: 'Recorded pass' };
  }

  if (transcript != null && transcript.trim()) {
    return { kind: 'heard', text: `Heard: ${transcript.trim()}` };
  }

  if (status === 'listening') {
    return { kind: 'heard', text: 'Listening' };
  }

  return { kind: 'idle', text: 'Say a pass like "Tom to Jerry"' };
}

function recordVoicePass(
  command: VoiceStatCommand,
  input: UseVoiceStatCommandsInput,
): { ok: true; message: string } | { ok: false; message: string } {
  if (input.pointIsOver) {
    return { ok: false, message: 'Point is over' };
  }

  if (input.oppHasDisc) {
    return { ok: false, message: 'Voice offense paused' };
  }

  const throwerRef = participantRef(command.fromParticipantId);

  if (!input.possession || isPossessionOver(input.possession)) {
    return { ok: false, message: 'Tap who has the disc first' };
  }

  if (
    input.discHolderRef != null &&
    !isSameParticipant(input.discHolderRef, command.fromParticipantId)
  ) {
    return { ok: false, message: 'Thrower is not holding disc' };
  }

  input.recordThrow({
    thrower: throwerRef,
    result: 'complete',
    toPlayer: participantRef(command.toParticipantId),
  });
  return { ok: true, message: 'Pass recorded' };
}

function participantRef(participantId: string): PlayerRef {
  return { refType: 'participant', participantId };
}

function isSameParticipant(ref: PlayerRef, participantId: string): boolean {
  return ref.refType === 'participant' && ref.participantId === participantId;
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
