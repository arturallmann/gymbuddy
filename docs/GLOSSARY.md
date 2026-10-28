# Glossary

One thing, one word. Use these terms in code, comments, commit messages, docs and the interface.
The "Not allowed" column lists words that must not be used for that thing.
Names follow common gym apps (Hevy, Strong, wger) where possible, so users recognise them.

## Training

| Term (interface) | Code name | Meaning | Not allowed |
|---|---|---|---|
| Workout | `workout`, table `workouts` | One training occasion with a start and end time. | session, day, training, workout log |
| Exercise | `exercise`, table `exercises` | A type of movement in the library, such as Bench Press. | movement, lift, activity, drill |
| Workout exercise | `workoutExercise`, table `workout_exercises` | One exercise inside one workout, together with its sets. The interface shows only the exercise name; docs and code always use the full term. | entry, slot, session exercise, exercise log |
| Set | `set`, table `sets`, type `WorkoutSet` | One logged effort: weight, reps, duration and/or distance. The type is `WorkoutSet` because `Set` is a JavaScript built-in. | entry, log, round |
| Rep | `reps` | One repetition inside a set. | repetition (in code), count |
| Set type | `setType` | Label of a set: normal set, warm-up set, drop set, failure set. Code values: `normal`, `warmup`, `dropset`, `failure`. | working set (use normal set) |
| Rest | `restSeconds` | Pause between sets or rounds. The rest timer counts it down. | break, pause, recovery |

## Exercise groups

| Term (interface) | Code name | Meaning | Not allowed |
|---|---|---|---|
| Exercise group | `workoutGroup`, table `workout_groups` | Umbrella term in code and docs for exercises done in rounds. The interface shows the group type instead. | block, cluster, combo, superset (as umbrella) |
| Superset | group type `superset` | Two exercises done back to back, then rest. | pair, combo |
| Circuit | group type `circuit` | Several exercises in a row, repeated for several rounds. | — |
| Giant set | group type `giant_set` | Three or more exercises for the same muscle group, back to back. | tri-set (use giant set) |
| Round | set `position` inside a group | Round N = set N of every exercise in the group. | lap, circuit (as a round) |

## Workout phases

| Term (interface) | Code name | Meaning | Not allowed |
|---|---|---|---|
| Warm-up phase | phase `warmup` | Exercises before the main part of a workout. | warm-up (alone) |
| Main phase | phase `main` | The main part of a workout. | — |
| Cool-down phase | phase `cooldown` | Stretches and easy work after the main part. | cool-down (alone), post-workout |

**Rule:** never write "warm-up" alone. Write "warm-up set" or "warm-up phase", because both exist.

## Exercise library

| Term (interface) | Code name | Meaning | Not allowed |
|---|---|---|---|
| Muscle group | `muscleGroup`, table `muscle_groups` | A muscle area an exercise works, such as biceps or lats. | body part, bodypart, muscle, target |
| Primary / secondary muscle group | role `primary`, `secondary` | The main and the helping muscle groups of an exercise. | main/side, target/synergist |
| Category | `category` | `strength`, `cardio`, `stretch` or `mobility`. | type, kind |
| Equipment | `equipment` | What the exercise needs, such as barbell or cable. | gear, tool |
| Library exercise | exercise with `userId` = NULL | An exercise that ships with the app. | default exercise, built-in exercise |
| Custom exercise | exercise with `userId` set | An exercise the user created. | user exercise, own exercise |
| Load type | `loadType` | How the app reads a set's weight: `external`, `bodyweight` or `none`. | format, weight type, mode |
| Added weight | `weightGrams` on a bodyweight exercise | Weight on top of bodyweight. Shown as "BW + 5 kg". Negative = assisted. | extra weight, plus weight |
| Tracked fields | `tracksReps`, `tracksDuration`, `tracksDistance` | Which inputs a set of this exercise has. | format, metrics, measurements, tracking flags |
| Description | `exercises.description` | Library text about the exercise. Only library updates change it. | notes, about |
| Instructions | `exercises.instructions` | Library steps for doing the exercise. | how-to, guide, steps (as a name) |

## Notes and preferences

| Term (interface) | Code name | Meaning | Not allowed |
|---|---|---|---|
| Notes | `notes` | Free text the user writes. Exists on workouts, workout exercises, sets and exercise preferences. | comment, memo, description |
| Exercise preferences | table `exercise_preferences` | The user's own notes and unit override for one exercise. | exercise settings, exercise notes (as table name) |

## Plans

| Term (interface) | Code name | Meaning | Not allowed |
|---|---|---|---|
| Template | `template`, table `templates` | Umbrella term in code and docs for anything saved for reuse. The interface shows "Routine" or "Saved superset" instead. | plan, preset |
| Routine | template kind `routine` | A saved plan for a whole workout, such as "Push day". | program, plan, split, preset |
| Saved superset | template kind `superset` | A saved exercise group added to a workout in one tap. | superset template (in the interface) |
| Target | `targetReps`, `targetWeightGrams` and so on | Planned values in a template. The set form prefills from them. | goal |
| Goal | (reserved) | A future feature, such as "40 push-ups in under 2 minutes". Do not use the word for anything else. | — |
| Program | (reserved) | Not used. A future group of routines over weeks. | — |

## Settings

| Term (interface) | Code name | Meaning | Not allowed |
|---|---|---|---|
| Settings | table `user_settings` | The user's app-wide choices. | preferences (that word is for exercise preferences), config, options |
| Weight unit | `weightUnit` | `kg` or `lb`. | — |
| Distance unit | `distanceUnit` | `metric` (m, km) or `imperial` (ft, mi). | — |
| Unit override | `exercise_preferences.weightUnit`, `.distanceUnit` | A different unit for one exercise. | custom unit, exercise unit |
| Feature toggle | type `FeatureToggles`, hook `useFeatures()` | An on/off switch that hides part of the interface. | feature flag, switch, option |
| Preset | `preset` | A set of feature toggles: `simple`, `standard`, `advanced`, `custom`. Only for settings. | mode, profile, template |
| First-time setup | `setupCompletedAt` | The short setup at first start: units, preset, fine-tuning. | onboarding, wizard, intro |

## Progress

| Term (interface) | Code name | Meaning | Not allowed |
|---|---|---|---|
| History view | — | A plain list of every set of one exercise, newest workout first. | log, timeline, feed |
| Chart view | — | A chart of weight, reps, duration or distance over time. | graph, stats, analytics |
| Volume | derived | Sum of weight × reps. | tonnage, load, total weight |
| Personal record | derived | The best value ever for an exercise. Short form in the interface: PR. | best, max, record (alone) |
| Estimated one-rep max | derived | A calculated maximum for one rep. Short form: e1RM. | 1RM (that means a real tested max), max |

## Data words

| Term | Meaning | Not allowed |
|---|---|---|
| Delete | For user data: writing the current time to `deletedAt`. Rows are never removed. (Deleting repo files is normal.) | erase, hard delete |
| User | The person using the app. One local user per phone. | athlete, member, account (until online features exist) |
| Sync | Sending changed rows to a server. Not built yet. | upload, backup (backup is a future feature that uses sync) |

## Writing rules

- Never use "set" as a verb in docs or comments. Write "change", "choose", "write" or "fill in" instead.
- Never use a word from a "Not allowed" column for the thing in that row.
- If a term is missing, ask before inventing a new one. Then add it here.
