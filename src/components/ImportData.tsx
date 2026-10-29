'use client';

import { useRef, useState } from 'react';
import { useDatabase } from '@/db/DatabaseContext';
import { importWorkouts } from '@/db/import';
import { useSettings } from '@/hooks/useSettings';
import { IMPORT_ACCEPT, readImportTable } from '@/lib/importFile';
import { parseImportTable } from '@/lib/importTable';

const SHOWN_ERRORS = 10;

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// Imports a CSV or Excel file in the export format. The whole file is checked first;
// any problem imports nothing (decision 024).
export default function ImportData() {
  const db = useDatabase();
  const { userId } = useSettings().settings;
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const run = async (file: File) => {
    setBusy(true);
    setMessage(null);
    setErrors([]);
    try {
      const parsed = parseImportTable(await readImportTable(file));
      if (!parsed.ok) {
        setMessage(`Nothing was imported. Fix ${count(parsed.errors.length, 'problem', 'problems')} in ${file.name} and try again:`);
        setErrors(parsed.errors);
        return;
      }
      const result = await importWorkouts(db, userId, parsed.workouts);
      const parts = [`Imported ${count(result.addedWorkouts, 'workout', 'workouts')} with ${count(result.addedSets, 'set', 'sets')}.`];
      if (result.skippedWorkouts > 0) {
        parts.push(`Skipped ${count(result.skippedWorkouts, 'workout that is', 'workouts that are')} already in the app.`);
      }
      if (result.createdExercises.length > 0) {
        parts.push(`New custom exercises: ${result.createdExercises.join(', ')}.`);
      }
      setMessage(parts.join(' '));
    } catch (error) {
      console.error(error);
      setMessage(`The import failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-gray-500">
        Reads files in the export format. Workouts that are already in the app are skipped.
      </p>
      <label
        className={`self-start rounded-lg border px-4 py-2 font-semibold ${busy ? 'opacity-50' : 'cursor-pointer'}`}
      >
        Import CSV or Excel
        <input
          ref={input}
          type="file"
          accept={IMPORT_ACCEPT}
          disabled={busy}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void run(file);
          }}
        />
      </label>
      {message && (
        <div role="status" className="flex flex-col gap-1 text-sm text-gray-400">
          <p>{message}</p>
          {errors.length > 0 && (
            <ul className="list-disc pl-5 text-red-400">
              {errors.slice(0, SHOWN_ERRORS).map((error) => (
                <li key={error}>{error}</li>
              ))}
              {errors.length > SHOWN_ERRORS && <li>and {errors.length - SHOWN_ERRORS} more</li>}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
