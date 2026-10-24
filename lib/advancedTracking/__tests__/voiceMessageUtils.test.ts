import type { ExpoSpeechRecognitionErrorCode } from 'expo-speech-recognition';
import type { PlatformOSType } from 'react-native';

import {
  getCaptureRejectionMessage,
  getSpeechErrorMessage,
} from '@/lib/advancedTracking/voiceMessageUtils';

describe('getSpeechErrorMessage', () => {
  it.each<[PlatformOSType, ExpoSpeechRecognitionErrorCode, string]>([
    ['ios', 'no-speech', 'No command heard'],
    ['android', 'speech-timeout', 'No command heard'],
    ['ios', 'not-allowed', 'Microphone permission needed'],
    ['ios', 'service-not-allowed', 'Enable/use keyboard Dictation once, then retry'],
    ['android', 'service-not-allowed', 'Offline voice unavailable'],
    ['ios', 'language-not-supported', 'Offline voice unavailable'],
    ['ios', 'network', 'Voice network unavailable'],
    ['ios', 'busy', 'Voice recognizer busy'],
    ['ios', 'audio-capture', 'Microphone unavailable'],
    ['android', 'client', "Couldn't catch that"],
    ['android', 'unknown', "Couldn't catch that"],
    ['ios', 'interrupted', 'Voice command failed'],
  ])('%s %s -> %s', (platform, error, message) => {
    expect(getSpeechErrorMessage(error, platform)).toBe(message);
  });
});

describe('getCaptureRejectionMessage', () => {
  it.each([
    ['point-over', 'Point is over'],
    ['point-not-started', 'Tap who has the disc first'],
    ['play-paused', 'Play is paused'],
    ['holder-required', 'Tap who has the disc first'],
    ['possession-over', 'Tap who has the disc first'],
  ] as const)('%s -> %s', (reason, message) => {
    expect(getCaptureRejectionMessage(reason)).toBe(message);
  });
});
