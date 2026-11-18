import { runProcess } from './process.js';

export async function gitOutput(root, args, maxOutputBytes = 4_194_304) {
  const result = await runProcess(
    'git',
    ['--literal-pathspecs', '-C', root, ...args],
    {
      maxOutputBytes,
      env: {
        ...process.env,
        GIT_NO_LAZY_FETCH: '1',
        GIT_OPTIONAL_LOCKS: '0',
        GIT_TERMINAL_PROMPT: '0',
      },
    }
  );
  if (result.code !== 0) {
    throw new Error(`Git ${args[0]} failed: ${result.stderr.trim()}`);
  }
  return result.stdout;
}

export async function resolveCommit(root, ref) {
  if (
    typeof ref !== 'string' ||
    !ref ||
    ref.startsWith('-') ||
    ref.includes('\0')
  ) {
    throw new Error('Invalid Git revision');
  }
  return (
    await gitOutput(root, [
      'rev-parse',
      '--verify',
      '--end-of-options',
      `${ref}^{commit}`,
    ])
  ).trim();
}
