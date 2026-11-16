import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import ExerciseImage from './ExerciseImage';

vi.mock('@/native/storedImages', () => ({ storedImageSrc: async (file: string) => `stored://${file}` }));

test('show the image bundled with the app', () => {
  render(<ExerciseImage path="Barbell_Curl/0.jpg" storedFile={null} alt="Curl" width={64} height={48} />);

  expect(screen.getByRole('img', { name: 'Curl' })).toHaveAttribute('src', '/exercise-images/Barbell_Curl/0.jpg');
});

test('show a file from the app storage instead, once its address is known', async () => {
  render(<ExerciseImage path="Barbell_Curl/0.jpg" storedFile="library-images/Barbell_Curl/0.jpg" alt="Curl" width={64} height={48} />);

  expect(await screen.findByRole('img', { name: 'Curl' })).toHaveAttribute('src', 'stored://library-images/Barbell_Curl/0.jpg');
});
