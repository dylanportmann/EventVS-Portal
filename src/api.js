export class ApiError extends Error {
  constructor(message, {
    status = 0,
    code = 'API_ERROR',
    details = null,
    clientRequestId = '',
    retryAfter = 0,
  } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.clientRequestId = clientRequestId;
    this.retryAfter = Number(retryAfter) || 0;
  }
}

export class EventVsApi {
  constructor({
    apiUrl,
    sessionProvider = () => '',
    fetchImpl = fetch,
    timeout = 30000,
    authTimeout = 75000,
    idFactory = () => globalThis.crypto.randomUUID(),
  }) {
    this.apiUrl = apiUrl;
    this.sessionProvider = sessionProvider;
    this.fetchImpl = fetchImpl;
    this.timeout = timeout;
    this.authTimeout = authTimeout;
    this.idFactory = idFactory;
  }

  startSession(email, challengeId) {
    return this.callPublic('startSession', { email, challengeId }, { timeout: this.authTimeout });
  }

  verifySession(email, code, challengeId = '') {
    return this.callPublic('verifySession', { email, code, challengeId }, { timeout: this.authTimeout });
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

  cancelEvent({ requestId, expectedRevision, confirmation, reason = '' }) {
    return this.call('cancelEvent', {
      requestId,
      expectedRevision,
      confirmation: confirmation === true,
      reason,
    });
  }

  getCancellationStatus(requestId) {
    return this.call('getCancellationStatus', { requestId });
  }

  async call(action, body = {}) {
    const sessionToken = await this.sessionProvider();
    if (!sessionToken) throw new ApiError('Code de connexion requis.', { status: 401, code: 'SESSION_REQUIRED' });
    return this.request({ action, ...body, sessionToken });
  }

  callPublic(action, body = {}, options = {}) {
    return this.request({ action, ...body }, options);
  }

  async request(payload, { timeout = this.timeout } = {}) {
    const clientRequestId = payload.clientRequestId || this.idFactory();
    const requestPayload = { ...payload, clientRequestId };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    let response;

    try {
      // Safari rejects Window.fetch when a class instance becomes its receiver.
      // Detach implementation before calling it so native fetch keeps valid context.
      const fetchImpl = this.fetchImpl;
      response = await fetchImpl(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=UTF-8',
          Accept: 'application/json',
        },
        body: JSON.stringify(requestPayload),
        mode: 'cors',
        credentials: 'omit',
        signal: controller.signal,
      });
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new ApiError('Traitement Power Automate toujours en cours.', {
          code: 'TIMEOUT',
          clientRequestId,
        });
      }
      throw new ApiError('API Event VS inaccessible.', {
        code: 'NETWORK_ERROR',
        details: error.message,
        clientRequestId,
      });
    } finally {
      clearTimeout(timer);
    }

    const rawResponse = await response.text();
    let responsePayload = {};
    try {
      responsePayload = rawResponse ? JSON.parse(rawResponse) : {};
    } catch {
      responsePayload = {};
    }
    if (!response.ok || responsePayload.ok === false) {
      const code = responsePayload.error?.code || (response.status === 409 ? 'REVISION_CONFLICT' : 'HTTP_ERROR');
      const message = responsePayload.error?.message || this.messageForStatus(response.status);
      const details = responsePayload.error?.details || null;
      throw new ApiError(message, {
        status: response.status,
        code,
        details,
        clientRequestId: responsePayload.meta?.clientRequestId || clientRequestId,
        retryAfter: details?.retryAfter,
      });
    }
    return responsePayload.data ?? responsePayload;
  }

  messageForStatus(status) {
    if (status === 401) return 'Session expirée. Reconnecte-toi.';
    if (status === 403) return 'Compte non autorisé pour Event VS.';
    if (status === 409) return 'Demande modifiée par une autre personne. Recharge avant de continuer.';
    if (status === 429) return 'Trop de requêtes. Réessaie dans un instant.';
    return `Erreur API (${status || 'réseau'}).`;
  }
}
