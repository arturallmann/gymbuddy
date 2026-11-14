'use client';

import { useEffect, useState } from 'react';
import { useDatabase } from '@/db/DatabaseContext';
import { listWorkoutHistory, type WorkoutHistoryItem } from '@/db/workouts';
import { useSettings } from '@/hooks/useSettings';
import { dayRange } from '@/lib/dates';
import WorkoutHistoryList from './WorkoutHistoryList';

// The workouts ended today, on the home page (decision 035). Shows nothing on a day without one.
export default function TodaysWorkouts() {
  const db = useDatabase();
  const { userId } = useSettings().settings;
  const [items, setItems] = useState<WorkoutHistoryItem[]>([]);

  useEffect(() => {
    let current = true;
    listWorkoutHistory(db, userId, dayRange(new Date()))
      .then((loaded) => current && setItems(loaded))
      .catch((reason: unknown) => console.error(reason));
    return () => {
      current = false;
    };
  }, [db, userId]);

  if (items.length === 0) {
    return null;
  }
  return (
    <section aria-label="Today" className="flex w-full flex-col gap-2 text-left">
      <h2 className="text-sm font-semibold uppercase text-muted">Today</h2>
      <WorkoutHistoryList items={items} />
    </section>
  );
}
