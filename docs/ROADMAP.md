# Roadmap

Each task is small enough for one branch. Each task lists how to check that it is done.

## Phase 0 — Clean the base (done)

- [x] **0.1 Upgrade dependencies.** Next.js, React, Capacitor and TypeScript to current versions.
  Done when: `npm run build` succeeds with `output: 'export'`.
- [x] **0.2 Remove server code.** Delete `app/api/`, `lib/prisma.ts`, `prisma/` and Prisma packages.
  Done when: no file imports `@prisma/client` and the static build succeeds.
- [x] **0.3 Fix Capacitor config.** Remove the LAN `server` block. Change `appId` to `com.gymbuddy.app`. Delete the duplicate `com/example/app/MainActivity.java`.
  Done when: `npx cap sync android` succeeds and the app opens on a phone from bundled files.
- [x] **0.4 Add checks.** Add `typecheck` and `test` scripts with Vitest. Turn on TypeScript strict mode.
  Done when: all three checks pass.
- [x] **0.5 Replace the boilerplate home page and README.**

## Phase 1 — Database on the phone (done)

- [x] **1.1** Add Drizzle, Drizzle Kit and the chosen SQLite plugin.
- [x] **1.2** Add `src/db/schema.ts` and generate the first migration.
- [x] **1.3** Open the database and run migrations at app start (`src/db/client.ts`).
- [x] **1.4** Seed muscle groups and the free-exercise-db library on first start.
- [x] **1.5** Unit conversion and display helpers in `src/lib/units.ts` (kg/lb, metric/imperial) with round-trip tests.
- [x] **1.6** Settings: `user_settings` row, `useFeatures()` hook, settings page with units and toggles.
  Done when: every toggle in `docs/DATA_MODEL.md` hides its interface part, and stored data still shows in history.
  Note: the toggles exist, but the interface parts they hide come in later tasks. Each of those tasks checks its toggle.
- [x] **1.7** First-time setup: units (suggested from phone region), preset choice, optional fine-tuning.
  Done when: a fresh install shows setup once, and all choices can change later in settings.

## Phase 2 — Log workouts (done)

- [x] **2.1** Start and end a workout. One active workout at a time; it can also be discarded.
- [x] **2.2** Add exercises to a workout; reorder them. Search by name; move up or down; remove.
- [x] **2.3** Log sets; the form follows the exercise's load type and tracked fields. Prefill and "Last time" from the last workout with the exercise.
  Each workout exercise has its own page (`/workout/exercise?id=…`) for logging and editing sets;
  the workout page shows a summary of the sets. Tapping a logged set edits it in the same form.
- [x] **2.4** Workout history list and workout detail page. The detail page is read-only, with "Delete workout".
- [x] **2.5** Exercise browser with muscle group filter, images and instructions. Images ship in the app (decision 021).
- [x] **2.6** Custom exercises: create, change and delete, from the exercise browser.
- [x] **2.7** Exercise preferences: standing notes and unit override per exercise.
  The workout exercise page also shows the exercise's first image (behind the `exerciseImages` toggle),
  a short description (category, equipment and primary muscle groups, or `exercises.description` when set)
  and a link to the exercise's page in the exercise browser.
  Done when: an exercise with a lb override shows lb in its set form, history and chart, while other exercises keep the global unit.
  (The chart comes in 4.2 and uses the same `getUnits()`.)

## Phase 3 — Export and cool-down phase (current)

- [x] **3.1** CSV export of all sets, from the settings page (decision 022).
- [ ] **3.2** Excel export.
- [ ] **3.3** Cool-down phase with stretch timer.

## Phase 3b — Supersets and templates

- [ ] **3b.1** Group exercises in a workout into a superset ("Make superset" action).
  Done when: the superset card shows one row per round and the rest timer starts after the last member.
- [ ] **3b.2** Save a superset from a workout as a template.
- [ ] **3b.3** Add a saved superset to a workout in one tap.
  Done when: editing the template afterwards does not change the earlier workout.
- [ ] **3b.4** Routines: save a full workout as a template and start a workout from it.
- [ ] **3b.5** Export adds a "Group" column (for example "Superset 1").

## Phase 4 — Progress views

- [ ] **4.1** History view per exercise: every set in order, with notes.
- [ ] **4.2** Chart view per exercise for weight, reps, duration and distance only.
  Done when: note-only exercises show the history view and no chart.

## Phase 4b — Interface polish

Starts when the basic features above work, so the details can be tuned in one go.

- [ ] **4b.1** Drag to reorder workout exercises.
  A drag handle on the right of each workout exercise starts a drag right away.
  A short hold anywhere on the workout exercise also starts a drag from where the finger is.
  The ↑ and ↓ buttons from 2.2 go away, or stay only for screen readers.
  Probably needs a drag library (for example dnd-kit); say why in the task summary.
  Done when: reordering by drag works on a phone, and scrolling the page does not start a drag.
- [ ] **4b.2** Fix every Android Back action: today the Back button and the Back gesture close the app on every page.
  Back first closes what is open on the page (the exercise picker, a confirm step, a set being edited),
  then goes back one page. Only on the home page does it close the app.
  Needs the Capacitor App plugin (`backButton` event), wrapped in `src/native/`.
  Done when: on a phone, Back never closes the app outside the home page, for example
  workout exercise page → workout → home, exercise detail → exercises → home, workout detail → workout history → home.
- [ ] **4b.3** Make "Remove" for a workout exercise and "Remove" for a set look different,
  so a tap meant for a set never removes the whole workout exercise (for example an icon, or a confirm step).
- [ ] **4b.4** Update exercise images when the phone is online.
  The app ships the images of one free-exercise-db commit (decision 021). When the phone has internet,
  the app checks for a newer library version and downloads only changed or new images.
  Offline, the bundled images stay. Logging never waits for the check.
- [ ] **4b.5** Images for custom exercises: take a photo or pick one from the phone.
  Needs the Camera plugin, wrapped in `src/native/`, and images stored on the phone.

## Phase 5 — Online (later)

- [ ] Backups to a server.
- [ ] Friends can view each other's history.

## Ideas (not planned)

See `docs/IDEAS.md`: smart watch support.
