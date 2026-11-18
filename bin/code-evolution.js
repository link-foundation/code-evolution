#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { URL } from 'node:url';
import { makeConfig } from 'lino-arguments';
import { extractEvolution } from '../src/evolution/index.js';

const usage = `Usage: code-evolution [repository] [options]

  --from <ref>            Start at this first-parent commit, inclusive
  --to <ref>              End at this commit (default: HEAD)
  --max-commits <n>       Limit the number of snapshots (default: 100)
  --max-files <n>         Limit tracked source files per snapshot
  --max-file-bytes <n>    Limit bytes per source file
  --max-total-bytes <n>   Limit source bytes per snapshot
  --output <path>         Write JSON to this path (default: stdout)
  -c, --configuration    Read options from a .lenv file
  -h, --help             Show usage
  -v, --version          Show the package version
`;

async function main() {
  const {
    positionals: [root = '.', extra],
    help,
    version,
    output,
    from,
    to,
    maxCommits,
    maxFiles,
    maxFileBytes,
    maxTotalBytes,
  } = makeConfig({
    includePositionals: true,
    lenv: { quiet: true },
    yargs: ({ yargs, getenv }) =>
      yargs
        .exitProcess(false)
        .help(false)
        .version(false)
        .parserConfiguration({ 'parse-positional-numbers': false })
        .strictOptions()
        .option('help', { type: 'boolean', alias: 'h' })
        .option('version', { type: 'boolean', alias: 'v' })
        .option('from', {
          type: 'string',
          default: getenv('FROM') || undefined,
        })
        .option('to', { type: 'string', default: getenv('TO') || undefined })
        .option('output', { type: 'string' })
        .option('max-commits', { type: 'number' })
        .option('max-files', { type: 'number' })
        .option('max-file-bytes', { type: 'number' })
        .option('max-total-bytes', { type: 'number' })
        .fail((message, error) => {
          throw error || new Error(message);
        }),
  });
  if (extra !== undefined) {
    throw new Error('Expected at most one repository path');
  }
  if (help) {
    process.stdout.write(usage);
    return;
  }
  if (version) {
    const metadata = new URL('../package.json', import.meta.url);
    process.stdout.write(
      `${JSON.parse(readFileSync(metadata, 'utf8')).version}\n`
    );
    return;
  }
  const report = await extractEvolution(root, {
    from,
    to,
    maxCommits,
    maxFiles,
    maxFileBytes,
    maxTotalBytes,
  });
  const json = `${JSON.stringify(report, null, 2)}\n`;
  if (output) {
    await writeFile(output, json);
  } else {
    process.stdout.write(json);
  }
}

try {
  await main();
} catch (error) {
  console.error(`code-evolution: ${error.message}`);
  process.exitCode = 2;
}
