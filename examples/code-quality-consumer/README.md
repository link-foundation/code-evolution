# Code Quality dependency compatibility

The verifier runs the original Code Quality CLI, library API and localhost HTTP endpoint from the exact upstream commit in `code-quality-source.txt`. It installs a packed Code Evolution candidate into a temporary copy of the same consumer, changes its evolution module to a re-export, and runs the unchanged entry points again. The comparison covers the complete v1 report, a truncated window and an invalid revision. It also checks the packed Code Evolution executable against the same report.

```bash
git clone --filter=blob:none --no-checkout https://github.com/link-foundation/code-quality.git code-quality-source
git -C code-quality-source sparse-checkout set bin src
git -C code-quality-source checkout "$(cat examples/code-quality-consumer/code-quality-source.txt)"
node examples/code-quality-consumer/verify.mjs code-quality-source
```

The verifier installs the exact tarball path, checks the package lock's SHA-512 integrity against the bytes from `npm pack`, and verifies reproducibility with `npm ci`. The PR workflow repeats this check against its own candidate. The re-export uses the following public entry point.

```js
export { extractEvolution } from '@link-foundation/code-evolution/evolution';
```

Code Quality's open implementation PR keeps the inline engine as specified in the extraction issue. Its consumer cutover is demonstrated in the temporary checkout. A later consumer revision can use the exact published Code Evolution version, with the corresponding integrity checked into its lockfile, once the package is published. [Code Quality PR #2](https://github.com/link-foundation/code-quality/pull/2), [extraction issue](https://github.com/link-foundation/code-evolution/issues/1)
