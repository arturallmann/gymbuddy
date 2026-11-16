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

## 037 — "Done before" first in exercise lists
Date: 2026-11-15
A search such as "squat" finds 56 library exercises, sorted by name, so the plain barbell squat drowns in
variations. Exercise lists (search and muscle groups on the "Add exercise" page, and the exercise browser)
now show the exercises the user did first, under "Done before", then all others under "All exercises".
Nothing is hidden.
"Done before" is sorted by the number of workouts with the exercise, then by the newest of them, then by
name, so a barbell squat done every week beats a goblet squat tried once last week. Each row says how often,
such as "12 workouts". `listExerciseUse()` counts active and ended workouts, without deleted rows.
The search on the "Add exercise" page no longer stops at 50 matches, so a done exercise is never cut off.
Favourites and a curated list of common exercises were left for later; history alone covers the regular case.

## 038 — Online library update: newer free-exercise-db library and images
Date: 2026-11-15
Until now a new library reached phones only with an app update (decision 018) (4b.4). New images mostly
belong to new or changed exercises, so the online update brings the whole library, not only images.
When the phone is online, 5 seconds after the start and at most once a day (`app_state.libraryCheckedAt`),
`LibraryUpdater` asks GitHub for the newest free-exercise-db commit. When it differs from the commit on the
phone (`app_state.onlineLibraryCommit`, otherwise the bundled one), the app:
1. downloads `dist/exercises.json` of that commit and checks it (`parseLibrary()`: the bundled shape, at least
   100 exercises, unique ids, image paths only like `Name_Of-Exercise/0.jpg`, so no file lands outside its folder);
2. downloads the images the app does not bundle, plus the ones GitHub lists as changed since the bundled
   commit, into the app's data folder (`library-images/…`);
3. only then updates the library in one transaction, with `exercise_images.storedFile` pointing to the
   downloaded files; all other images stay the bundled copies.
Any failure leaves the library as it was. Logging never waits: the update runs in the background and only
writes a console warning. A new bundled library (app update) replaces an online one and clears
`onlineLibraryCommit`, so the next check applies the online one again if it is still newer.
It uses no new dependency: `fetch` and the Filesystem plugin (`src/native/libraryDownload.ts`).
The app contacts api.github.com and raw.githubusercontent.com; nothing about the user is sent.

## 039 — Photos of custom exercises
Date: 2026-11-15
A custom exercise can have any number of photos (4b.5): "Take photo" (camera) or "Choose photo" (the phone's
photos) on its exercise page, and remove after a confirm step. The first photo shows in exercise lists.
Library exercises keep their library images.
The Camera plugin (`@capacitor/camera`, MIT, from the Capacitor team) takes or picks the photo; it needs no
Android permission. The app makes every photo smaller (at most 1080 px, JPEG) and writes it as a file to its
data folder (`exercise-photos/<uuid>.jpg`); `exercise_images` keeps a row with the file in `storedFile`.
Storing photos inside the database was rejected: it grows by about 200 KB per photo. A future backup or sync
must copy these files too.
A removed photo is a deleted row (`deletedAt`); its file stays. The unique index on `exercise_images`
(exercise, position) now ignores deleted rows, so a new photo can take a freed position.
The photo section follows the `exerciseImages` feature toggle.

## 040 — Calendar with plate bars (idea B)
Date: 2026-11-15
The calendar (4b.9, route `/calendar`, in the home page menu) follows idea B of the calendar ideas page:
- Month view: a grid of whole weeks. A day with ended workouts shows small bars in the plate colors of their
  categories (strength petrol, cardio yellow, stretch green, mobility grey; one grey bar when the workouts
  have no exercises). Tapping such a day opens a panel under the grid with its workouts.
- Week view: a list of the seven days with bars and exercise names, or "Rest day" for a past day without a
  workout. Tapping a day opens its workouts in place.
- Today sits on a yellow disc in both views. Arrows, a sideways swipe and "Today" (shown when today is not on
  screen) change the month or week. Weeks start on the phone's first day of the week (`Intl.Locale` week info,
  Monday when unknown).
- Each workout opens its workout detail page. The place (view, shown day, open day) lives in the address,
  and the detail page gets it as `back`, so its back arrow and Android Back return to the same place.
The calendar loads only the shown days (`listWorkoutHistory()` with a time span), which now also returns each
workout exercise with its category and number of sets. The dots and the shade by sets (ideas A and C) were
not chosen.

## 041 — Calendar icon on the home page; the calendar opens on the current week
Date: 2026-11-15
The calendar gets its own calendar icon at the top right of the home page, left of the book icon, and leaves
the book menu. Without a place in the address it opens the week view on the current week, the most
useful view during training; the month view stays one tap away. This changes decision 040.

## 042 — Exercise pages in tabs; weight and reps with − and +
Date: 2026-11-15
Most of the time the user only logs weight and reps (4b.11). Of the three layouts on the exercise view ideas
page, the user chose idea B, tabs, with two changes: weight and reps keep their text input and get − and + next
to it, and the inputs stand in one column.
- Workout exercise page: tab "Log" (the user's note, "Log a set to add…", last time, stretch timer, set form,
  logged sets) and tab "About" (image, short description, link to the exercise page, notes and units, phase).
  It opens on "Log".
- Exercise page: tabs "Progress" (chart and history view), "About" (images or photos, muscle groups,
  description, instructions, edit and delete for a custom exercise) and "Notes" (notes and units). It opens
  on "Progress".
