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

## 027 — Routines: save any workout, start from the Routines page
Date: 2026-10-30
"Save as routine" on the active workout page and on a past workout's detail page copies the whole
workout into a template of kind `routine`, with the same rules as a saved superset (decision 026):
order, phases, each exercise group with its own `groupKey`, type and rest, and targets from the logged sets.
The Routines page (home page link, `templates` feature toggle) lists, renames and deletes routines.
"Start" starts a workout from a routine in one transaction: the new workout records the routine in
`workouts.templateId` and gets a copy of its rows. While a workout is active, the page offers
"Continue workout" instead (decision 019).

## 028 — Export and import keep exercise groups
Date: 2026-10-30
The export has a "Group" column: the group type and a number per workout, such as "Superset 1",
in the order the groups first appear; empty for a single workout exercise. The import reads it back:
rows of one workout with the same label become one exercise group of that type, with the default rest
(the file has no rest column). So exporting and importing a workout with supersets keeps them.
This adds to decisions 022 and 024.

## 029 — Progress views: own SVG chart, five values per workout
Date: 2026-10-30
Each exercise page has a history view and, when the exercise tracks a fixed field and the `charts`
feature toggle is on, a chart view. The chart is a small SVG line chart written in the app, not a
chart library: no new dependency, small enough for a phone. Fancier charts can come in Phase 4b.
Per workout it shows the heaviest weight, the most reps, the volume (weight × reps, only for
external load), the longest duration or the longest distance, in the exercise's units.

## 030 — Color theme "Bumper Plate", light, dark or same as the phone
Date: 2026-11-14
The user chose the "Bumper Plate" color scheme around their favourite color #0b3f57: petrol for main
buttons and chosen options, competition plate colors for states (yellow for timers, red for delete,
green for done), on cool grey neutrals. Each color has a light and a dark value, and the main pairs
reach WCAG AA contrast in both.
The colors are CSS variables in `src/app/globals.css`, exposed as named colors in `tailwind.config.ts`
(`page`, `surface`, `line`, `line-strong`, `ink`, `muted`, `primary`, `link`, `accent`, `danger`,
`success`, plus `on-…` for text on a filled color). Components use only these names, never fixed
Tailwind colors such as `sky-600`, so one change of a variable changes the whole app. A plain `border`
uses `line-strong`, so cards and buttons keep visible borders in the light theme.
The theme is a setting: `user_settings.theme` is `system` (default, "Same as phone"), `light` or `dark`.
`light` and `dark` write `data-theme` on `<html>`; `system` leaves it out, so the phone's light or dark mode
decides through `prefers-color-scheme`. Until the settings load, the phone's mode applies.

## 031 — Add exercise page; an exercise joins the workout with its first set; no discard
Date: 2026-11-14
The workout page shows a round + button instead of "Add exercise" and "Add saved superset".
It opens the "Add exercise" page: a search field over all exercises and, while the search is empty,
the list of muscle groups, each opening the exercises that work it (primary or secondary).
The top bar of the page links to saved supersets (with the `supersets` and `templates` feature toggles);
tapping one adds it to the workout as before (decision 026).
Tapping an exercise opens the workout exercise page for it right away, but adds nothing yet.
The first logged set adds the exercise and that set in one transaction (`addWorkoutExerciseWithSet`),
so looking at an exercise never leaves an empty workout exercise behind. An exercise already in the
workout opens its workout exercise instead. The phase follows the same default as before; it can change
after the first set.
"Discard workout" is gone from the active workout (this replaces that part of decision 019). The user ends
the workout and, if it was a mistake, deletes it with "Delete workout" on its workout history page.
"End workout" and a smaller elapsed time move into the top bar of the workout page.

## 032 — Workout page bars, primary muscle groups, category filter, arrow-only back links
Date: 2026-11-15
This adjusts decision 031 after trying it on a phone.
- The workout page has a bar at the bottom with "End workout" and the + button, where the thumb is.
  "Save as routine" moves to the top bar; its name form opens on a line below it.
