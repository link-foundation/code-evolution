import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { URL } from 'node:url';
import { withExampleHistory } from '../evolution-report/generate.mjs';

const packageName = '@link-foundation/code-evolution';
const sourceRepository = resolve(process.argv[2] || '');
const project = new URL('../../', import.meta.url);
const [pinnedSource] = (
  await readFile(new URL('./code-quality-source.txt', import.meta.url), 'utf8')
)
  .trim()
  .split(/\s+/);

function run(command, args, cwd) {
  return execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 2_097_152,
    timeout: 120_000,
  });
}

async function prepareConsumer(directory) {
  assert.equal(
    run('git', ['rev-parse', 'HEAD'], sourceRepository).trim(),
    pinnedSource
  );
  for (const path of ['package.json', 'package-lock.json', 'bin', 'src']) {
    await cp(join(sourceRepository, path), join(directory, path), {
      recursive: true,
    });
  }
  const [pkg] = JSON.parse(
    run('npm', ['pack', '--json', '--pack-destination', directory], project)
  );
  run(
    'npm',
    ['ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'],
    directory
  );
  await cp(
    new URL('./observe.mjs', import.meta.url),
    join(directory, 'observe.mjs')
  );
  return pkg;
}

async function installDependency(directory, pkg) {
  const archive = join(directory, pkg.filename);
  const sha = createHash('sha512')
    .update(await readFile(archive))
    .digest('base64');
  assert.equal(pkg.integrity, `sha512-${sha}`);
  run(
    'npm',
    [
      'install',
      '--omit=dev',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--save-exact',
      `./${pkg.filename}`,
    ],
    directory
  );
  const lock = JSON.parse(
    await readFile(join(directory, 'package-lock.json'), 'utf8')
  );
  assert.equal(
    lock.packages[''].dependencies[packageName],
    `file:${pkg.filename}`
  );
  assert.equal(
    lock.packages[`node_modules/${packageName}`].integrity,
    pkg.integrity
  );
  await writeFile(
    join(directory, 'src/quality/evolution.js'),
    `export { extractEvolution } from '${packageName}/evolution';\n`
  );
  run(
    'npm',
    ['ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'],
    directory
  );
}

assert.ok(process.argv[2], 'Provide the pinned Code Quality checkout');
const directory = await mkdtemp(join(tmpdir(), 'code-quality-consumer-'));
try {
  const pkg = await prepareConsumer(directory);
  await withExampleHistory(async (repository) => {
    const observe = () =>
      JSON.parse(run(process.execPath, ['observe.mjs', repository], directory));
    const before = observe();
    await installDependency(directory, pkg);
    assert.deepEqual(observe(), before);
    const executable = join(
      directory,
      'node_modules',
      packageName,
      'bin/code-evolution.js'
    );
    const report = run(process.execPath, [executable, repository], directory);
    assert.deepEqual(JSON.parse(report), before.report);
  });
  console.log(
    `Code Quality library, CLI and HTTP parity verified with ${pkg.name}@${pkg.version} (${pkg.integrity})`
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
