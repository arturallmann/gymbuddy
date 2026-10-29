// Downloads the exercise images of free-exercise-db (public domain) into
// public/exercise-images/, so the static build bundles them into the app.
// It uses the commit in data/free-exercise-db/version.json, the same one as the
// library data, and skips the download when that commit is already there.
// The images are not in git (about 100 MB); this script fetches them again on a new clone.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const TARGET = 'public/exercise-images';
const MARKER = join(TARGET, '.commit');
const { commit } = JSON.parse(readFileSync('data/free-exercise-db/version.json', 'utf8'));

if (existsSync(MARKER) && readFileSync(MARKER, 'utf8').trim() === commit) {
  process.exit(0);
}

console.log(`Downloading exercise images from free-exercise-db ${commit} …`);
const checkout = mkdtempSync(join(tmpdir(), 'free-exercise-db-'));
const git = (...args) => execFileSync('git', args, { cwd: checkout, stdio: ['ignore', 'ignore', 'inherit'] });
try {
  git('init', '--quiet');
  git('remote', 'add', 'origin', 'https://github.com/yuhonas/free-exercise-db.git');
  git('sparse-checkout', 'set', 'exercises');
  git('fetch', '--quiet', '--depth=1', '--filter=blob:none', 'origin', commit);
  git('checkout', '--quiet', 'FETCH_HEAD');

  rmSync(TARGET, { recursive: true, force: true });
  const exercises = JSON.parse(readFileSync('data/free-exercise-db/exercises.json', 'utf8'));
  let count = 0;
  for (const path of exercises.flatMap((exercise) => exercise.images)) {
    const source = join(checkout, 'exercises', path);
    if (!existsSync(source)) {
      throw new Error(`Image ${path} is missing in free-exercise-db ${commit}`);
    }
    cpSync(source, join(TARGET, path));
    count++;
  }
  writeFileSync(MARKER, `${commit}\n`);
  console.log(`Wrote ${count} images to ${TARGET}`);
} finally {
  rmSync(checkout, { recursive: true, force: true });
}
