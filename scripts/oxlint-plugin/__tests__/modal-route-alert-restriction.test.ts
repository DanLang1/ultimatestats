import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import repositoryConfig from '../../../oxlint.config.mts';

const REPOSITORY_ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const OXLINT_BINARY = path.join(REPOSITORY_ROOT, 'node_modules', '.bin', 'oxlint');
const MODAL_ROUTE_FILES = 'app/(modals)/**/*.tsx';
const USE_ALERT_SOURCE = `import { useAlert } from '@/components/ui/AlertProvider';

export function Probe() {
  useAlert();
  return null;
}
`;

// Lints USE_ALERT_SOURCE at relativePath with the repository's real modal-route override, inside a
// temporary directory so the probe never lands in the app's route tree.
function lintUseAlertAt(relativePath: string) {
  const modalOverride = repositoryConfig.overrides?.find((override) =>
    override.files.includes(MODAL_ROUTE_FILES),
  );
  assert.ok(modalOverride, `oxlint.config.mts has no override for ${MODAL_ROUTE_FILES}`);

  const temporaryDirectory = mkdtempSync(path.join(tmpdir(), 'ultimatestats-modal-alert-'));
  try {
    const configPath = path.join(temporaryDirectory, 'oxlint.config.json');
    const sourcePath = path.join(temporaryDirectory, relativePath);
    writeFileSync(configPath, JSON.stringify({ overrides: [modalOverride] }));
    mkdirSync(path.dirname(sourcePath), { recursive: true });
    writeFileSync(sourcePath, USE_ALERT_SOURCE);

    const result = spawnSync(
      OXLINT_BINARY,
      ['--config', configPath, '--format', 'json', sourcePath],
      { cwd: temporaryDirectory, encoding: 'utf8' },
    );
    return { status: result.status, output: `${result.stdout}\n${result.stderr}` };
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

void test('modal routes cannot import useAlert', () => {
  const { status, output } = lintUseAlertAt('app/(modals)/ProbeModal.tsx');

  assert.equal(status, 1, output);
  assert.match(output, /no-restricted-imports/);
  assert.match(output, /useAlert/);
  assert.match(output, /Confirm inside the sheet/);
});

void test('screens outside modal routes may import useAlert', () => {
  const { status, output } = lintUseAlertAt('app/(main)/ProbeScreen.tsx');

  assert.equal(status, 0, output);
});
