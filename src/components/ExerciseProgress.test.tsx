import { screen, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { saveExercisePreferences } from '@/db/preferences';
import { exercises, type Exercise } from '@/db/schema';
import { getLocalSettings, updateSettings } from '@/db/settings';
import { addSet, addWorkoutExercise, endWorkout, startWorkout } from '@/db/workouts';
import { getUnits } from '@/lib/units';
import { createTestDatabase } from '@/testing/database';
import { renderWithDatabase } from '@/testing/render';
import ExerciseProgress from './ExerciseProgress';

const values = { setType: 'normal' as const, weightGrams: 20412, reps: 5, durationSeconds: null, distanceMeters: null, rpe: null, notes: 'green band' };

async function setup(kind: 'weights' | 'notes', options: { charts?: boolean; lb?: boolean } = {}) {
  const { db } = await createTestDatabase();
  const local = await getLocalSettings(db);
  await updateSettings(db, local.id, { features: { charts: options.charts ?? true } });
  const exercise = {
    id: crypto.randomUUID(),
    source: 'custom' as const,
    name: kind === 'weights' ? 'Curl' : 'Box Jump',
    category: 'strength' as const,
    loadType: kind === 'weights' ? ('external' as const) : ('none' as const),
    tracksReps: kind === 'weights',
  };
  await db.insert(exercises).values(exercise);
  const workout = await startWorkout(db, local.userId);
  const id = await addWorkoutExercise(db, workout.id, exercise.id);
  await addSet(db, id, kind === 'weights' ? values : { ...values, weightGrams: null, reps: null, notes: '60 cm' });
  await endWorkout(db, workout.id);
  const prefs = options.lb ? await saveExercisePreferences(db, local.userId, exercise.id, { weightUnit: 'lb' }) : null;
  const units = getUnits(local, prefs);
  const full = { ...exercise, tracksDuration: false, tracksDistance: false } as Pick<Exercise, 'id' | 'loadType' | 'tracksReps' | 'tracksDuration' | 'tracksDistance'>;
  return renderWithDatabase(<ExerciseProgress exercise={full} units={units} />, { db });
}

describe('ExerciseProgress', () => {
  test('start with the history view and switch to the chart view', async () => {
    const { user } = await setup('weights');

    expect(await screen.findByRole('list', { name: 'History' })).toHaveTextContent('20.4 kg × 5');
    await user.click(screen.getByRole('button', { name: 'Chart' }));

    expect(screen.getByRole('img', { name: 'Heaviest weight per workout' })).toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: 'Chart value' })).getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Heaviest weight',
      'Most reps',
      'Volume',
    ]);
  });

  test('show a note-only exercise with the history view and no chart', async () => {
    await setup('notes');

    expect(await screen.findByRole('list', { name: 'History' })).toHaveTextContent('60 cm');
    expect(screen.queryByRole('button', { name: 'Chart' })).not.toBeInTheDocument();
  });

  test('hide the chart view when charts are off, and keep the history view', async () => {
    await setup('weights', { charts: false });

    expect(await screen.findByRole('list', { name: 'History' })).toHaveTextContent('green band');
    expect(screen.queryByRole('button', { name: 'Chart' })).not.toBeInTheDocument();
  });

  test('use the unit override in the history and the chart', async () => {
    const { user } = await setup('weights', { lb: true });

    expect(await screen.findByRole('list', { name: 'History' })).toHaveTextContent('45 lb × 5');
    await user.click(screen.getByRole('button', { name: 'Chart' }));
    expect(screen.getByRole('status')).toHaveTextContent('45 lb');
  });
});
