import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { DEFAULT_FEATURES, type FeatureToggles } from '@/db/schema';
import { setFormValues, type SetFormExercise } from '@/lib/sets';
import type { Units } from '@/lib/units';
import SetForm from './SetForm';

const kg: Units = { weightUnit: 'kg', distanceUnit: 'metric' };
const curl: SetFormExercise = { loadType: 'external', tracksReps: true, tracksDuration: false, tracksDistance: false };
const plank: SetFormExercise = { loadType: 'bodyweight', tracksReps: false, tracksDuration: true, tracksDistance: false };
const run: SetFormExercise = { loadType: 'none', tracksReps: false, tracksDuration: true, tracksDistance: true };
const off: FeatureToggles = { ...DEFAULT_FEATURES, rpe: false, setTypes: false, setNotes: false };
const on: FeatureToggles = { ...DEFAULT_FEATURES, rpe: true, setTypes: true, setNotes: true };

function renderForm(exercise: SetFormExercise, features = off, units = kg, onLog = vi.fn().mockResolvedValue(undefined)) {
  render(
    <SetForm exercise={exercise} units={units} features={features} initial={setFormValues(null, units)} onLog={onLog} />,
  );
  return { user: userEvent.setup(), onLog };
}

describe('SetForm', () => {
  test('show weight and reps for an external exercise', () => {
    renderForm(curl);

    expect(screen.getByRole('textbox', { name: 'Weight (kg)' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Reps' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Duration' })).not.toBeInTheDocument();
  });

  test('show added weight and duration for a bodyweight hold', () => {
    renderForm(plank, off, { weightUnit: 'lb', distanceUnit: 'imperial' });

    expect(screen.getByRole('textbox', { name: /Added weight \(lb\)/ })).toBeInTheDocument();
    expect(screen.getByText('Empty = bodyweight only. Negative = assisted.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Duration' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Reps' })).not.toBeInTheDocument();
  });

  test('show distance and duration, but no weight, when the load type is none', () => {
    renderForm(run);

    expect(screen.getByRole('textbox', { name: /Distance/ })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Distance unit' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /Weight/ })).not.toBeInTheDocument();
  });

  test('hide RPE, set type and notes when their toggles are off', () => {
    renderForm(curl, off);

    expect(screen.queryByRole('textbox', { name: 'RPE' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Set type' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Notes' })).not.toBeInTheDocument();
  });

  test('log a set with RPE, set type and notes when their toggles are on', async () => {
    const { user, onLog } = renderForm(curl, on);

    await user.type(screen.getByRole('textbox', { name: 'Weight (kg)' }), '60');
    await user.type(screen.getByRole('textbox', { name: 'Reps' }), '8');
    await user.type(screen.getByRole('textbox', { name: 'RPE' }), '8,5');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Set type' }), 'Warm-up set');
    await user.type(screen.getByRole('textbox', { name: 'Notes' }), 'slow');
    await user.click(screen.getByRole('button', { name: 'Log set' }));

    expect(onLog).toHaveBeenCalledWith({
      setType: 'warmup',
      weightGrams: 60000,
      reps: 8,
      durationSeconds: null,
      distanceMeters: null,
      rpe: 8.5,
      notes: 'slow',
    });
  });

  test('show what is wrong and log nothing', async () => {
    const { user, onLog } = renderForm(curl);

    await user.type(screen.getByRole('textbox', { name: 'Reps' }), 'many');
    await user.click(screen.getByRole('button', { name: 'Log set' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Reps must be a whole number.');
    expect(onLog).not.toHaveBeenCalled();
  });
});
