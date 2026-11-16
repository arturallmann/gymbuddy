import { screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { templates } from '@/db/schema';
import { getLocalSettings } from '@/db/settings';
import { createTestDatabase } from '@/testing/database';
import { renderWithDatabase } from '@/testing/render';
import SavedSupersetPicker from './SavedSupersetPicker';

test('list saved supersets and pick one', async () => {
  const { db } = await createTestDatabase();
  const { userId } = await getLocalSettings(db);
  const id = crypto.randomUUID();
  await db.insert(templates).values({ id, userId, kind: 'superset', name: 'Arms' });
  const onPick = vi.fn();
  const { user } = await renderWithDatabase(<SavedSupersetPicker onPick={onPick} onClose={vi.fn()} />, { db });

  await user.click(await screen.findByRole('button', { name: /Arms/ }));

  expect(onPick).toHaveBeenCalledWith(id);
});

test('say so without saved supersets, and close', async () => {
  const onClose = vi.fn();
  const { user } = await renderWithDatabase(<SavedSupersetPicker onPick={vi.fn()} onClose={onClose} />);

  expect(await screen.findByText('No saved supersets yet.')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(onClose).toHaveBeenCalledOnce();
});
