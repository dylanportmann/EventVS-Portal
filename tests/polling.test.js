import { describe, expect, it } from 'vitest';
import { AUTO_REFRESH_INTERVAL_MS, canAutoRefresh, changed } from '../src/polling.js';

describe('automatic refresh', () => {
  const ready = {
    account: { username: 'manager@epfl.ch' },
    profile: { email: 'manager@epfl.ch' },
    loading: false,
    editOpen: false,
    polling: false,
    visibilityState: 'visible',
  };

  it('polls a visible authenticated view every 15 seconds', () => {
    expect(AUTO_REFRESH_INTERVAL_MS).toBe(15_000);
    expect(canAutoRefresh(ready)).toBe(true);
  });

  it.each([
    ['hidden page', { visibilityState: 'hidden' }],
    ['open editor', { editOpen: true }],
    ['active request', { polling: true }],
    ['loading view', { loading: true }],
    ['signed-out view', { account: null }],
  ])('does not poll with %s', (_label, override) => {
    expect(canAutoRefresh({ ...ready, ...override })).toBe(false);
  });

  it('rerenders only when API data changed', () => {
    expect(changed({ status: 'En attente' }, { status: 'Refusé' })).toBe(true);
    expect(changed({ status: 'Refusé' }, { status: 'Refusé' })).toBe(false);
  });
});
