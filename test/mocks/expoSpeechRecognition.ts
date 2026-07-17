export const ExpoSpeechRecognitionModule = {
  abort: jest.fn(),
  getDefaultRecognitionService: jest.fn(() => null),
  getSpeechRecognitionServices: jest.fn(() => []),
  getSupportedLocales: jest.fn(async () => ({ installedLocales: [], locales: [] })),
  isRecognitionAvailable: jest.fn(() => false),
  requestPermissionsAsync: jest.fn(async () => ({ granted: false, status: 'denied' })),
  start: jest.fn(),
  stop: jest.fn(),
  supportsOnDeviceRecognition: jest.fn(() => false),
};

export const RecognizerIntentExtraLanguageModel = {
  LANGUAGE_MODEL_WEB_SEARCH: 'web_search',
};

export const TaskHintIOS = {
  confirmation: 'confirmation',
};

export function useSpeechRecognitionEvent() {}
