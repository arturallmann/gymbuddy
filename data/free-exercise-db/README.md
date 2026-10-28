# free-exercise-db

Exercise library data from https://github.com/yuhonas/free-exercise-db
(The Unlicense, public domain).

- Commit: in `version.json`
- Update: `node scripts/update-exercise-library.mjs <commit>`. It writes `exercises.json` and `version.json`.

`src/db/seed.ts` maps these exercises into the `exercises`, `exercise_muscle_groups`
and `exercise_images` tables. It runs on first start and again when the library version changes
(the commit in `version.json` or `SEED_VERSION` in `seed.ts`).

The images (about 100 MB) are not in this repository yet. `exercise_images.path`
holds their path inside the free-exercise-db `exercises/` folder.
