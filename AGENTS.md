Quick, high-signal guidance for OpenCode agents working on this repo.

Setup
- Use pnpm (packageManager pinned). Node must be >=22. CI uses pnpm@10 and Node 22.
- To reproduce CI exactly: `pnpm install --frozen-lockfile`.

Build & run the CLI
- Build everything: `pnpm build` (runs ReScript compiler, TypeScript stream build, then rolldown bundling).
- After build the CLI entrypoint is `./dist/cli.mjs`. Run locally with e.g.:
  - `node ./dist/cli.mjs --help`
  - `node ./dist/cli.mjs data.json --format csv`
- Packaging/publish expects `dist` present (prepack runs `pnpm build`).

Development shortcuts
- ReScript watch: `pnpm res:dev` (runs `rescript watch`).
- Clean ReScript artifacts: `pnpm res:clean`.
- Rebuild single parts if needed: `pnpm ts:stream` runs `tsc -p tsconfig.stream.json` for streaming helpers.

Tests
- Run full test suite: `pnpm test` (runs ReScript tests then CLI tests). This is what CI runs.
- The CLI unit tests run `pnpm build` then Node's test runner on `test/cli.test.ts` (see `test:cli`).
- If you need only the ReScript tests: `pnpm res:test`.

CI & reproducibility
- CI job runs: checkout → pnpm install --frozen-lockfile → pnpm build → pnpm test.
- Follow that same order locally when debugging CI failures.

Important repo quirks / gotchas
- This is a ReScript-first project. The build step is multi-stage (rescript → tsc for streaming code → rolldown). Running only `rescript` is usually insufficient for `dist` to be ready.
- Node >=22 is required. Running older Node will cause subtle failures in build/test.
- `--frozen-lockfile` is used in CI; don't commit a changed pnpm-lock.yaml without running the install flow that updates it.
- The package `bin` points to `./dist/cli.mjs` and `files` includes `dist` — publishing requires the built files.

Where to look first
- README.md (root) — CLI semantics, examples, config file format (.tablyfulrc.json).
- package.json — scripts: build/test/watch and engine/pnpm pin.
- .github/workflows/ci.yml — exact CI steps to mirror locally.
- docs/README.md — high-level architecture and features.

If you are unsure, ask one short question: which command do you plan to run? (helps avoid running the wrong build/test step)
