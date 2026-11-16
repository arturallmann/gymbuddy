'use client';

import { useEffect, useState } from 'react';
import { useDatabase } from '@/db/DatabaseContext';
import { listExerciseHistory, type HistoryRow } from '@/db/progress';
import type { Exercise } from '@/db/schema';
import { useFeatures, useSettings } from '@/hooks/useSettings';
import { chartMetrics, chartPoints, historyByWorkout } from '@/lib/progress';
import type { Units } from '@/lib/units';
import ExerciseChart from './ExerciseChart';
import ExerciseHistory from './ExerciseHistory';

type Props = {
  exercise: Pick<Exercise, 'id' | 'loadType' | 'tracksReps' | 'tracksDuration' | 'tracksDistance'>;
  // The exercise's units: its unit override, otherwise the settings.
  units: Units;
};

// The history view and the chart view of one exercise (docs/DATA_MODEL.md, charts and history).
// The chart view needs a tracked field and the charts feature toggle; the history view is always there.
export default function ExerciseProgress({ exercise, units }: Props) {
  const db = useDatabase();
  const { userId } = useSettings().settings;
  const features = useFeatures();
  const [rows, setRows] = useState<HistoryRow[] | undefined>(undefined);
  const [view, setView] = useState<'history' | 'chart'>('history');

  useEffect(() => {
    let current = true;
    listExerciseHistory(db, userId, exercise.id)
      .then((loaded) => current && setRows(loaded))
      .catch((reason: unknown) => console.error(reason));
    return () => {
      current = false;
    };
  }, [db, userId, exercise.id]);

  if (!rows) {
    return null;
  }
  const metrics = features.charts ? chartMetrics(exercise) : [];
  const showChart = view === 'chart' && metrics.length > 0;
  return (
    <section aria-label="Progress" className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <h2 className="min-w-0 flex-1 text-lg font-semibold">Progress</h2>
        {metrics.length > 0 && (
          <div role="group" aria-label="View" className="flex gap-1">
            {(['history', 'chart'] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={view === option}
                onClick={() => setView(option)}
                className={`rounded-lg border px-3 py-1 text-sm ${view === option ? 'border-sky-600 bg-sky-600 text-white' : ''}`}
              >
                {option === 'history' ? 'History' : 'Chart'}
              </button>
            ))}
          </div>
        )}
      </div>
      {showChart ? (
        <ExerciseChart metrics={metrics} pointsFor={(metric) => chartPoints(rows, metric)} units={units} />
      ) : (
        <ExerciseHistory workouts={historyByWorkout(rows)} loadType={exercise.loadType} units={units} />
      )}
    </section>
  );
}
