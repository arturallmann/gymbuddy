'use client';

import { useState } from 'react';
import { useDatabase } from '@/db/DatabaseContext';
import { listExportRows } from '@/db/export';
import { listExercisePreferences } from '@/db/preferences';
import { useSettings } from '@/hooks/useSettings';
import { buildExportFile, type ExportFormat } from '@/lib/exportFile';
import { buildExportTable } from '@/lib/exportTable';
import { saveFile } from '@/native/files';
import { shareFile } from '@/native/share';

const FORMATS: { format: ExportFormat; label: string }[] = [{ format: 'csv', label: 'Export CSV' }];

// Exports every set as a file and opens the share menu (on the phone) or downloads it (in the browser).
export default function ExportData() {
  const db = useDatabase();
  const { settings } = useSettings();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const run = async (format: ExportFormat) => {
    setBusy(true);
    setMessage(null);
    try {
      const rows = await listExportRows(db, settings.userId);
      if (rows.length === 0) {
        setMessage('No sets to export yet.');
        return;
      }
      const preferences = await listExercisePreferences(db, settings.userId, [...new Set(rows.map((row) => row.exerciseId))]);
      const file = await buildExportFile(buildExportTable(rows, settings, preferences), format);
      const uri = await saveFile(file.name, file.data, file.mimeType);
      if (uri) {
        await shareFile(uri, 'Gymbuddy export');
      }
      setMessage(`Exported ${rows.length === 1 ? '1 set' : `${rows.length} sets`} to ${file.name}.`);
    } catch (error) {
      console.error(error);
      setMessage(`The export failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-gray-500">One row per set, in the units each exercise uses.</p>
      <div className="flex flex-wrap gap-3">
        {FORMATS.map(({ format, label }) => (
          <button
            key={format}
            type="button"
            disabled={busy}
            onClick={() => run(format)}
            className="rounded-lg border px-4 py-2 font-semibold disabled:opacity-50"
          >
            {label}
          </button>
        ))}
      </div>
      {message && (
        <p role="status" className="text-sm text-gray-400">
          {message}
        </p>
      )}
    </div>
  );
}
