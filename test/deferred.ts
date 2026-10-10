import AsyncStorage from '@react-native-async-storage/async-storage';
import { act } from '@testing-library/react-native';

export function createDeferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((accept, fail) => {
    resolve = accept;
    reject = fail;
  });
  return { promise, resolve, reject };
}

/**
 * Hold every AsyncStorage write whose key matches until `release()`, so a test can observe the
 * in-flight state of a save. Held writes still reach the real mock storage once released.
 */
export function holdAsyncStorageWrites(matchesKey: (key: string) => boolean = () => true) {
  const originalWrite = jest.mocked(AsyncStorage.setItem).getMockImplementation()!;
  const gate = createDeferred();
  const held = createDeferred();
  const writes: Promise<void>[] = [];
  jest.spyOn(AsyncStorage, 'setItem').mockImplementation((key, value) => {
    if (!matchesKey(key)) return originalWrite(key, value);
    held.resolve();
    const write = gate.promise.then(() => originalWrite(key, value));
    writes.push(write);
    return write;
  });
  return {
    /** Resolves once a matching write is waiting. */
    held: held.promise,
    /** Lets held writes (and any later ones) through and resolves after they are persisted. */
    release: () =>
      act(async () => {
        gate.resolve();
        await Promise.all(writes);
      }),
  };
}
