# free-exercise-db

Exercise library data from https://github.com/yuhonas/free-exercise-db
(The Unlicense, public domain).

- Commit: `f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5`
- Update: `node scripts/update-exercise-library.mjs <commit>`, then change the commit above.

`src/db/seed.ts` maps these exercises into the `exercises`, `exercise_muscle_groups`
and `exercise_images` tables on first start.

The images (about 100 MB) are not in this repository yet. `exercise_images.path`
holds their path inside the free-exercise-db `exercises/` folder.
