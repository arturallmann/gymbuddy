import { describe, expect, test, vi } from 'vitest';
import { createBackStack } from './backStack';

describe('back stack', () => {
  test('close what is open before leaving the page, newest first', () => {
    const stack = createBackStack();
    const page = vi.fn();
    const confirm = vi.fn();
    const editing = vi.fn();
    stack.register('page', page);
    stack.register('close', confirm);
    const removeEditing = stack.register('close', editing);

    expect(stack.back()).toBe(true);
    expect(editing).toHaveBeenCalledOnce();
    expect(confirm).not.toHaveBeenCalled();

    removeEditing();
    stack.back();
    expect(confirm).toHaveBeenCalledOnce();
    expect(page).not.toHaveBeenCalled();
  });

  test('go to the page before when nothing is open', () => {
    const stack = createBackStack();
    const page = vi.fn();
    stack.register('page', page);

    expect(stack.back()).toBe(true);
    expect(page).toHaveBeenCalledOnce();
  });

  test('report nothing to do on a page without a back arrow, such as home', () => {
    const stack = createBackStack();
    const remove = stack.register('page', vi.fn());
    remove();
    remove();

    expect(stack.back()).toBe(false);
  });
});
