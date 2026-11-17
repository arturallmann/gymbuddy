import { screen, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { addBodyweight, listBodyweights } from '@/db/bodyweights';
import { getLocalSettings } from '@/db/settings';
import { createTestDatabase } from '@/testing/database';
import { renderWithDatabase, savedSettings } from '@/testing/render';
import BodySettings from './BodySettings';

describe('BodySettings', () => {
  test('save the height in millimeters from cm', async () => {
    const { user, db } = await renderWithDatabase(<BodySettings />);

    await user.type(screen.getByLabelText('Height (cm)'), '180');
    await user.click(within(screen.getByRole('form', { name: 'Height' })).getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect((await savedSettings(db)).heightMillimeters).toBe(1800);
  });

  test('take feet and inches with imperial units and show the stored height in them', async () => {
    const { user, db } = await renderWithDatabase(<BodySettings />, { settings: { distanceUnit: 'imperial', heightMillimeters: 1803 } });

    expect(screen.getByLabelText('Height (ft)')).toHaveValue('5');
    expect(screen.getByLabelText('Height (in)')).toHaveValue('11');
    await user.clear(screen.getByLabelText('Height (in)'));
    await user.type(screen.getByLabelText('Height (in)'), '10');
    await user.click(within(screen.getByRole('form', { name: 'Height' })).getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect((await savedSettings(db)).heightMillimeters).toBe(1778);
  });

  test('add a new bodyweight and keep the earlier one', async () => {
    const { db } = await createTestDatabase();
    const { userId } = await getLocalSettings(db);
    await addBodyweight(db, userId, 82000, new Date(2026, 9, 1));
    const { user } = await renderWithDatabase(<BodySettings />, { db });

    expect(await screen.findByText('82 kg')).toBeInTheDocument();
    await user.type(screen.getByLabelText('New bodyweight (kg)'), '80,5');
    await user.click(within(screen.getByRole('form', { name: 'Bodyweight' })).getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('80.5 kg')).toBeInTheDocument();
    expect((await listBodyweights(db, userId)).map((b) => b.weightGrams)).toEqual([82000, 80500]);
  });

  test('explain a bodyweight that is not a number and save nothing', async () => {
    const { user, db } = await renderWithDatabase(<BodySettings />);

    await user.type(await screen.findByLabelText('New bodyweight (kg)'), 'heavy');
    await user.click(within(screen.getByRole('form', { name: 'Bodyweight' })).getByRole('button', { name: 'Save' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Enter your bodyweight in kg');
    expect(await listBodyweights(db, (await savedSettings(db)).userId)).toEqual([]);
  });
});
