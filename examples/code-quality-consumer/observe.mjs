import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { once } from 'node:events';

const { extractEvolution, createQualityServer } =
  await import('@link-foundation/code-quality/quality');

const root = process.argv[2];
const report = await extractEvolution(root);
assert.equal(report.commits.length, 5);
assert.ok(report.repeatedPatterns.length > 0);
assert.ok(report.coupling.length > 0);
const cli = JSON.parse(
  execFileSync(process.execPath, ['bin/code-quality.js', 'evolution', root], {
    encoding: 'utf8',
    maxBuffer: 1_048_576,
    timeout: 30_000,
  })
);
assert.deepEqual(cli, report);
const limited = await extractEvolution(root, { maxCommits: 2 });
assert.equal(limited.truncated, true);

const server = createQualityServer({ root });
const listening = once(server, 'listening');
server.listen(0, '127.0.0.1');
await listening;
try {
  const url = `http://127.0.0.1:${server.address().port}/v1/evolution`;
  const request = (body) =>
    fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
  const result = await request({ maxCommits: 2 });
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), limited);
  const invalid = await request({ to: '--all' });
  assert.equal(invalid.status, 400);
  const refusal = await invalid.json();
  assert.match(refusal.error, /Invalid Git revision/);
  console.log(JSON.stringify({ report, limited, refusal }));
} finally {
  server.closeAllConnections();
  await new Promise((done) => server.close(done));
}
