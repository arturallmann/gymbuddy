import { screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import type { AppDatabase } from '@/db/driver';
import { exercises, sets } from '@/db/schema';
import { getLocalSettings, updateSettings, type SettingsChange } from '@/db/settings';
import { addSet, addWorkoutExercise, endWorkout, listWorkoutExercises, startWorkout } from '@/db/workouts';
import type { SetValues } from '@/lib/sets';
import { createTestDatabase } from '@/testing/database';
import { renderWithDatabase } from '@/testing/render';
import SetLog from './SetLog';

const values: SetValues = {
  setType: 'normal',
  weightGrams: 60000,
  reps: 8,
  durationSeconds: null,
  distanceMeters: null,
  rpe: null,
  notes: null,
};

type Options = {
  settings?: SettingsChange;
  // Sets of this exercise in an earlier, ended workout.
  lastTime?: SetValues[];
  // Sets already logged in the active workout.
  logged?: SetValues[];
};

async function setup({ settings = {}, lastTime = [], logged = [] }: Options = {}) {
  const { db } = await createTestDatabase();
  const local = await getLocalSettings(db);
  if (Object.keys(settings).length > 0) await updateSettings(db, local.id, settings);
  const exerciseId = crypto.randomUUID();
  await db.insert(exercises).values({
    id: exerciseId,
    source: 'custom',
    name: 'Squat',
    category: 'strength',
    loadType: 'external',
    tracksReps: true,
  });
  const logAll = async (workoutExerciseId: string, list: SetValues[]) => {
    for (const set of list) await addSet(db, workoutExerciseId, set);
  };
  if (lastTime.length > 0) {
    const old = await startWorkout(db, local.userId, new Date('2026-10-01T10:00:00Z'));
    await logAll(await addWorkoutExercise(db, old.id, exerciseId), lastTime);
    await endWorkout(db, old.id);
  }
  const workout = await startWorkout(db, local.userId);
  await logAll(await addWorkoutExercise(db, workout.id, exerciseId), logged);
  const [item] = await listWorkoutExercises(db, workout.id);
  return renderWithDatabase(<SetLog item={item} workoutId={workout.id} />, { db });
}

async function savedSets(db: AppDatabase) {
  return db.select().from(sets);
}

describe('SetLog', () => {
  test('log a set, show it and prefill the next one from it', async () => {
    const { db, user } = await setup();

    await user.type(await screen.findByRole('textbox', { name: 'Weight (kg)' }), '60');
    await user.type(screen.getByRole('textbox', { name: 'Reps' }), '8');
    await user.click(screen.getByRole('button', { name: 'Log set' }));

    expect(await screen.findByRole('list', { name: 'Sets' })).toHaveTextContent('60 kg × 8');
    expect(screen.getByRole('textbox', { name: 'Weight (kg)' })).toHaveValue('60');
    expect(screen.getByRole('textbox', { name: 'Reps' })).toHaveValue('8');
    expect(await savedSets(db)).toEqual([expect.objectContaining({ weightGrams: 60000, reps: 8, position: 1 })]);
  });

  test('show last time with its notes, and prefill the same set number from it', async () => {
    await setup({
      lastTime: [
        { ...values, weightGrams: 50000, reps: 10 },
        { ...values, weightGrams: 55000, reps: 8, notes: 'belt' },
      ],
      logged: [{ ...values, weightGrams: 50000, reps: 10 }],
    });

    expect(await screen.findByText('Last time: 50 kg × 10, 55 kg × 8 (belt)')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Weight (kg)' })).toHaveValue('55');
    expect(screen.getByRole('textbox', { name: 'Reps' })).toHaveValue('8');
  });

  test('prefill from the previous set after the sets of last time run out', async () => {
    await setup({
      lastTime: [{ ...values, weightGrams: 50000, reps: 10 }],
      logged: [values, { ...values, weightGrams: 70000, reps: 3 }],
    });

    expect(await screen.findByRole('textbox', { name: 'Weight (kg)' })).toHaveValue('70');
    expect(screen.getByRole('textbox', { name: 'Reps' })).toHaveValue('3');
  });

  test('use the weight unit from the settings', async () => {
    await setup({ settings: { weightUnit: 'lb' }, logged: [{ ...values, weightGrams: 20412, reps: 5 }] });

    expect(await screen.findByRole('list', { name: 'Sets' })).toHaveTextContent('45 lb × 5');
    expect(screen.getByRole('textbox', { name: 'Weight (lb)' })).toHaveValue('45');
  });

  test('show stored RPE, set type and notes when their toggles are off, without their inputs', async () => {
    await setup({
      settings: { features: { rpe: false, setTypes: false, setNotes: false } },
      logged: [{ ...values, rpe: 9, setType: 'warmup', notes: 'green band' }],
    });

    const list = await screen.findByRole('list', { name: 'Sets' });
    expect(list).toHaveTextContent('60 kg × 8 · RPE 9 · Warm-up set');
    expect(list).toHaveTextContent('green band');
    expect(screen.queryByRole('textbox', { name: 'RPE' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Set type' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Notes' })).not.toBeInTheDocument();
  });

  test('remove a set', async () => {
    const { db, user } = await setup({ logged: [values] });

    await user.click(await screen.findByRole('button', { name: 'Remove set 1' }));

    expect(await screen.findByRole('button', { name: 'Log set' })).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Sets' })).not.toBeInTheDocument();
    const [row] = await savedSets(db);
    expect(row.deletedAt).not.toBeNull();
  });
});
