import { act, screen, within } from '@testing-library/react';
import { useCallback, useEffect, useState } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useDatabase } from '@/db/DatabaseContext';
import { createCustomExercise, getExerciseDetail, type ExerciseImageItem } from '@/db/exercises';
import { getLocalSettings } from '@/db/settings';
import { backStack } from '@/lib/backStack';
import { createTestDatabase } from '@/testing/database';
import { renderWithDatabase } from '@/testing/render';
import ExercisePhotos from './ExercisePhotos';

const native = vi.hoisted(() => ({ pickPhoto: vi.fn(), writeStoredImage: vi.fn() }));
vi.mock('@/native/photos', () => ({ pickPhoto: native.pickPhoto }));
vi.mock('@/native/storedImages', () => ({
  writeStoredImage: native.writeStoredImage,
  storedImageSrc: async (file: string) => `data:image/jpeg;base64,${file}`,
}));

beforeEach(() => {
  native.pickPhoto.mockReset().mockResolvedValue('BASE64');
  native.writeStoredImage.mockReset().mockResolvedValue(undefined);
});

// A custom exercise on a page that loads its photos again after a change, like the exercise page.
function Page({ id, userId }: { id: string; userId: string }) {
  const db = useDatabase();
  const [images, setImages] = useState<ExerciseImageItem[] | null>(null);
  const load = useCallback(async () => setImages((await getExerciseDetail(db, userId, id))!.images), [db, userId, id]);
  useEffect(() => {
    getExerciseDetail(db, userId, id)
      .then((detail) => setImages(detail!.images))
      .catch((reason: unknown) => console.error(reason));
  }, [db, userId, id]);
  return images && <ExercisePhotos exerciseId={id} name="Cable Thing" images={images} onChange={load} />;
}

async function setup() {
  const { db } = await createTestDatabase();
  const { userId } = await getLocalSettings(db);
  const id = await createCustomExercise(db, userId, {
    name: 'Cable Thing',
    category: 'strength',
    equipment: 'cable',
    loadType: 'external',
    tracksReps: true,
    tracksDuration: false,
    tracksDistance: false,
    primaryMuscleGroupIds: [],
    secondaryMuscleGroupIds: [],
  });
  const photos = async () => (await getExerciseDetail(db, userId, id))!.images;
  const rendered = await renderWithDatabase(<Page id={id} userId={userId} />, { db });
  await screen.findByRole('button', { name: 'Take photo' });
  return { ...rendered, photos };
}

describe('ExercisePhotos', () => {
  test('take a photo: save it as a file in the app storage and show it', async () => {
    const { user, photos } = await setup();
    expect(screen.getByText(/No photos yet/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Take photo' }));

    expect(await screen.findByRole('img', { name: 'Cable Thing, photo 1' })).toBeInTheDocument();
    expect(native.pickPhoto).toHaveBeenCalledWith('camera');
    const [file, data] = native.writeStoredImage.mock.calls[0];
    expect(file).toMatch(/^exercise-photos\/[0-9a-f-]{36}\.jpg$/);
    expect(data).toBe('BASE64');
    expect((await photos()).map((image) => image.storedFile)).toEqual([file]);
  });

  test('choose a photo from the phone', async () => {
    const { user } = await setup();

    await user.click(screen.getByRole('button', { name: 'Choose photo' }));

    expect(native.pickPhoto).toHaveBeenCalledWith('photos');
    expect(await screen.findByRole('img', { name: 'Cable Thing, photo 1' })).toBeInTheDocument();
  });

  test('save nothing when the user cancels, and say so when saving fails', async () => {
    const { user, photos } = await setup();
    native.pickPhoto.mockResolvedValueOnce(null);
    await user.click(screen.getByRole('button', { name: 'Take photo' }));
    expect(await photos()).toEqual([]);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    native.writeStoredImage.mockRejectedValueOnce(new Error('disk full'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await user.click(screen.getByRole('button', { name: 'Take photo' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The photo could not be saved.');
    expect(await photos()).toEqual([]);
  });

  test('remove a photo after the confirm step; Keep and Android Back keep it', async () => {
    const { user, photos } = await setup();
    await user.click(screen.getByRole('button', { name: 'Take photo' }));
    await screen.findByRole('img', { name: 'Cable Thing, photo 1' });

    await user.click(screen.getByRole('button', { name: 'Remove photo 1' }));
    await user.click(screen.getByRole('button', { name: 'Keep' }));
    await user.click(screen.getByRole('button', { name: 'Remove photo 1' }));
    act(() => {
      backStack.back();
    });
    expect(await photos()).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Remove photo 1' }));
    await user.click(within(screen.getByRole('group', { name: 'Remove photo 1' })).getByRole('button', { name: 'Remove' }));

    expect(await screen.findByText(/No photos yet/)).toBeInTheDocument();
    expect(await photos()).toEqual([]);
  });
});
