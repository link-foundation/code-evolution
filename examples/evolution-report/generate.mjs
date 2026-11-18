import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';
import { extractEvolution } from '../../src/evolution/index.js';

const initial = {
  'src/cache.js': 'export function cached(value) { return value; }\n',
  'src/normalize.js':
    'export function label(value) { if (value) { return value; } return "none"; }\n' +
    'export function title(name) { if (name) { return name; } return "none"; }\n',
  'src/format.js':
    'export class Formatter { format(value) { return String(value); } }\n',
  'src/metrics.py': 'def count(values):\n    return len(values)\n',
};

export async function withExampleHistory(callback) {
  const root = await mkdtemp(join(tmpdir(), 'evolution-example-'));
  let date;
  const git = (...args) => {
    const result = spawnSync(
      'git',
      [
        '-C',
        root,
        '-c',
        'core.autocrlf=false',
        '-c',
        'core.hooksPath=.',
        '-c',
        'commit.gpgsign=false',
        ...args,
      ],
      {
        encoding: 'utf8',
        maxBuffer: 65_536,
        env: {
          ...process.env,
          GIT_CONFIG_GLOBAL: join(root, 'no-global-config'),
          GIT_CONFIG_NOSYSTEM: '1',
          GIT_AUTHOR_NAME: 'Evolution Fixture',
          GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
          GIT_COMMITTER_NAME: 'Evolution Fixture',
          GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
          GIT_AUTHOR_DATE: date,
          GIT_COMMITTER_DATE: date,
        },
      }
    );
    if (result.status !== 0) {
      throw result.error || new Error(result.stderr.trim());
    }
  };
  const write = (path, value) => writeFile(join(root, path), value);
  const commit = (day, subject) => {
    date = `2026-06-${day}T12:00:00Z`;
    git('add', '--all');
    git('commit', '--quiet', '-m', subject);
  };
  try {
    git('init', '--quiet', '--initial-branch=main', '--object-format=sha1');
    await mkdir(join(root, 'src'));
    for (const [path, source] of Object.entries(initial)) {
      await write(path, source);
    }
    commit('02', 'Introduce text formatting and metrics');
    await write(
      'src/normalize.js',
      'export function label(value) { return value || "none"; }\n' +
        'export function title(name) { return name || "none"; }\n'
    );
    await write(
      'src/metrics.py',
      'def count(values):\n    return sum(1 for value in values)\n'
    );
    commit('05', 'Simplify repeated default-value branches');
    await write(
      'src/format.js',
      'export class Formatter { format(value) { return String(value).trim(); } }\n'
    );
    await write(
      'src/normalize.js',
      'export function label(value) { return value || "none"; }\n' +
        'export function title(name) { return name || "none"; }\n' +
        'export function slug(value) { return label(value).trim(); }\n'
    );
    commit('08', 'Add a slug and trim formatted output');
    await rename(join(root, 'src/format.js'), join(root, 'src/formatter.js'));
    commit('12', 'Move the formatter to a dedicated file');
    await rm(join(root, 'src/cache.js'));
    await write(
      'src/metrics.py',
      'def count(values):\n    return len(set(values))\n'
    );
    commit('17', 'Remove the unused cache and count unique values');
    return await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const report = await withExampleHistory(extractEvolution);
  const destination = new URL(
    '../universal-app/evolution/sample-report.json',
    import.meta.url
  );
  const { format, resolveConfig } = await import('prettier');
  const filepath = fileURLToPath(destination);
  const options = await resolveConfig(filepath);
  await writeFile(
    destination,
    await format(JSON.stringify(report, null, 2), { ...options, filepath })
  );
}
