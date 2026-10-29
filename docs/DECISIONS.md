# Decisions

Each entry records one decision and the reason. Add new entries at the bottom. Do not rewrite old entries; add a new entry that replaces them.

## 001 — Capacitor stays as the native shell
Date: 2026-10-28
The app is built from web code. A rewrite in React Native, Flutter or native code costs months.
A gym tracker shows forms, lists and timers. A web view handles these screens well.

## 002 — All data lives on the phone
Date: 2026-10-28
The app must work in gyms with weak signal. No feature may need a server to log a workout.

## 003 — Drizzle replaces Prisma
Date: 2026-10-28
Prisma needs Node.js and cannot run inside the phone's web view.
Drizzle runs on the phone through a Capacitor SQLite plugin and defines the schema in TypeScript.

## 004 — Next.js uses static export
Date: 2026-10-28
Capacitor loads static files from the app package. So the build uses `output: 'export'`.
API routes, server actions and server rendering are not allowed.

## 005 — Units are grams, seconds and meters
Date: 2026-10-28
Integers avoid rounding errors with 1.25 kg plates. The interface converts for display.

## 006 — Bodyweight exercises store added weight only
Date: 2026-10-28
The user logs "BW + 5 kg", not their bodyweight plus 5 kg. See `docs/DATA_MODEL.md`.

## 007 — UUIDs, timestamps and soft deletes on all user tables
Date: 2026-10-28
These fields prepare the database for future backups and friend features.

## 008 — Exercise library from free-exercise-db
Date: 2026-10-28
The dataset is public domain, includes images and stretches, and can ship inside the app.

## 009 — Notes instead of custom measurement fields
Date: 2026-10-28
Rare measurements (box jump height, band color, seat height) go in notes at exercise, workout,
workout exercise or set level. The schema gets no new column for a rare measurement.

## 010 — Charts use fixed fields only
Date: 2026-10-28
Charts use weight, reps, duration and distance. Note-only exercises get a plain set history instead.

## 011 — Supersets through groups, saved supersets through templates
Date: 2026-10-28
`workout_exercises.groupId` links exercises into a superset. Templates store saved supersets and routines.
Adding a template copies its rows, so template edits never change history.

## 012 — Units are a display setting
Date: 2026-10-28
Default is kg and metric distance. Users can choose lb and imperial distance as separate settings.
Storage stays in grams and meters, so changing units never changes data.

## 013 — Features can be turned off, with presets at first start
Date: 2026-10-28
Casual users should see a simple interface. Rest timers, supersets, templates and other extras are toggles.
First-time setup offers simple, standard and advanced presets, plus unit choice. Toggles hide interface only.

## 014 — Unit override per exercise
Date: 2026-10-28
Gyms mix equipment marked in kg and lb. A user can choose a unit for one exercise.
The override lives in `exercise_preferences` (renamed from `exercise_notes`) and only changes the display.

## 015 — SQLite plugin: @capacitor-community/sqlite
Date: 2026-10-28
The plugin is free and open source. The Capawesome plugin needs a paid license and a private registry.
Drizzle talks to the plugin through its `sqlite-proxy` driver and a small bridge in `src/db/driver.ts`.
The browser dev server uses the plugin's web version (`jeep-sqlite`, stored in IndexedDB).

## 016 — Plugin limits are guarded in the bridge
Date: 2026-10-28
The SQLite plugin fakes RETURNING on Android and returns wrong rows. Its web version ends a raw `BEGIN`.
So queries never use `.returning()`: they write rows with an id from `crypto.randomUUID()`, then select them by id.
Several writes go through the plugin's transaction API in one transaction.
`src/db/driver.ts` rejects both mistakes, so tests on better-sqlite3 catch them too.
Rules: `.claude/rules/database.md`. Test limits: `docs/TESTING.md`.

## 017 — Graphify as a developer tool
Date: 2026-10-28
A knowledge graph gives a quick overview of how code and docs connect, and shows rules written twice.
Graphify runs on the developer's machine only. It is not an app dependency, and `graphify-out/` is not committed.
See `docs/GRAPHIFY.md`.

## 018 — Library version decides when to seed again
Date: 2026-10-28
Phones that already had the library never got a newer one after an app update.
The library version is the free-exercise-db commit plus `SEED_VERSION` in `src/db/seed.ts`.
The phone stores the version it seeded last in a new `app_state` table, not in `user_settings`,
because it is not a choice of the user. The app loads the large library file only when the version changes.
Seeding every start was rejected: about 870 upserts through native code on each start.

## 019 — One active workout at a time
Date: 2026-10-29
A user has at most one active workout (started, not ended, not deleted). "Start workout" opens it
when it exists. A partial unique index on `workouts.userId` (where `endedAt` and `deletedAt` are NULL)
makes two taps at once still create one workout. "End workout" always keeps the workout;
"Discard workout" deletes it after a confirm step.

## 020 — Computed columns get a plain name
Date: 2026-10-29
The plugin's Android version reads each result column by name. SQLite names a computed column
after its text, and in a join that text has a dot, such as `count("sets"."id")`. Android then
treats it as table and column and the query fails, while the test database works.
So every computed column gets a name with `.as()`, and `src/db/driver.ts` rejects one that
has a dot and no name, so tests catch it. This adds to decision 016.

## Open questions
- Pricing (draft): free app plus a cheap yearly plan, no monthly plan. Recommendation so far:
  about 4.99€ per year plus a lifetime option; logging, history and CSV export always free.
- Keep Next.js, or move to Vite + React?
- Excel library: SheetJS or ExcelJS?
