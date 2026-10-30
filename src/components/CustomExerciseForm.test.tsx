import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import type { MuscleGroup } from '@/db/schema';
import { EMPTY_CUSTOM_EXERCISE } from '@/lib/exercises';
import CustomExerciseForm from './CustomExerciseForm';

const groups = [
  { id: 'g1', key: 'biceps', name: 'Biceps' },
  { id: 'g2', key: 'forearms', name: 'Forearms' },
] as MuscleGroup[];

function renderForm(onSave = vi.fn().mockResolvedValue(undefined)) {
  render(
    <CustomExerciseForm
      initial={EMPTY_CUSTOM_EXERCISE}
      muscleGroups={groups}
      equipment={['bands', 'barbell']}
      submitLabel="Create exercise"
      onSave={onSave}
    />,
  );
  return { user: userEvent.setup(), onSave };
}

describe('CustomExerciseForm', () => {
  test('save every field the user fills in', async () => {
    const { user, onSave } = renderForm();

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Band Pull-Apart');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Category' }), 'Mobility');
    await user.type(screen.getByRole('combobox', { name: 'Equipment' }), 'bands');
    await user.click(screen.getByRole('radio', { name: 'No weight' }));
    await user.click(screen.getByRole('checkbox', { name: 'Duration' }));
    await user.click(within(screen.getByRole('group', { name: 'Primary muscle groups' })).getByRole('checkbox', { name: 'Biceps' }));
    await user.click(within(screen.getByRole('group', { name: 'Secondary muscle groups' })).getByRole('checkbox', { name: 'Forearms' }));
    await user.click(screen.getByRole('button', { name: 'Create exercise' }));

    expect(onSave).toHaveBeenCalledWith({
      name: 'Band Pull-Apart',
      category: 'mobility',
      equipment: 'bands',
      loadType: 'none',
      tracksReps: true,
      tracksDuration: true,
      tracksDistance: false,
      primaryMuscleGroupIds: ['g1'],
      secondaryMuscleGroupIds: ['g2'],
    });
  });

  test('start with weight and reps', () => {
    renderForm();

    expect(screen.getByRole('radio', { name: 'Weight (barbell, dumbbell, machine)' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Reps' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Distance' })).not.toBeChecked();
  });

  test('need a name', async () => {
    const { user, onSave } = renderForm();

    await user.type(screen.getByRole('textbox', { name: 'Name' }), '   ');
    await user.click(screen.getByRole('button', { name: 'Create exercise' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Fill in a name.');
    expect(onSave).not.toHaveBeenCalled();
  });
});
