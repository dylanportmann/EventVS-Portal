import { beforeEach, describe, expect, it } from 'vitest';
import { PortalSession, STORAGE_KEY } from '../src/session.js';

function storage() {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
}

describe('PortalSession', () => {
  let store;
  let session;

  beforeEach(() => {
    store = storage();
    session = new PortalSession(store);
  });

  it('keeps valid token for matching email', () => {
    session.set({ sessionToken: 'token', expiresAt: '2099-01-01T00:00:00Z', email: 'Dylan.Portmann@epfl.ch' });
    expect(session.get('dylan.portmann@epfl.ch')).toMatchObject({ token: 'token', email: 'dylan.portmann@epfl.ch' });
  });

  it('rejects expired or other-account token', () => {
    store.setItem(STORAGE_KEY, JSON.stringify({ token: 'old', expiresAt: '2000-01-01T00:00:00Z', email: 'a@epfl.ch' }));
    expect(session.get('a@epfl.ch')).toBeNull();
    session.set({ sessionToken: 'new', expiresAt: '2099-01-01T00:00:00Z', email: 'a@epfl.ch' });
    expect(session.get('b@epfl.ch')).toBeNull();
  });
});
