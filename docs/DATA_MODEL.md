# Data model

The source of truth is `src/db/schema.ts`. This file explains the meaning behind the tables.

## Tables

| Table | Holds |
|---|---|
| users | One local user per phone. Later linked to an online account. |
| user_settings | Units, feature toggles, preset and first-time setup state. One row per user. |
| app_state | Values the app keeps for itself, one row per key (`libraryVersion`). Not user data. |
| muscle_groups | Muscle areas such as back, biceps, hamstrings. |
| exercises | Library exercises (`userId` is null) and custom exercises (`userId` set). |
| exercise_muscle_groups | Links exercises to muscle groups, with role `primary` or `secondary`. |
| exercise_images | Images for an exercise, with order, license and attribution. |
| exercise_preferences | The user's own settings for one exercise: standing notes and unit overrides. |
| templates | A saved superset or routine. |
| template_exercises | Exercises in a template, with order, superset key and optional targets. |
| workouts | One workout, with start and end time. `endedAt` is NULL while it is the active workout (one per user). |
| workout_groups | A superset, circuit or giant set inside one workout. |
| workout_exercises | One exercise inside one workout, with order and phase. |
| sets | One logged effort, with weight, reps, duration or distance. |

## Units

| Value | Stored as | Example |
|---|---|---|
| Weight | integer grams | 12.5 kg → `12500` |
| Duration | integer seconds | 1 min 30 s → `90` |
| Distance | meters | 5 km → `5000` |
| Dates | integer milliseconds (Drizzle `timestamp_ms`) | |

## Display units

Storage never changes: grams, seconds, meters. Settings only change the display and input.

| Setting | Values | Default |
|---|---|---|
| `weightUnit` | `kg`, `lb` | `kg` |
| `distanceUnit` | `metric` (m, km), `imperial` (ft, mi) | `metric` |

- 1 lb = 453.59237 g. Convert user input to whole grams when saving.
- Show pounds rounded to 0.1 lb and kilograms rounded to 0.05 kg, so 45 lb shows as 45 lb again.
- All conversion and formatting lives in `src/lib/units.ts`, with tests for round trips.

### Unit override per exercise

A user can choose a different unit for one exercise in `exercise_preferences` (for example a machine marked in pounds).
- Unit for display and input = exercise override if set, otherwise `user_settings`.
- One helper, `getUnits(settings, preferences)`, decides this. Components never decide it themselves.
- The set form, history and chart of that exercise all use the override.
- Totals across exercises (for example weekly volume) use the global unit, because storage is the same everywhere.
- The set form shows the active unit next to the input, so the user always sees which unit applies.
- First-time setup suggests units from the phone's region (for example `en-US` → lb and imperial).

## Feature toggles

`user_settings.features` is a JSON object. Code merges it over `DEFAULT_FEATURES` from the schema file.
A new toggle therefore needs no migration: add it to `FeatureToggles` and `DEFAULT_FEATURES`.

| Feature toggle | Hides when off |
|---|---|
| `restTimer` | Rest timer and its controls |
| `supersets` | "Make superset" action and superset templates |
| `templates` | Saved templates and routines |
| `rpe` | RPE input on sets |
| `setTypes` | Warm-up set, drop set and failure set labels |
| `phases` | Warm-up phase, cool-down phase and stretch timer |
| `setNotes` | Notes field on each set |
| `exerciseImages` | Images in the exercise browser |
| `charts` | Chart view (history view stays) |

Rules:
- A toggle hides input and controls only. It never deletes or hides stored data.
  History still shows supersets, RPE and notes recorded earlier.
- Read feature toggles through one hook (`useFeatures()`). Components never read the settings table directly.

## Presets (first-time setup)

| Preset | restTimer | supersets | templates | rpe | setTypes | phases | setNotes | exerciseImages | charts |
|---|---|---|---|---|---|---|---|---|---|
| simple | off | off | off | off | off | off | off | on | on |
| standard | on | on | on | off | off | off | on | on | on |
| advanced | on | on | on | on | on | on | on | on | on |

First-time setup has three short steps: units, preset, optional fine-tuning of single toggles.
Changing any toggle afterwards sets `preset` to `custom`. Settings can change at any time.

## Load types

The `loadType` field on an exercise decides how the app reads `sets.weightGrams`.

| loadType | weightGrams means | Display |
|---|---|---|
| external | Full load | `12 kg` |
| bodyweight | Added load. Null = bodyweight only. Negative = assisted. | `BW`, `BW + 5 kg`, `BW − 20 kg` |
| none | Not used | (no weight) |

The tracked fields `tracksReps`, `tracksDuration` and `tracksDistance` decide which inputs the set form shows.

Examples:
- Bicep curl: external, reps
- Pull-up: bodyweight, reps
- Plank: bodyweight, duration
- Hamstring stretch: none, duration (category `stretch`)

## Notes instead of custom fields

The fixed fields cover common measurements. Notes cover everything else.
Do not add a new column for a rare measurement. Use notes.

