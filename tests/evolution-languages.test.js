import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';
import { describe, it } from 'test-anywhere';
import { extractEvolution } from '../src/evolution/index.js';
import { detectLanguage } from '../src/evolution/languages.js';
import { extractSyntax, withSyntax } from '../src/evolution/syntax.js';
import { withExampleHistory } from '../examples/evolution-report/generate.mjs';
import { isReport } from '../examples/universal-app/evolution/report.js';
import { languageFixtures } from './fixtures/evolution-languages.js';
import { itUnless, sandboxed } from './helpers/skip.js';

describe('evolution input and report formats', () => {
  for (const [language, { path, content, invalid }] of Object.entries(
    languageFixtures
  )) {
    it(`projects the pinned ${language} grammar`, async () => {
      assert.equal(detectLanguage(path), language);
      const project = (source) =>
        withSyntax(language, source, (syntax) => extractSyntax(syntax, source));
      const parsed = await project(content);
      assert.deepEqual(parsed.errors, []);
      assert.ok(parsed.abstractions.some(({ kind }) => kind === 'function'));
      for (const { hash, shape, editHash } of parsed.abstractions) {
        for (const digest of [hash, shape, editHash]) {
          assert.match(digest, /^[a-f0-9]{64}$/);
        }
      }
      assert.ok((await project(invalid)).errors.length);
    });
  }

  itUnless(sandboxed)(
    'reproduces the report shipped with the viewer',
    async () => {
      const report = await withExampleHistory(extractEvolution);
      const sample = await readFile(
        new URL(
          '../examples/universal-app/evolution/sample-report.json',
          import.meta.url
        ),
        'utf8'
      );
      assert.deepEqual(report, JSON.parse(sample));
      assert.ok(isReport(report));
      assert.equal(isReport({ ...report, events: [null] }), false);
      assert.equal(isReport({ ...report, schemaVersion: 2 }), false);
    }
  );
});
