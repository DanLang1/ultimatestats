import { act, renderHook } from '@testing-library/react-native';
import { PermissionStatus } from 'expo-modules-core';
import {
  ExpoSpeechRecognitionModule,
  type ExpoSpeechRecognitionErrorCode,
} from 'expo-speech-recognition';
import { Platform } from 'react-native';

import type { CaptureIntent } from '@/lib/advancedTracking/captureIntentUtils';
import { useAdvancedTrackingStore } from '@/store/advancedTracking/trackingStore';
import {
  createAdvancedGameScenario,
  participantRef,
  UNTRACKED_PLAYER,
} from '@/test/fixtures/advancedGameBuilder';
import { resetAllStores } from '@/test/fixtures/resetStores';

import { useVoiceStatCommands } from '../useVoiceStatCommands';

type VoiceInput = Parameters<typeof useVoiceStatCommands>[0];
const mockSpeechListeners = new Map<string, (event: unknown) => void>();

jest.mock('expo-speech-recognition', () => {
  const adapter = jest.requireActual<typeof import('@/test/mocks/expoSpeechRecognition')>(
    '@/test/mocks/expoSpeechRecognition',
  );
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    ...adapter,
    useSpeechRecognitionEvent(event: string, listener: (payload: unknown) => void) {
      useEffect(() => {
        mockSpeechListeners.set(event, listener);
        return () => {
          mockSpeechListeners.delete(event);
        };
      }, [event, listener]);
    },
  };
});

const native = jest.mocked(ExpoSpeechRecognitionModule);
let mockStart: jest.SpyInstance;
let mockStop: jest.SpyInstance;
let mockAbort: jest.SpyInstance;

async function emit(event: string, payload: unknown = {}) {
  await act(() => {
    mockSpeechListeners.get(event)!(payload);
  });
}

async function hear(transcript: string, isFinal = true, confidence = 0.9) {
  await emit('result', { isFinal, results: [{ transcript, confidence }] });
}

async function begin(result: { current: ReturnType<typeof useVoiceStatCommands> }) {
  await act(() => result.current.toggleListening());
  await emit('start');
}

function arrangeInput(overrides: Partial<VoiceInput> = {}): VoiceInput {
  const game = createAdvancedGameScenario()
    .startPoint({ puller: UNTRACKED_PLAYER, receiver: participantRef('alex') })
    .pickup(participantRef('alex'))
    .build();
  useAdvancedTrackingStore.setState({ currentGame: game, currentGameId: game.id });
  return {
    enabled: true,
    activeParticipants: [
      { id: 'alex', name: 'Alex', number: '7' },
      { id: 'blair', name: 'Blair', number: '12' },
      { id: 'casey', name: 'Casey', number: '3' },
    ],
    pointIsOver: false,
    oppHasDisc: false,
    possession: game.points[0].possessions[0],
    discHolderRef: participantRef('alex'),
    recordCaptureIntent: jest.fn((intent: CaptureIntent) =>
      useAdvancedTrackingStore.getState().recordCaptureIntent(intent),
    ),
    ...overrides,
  };
}

