# Gymbuddy

Gymbuddy is an offline-first gym tracking app for phones.
Capacitor wraps a Next.js (TypeScript) interface. All data lives in SQLite on the phone.

Read these files before larger changes:
- @docs/ARCHITECTURE.md — layers and data flow
- @docs/DATA_MODEL.md — tables, units and weight rules
- @docs/DECISIONS.md — decisions that are already made
- @docs/GLOSSARY.md — the only allowed names for things
- @docs/TESTING.md — how to write and run tests
- `docs/ROADMAP.md` — current phase and task list (read when picking a task)
- `docs/GRAPHIFY.md` — knowledge graph of the repo (read when you need an overview)
- @AGENTS.md — Next.js version notice, written by `next dev`

## Commands

- Install: `npm ci`
- Dev server (browser): `npm run dev`
- Type check: `npm run typecheck`
- Lint: `npm run lint`
- Tests: `npm test` (helpers, database, components and pages; see `docs/TESTING.md`)
- Run on a phone: `npm run android`
- Static build for the phone: `npm run build` (writes `out/`)
- Copy build to native projects: `npx cap sync`
- Knowledge graph of the repo: `graphify update .` after code changes (see `docs/GRAPHIFY.md`)
- Generate a migration after a schema change: `npm run db:generate` (runs `drizzle-kit generate` and bundles the result into `src/db/migrations.ts`)

Run `npm run typecheck`, `npm run lint` and `npm test` before you call a task done.

## Tests

- Every change comes with tests in the same commit: new code, changed behavior and bug fixes.
- A test file sits next to the file it tests: `units.ts` → `units.test.ts`, `page.tsx` → `page.test.tsx`.
- Use the helpers in `src/testing/`: `createTestDatabase()` for queries, `renderWithDatabase()` for components and pages.
- A bug fix gets a test that fails without the fix.
- Changes to `src/db/` or app startup also need a check in the browser and on a phone, because the test database is not the plugin.

## Hard rules

- No server code. Do not add API routes, server actions or server-side data fetching.
  The app must build with `output: 'export'`.
- All database access goes through `src/db/` (Drizzle). Components never import the SQLite plugin directly.
- Never edit files in `drizzle/` (generated migrations) or `src/db/migrations.ts` by hand. Change `src/db/schema.ts` and regenerate.
- Never delete rows from user tables. Write the current time to `deletedAt` instead. Every query filters out rows with `deletedAt`.
- New IDs are UUIDs from `crypto.randomUUID()`. Never use auto-increment IDs.
- Store weight in grams, durations in seconds, distance in meters. Convert only in the interface.
- Convert units only through `src/lib/units.ts`. Never show raw grams or meters.
- Every optional feature checks its feature toggle through `useFeatures()`. A feature toggle hides interface only; it never deletes data.
- A new optional feature gets a new feature toggle in `FeatureToggles`, `DEFAULT_FEATURES` and the preset table in `docs/DATA_MODEL.md`.
- Do not add a new dependency without saying why in the task summary.
- Do not change `android/` or `ios/` unless the task asks for it.

## Words used in this project

The glossary (`docs/GLOSSARY.md`, imported above) lists the only allowed names.
Use only the glossary terms in code, comments, commit messages and the interface.
If a needed term is missing, stop and ask before inventing one.

## Code style

- TypeScript strict mode. No `any`.
- Function components and hooks only.
- Tailwind for styling.
- One component per file. File name matches the component name.
- Small pure functions for unit conversion and formatting live in `src/lib/`.

## Workflow

- Work on a branch. Never commit to `master` directly.
- One task from `docs/ROADMAP.md` per branch.
- If a task needs a decision that `docs/DECISIONS.md` does not cover, stop and ask.
- When a task changes a rule in this file or in `docs/`, update that file in the same commit.
- If `graphify-out/graph.json` exists, use `/graphify query` to find related code and docs before reading many files.
  Check what it finds in the files: the graph can be out of date, and inferred edges are guesses.

## Git

- Branch name: `task/<roadmap number>-<short-name>`, for example `task/0.2-remove-server-code`.
- Commit messages: short imperative summary, for example "Remove Prisma and API routes".
- Commit after the checks pass. Do not commit failing code.
- Push the branch and open a pull request with `gh pr create`. Never merge the pull request.
- Never push to `master`. Never force-push.
- Create tags only when I ask for a tag.