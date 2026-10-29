# Testing

Every change comes with tests. A task is not done until its tests exist and pass.

## Commands

| Command | What it runs |
|---|---|
| `npm test` | All tests once (Vitest) |
| `npx vitest` | Tests in watch mode |
| `npx vitest run --project unit` | Only helper and database tests (Node) |
| `npx vitest run --project components` | Only component and page tests (jsdom) |
| `npx vitest run src/lib/units.test.ts` | One file |

## Where tests live

A test file sits next to the file it tests and has the same name plus `.test`:
`src/lib/units.ts` → `src/lib/units.test.ts`, `src/app/settings/page.tsx` → `src/app/settings/page.test.tsx`.

`vitest.config.mts` has two projects:

| Project | Files | Environment |
|---|---|---|
| `unit` | `src/**/*.test.ts` | Node |
| `components` | `src/**/*.test.tsx` | jsdom (simulated browser), with `vitest.setup.ts` |

A `.test.ts` file that needs a browser can start with `// @vitest-environment jsdom`
(see `src/db/client.web.test.ts`).

## What to test

| Code | Test with | Example |
|---|---|---|
| Pure helpers in `src/lib/` | Plain inputs and outputs. Round trips for conversions. | `src/lib/units.test.ts` |
| Queries in `src/db/` | `createTestDatabase()`: an in-memory database with all migrations | `src/db/settings.test.ts` |
| Components | Testing Library: render, click as a user would, check what the user sees | `src/components/ToggleRow.test.tsx` |
| Components and pages that read or write data | `renderWithDatabase()`, then check the screen and the saved rows | `src/app/settings/page.test.tsx` |
| Startup code that calls the plugin | `createFakePlugin()` in place of the real plugin | `src/db/client.test.ts` |

Rules:
- Test behavior the user or the caller sees, not implementation details.
  Find elements by role and name (`getByRole('switch', { name: 'RPE' })`), not by class or test id.
- Every query function gets tests for its normal case, for soft-deleted rows, and for anything
  that runs at the same time (two calls at once must not create two rows).
- Every bug fix gets a test that fails without the fix.
- Every feature toggle gets a test that the interface part is hidden when the toggle is off
  and that stored data still shows.
- Check that a new test can fail: break the code for a moment and run the test.

## Test helpers (`src/testing/`)

| Helper | File | Use |
|---|---|---|
| `createTestDatabase()` | `database.ts` | In-memory database with migrations. Returns `{ db, conn }`. |
| `createTestConnection()` | `database.ts` | Plugin-like connection without migrations. |
| `renderWithDatabase(ui, { settings, db })` | `render.tsx` | Renders inside the database and settings providers. Returns `{ db, user, ... }`; `user` is a `userEvent` instance. Pass `db` to write rows before rendering. |
| `savedSettings(db)` | `render.tsx` | Reads the saved settings. |
| `createFakePlugin()` | `plugin.ts` | Fake `SQLiteConnection` for testing `src/db/client.ts`. |

Pages that use `next/navigation` mock it with `vi.mock('next/navigation', ...)`
(see `src/components/SetupGate.test.tsx`).

## Limits of the test database

The test connection runs the same bridge (`src/db/driver.ts`) as the app, but on better-sqlite3,
not on the plugin. It cannot catch plugin bugs. Known plugin limits are guarded in the bridge
(decision 016 in `docs/DECISIONS.md`) and have tests there:
- RETURNING is rejected, because the plugin fakes it on Android and returns wrong rows.
- Transactions go through the plugin's transaction API, because its web version ends raw `BEGIN`.

So a change to `src/db/` or startup also needs a check in the real app:
1. `npm run dev` and try the change in the browser.
2. `npm run android` and try it on a phone. `adb logcat | grep Capacitor` shows the plugin calls and errors.
