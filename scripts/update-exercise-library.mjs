// Downloads the exercise library from free-exercise-db (public domain) into
// data/free-exercise-db/. Usage: node scripts/update-exercise-library.mjs <commit>
// Also writes the commit to version.json, so phones seed the new library after an app update.
import { writeFileSync } from 'node:fs';

const commit = process.argv[2];
if (!commit) {
  console.error('Usage: node scripts/update-exercise-library.mjs <commit>');
  process.exit(1);
}
const url = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/${commit}/dist/exercises.json`;
const response = await fetch(url);
if (!response.ok) {
  throw new Error(`Download failed: ${response.status} ${url}`);
}
const exercises = await response.json();
writeFileSync('data/free-exercise-db/exercises.json', JSON.stringify(exercises, null, 2) + '\n');
writeFileSync('data/free-exercise-db/version.json', JSON.stringify({ commit }, null, 2) + '\n');
console.log(`Wrote ${exercises.length} exercises from ${commit}`);
