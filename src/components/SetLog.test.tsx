import { screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import type { AppDatabase } from '@/db/driver';
import { exercises, sets } from '@/db/schema';
import { getLocalSettings, updateSettings, type SettingsChange } from '@/db/settings';
import { saveWorkoutAsRoutine, startWorkoutFromRoutine } from '@/db/templates';
import { addSet, addWorkoutExercise, deleteWorkout, endWorkout, listWorkoutExercises, startWorkout } from '@/db/workouts';
import type { SetValues } from '@/lib/sets';
import { getUnits } from '@/lib/units';
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
  // A stretch held for time, with a default duration of 45 seconds.
  stretch?: boolean;
  // Sets of this exercise in an earlier, ended workout.
  lastTime?: SetValues[];
  // Sets already logged in the active workout.
  logged?: SetValues[];
};

async function setup({ settings = {}, lastTime = [], logged = [], stretch = false }: Options = {}) {
  const { db } = await createTestDatabase();
  let local = await getLocalSettings(db);
  if (Object.keys(settings).length > 0) local = await updateSettings(db, local.id, settings);
  const exerciseId = crypto.randomUUID();
  await db.insert(exercises).values(
    stretch
      ? { id: exerciseId, source: 'custom', name: 'Hamstring Stretch', category: 'stretch', loadType: 'none', tracksDuration: true, defaultDurationSeconds: 45 }
      : { id: exerciseId, source: 'custom', name: 'Squat', category: 'strength', loadType: 'external', tracksReps: true },
  );
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
  return renderWithDatabase(<SetLog item={item} workoutId={workout.id} units={getUnits(local)} />, { db });
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

  test('use the units it is given', async () => {
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

  test('edit a logged set in the same form', async () => {
    const { db, user } = await setup({ logged: [values, { ...values, reps: 6 }] });

    await user.click(await screen.findByRole('button', { name: 'Edit set 1' }));
    const reps = screen.getByRole('textbox', { name: 'Reps' });
    expect(reps).toHaveValue('8');
    await user.clear(reps);
    await user.type(reps, '7');
    await user.click(screen.getByRole('button', { name: 'Save set' }));

    expect(await screen.findByRole('button', { name: 'Log set' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Sets' })).toHaveTextContent('60 kg × 7');
    const saved = (await savedSets(db)).sort((a, b) => a.position - b.position);
    expect(saved.map((set) => set.reps)).toEqual([7, 6]);
  });

  test('keep stored notes and RPE when a set is edited with their toggles off', async () => {
    const { db, user } = await setup({
      settings: { features: { rpe: false, setNotes: false } },
      logged: [{ ...values, rpe: 9, notes: 'green band' }],
    });

    await user.click(await screen.findByRole('button', { name: 'Edit set 1' }));
    const reps = screen.getByRole('textbox', { name: 'Reps' });
    await user.clear(reps);
    await user.type(reps, '5');
    await user.click(screen.getByRole('button', { name: 'Save set' }));

    await screen.findByRole('button', { name: 'Log set' });
    const [set] = await savedSets(db);
    expect(set).toMatchObject({ reps: 5, rpe: 9, notes: 'green band' });
  });

  test('cancel editing without changes', async () => {
    const { db, user } = await setup({ logged: [values] });

    await user.click(await screen.findByRole('button', { name: 'Edit set 1' }));
    await user.clear(screen.getByRole('textbox', { name: 'Reps' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(await screen.findByRole('button', { name: 'Log set' })).toBeInTheDocument();
    const [set] = await savedSets(db);
    expect(set.reps).toBe(8);
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

describe('stretch timer', () => {
  test('show the stretch timer with the default duration when phases are on', async () => {
    await setup({ stretch: true, settings: { features: { phases: true } } });

    expect(await screen.findByRole('region', { name: 'Stretch timer' })).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('0:45');
  });

  test('hide the stretch timer when phases are off, and keep the set form', async () => {
    await setup({ stretch: true, settings: { features: { phases: false } } });

    expect(await screen.findByRole('textbox', { name: 'Duration' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Stretch timer' })).not.toBeInTheDocument();
  });

  test('show no stretch timer for an exercise that is not held for time', async () => {
    await setup({ settings: { features: { phases: true } } });

    expect(await screen.findByRole('button', { name: 'Log set' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Stretch timer' })).not.toBeInTheDocument();
  });
});

test('prefill from the routine targets when the exercise has no last time', async () => {
  const { db } = await createTestDatabase();
  const local = await getLocalSettings(db);
  const exerciseId = crypto.randomUUID();
  await db.insert(exercises).values({ id: exerciseId, source: 'custom', name: 'Squat', category: 'strength', loadType: 'external', tracksReps: true });
  const first = await startWorkout(db, local.userId);
  await addSet(db, await addWorkoutExercise(db, first.id, exerciseId), { ...values, weightGrams: 100000, reps: 5 });
  const routineId = await saveWorkoutAsRoutine(db, local.userId, first.id, 'Monday');
  await deleteWorkout(db, first.id);
  const workoutId = await startWorkoutFromRoutine(db, local.userId, routineId);
  const [item] = await listWorkoutExercises(db, workoutId);

  await renderWithDatabase(<SetLog item={item} workoutId={workoutId} units={getUnits(local)} />, { db });

  expect(await screen.findByRole('textbox', { name: 'Weight (kg)' })).toHaveValue('100');
  expect(screen.getByRole('textbox', { name: 'Reps' })).toHaveValue('5');
  expect(screen.queryByText(/Last time/)).not.toBeInTheDocument();
});