| Level | Field | Example |
|---|---|---|
| Exercise (library text) | `exercises.description` | How to do a box jump |
| Exercise (user's own) | `exercise_preferences.notes` | "Measure jump height. Seat at 4." |
| Workout | `workouts.notes` | "Felt tired, short sleep" |
| Exercise in a workout | `workout_exercises.notes` | "Used the old machine" |
| Set | `sets.notes` | "60 cm", "green band" |

When the user logs a set, the set form shows the notes from the last workout with that exercise.
Library updates never change `exercise_preferences`.

## Supersets

- `workout_exercises.groupId` is NULL for a normal exercise.
- Exercises with the same `groupId` form one group. Their `position` values are neighbours.
- Inside a group, `sets.position` is the round number. Round 1 = set 1 of each member.
- The rest timer starts after the last member of a round. Rest length: `workout_groups.restSeconds`.
- A user can group exercises during a workout, or add a saved superset template.
- "Make superset" needs two or more workout exercises of one phase that are not in a group yet
  (decision 025). They move next to each other; a group moves up or down as one block, and changing
  the phase of one member changes it for the whole group.
- "Ungroup" clears `groupId` on the members and deletes the group. A delete that leaves one member
  does the same.
- The `supersets` feature toggle hides "Make superset" and "Ungroup"; stored groups still show.

## Templates

- A template is a saved superset (`kind = 'superset'`) or a full routine (`kind = 'routine'`).
- Adding a template to a workout COPIES its rows into `workout_exercises` and new groups.
  The workout never references template rows after the copy, so template edits never change history.
  `workout_groups.templateId` only records where a group came from.
- In a routine, rows with the same `groupKey` become one group in the workout.
- Starting a workout from a routine writes the routine's id to `workouts.templateId` (decision 027).
- Prefill order for the set form: last workout with this exercise first, then template targets.
- A saved superset made from a workout (decision 026) has one row per exercise, all with the same
  `groupKey`, the group's `groupType` and `restSeconds`, and targets from the sets logged in the group.
- Deleting a template writes `deletedAt` to it and its `template_exercises`. Workouts that used it keep their copies.
- Template targets reach the set form through the origin of a workout exercise: its group's `templateId`,
  otherwise its workout's `templateId` (a routine). Only the prefill reads them; the structure of the
  workout never does.

## Charts and history

Charts use only the fixed fields: `weightGrams`, `reps`, `durationSeconds`, `distanceMeters`.
Charts never parse notes.

Each exercise page has two views:
- **Chart** — shown only when the exercise tracks at least one fixed field.
  Values per workout are derived at query time (best set, total volume = weight × reps, longest duration).
  Do not store derived values in tables.
- **History** — a plain list of every set, newest workout first, with all fields and notes.
  Every exercise has this view, including note-only exercises.

Both views use one query: sets → workout_exercises (by `exerciseId`) → workouts, ordered by
`workouts.startedAt`, then `workout_exercises.position`, then `sets.position`.
Sets without a value for the charted field are left out of the chart, but stay in the history.

Chart values per workout (decision 029): heaviest weight (`weightGrams`, added weight on bodyweight
exercises), most reps, volume (sum of weight × reps, external load only), longest duration and
longest distance. The chart offers only values the exercise tracks; a note-only exercise has none.

## Phases

`workout_exercises.phase` is `warmup`, `main` or `cooldown`.
Stretches normally go in `cooldown`. The timer uses `exercises.defaultDurationSeconds`.

- With the `phases` feature toggle on, a new stretch goes in `cooldown` and everything else in `main`;
  the workout page shows one section per phase, and the workout exercise page has a phase choice.
- Moving a workout exercise up or down swaps it only with a neighbour in the same phase.
  Changing its phase keeps its `position`, so it keeps its order among the exercises of the new phase.
- With the toggle off, new workout exercises go in `main`; a stored phase still shows as a label.
- The stretch timer shows for exercises that track duration and are stretches or have a
  `defaultDurationSeconds`. At zero the phone vibrates and plays a tone; the user then logs the set.

## Rules for every query

- Filter out rows where `deletedAt` is set.
- Order sets by `position`. Order workout exercises by `position`.
- Soft delete: write the current time to `deletedAt`. Do the same for child rows (sets of a deleted workout exercise).
- Unique indexes on user tables apply only to rows where `deletedAt` is NULL, so a deleted row never blocks a new one.

## Exercise library

The library comes from free-exercise-db (public domain).
`source` = `free-exercise-db` and `sourceId` = its exercise id.
Re-running the seed updates these rows and never touches `source = 'custom'` rows.

The seed runs on first start and whenever the library version changes:
the commit in `data/free-exercise-db/version.json` or `SEED_VERSION` in `src/db/seed.ts`.
`app_state.libraryVersion` holds the version the phone seeded last.
Raise `SEED_VERSION` when `toLibraryExercise()` maps exercises differently.
Exercises that free-exercise-db removes stay on the phone, because workouts and exercise preferences use them.

### Custom exercises

A custom exercise has `source = 'custom'`, `userId` set and `sourceId` NULL.
The user chooses name, category, equipment, load type, tracked fields and muscle groups.
Only custom exercises can change; library exercises change only through library updates.
Deleting a custom exercise writes `deletedAt`: search no longer finds it, but workouts that used it still show it.
