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

## 021 — Exercise images ship inside the app
Date: 2026-10-29
The exercise browser must show images without internet (decision 002). The app bundles the
free-exercise-db images of the pinned commit (about 100 MB). They are not in git:
`scripts/download-exercise-images.mjs` fetches them before `npm run dev` and `npm run build`.
Updating images when the phone is online, and images for custom exercises, come later (Phase 4b).

## 022 — Export: display units, CSV with commas, Excel through ExcelJS
Date: 2026-10-29
The export has one row per set. Weight is in the exercise's unit (its unit override, otherwise the
settings) with a unit column; duration is in seconds; distance is in m or km (ft or mi) with a unit
column. People read the file, and the numbers still work in formulas.
CSV is comma separated, UTF-8 with a byte order mark, so spreadsheet apps read letters such as ä.
The `.xlsx` file comes from ExcelJS (MIT, on npm). It loads only when the user exports, so it does
not slow the app start. SheetJS was rejected: its npm package is old, and newer versions install
only from its own server.

## 023 — The stretch timer signals inside the app
Date: 2026-10-29
At zero the stretch timer vibrates through the Haptics plugin and plays a short tone through the
Web Audio API, so the app needs no sound file. It counts from an end time, so it stays right when
the phone pauses the app; the signal then comes when the app is back in front.
A notification while the app is in the background needs the Local Notifications plugin and a
permission prompt; it comes with the rest timer later (see `docs/IDEAS.md`).

## 024 — Import reads the export format, checks everything first, skips what exists
Date: 2026-10-29
The app imports the CSV and `.xlsx` files it exports, so a user can move their data or edit it in a
spreadsheet. Columns are found by their header. The whole file is checked first: if any row cannot be
read, the app lists the rows and reasons and imports nothing, so a file is never half imported.
The import itself runs in one transaction for the same reason.
A workout whose date and start time (to the minute) already exist is skipped, so importing the same
file twice changes nothing. Exercise names match library and custom exercises without regard to case;
an unknown name becomes a custom exercise, with its load type from the file and its tracked fields from
the columns that have values. The export gained an "End time" column; without it, an imported workout
ends at its start time.

## 025 — Supersets: any number of exercises, guided rounds, rest after a round
Date: 2026-10-30
"Make superset" groups two or more workout exercises of one phase into one exercise group of type
`superset`; giant set and circuit stay unused for now. The members move next to each other, where the
first chosen one is, and from then on move up or down as one block. A group left with one member
after a delete becomes a single workout exercise again.
The group page guides the user through the rounds: the next exercise is the first one with the fewest
sets (A → B → … → A), and a tap on the rounds table logs or edits any set instead.
After the last set of a round, a rest timer counts down from `workout_groups.restSeconds`
(default 90 s), behind the `restTimer` feature toggle.

## 026 — Saved supersets keep targets from the logged sets
Date: 2026-10-30
"Save superset" on the group page copies the exercise group into a template of kind `superset`:
each exercise with its order, phase, the group type and rest, and targets from the sets logged in the
group (the number of sets as `targetSets`, the values of the last set as the other targets).
The set form uses targets only when an exercise has no last workout yet (prefill order in DATA_MODEL).
"Save superset" and the home page link to "Saved supersets" show only when the `supersets` and
`templates` feature toggles are both on. The "Saved supersets" page lists, renames and deletes them;
it still lists stored saved supersets when the toggles are off.

## Open questions
- Pricing (draft): free app plus a cheap yearly plan, no monthly plan. Recommendation so far:
  about 4.99€ per year plus a lifetime option; logging, history and CSV export always free.
- Keep Next.js, or move to Vite + React?
