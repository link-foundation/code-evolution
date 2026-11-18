# Git history analysis

The `@link-foundation/code-evolution/evolution` entry point reads a local Git repository and returns a JSON-compatible report. The `code-evolution` executable writes the same report. Both require Git on `PATH`. The package supports Node.js 20 and later. The Git fixtures also run under Bun and Deno.

```bash
node bin/code-evolution.js /path/to/repository --max-commits 25 --output report.json
```

```js
import { extractEvolution } from '@link-foundation/code-evolution/evolution';

const report = await extractEvolution('/path/to/repository', {
  to: 'HEAD',
  maxCommits: 25,
});
```

The CLI uses `lino-arguments` and accepts a Links Notation configuration file via `--configuration`. Run `node bin/code-evolution.js --help` for all options. A refusal exits with status 2 and writes its reason to stderr.

## History selection

The engine resolves commit refs, follows the first parent of each commit, then reports the selected snapshots from oldest to newest. `to` defaults to `HEAD`. `from` is inclusive and must be within the selected first-parent window of `to`. When `from` is omitted, `truncated` reports whether the local history reaches beyond the commit limit. A shallow clone can hide older history. Merge results are visible in first-parent snapshots. Side-branch commits, index changes and uncommitted files are outside the analysis window.

The first selected snapshot contributes additions for every tracked identity in that snapshot. Its file events count toward hotspot and coupling totals. Identity IDs and aggregated counts can therefore change when you change the starting commit.

The source projection recognizes JavaScript, TypeScript, TSX, Rust, Python, Go, C#, Java, C, C++, PHP, Bash and CMake. It excludes known dependency and build directories (`node_modules`, `vendor`, `target`, `dist` and `.venv`). The analyzer refuses recognized source entries that are symlinks or other non-regular Git entries, binary sources, syntax errors, and definitions requiring unsupported CMake expansion.

| Option                       | Default | Maximum |
| ---------------------------- | ------: | ------: |
| `maxCommits`                 |     100 |   1,000 |
| `maxFiles` per snapshot      |   1,000 |   1,000 |
| `maxFileBytes`               |   1 MiB |   1 MiB |
| `maxTotalBytes` per snapshot |  16 MiB |  16 MiB |

Git subprocesses have individual 30-second and output limits. Parsing has independent traversal, complexity and metadata budgets. The engine refuses histories with more than 50,000 events or more than 100,000 distinct candidate file pairs. Commits with more than 100 file events contribute to hotspots and are excluded from coupling. Source blobs must be present locally when Git honors `GIT_NO_LAZY_FETCH`.

## Identity and report interpretation

- Earlier and later entries must have the same kind and language. Matching tries unique path plus qualified name, then unique exact content, then unique normalized structure for functions and classes. Each earlier entry can be matched once. A candidate duplicated on either side cannot match by that criterion.
- Identity continues across a matched rename. An exact-content file rename is eligible for continuity. A move with edits can appear as a file deletion and addition. Same-shaped declarations may be unrelated, and true continuations can become ambiguous. If every criterion fails, the engine records additions and deletions with independent identities.
- A file content hash is its Git blob ID. An abstraction content hash is SHA-256 over its source span. Structural hashes use normalized syntax, so identifiers and selected literals can vary across the same shape. A file shape summarizes its abstraction shapes. Additional edit hashes capture transformations such as operator changes that the structural projection may normalize.
- Hotspots count file events by reported path. A coupling entry counts commits where both paths had a file event and appears after two such commits. Batches, the initial snapshot and renames can affect both rankings. Use the timeline to inspect the underlying commits.
- A repeated transformation groups matching before/after edit hashes by language and abstraction kind. Suggestions link each occurrence by commit, path and identity ID. A single commit can contribute several occurrences. The report labels suggestions observational because structural changes do not establish behavioral equivalence or maintenance benefit.

The `schemaVersion: 1` contract includes resolved refs, ordered commits, the identity events, current identities, summaries and limitations. See the [Code Quality compatibility check](../examples/code-quality-consumer/README.md) and the [extraction case study](case-studies/issue-1/README.md).

## Demo

```bash
npm ci --prefix examples/universal-app
npm run example:web:build
npm run example:web:preview
```

Open `/evolution/` on the printed local address. Explore the built-in history or choose **Open JSON** to inspect a report. The demo reads files up to 8 MiB in the browser. To recreate the built-in report byte for byte, run `node examples/evolution-report/generate.mjs` from the repository root.
