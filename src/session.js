const STORAGE_KEY = 'eventvs.portal.session.v1';
const CHALLENGE_STORAGE_KEY = 'eventvs.portal.challenge.v1';

export class PortalSession {
  constructor(storage = sessionStorage) {
    this.storage = storage;
  }

  get(email = '') {
    try {
      const value = JSON.parse(this.storage.getItem(STORAGE_KEY) || 'null');
      if (!value?.token || !value?.expiresAt || Date.parse(value.expiresAt) <= Date.now()) {
        this.clear();
        return null;
      }
      if (email && value.email?.toLowerCase() !== email.toLowerCase()) return null;
      return value;
    } catch {
      this.clear();
      return null;
    }
  }

  set({ sessionToken, expiresAt, email }) {
    const value = { token: sessionToken, expiresAt, email: email.toLowerCase() };
    this.storage.setItem(STORAGE_KEY, JSON.stringify(value));
    this.clearChallenge();
    return value;
  }

  getChallenge(email = '') {
    try {
      const value = JSON.parse(this.storage.getItem(CHALLENGE_STORAGE_KEY) || 'null');
      if (!value?.challengeId || !value?.expiresAt || Date.parse(value.expiresAt) <= Date.now()) {
        this.clearChallenge();
        return null;
      }
      if (email && value.email?.toLowerCase() !== email.toLowerCase()) return null;
      return value;
    } catch {
      this.clearChallenge();
      return null;
    }
  }

  setChallenge({ challengeId, expiresAt, retryAt, email }) {
    const value = {
      challengeId,
      expiresAt,
      retryAt,
      email: email.toLowerCase(),
    };
    this.storage.setItem(CHALLENGE_STORAGE_KEY, JSON.stringify(value));
    return value;
  }

  clearChallenge() {
    this.storage.removeItem(CHALLENGE_STORAGE_KEY);
  }

  clear() {
    this.storage.removeItem(STORAGE_KEY);
    this.clearChallenge();
  }
}

export { CHALLENGE_STORAGE_KEY, STORAGE_KEY };
