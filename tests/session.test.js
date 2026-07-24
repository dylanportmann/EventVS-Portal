import { beforeEach, describe, expect, it } from 'vitest';
import { CHALLENGE_STORAGE_KEY, PortalSession, STORAGE_KEY } from '../src/session.js';

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

  it('persists pending challenge without OTP and clears it after session creation', () => {
    session.setChallenge({
      challengeId: 'challenge',
      expiresAt: '2099-01-01T00:00:00Z',
      retryAt: '2098-12-31T23:51:00Z',
      email: 'Dylan.Portmann@epfl.ch',
    });
    expect(session.getChallenge('dylan.portmann@epfl.ch')).toMatchObject({ challengeId: 'challenge' });
    expect(store.getItem(CHALLENGE_STORAGE_KEY)).not.toContain('123456');

    session.set({ sessionToken: 'token', expiresAt: '2099-01-01T00:00:00Z', email: 'dylan.portmann@epfl.ch' });
    expect(session.getChallenge('dylan.portmann@epfl.ch')).toBeNull();
  });

  it('drops expired pending challenge', () => {
    store.setItem(CHALLENGE_STORAGE_KEY, JSON.stringify({
      challengeId: 'old', expiresAt: '2000-01-01T00:00:00Z', retryAt: '2000-01-01T00:00:00Z', email: 'a@epfl.ch',
    }));
    expect(session.getChallenge('a@epfl.ch')).toBeNull();
  });
});
