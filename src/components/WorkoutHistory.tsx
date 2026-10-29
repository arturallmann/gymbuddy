'use client';

import { useEffect, useState } from 'react';
import { useDatabase } from '@/db/DatabaseContext';
import { listWorkoutHistory, type WorkoutHistoryItem } from '@/db/workouts';
import { useSettings } from '@/hooks/useSettings';
import WorkoutHistoryList from './WorkoutHistoryList';

// Loads the workout history of the local user.
export default function WorkoutHistory() {
  const db = useDatabase();
  const { userId } = useSettings().settings;
  const [items, setItems] = useState<WorkoutHistoryItem[] | undefined>(undefined);

  useEffect(() => {
    let current = true;
    listWorkoutHistory(db, userId)
      .then((loaded) => current && setItems(loaded))
      .catch((reason: unknown) => console.error(reason));
    return () => {
      current = false;
    };
  }, [db, userId]);

  return items ? <WorkoutHistoryList items={items} /> : null;
}
