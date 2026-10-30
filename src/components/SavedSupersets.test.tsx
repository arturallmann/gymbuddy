import { screen, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { makeSuperset } from '@/db/groups';
import { saveExercisePreferences } from '@/db/preferences';
import { exercises } from '@/db/schema';
import { getLocalSettings } from '@/db/settings';
import { listTemplates, saveGroupAsTemplate } from '@/db/templates';
import { addSet, addWorkoutExercise, startWorkout } from '@/db/workouts';
import { createTestDatabase } from '@/testing/database';
import { renderWithDatabase } from '@/testing/render';
import SavedSupersets from './SavedSupersets';

async function withSaved(features = {}) {
  const { db } = await createTestDatabase();
  const local = await getLocalSettings(db);
  const workout = await startWorkout(db, local.userId);
  const ids: string[] = [];
  const exerciseIds: string[] = [];
  for (const name of ['Curl', 'Press']) {
    const id = crypto.randomUUID();
    await db.insert(exercises).values({ id, name, userId: local.userId, source: 'custom', category: 'strength', loadType: 'external' });
    exerciseIds.push(id);
    ids.push(await addWorkoutExercise(db, workout.id, id));
  }
  await saveExercisePreferences(db, local.userId, exerciseIds[0], { weightUnit: 'lb' });
  const groupId = await makeSuperset(db, workout.id, ids, 60);
  for (let round = 0; round < 3; round++) {
    await addSet(db, ids[0], { setType: 'normal', weightGrams: 20412, reps: 10, durationSeconds: null, distanceMeters: null, rpe: null, notes: null });
  }
  await saveGroupAsTemplate(db, local.userId, groupId, 'Arms');
  const rendered = await renderWithDatabase(<SavedSupersets />, { db, settings: { features } });
  return { ...rendered, userId: local.userId };
}

describe('SavedSupersets', () => {
  test('list each saved superset with rest, exercises and targets in each exercise’s unit', async () => {
    await withSaved();

    const card = await screen.findByRole('listitem', { name: 'Arms' });
    expect(within(card).getByText('Rest 1:00')).toBeInTheDocument();
    expect(within(card).getByText('Curl').closest('li')).toHaveTextContent('Curl · 3 × 45 lb × 10');
    expect(within(card).getByText('Press').closest('li')).toHaveTextContent(/^Press$/);
  });

  test('rename a saved superset', async () => {
    const { db, user, userId } = await withSaved();

    await user.click(await screen.findByRole('button', { name: 'Rename' }));
    const name = screen.getByRole('textbox', { name: 'Name' });
    await user.clear(name);
    await user.type(name, 'Biceps finisher');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('heading', { name: 'Biceps finisher' })).toBeInTheDocument();
    expect((await listTemplates(db, userId, 'superset'))[0].name).toBe('Biceps finisher');
  });

  test('delete a saved superset after the confirm step', async () => {
    const { db, user, userId } = await withSaved();

    await user.click(await screen.findByRole('button', { name: 'Delete saved superset' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText(/No saved supersets yet/)).toBeInTheDocument();
    expect(await listTemplates(db, userId, 'superset')).toEqual([]);
  });

  test('still list saved supersets when the toggles are off', async () => {
    await withSaved({ supersets: false, templates: false });
    expect(await screen.findByRole('listitem', { name: 'Arms' })).toBeInTheDocument();
  });
});
