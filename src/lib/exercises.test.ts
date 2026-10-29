import { expect, test } from 'vitest';
import { equipmentLabel, exerciseImageUrl, instructionSteps } from './exercises';

test('build the address of a bundled image, with each part encoded', () => {
  expect(exerciseImageUrl('3_4_Sit-Up/0.jpg')).toBe('/exercise-images/3_4_Sit-Up/0.jpg');
  expect(exerciseImageUrl('Curl #1/0.jpg')).toBe('/exercise-images/Curl%20%231/0.jpg');
});

test('start equipment with a capital letter', () => {
  expect(equipmentLabel('body only')).toBe('Body only');
  expect(equipmentLabel('e-z curl bar')).toBe('E-z curl bar');
});

test('split instructions into steps and drop empty lines', () => {
  expect(instructionSteps('Stand up.\n\n  Curl the bar. \nLower it.')).toEqual(['Stand up.', 'Curl the bar.', 'Lower it.']);
  expect(instructionSteps(null)).toEqual([]);
});
