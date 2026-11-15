import { expect, test } from 'vitest';
import { fitInside } from './photos';

test('make a large photo fit inside 1080 px and keep its shape', () => {
  expect(fitInside(4032, 3024)).toEqual({ width: 1080, height: 810 });
  expect(fitInside(3000, 4000)).toEqual({ width: 810, height: 1080 });
});

test('leave a small photo as it is', () => {
  expect(fitInside(640, 480)).toEqual({ width: 640, height: 480 });
});
