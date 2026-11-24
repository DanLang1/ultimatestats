// Captures the app's persisted AsyncStorage from an iOS simulator into one storage-checkpoint JSON
// file (see test/fixtures/storage-checkpoints/README.md). Read-only on the simulator.
// Run from the repo root:
//   npm run capture:storage-checkpoint -- <simulator-udid> <bundle-id> <output-path>

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const STORAGE_KEY_PREFIX = 'ultimatestats';

// AsyncStorage keeps small values inline in the manifest and stores `null` for a value that lives
// in a sibling file named after the MD5 of its key.
type AsyncStorageManifest = Record<string, string | null>;

function getAsyncStorageDirectory(simulatorUdid: string, bundleId: string): string {
  const dataContainer = execFileSync(
    'xcrun',
    ['simctl', 'get_app_container', simulatorUdid, bundleId, 'data'],
    { encoding: 'utf8' },
  ).trim();

  return path.join(
    dataContainer,
    'Library',
    'Application Support',
    bundleId,
    'RCTAsyncLocalStorage_V1',
  );
}

function readStoredValue(storageDirectory: string, key: string, inlineValue: string | null) {
  if (inlineValue !== null) return inlineValue;

  const valueFileName = createHash('md5').update(key).digest('hex');
  return readFileSync(path.join(storageDirectory, valueFileName), 'utf8');
}

// JSON objects and arrays are stored parsed so the checkpoint is readable and diffable. Every
// other value (a version string, a theme name) stays the exact string AsyncStorage holds.
function toCheckpointValue(storedValue: string): unknown {
  try {
    const parsed: unknown = JSON.parse(storedValue);
    const isJsonContainer = typeof parsed === 'object' && parsed !== null;
    return isJsonContainer ? parsed : storedValue;
  } catch {
    return storedValue;
  }
}

function captureStorageCheckpoint(simulatorUdid: string, bundleId: string) {
  const storageDirectory = getAsyncStorageDirectory(simulatorUdid, bundleId);
  const manifest: AsyncStorageManifest = JSON.parse(
    readFileSync(path.join(storageDirectory, 'manifest.json'), 'utf8'),
  );

  const appKeys = Object.keys(manifest)
    .filter((key) => key.startsWith(STORAGE_KEY_PREFIX))
    .sort();

  return Object.fromEntries(
    appKeys.map((key) => [
      key,
      toCheckpointValue(readStoredValue(storageDirectory, key, manifest[key])),
    ]),
  );
}

const [simulatorUdid, bundleId, outputPath] = process.argv.slice(2);
if (!simulatorUdid || !bundleId || !outputPath) {
  console.error(
    'Usage: npm run capture:storage-checkpoint -- <simulator-udid> <bundle-id> <output-path>',
  );
  process.exit(1);
}

const checkpoint = captureStorageCheckpoint(simulatorUdid, bundleId);
mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(checkpoint, null, 2)}\n`);
// `npm run format:check` covers JSON, so the fixture has to match the repo formatter.
execFileSync('npx', ['oxfmt', outputPath], { stdio: 'inherit' });
console.log(`Captured ${Object.keys(checkpoint).length} storage keys to ${outputPath}`);
