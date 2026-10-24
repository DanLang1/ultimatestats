import type { ExpoSpeechRecognitionErrorCode } from 'expo-speech-recognition';
import type { PlatformOSType } from 'react-native';

import type { CaptureIntentRejection } from '@/lib/advancedTracking/captureIntentUtils';

export function getSpeechErrorMessage(
  error: ExpoSpeechRecognitionErrorCode,
  platform: PlatformOSType,
): string {
  if (error === 'no-speech' || error === 'speech-timeout') {
    return 'No command heard';
  }
  if (error === 'not-allowed') {
    return 'Microphone permission needed';
  }
  if (platform === 'ios' && error === 'service-not-allowed') {
    return 'Enable/use keyboard Dictation once, then retry';
  }
  if (error === 'language-not-supported' || error === 'service-not-allowed') {
    return 'Offline voice unavailable';
  }
  if (error === 'network') {
    return 'Voice network unavailable';
  }
  if (error === 'busy') {
    return 'Voice recognizer busy';
  }
  if (error === 'audio-capture') {
    return 'Microphone unavailable';
  }
  if (error === 'client' || error === 'unknown') {
    return "Couldn't catch that";
  }
  return 'Voice command failed';
}

const CAPTURE_REJECTION_MESSAGES: Record<CaptureIntentRejection, string> = {
  'point-over': 'Point is over',
  'point-not-started': 'Tap who has the disc first',
  'play-paused': 'Play is paused',
  'holder-required': 'Tap who has the disc first',
  'possession-over': 'Tap who has the disc first',
};

export function getCaptureRejectionMessage(reason: CaptureIntentRejection): string {
  return CAPTURE_REJECTION_MESSAGES[reason];
}
