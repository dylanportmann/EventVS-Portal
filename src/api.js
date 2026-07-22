export class ApiError extends Error {
  constructor(message, { status = 0, code = 'API_ERROR', details = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class EventVsApi {
  constructor({ apiUrl, tokenProvider, fetchImpl = fetch, timeout = 30000 }) {
    this.apiUrl = apiUrl;
    this.tokenProvider = tokenProvider;
    this.fetchImpl = fetchImpl;
    this.timeout = timeout;
  }

  listRequests(payload = {}) {
    return this.call('listRequests', { payload });
  }

  getRequest(requestId) {
    return this.call('getRequest', { requestId });
  }

  updateRequest({ requestId, expectedRevision, changes, reason = '', identity = {} }) {
    return this.call('updateRequest', {
      requestId,
      expectedRevision,
      changes,
      reason,
      clientContext: {
        displayName: identity.name || '',
        username: identity.username || '',
      },
    });
  }

  async call(action, body = {}) {
    const token = await this.tokenProvider();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);
    let response;

    try {
      response = await this.fetchImpl(this.apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ action, ...body }),
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-store',
        signal: controller.signal,
      });
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new ApiError('API trop lente. Réessaie.', { code: 'TIMEOUT' });
      }
      throw new ApiError('API Event VS inaccessible.', { code: 'NETWORK_ERROR', details: error.message });
    } finally {
      clearTimeout(timer);
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) {
      const code = payload.error?.code || (response.status === 409 ? 'REVISION_CONFLICT' : 'HTTP_ERROR');
      const message = payload.error?.message || this.messageForStatus(response.status);
      throw new ApiError(message, { status: response.status, code, details: payload.error?.details });
    }
    return payload.data ?? payload;
  }

  messageForStatus(status) {
    if (status === 401) return 'Session expirée. Reconnecte-toi.';
    if (status === 403) return 'Compte non autorisé pour Event VS.';
    if (status === 409) return 'Demande modifiée par une autre personne. Recharge avant de continuer.';
    if (status === 429) return 'Trop de requêtes. Réessaie dans un instant.';
    return `Erreur API (${status || 'réseau'}).`;
  }
}
