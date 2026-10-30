'use client';

import { useDatabase } from '@/db/DatabaseContext';
import { saveWorkoutAsRoutine } from '@/db/templates';
import { useFeatures, useSettings } from '@/hooks/useSettings';
import { defaultRoutineName } from '@/lib/templates';
import SaveTemplate from './SaveTemplate';

// "Save as routine" for a workout, shown when the templates feature toggle is on (decision 027).
export default function SaveRoutine({ workoutId, startedAt }: { workoutId: string; startedAt: Date }) {
  const db = useDatabase();
  const { userId } = useSettings().settings;
  const features = useFeatures();
  if (!features.templates) {
    return null;
  }
  return (
    <SaveTemplate
      label="Save as routine"
      defaultName={defaultRoutineName(startedAt)}
      listHref="/routines"
      listLabel="Routines"
      onSave={async (name) => {
        await saveWorkoutAsRoutine(db, userId, workoutId, name);
      }}
    />
  );
}
