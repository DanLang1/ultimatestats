import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const REPOSITORY_ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const OXLINT_BINARY = path.join(REPOSITORY_ROOT, 'node_modules', '.bin', 'oxlint');
const PLUGIN_PATH = fileURLToPath(new URL('../index.ts', import.meta.url));

void test('Oxlint loads and executes the local TypeScript plugin', () => {
  const temporaryDirectory = mkdtempSync(path.join(tmpdir(), 'ultimatestats-oxlint-plugin-'));
  const configPath = path.join(temporaryDirectory, 'oxlint.config.json');
  const sourcePath = path.join(temporaryDirectory, 'fixture.tsx');

  try {
    writeFileSync(
      configPath,
      JSON.stringify({
        jsPlugins: [{ name: 'local', specifier: PLUGIN_PATH }],
        rules: { 'local/no-restricted-hooks': 'error' },
      }),
    );
    writeFileSync(sourcePath, `useMemo(() => 42, []);\n`);

    const result = spawnSync(
      OXLINT_BINARY,
      ['--config', configPath, '--format', 'json', sourcePath],
      {
        cwd: REPOSITORY_ROOT,
        encoding: 'utf8',
      },
    );
    const output = `${result.stdout}\n${result.stderr}`;

    assert.equal(result.status, 1, output);
    assert.match(output, /local\(no-restricted-hooks\)/);
    assert.match(output, /useMemo/);
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});