- A muscle group on the "Add exercise" page lists only exercises where it is the primary muscle group,
  so Biceps shows curls, not rows. The page lists only muscle groups that have such an exercise.
  The exercise browser (`/exercises`) keeps its filter over primary and secondary muscle groups.
- A category filter (All, Strength, Cardio, Stretch, Mobility) narrows the muscle groups, their
  exercises and the search. It lives in the address (`?category=…`), so it stays when the user opens
  a muscle group and comes back.
- Back links are an arrow only (`BackLink`), named for screen readers ("Back to workout"), because the
  text next to long page titles pushed them onto two lines.

## 033 — Drag to reorder with dnd-kit
Date: 2026-11-15
Workout exercises move by dragging (4b.1). The drag library is dnd-kit (`@dnd-kit/core`, `@dnd-kit/sortable`,
`@dnd-kit/utilities`, MIT): it handles touch, scrolling while dragging and screen reader text, and it is small.
Writing touch dragging by hand was rejected: phones differ in how they report touches, and scrolling
and dragging easily get mixed up.
Two sensors start a drag (`src/lib/dragSensors.ts`): a press on the handle on the right starts it at once;
a long press (300 ms, the finger moving less than 8 px) anywhere on the card starts it too. A finger that
moves earlier scrolls the page. A tap after a drag does not open the workout exercise.
A card moves only inside its phase, and an exercise group moves as one card. `moveWorkoutExerciseTo()`
writes the new order in one transaction. The ↑ and ↓ buttons stay for screen readers and keyboards only.

## 034 — Android Back follows the back arrow, after closing what is open
Date: 2026-11-15
Back used to close the app on every page (4b.2). The App plugin (`@capacitor/app`, MIT, from the Capacitor
team) reports the Back button and the Back gesture; `src/native/app.ts` wraps it.
Back does what the user sees on screen, in this order:
1. Close what is open on the page: a confirm step, a set being edited, the name form of "Save as routine"
   or "Save superset", choosing for a superset, renaming a template, a later step of first-time setup.
2. Otherwise go where the page's back arrow (`BackLink`) goes. So Back always matches the arrow,
   for example workout exercise page → workout → home, even when the user came through the
   "Add exercise" pages.
3. Otherwise close the app. Only the home page and the first step of first-time setup have no back arrow.
Components register these handlers with `useBackHandler()` while they are shown; `src/lib/backStack.ts`
picks the newest "close" handler, then the newest "page" handler. The browser history was rejected as the
rule: after "Add exercise" it would walk back through the search pages instead of to the workout.

## 035 — A clean home page with icons; trash icons; more exercise filters
Date: 2026-11-15
The home page shows only the app name with a dumbbell mark (top left), two icons (top right),
"Start workout" or "Continue workout" in the middle and, below it, the workouts ended today.
- The book icon opens a menu: workout history, exercises, routines (`templates` feature toggle) and saved
  supersets (`supersets` and `templates`). Android Back, a tap outside or a second tap closes it.
- The gear icon opens the settings.
- "Today" lists ended workouts that started on the phone's current day (`listWorkoutHistory()` with a time
  span from `dayRange()`), like the workout history.
Every red "Remove" text becomes a trash can icon; the button keeps its name for screen readers
("Remove set 1", "Remove Squat"). Task 4b.3 (telling the two apart) stays open.
The exercise browser gains the category filter of the "Add exercise" page and a "Custom only" button.
It keeps its muscle group filter over primary and secondary muscle groups.

## 036 — Removing a workout exercise asks first
Date: 2026-11-15
Both "Remove" buttons became trash icons (decision 035), so they looked the same (4b.3).
Removing a workout exercise takes all its sets along, so its red trash icon now asks first, inside the card:
"Remove Squat and its sets from this workout?" with "Remove" and "Keep". Android Back keeps it.
Removing one set stays one tap, with a smaller grey trash icon, because one set is quick to log again.

## Open questions
- Pricing (draft): free app plus a cheap yearly plan, no monthly plan. Recommendation so far:
  about 4.99€ per year plus a lifetime option; logging, history and CSV export always free.
- Keep Next.js, or move to Vite + React?
