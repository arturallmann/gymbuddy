'use client';

import { useState } from 'react';
import { useDatabase } from '@/db/DatabaseContext';
import { addExercisePhoto, deleteExercisePhoto, type ExerciseImageItem } from '@/db/exercises';
import { useBackHandler } from '@/hooks/useBackHandler';
import { useSettings } from '@/hooks/useSettings';
import { pickPhoto, type PhotoSource } from '@/native/photos';
import { writeStoredImage } from '@/native/storedImages';
import ExerciseImage from './ExerciseImage';
import TrashIcon from '@/components/ui/icons/TrashIcon';

type Props = {
  exerciseId: string;
  name: string;
  images: ExerciseImageItem[];
  // Called after a photo was added or deleted, so the page loads the photos again.
  onChange: () => Promise<void>;
};

// The photos of a custom exercise (decision 039): take one with the camera or choose one from the
// phone's photos, and remove one after a confirm step. The first photo shows in exercise lists.
export default function ExercisePhotos({ exerciseId, name, images, onChange }: Props) {
  const db = useDatabase();
  const { userId } = useSettings().settings;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  useBackHandler(removing ? () => setRemoving(null) : null);

  const add = async (source: PhotoSource) => {
    setError(null);
    setBusy(true);
    try {
      const photo = await pickPhoto(source);
      if (photo) {
        const file = `exercise-photos/${crypto.randomUUID()}.jpg`;
        await writeStoredImage(file, photo);
        await addExercisePhoto(db, userId, exerciseId, file);
        await onChange();
      }
    } catch (reason) {
      console.error(reason);
      setError('The photo could not be saved. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const button = 'flex-1 rounded-lg border bg-surface px-4 py-2 font-semibold disabled:opacity-50';
  return (
    <section aria-label="Photos" className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Photos</h2>
      {images.length === 0 && <p className="text-sm text-muted">No photos yet. The first photo shows in exercise lists.</p>}
      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-2">
          {images.map((image, index) => (
            <li key={image.id} className="relative">
              <ExerciseImage
                path={image.path}
                storedFile={image.storedFile}
                alt={`${name}, photo ${index + 1}`}
                width={400}
                height={300}
                className="aspect-[4/3] h-auto w-full rounded object-cover"
              />
              {removing === image.id ? (
                <div
                  role="group"
                  aria-label={`Remove photo ${index + 1}`}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded bg-page/90 p-2"
                >
                  <button
                    type="button"
                    onClick={async () => {
                      setRemoving(null);
                      await deleteExercisePhoto(db, userId, image.id);
                      await onChange();
                    }}
                    className="w-full rounded-lg bg-danger px-3 py-1.5 text-sm font-semibold text-on-danger"
                  >
                    Remove
                  </button>
                  <button type="button" onClick={() => setRemoving(null)} className="w-full rounded-lg border bg-surface px-3 py-1.5 text-sm">
                    Keep
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  aria-label={`Remove photo ${index + 1}`}
                  onClick={() => setRemoving(image.id)}
                  className="absolute right-1 top-1 rounded-full bg-page/80 p-1.5 text-danger"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-3">
        <button type="button" disabled={busy} onClick={() => add('camera')} className={button}>
          Take photo
        </button>
        <button type="button" disabled={busy} onClick={() => add('photos')} className={button}>
          Choose photo
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
