const STORAGE_KEY = 'eventvs.portal.session.v1';

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
    return value;
  }

  clear() {
    this.storage.removeItem(STORAGE_KEY);
  }
}

export { STORAGE_KEY };
