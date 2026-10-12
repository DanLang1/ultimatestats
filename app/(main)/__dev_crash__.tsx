import { Redirect } from 'expo-router';

/** Dev-only route that throws during render to exercise the screen error boundary. */
export default function DevCrashScreen() {
  if (!__DEV__) {
    return <Redirect href="/" />;
  }
  throw new Error('Dev crash: screen render failure');
}