describe('voice command recognition', () => {
  beforeEach(() => {
    resetAllStores();
    jest.useFakeTimers();
    mockStart = jest.spyOn(native, 'start');
    mockStop = jest.spyOn(native, 'stop');
    mockAbort = jest.spyOn(native, 'abort');
    native.isRecognitionAvailable.mockReturnValue(true);
    native.requestPermissionsAsync.mockResolvedValue({
      granted: true,
      status: PermissionStatus.GRANTED,
      expires: 'never',
      canAskAgain: true,
      restricted: false,
    });
    native.getSpeechRecognitionServices.mockReturnValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    mockSpeechListeners.clear();
  });

  it('shows interim name feedback and records the final pass through the real store', async () => {
    const input = arrangeInput();
    const { result } = await renderHook(() => useVoiceStatCommands(input));
    await begin(result);
    await hear('Blair', false);
    expect(result.current.feedback).toEqual({ kind: 'heard', text: 'Heard: Blair' });
    expect(input.recordCaptureIntent).not.toHaveBeenCalled();
    await hear('Blair');
    expect(result.current.feedback).toEqual({ kind: 'recorded', text: 'Recorded pass' });
    expect(input.recordCaptureIntent).toHaveBeenCalledWith({
      kind: 'pass',
      receiver: participantRef('blair'),
    });
    expect(
      useAdvancedTrackingStore.getState().currentGame!.points[0].possessions[0].actions.at(-1),
    ).toMatchObject({
      kind: 'throw',
      thrower: participantRef('alex'),
      toPlayer: participantRef('blair'),
      result: 'complete',
    });
  });

  it('records an interim jersey number once despite later final, abort, and end events', async () => {
    const input = arrangeInput();
    const { result } = await renderHook(() => useVoiceStatCommands(input));
    await begin(result);
    await hear('number twelve', false);
    await hear('number twelve');
    await emit('error', { error: 'aborted', message: 'Cancelled' });
    await emit('end');
    expect(input.recordCaptureIntent).toHaveBeenCalledTimes(1);
    expect(result.current.feedback).toEqual({ kind: 'recorded', text: 'Recorded pass' });
    expect(result.current.isListening).toBe(false);
  });

  it('prefers a valid number alternative over an uncertain name or unmatched first result', async () => {
    const input = arrangeInput();
    const { result } = await renderHook(() => useVoiceStatCommands(input));
    await begin(result);
    await emit('result', {
      isFinal: true,
      results: [
        { transcript: 'unrecognizable', confidence: 0.9 },
        { transcript: 'Blair', confidence: 0.9 },
        { transcript: 'number three', confidence: -1 },
        { transcript: '   ', confidence: 1 },
      ],
    });
    expect(input.recordCaptureIntent).toHaveBeenCalledWith({
      kind: 'pass',
      receiver: participantRef('casey'),
    });
    expect(result.current.feedback.kind).toBe('recorded');
  });

  it('waits for a final same-holder number and rejects it without a self-pass', async () => {
    const input = arrangeInput();
    const { result } = await renderHook(() => useVoiceStatCommands(input));
    await begin(result);
    await hear('number seven', false);
    expect(result.current.isListening).toBe(true);
    expect(input.recordCaptureIntent).not.toHaveBeenCalled();
    await hear('number seven');
    expect(result.current.feedback).toMatchObject({
      kind: 'issue',
      text: 'Receiver already has disc',
    });
    expect(input.recordCaptureIntent).not.toHaveBeenCalled();
  });

  it.each([
    [{ enabled: false }, 'Voice unavailable'],
    [{ pointIsOver: true }, 'Point is over'],
    [{ oppHasDisc: true }, 'Voice offense paused'],
  ])('guards recognition before starting: %j', async (overrides, message) => {
    const input = arrangeInput(overrides);
    const { result } = await renderHook(() => useVoiceStatCommands(input));
    await act(() => result.current.toggleListening());
    expect(mockStart).not.toHaveBeenCalled();
    expect(result.current.feedback).toMatchObject({ kind: 'issue', text: message });
  });

  it.each(['unavailable', 'denied', 'rejected'] as const)(
    'reports %s native recognition setup',
    async (failure) => {
      if (failure === 'unavailable') native.isRecognitionAvailable.mockReturnValue(false);
      if (failure === 'denied')
        native.requestPermissionsAsync.mockResolvedValue({
          granted: false,
          status: PermissionStatus.DENIED,
          expires: 'never',
          canAskAgain: false,
          restricted: false,
        });
      if (failure === 'rejected') {
        native.requestPermissionsAsync.mockRejectedValue(new Error('Permission API failed'));
        jest.spyOn(console, 'error').mockImplementation(() => {});
      }
      const { result } = await renderHook(() => useVoiceStatCommands(arrangeInput()));
      await act(() => result.current.toggleListening());
      expect(result.current.feedback).toMatchObject({
        kind: 'issue',
        text: failure === 'denied' ? 'Microphone permission needed' : 'Voice not available',
      });
      expect(mockStart).not.toHaveBeenCalled();
      expect(result.current.isListening).toBe(false);
    },
  );

  it.each(['cancel', 'disable'] as const)(
    'does not start after %s while permission is pending',
    async (reason) => {
      let grant!: (value: Awaited<ReturnType<typeof native.requestPermissionsAsync>>) => void;
      native.requestPermissionsAsync.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            grant = resolve;
          }),
      );
      const input = arrangeInput();
      const { result, rerender } = await renderHook(
        (props: VoiceInput) => useVoiceStatCommands(props),
        { initialProps: input },
      );
      let pending!: Promise<void>;
      await act(() => {
        pending = result.current.toggleListening();
      });
      if (reason === 'cancel') await act(() => result.current.stopListening());
      else await rerender({ ...input, enabled: false });
      await act(async () => {
        grant({
          granted: true,
          status: PermissionStatus.GRANTED,
          expires: 'never',
          canAskAgain: true,
          restricted: false,
        });
        await pending;
      });
      expect(mockStart).not.toHaveBeenCalled();
      expect(result.current.isListening).toBe(false);
    },
  );

  it('asks the recognizer to finish after ten seconds and still accepts its final command', async () => {
    const input = arrangeInput();
    native.getSpeechRecognitionServices.mockReturnValue(['com.google.android.as']);
    const { result } = await renderHook(() => useVoiceStatCommands(input));
    await begin(result);
    expect(mockStart).toHaveBeenCalledWith(
      expect.objectContaining({
        continuous: false,
        requiresOnDeviceRecognition: true,
        androidRecognitionServicePackage: 'com.google.android.as',
        contextualStrings: expect.arrayContaining(['Blair', 'number twelve']),
      }),
    );
    await act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(mockStop).toHaveBeenCalledTimes(1);
    expect(result.current.message).toBe('Finishing command');
    await hear('Blair');
    expect(input.recordCaptureIntent).toHaveBeenCalledTimes(1);
    expect(result.current.feedback.kind).toBe('recorded');
  });

  it('cancels an active session on a second tap and ignores late speech', async () => {
    const input = arrangeInput();
    const { result } = await renderHook(() => useVoiceStatCommands(input));
    await begin(result);
    await act(() => result.current.toggleListening());
    await hear('Blair');
    await act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(input.recordCaptureIntent).not.toHaveBeenCalled();
    expect(mockStop).not.toHaveBeenCalled();
    expect(result.current.feedback.kind).toBe('idle');
  });

  it.each(['nomatch', 'end'] as const)(
    'reports native %s without creating a pass',
    async (event) => {
      const input = arrangeInput();
      const { result } = await renderHook(() => useVoiceStatCommands(input));
      await begin(result);
      await emit('result', { isFinal: false, results: [] });
      await emit('result', { isFinal: true, results: [{ transcript: '   ', confidence: 0 }] });
      await emit(event);
      expect(result.current.feedback).toMatchObject({
        kind: 'issue',
        text: event === 'nomatch' ? 'No clear command' : 'No final command heard',
      });
      expect(input.recordCaptureIntent).not.toHaveBeenCalled();
      expect(result.current.isListening).toBe(false);
    },
  );

  it('shows an unrecognized final command instead of guessing a player', async () => {
    const input = arrangeInput();
    const { result } = await renderHook(() => useVoiceStatCommands(input));
    await begin(result);
    await hear('unrecognizable', false);
    await hear('unrecognizable');
    await emit('end');
    expect(result.current.feedback).toMatchObject({ kind: 'issue', text: 'Heard: unrecognizable' });
    expect(input.recordCaptureIntent).not.toHaveBeenCalled();
  });

  it('preserves heard speech when recognition fails before a final result', async () => {
    const { result } = await renderHook(() => useVoiceStatCommands(arrangeInput()));
    await begin(result);
    await hear('Blair', false);
    await emit('error', { error: 'network', message: 'Offline' });
    expect(result.current.feedback).toEqual({ kind: 'heard', text: 'Heard: Blair' });
  });

  it.each([
    ['ios', 'service-not-allowed', 'Enable/use keyboard Dictation once, then retry'],
    ['android', 'network', 'Voice network unavailable'],
  ] as const)(
    'explains %s recognition error %s',
    async (platform, error: ExpoSpeechRecognitionErrorCode, message) => {
      jest.replaceProperty(Platform, 'OS', platform);
      const { result } = await renderHook(() => useVoiceStatCommands(arrangeInput()));
      await begin(result);
      await emit('error', { error, message: 'Native failure' });
      expect(result.current.feedback).toEqual({
        kind: 'issue',
        text: message,
        persistent: platform === 'ios' && error === 'service-not-allowed',
      });
      expect(result.current.isListening).toBe(false);
    },
  );

  it.each([
    [{ pointIsOver: true }, 'Point is over'],
    [{ oppHasDisc: true }, 'Voice offense paused'],
    [{ possession: null }, 'Tap who has the disc first'],
    [{ discHolderRef: null }, 'Tap who has the disc first'],
  ])('rechecks game state before recording a final command: %j', async (change, message) => {
    const input = arrangeInput();
    const { result, rerender } = await renderHook(
      (props: VoiceInput) => useVoiceStatCommands(props),
      { initialProps: input },
    );
    await begin(result);
    await rerender({ ...input, ...change });
    await hear('Blair');
    expect(input.recordCaptureIntent).not.toHaveBeenCalled();
    expect(result.current.feedback).toMatchObject({ kind: 'issue', text: message });
  });

  it.each([
    ['point-over', 'Point is over'],
    ['holder-required', 'Tap who has the disc first'],
  ] as const)('reports a capture rejection caused by %s', async (reason, message) => {
    const input = arrangeInput({ recordCaptureIntent: jest.fn(() => ({ ok: false, reason })) });
    const { result } = await renderHook(() => useVoiceStatCommands(input));
    await begin(result);
    await hear('Blair');
    expect(result.current.feedback).toMatchObject({ kind: 'issue', text: message });
  });

  it('aborts native recognition and clears its safety timer on unmount', async () => {
    const input = arrangeInput();
    const { result, unmount } = await renderHook(() => useVoiceStatCommands(input));
    await begin(result);
    native.abort.mockClear();
    await unmount();
    expect(mockAbort).toHaveBeenCalledTimes(1);
    await act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(mockStop).not.toHaveBeenCalled();
  });
});
