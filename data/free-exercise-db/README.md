# free-exercise-db

Exercise library data from https://github.com/yuhonas/free-exercise-db
(The Unlicense, public domain).

- Commit: in `version.json`
- Update: `node scripts/update-exercise-library.mjs <commit>`. It writes `exercises.json` and `version.json`.

`src/db/seed.ts` maps these exercises into the `exercises`, `exercise_muscle_groups`
and `exercise_images` tables. It runs on first start and again when the library version changes
(the commit in `version.json` or `SEED_VERSION` in `seed.ts`).

The images (about 100 MB) are not in this repository. `scripts/download-exercise-images.mjs`
downloads them for the commit in `version.json` into `public/exercise-images/` before
`npm run dev` and `npm run build`, so the app bundles them (decision 021).
`exercise_images.path` holds their path inside that folder, such as `3_4_Sit-Up/0.jpg`.
