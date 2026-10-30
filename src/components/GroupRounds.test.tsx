import { screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { getWorkoutGroup, makeSuperset } from '@/db/groups';
import { saveExercisePreferences } from '@/db/preferences';
import { exercises } from '@/db/schema';
import { getLocalSettings } from '@/db/settings';
import { addSet, addWorkoutExercise, startWorkout } from '@/db/workouts';
import { createTestDatabase } from '@/testing/database';
import { renderWithDatabase } from '@/testing/render';
import GroupRounds from './GroupRounds';

const values = { setType: 'normal' as const, weightGrams: 20412, reps: 5, durationSeconds: null, distanceMeters: null, rpe: null, notes: null };

test('show one row per round in each exercise’s unit, with a dash for a missing set', async () => {
  const { db } = await createTestDatabase();
  const { userId } = await getLocalSettings(db);
  const workout = await startWorkout(db, userId);
  const ids: string[] = [];
  for (const name of ['Curl', 'Press']) {
    const id = crypto.randomUUID();
    await db.insert(exercises).values({ id, name, userId, source: 'custom', category: 'strength', loadType: 'external' });
    if (name === 'Curl') await saveExercisePreferences(db, userId, id, { weightUnit: 'lb' });
    ids.push(await addWorkoutExercise(db, workout.id, id));
  }
  const groupId = await makeSuperset(db, workout.id, ids, 90);
  await addSet(db, ids[0], values);
  await addSet(db, ids[1], values);
  await addSet(db, ids[0], values);
  const { members } = (await getWorkoutGroup(db, groupId))!;

  await renderWithDatabase(<GroupRounds members={members} workoutId={workout.id} restSeconds={90} />, { db });

  expect(await screen.findByText('Round 1: 45 lb × 5 · 20.4 kg × 5')).toBeInTheDocument();
  expect(screen.getByText('Round 2: 45 lb × 5 · —')).toBeInTheDocument();
  expect(screen.getByText('Superset · Rest 1:30')).toBeInTheDocument();
});