- Set form: inputs one under the other. − and + move weight by 2.5 kg or 5 lb and reps by 1 (`stepWeightText`,
  `stepRepsText`); weight stops at 0 except added weight on a bodyweight exercise (assisted). RPE, set type and
  notes open with "+ RPE, set type and notes" and start open when an edited set has one of them.
Tabs keep each part short, so nothing scrolls away during a set. The menu (idea A) and folded rows (idea C)
were not chosen.

## 043 — Statistics: records on the pages, a statistics page, bodyweight with a date
Date: 2026-11-15
Of the three statistics ideas (4b.12) the user chose a mix of A and C: the exercise page and the workout
detail page show the most useful numbers, and a statistics page holds the rest.
- Exercise page, "Progress" tab: personal record tiles above the chart and history view; the chart gains e1RM.
- Workout detail page: a summary (volume, sets, exercises, PRs) and a PR badge on each exercise that beat
  every earlier workout. The first workout with an exercise reaches no PRs, so a PR always means progress.
- Statistics page (`/statistics`, in the book menu, not a fourth home page icon): tabs Workouts, Exercises,
  Muscle groups and Bodyweight; the first three share a time span (4 weeks, 3 months, a year). Muscle
  group numbers live only here.
- All of it follows a new `statistics` feature toggle (off in the simple preset).
Counting rules:
- e1RM: Epley, weight × (1 + reps ÷ 30), from sets of 1–12 reps; a single rep is its weight. External load only.
- Muscle groups: a set counts 1 for a primary and ½ for a secondary muscle group.
- Bodyweight: the user enters height and bodyweight (Settings, "Body"; bodyweight also on the statistics page).
  Each entry is a row in a new `bodyweights` table with the time it was measured, and applies from the start
  of that day. A new bodyweight never changes earlier workouts; workouts before the first one have no
  bodyweight. Storing the bodyweight on every set was rejected: the table gives the same result, keeps
  sets unchanged, and shows the bodyweight over time.
- Volume of a bodyweight exercise = (bodyweight + added weight) × reps, only when a bodyweight is known.
- The bodyweight never affects personal records: 5 dips at 85 kg are no PR over 5 dips at 80 kg, because
  bodyweight changes slowly and PRs get harder while losing weight. So a bodyweight exercise has PRs for
  added weight and reps only, never for volume or e1RM.
Height is stored in whole millimeters (`user_settings.heightMillimeters`), because meters would need decimals;
it shows in cm or in feet and inches with the distance unit. Nothing uses it yet.

## 044 — Swipe between tabs
Date: 2026-11-16
Pages with tabs (exercise page, workout exercise page, statistics page) change tabs with a sideways swipe
anywhere on the page: left for the next tab, right for the one before; it stops at the first and last tab.
A swipe counts when it moves at least 60 px sideways and clearly more sideways than down (`src/lib/swipe.ts`),
the same rule the calendar uses for months and weeks; both use `useSwipe()`. A swipe that starts in a text
field or in something that scrolls sideways (such as a row of chips) belongs to that element. The tabs
change at once, without a sliding animation, so the page stays as simple as a tap on a tab.

## 045 — Tabs, months and weeks slide in
Date: 2026-11-16
A changed tab (by tap or swipe, decision 044) and a changed month or week in the calendar slide in from the
side they come from: the next one from the right, the one before from the left, over 200 ms with a short fade.
The slide plays after the change; the content does not follow the finger during the swipe, which would fight
with scrolling up and down. Phones that ask for reduced motion get no slide. `useTabs()` keeps the chosen tab
and the direction; the classes `slide-from-right` and `slide-from-left` live in `globals.css`.

## 046 — Muscle map: warm clay shades, front and back, a page after End workout
Date: 2026-11-16
The muscle map (4b.13) is our own SVG of the body, front and back side by side, with one area per muscle group
of the exercise library (`src/lib/muscleMap.ts`). Of the mockups the user chose:
- Shades of one color, "warm clay" (muted orange-brown), from untrained (grey) through five steps; the most
  trained muscle group always gets the darkest step (`heatLevel()`). Petrol was rejected because its bright
  steps glared in the dark theme; numbers on the body and a weekly range of sets were not chosen.
  The colors are named colors `heat-0` to `heat-5` (this adds to decision 030).
- On the statistics page the muscle map replaces the muscle group list. It shades by sets per week by default
  (a set counts 1 for a primary and ½ for a secondary muscle group, decision 043), with volume per week one
  tap away. A tap on a muscle group shows its sets, volume and exercises; Android Back clears the choice.
- The workout detail page shows the map of that workout under its summary.
- "End workout" opens a new "Workout ended" page (`/workout/ended?id=…`): the summary, the muscle map and the
  personal records the workout reached. "Done" and Android Back go to the home page, which lists today's
  workouts. With the `statistics` feature toggle off, "End workout" goes home as before.
All of it follows the `statistics` feature toggle, so it needs no toggle of its own.

## 047 — Wider tap areas for small muscle groups
Date: 2026-11-16
On a phone, traps, adductors and abductors were hard to tap on the muscle map (decision 046). These and the
neck get an invisible band around their shape (`TAP_MARGIN` in `src/lib/muscleMap.ts`, 10–14 drawing units)
that takes taps too. The bands lie on top of their larger neighbors, which keep most of their area.
The drawing itself does not change.

## Open questions
- Pricing (draft): free app plus a cheap yearly plan, no monthly plan. Recommendation so far:
  about 4.99€ per year plus a lifetime option; logging, history and CSV export always free.
- Keep Next.js, or move to Vite + React?
