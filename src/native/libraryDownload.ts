// The network side of the online library update (decision 038): asks GitHub for the newest
// free-exercise-db commit and downloads its library file and images. Every call has a time limit,
// and every failure is an error the caller can ignore; logging never waits for any of this.
import { blobToBase64, writeStoredImage } from './storedImages';

const REPOSITORY = 'yuhonas/free-exercise-db';
const API = `https://api.github.com/repos/${REPOSITORY}`;
const RAW = `https://raw.githubusercontent.com/${REPOSITORY}`;
const TIMEOUT_MS = 20_000;
// GitHub lists at most this many changed files; a longer list is cut off and so unknown.
const MAX_COMPARE_FILES = 300;
const COMMIT = /^[0-9a-f]{40}$/;

async function get(url: string, accept?: string): Promise<Response> {
  const response = await fetch(url, {
    headers: accept ? { Accept: accept } : undefined,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${url}`);
  }
  return response;
}

// The newest commit of free-exercise-db.
export async function fetchHeadCommit(): Promise<string> {
  const commit = (await (await get(`${API}/commits/HEAD`, 'application/vnd.github.sha')).text()).trim();
  if (!COMMIT.test(commit)) {
    throw new Error('GitHub sent no commit');
  }
  return commit;
}

// The library file (dist/exercises.json) of a commit, not yet checked.
export async function fetchLibraryFile(commit: string): Promise<unknown> {
  return (await get(`${RAW}/${commit}/dist/exercises.json`)).json();
}

// The files that changed between two commits, or null when GitHub cannot say all of them.
export async function fetchChangedFiles(base: string, head: string): Promise<string[] | null> {
  try {
    const body = (await (await get(`${API}/compare/${base}...${head}`)).json()) as {
      files?: { filename: string; status: string }[];
    };
    if (!body.files || body.files.length >= MAX_COMPARE_FILES) return null;
    return body.files.filter((file) => file.status !== 'removed').map((file) => file.filename);
  } catch {
    return null;
  }
}

// Downloads one image of a commit into the app's data folder.
export async function downloadImage(commit: string, path: string, file: string): Promise<void> {
  const blob = await (await get(`${RAW}/${commit}/exercises/${path}`)).blob();
  await writeStoredImage(file, await blobToBase64(blob));
}
