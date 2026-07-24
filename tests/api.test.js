import { describe, expect, it, vi } from 'vitest';
import { ApiError, EventVsApi } from '../src/api.js';

function response(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const CLIENT_REQUEST_ID = '11111111-1111-4111-8111-111111111111';
const CHALLENGE_ID = '22222222-2222-4222-8222-222222222222';
const idFactory = () => CLIENT_REQUEST_ID;

describe('EventVsApi', () => {
  it('posts one action with portal session and no CORS preflight header', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({ ok: true, data: { items: [] } }));
    const api = new EventVsApi({ apiUrl: 'https://api.example.test', sessionProvider: () => 'session', fetchImpl, idFactory });
    await api.listRequests({ page: 2 });
    expect(fetchImpl).toHaveBeenCalledWith('https://api.example.test', expect.objectContaining({
      method: 'POST',
      credentials: 'omit',
      headers: expect.objectContaining({ 'Content-Type': 'text/plain;charset=UTF-8' }),
      body: JSON.stringify({ action: 'listRequests', payload: { page: 2 }, sessionToken: 'session', clientRequestId: CLIENT_REQUEST_ID }),
    }));
    expect(fetchImpl.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
    expect(fetchImpl.mock.calls[0][1]).not.toHaveProperty('cache');
  });

  it('starts and verifies email challenge without existing session', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response({ ok: true, data: { challenge: true } }, 202))
      .mockResolvedValueOnce(response({ ok: true, data: { sessionToken: 'abc', expiresAt: '2099-01-01T00:00:00Z', email: 'dylan.portmann@epfl.ch' } }));
    const api = new EventVsApi({ apiUrl: 'https://api.example.test', fetchImpl, idFactory });
    await api.startSession('dylan.portmann@epfl.ch', CHALLENGE_ID);
    await api.verifySession('dylan.portmann@epfl.ch', '123456', CHALLENGE_ID);
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({
      action: 'startSession', email: 'dylan.portmann@epfl.ch', challengeId: CHALLENGE_ID, clientRequestId: CLIENT_REQUEST_ID,
    });
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body)).toEqual({
      action: 'verifySession', email: 'dylan.portmann@epfl.ch', code: '123456', challengeId: CHALLENGE_ID, clientRequestId: CLIENT_REQUEST_ID,
    });
  });

  it('sends expected revision and changes', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({ ok: true, data: { revision: 4 } }));
    const api = new EventVsApi({ apiUrl: 'https://api.example.test', sessionProvider: () => 'session', fetchImpl, idFactory });
    await api.updateRequest({ requestId: '42', expectedRevision: 3, changes: { title: 'B' }, identity: { name: 'Dylan' } });
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body).toMatchObject({ action: 'updateRequest', requestId: '42', expectedRevision: 3, changes: { title: 'B' } });
  });

  it('requires explicit cancellation confirmation and polls job status', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response({ ok: true, data: { requestId: '42', status: 'Queued' } }, 202))
      .mockResolvedValueOnce(response({ ok: true, data: { requestId: '42', status: 'Completed' } }));
    const api = new EventVsApi({ apiUrl: 'https://api.example.test', sessionProvider: () => 'session', fetchImpl, idFactory });

    await api.cancelEvent({ requestId: '42', expectedRevision: 3, confirmation: true, reason: 'Annulé' });
    await api.getCancellationStatus('42');

    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({
      action: 'cancelEvent', requestId: '42', expectedRevision: 3, confirmation: true, reason: 'Annulé', sessionToken: 'session', clientRequestId: CLIENT_REQUEST_ID,
    });
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body)).toEqual({
      action: 'getCancellationStatus', requestId: '42', sessionToken: 'session', clientRequestId: CLIENT_REQUEST_ID,
    });
  });

  it('maps stale revision to typed 409 error', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({ ok: false, error: { code: 'REVISION_CONFLICT', message: 'Périmée' } }, 409));
    const api = new EventVsApi({ apiUrl: 'https://api.example.test', sessionProvider: () => 'session', fetchImpl, idFactory });
    await expect(api.getRequest('42')).rejects.toMatchObject({ name: 'ApiError', status: 409, code: 'REVISION_CONFLICT' });
  });

  it('maps network failure without leaking details to request body', async () => {
    const api = new EventVsApi({
      apiUrl: 'https://api.example.test', sessionProvider: () => 'session', fetchImpl: vi.fn().mockRejectedValue(new Error('DNS')), idFactory,
    });
    await expect(api.getRequest('42')).rejects.toBeInstanceOf(ApiError);
  });

  it('calls fetch without binding the API instance as receiver', async () => {
    const fetchImpl = vi.fn(function () {
      expect(this).toBeUndefined();
      return Promise.resolve(response({ ok: true, data: { accepted: true } }));
    });
    const api = new EventVsApi({ apiUrl: 'https://api.example.test', fetchImpl, idFactory });

    await expect(api.startSession('dylan.portmann@epfl.ch', CHALLENGE_ID)).resolves.toEqual({ accepted: true });
  });

  it('exposes retry and correlation metadata from rate limiting', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({
      ok: false,
      error: { code: 'RATE_LIMITED', message: 'Attendez', details: { retryAfter: 42, challengeId: CHALLENGE_ID } },
      meta: { clientRequestId: CLIENT_REQUEST_ID },
    }, 429));
    const api = new EventVsApi({ apiUrl: 'https://api.example.test', fetchImpl, idFactory });

    await expect(api.startSession('dylan.portmann@epfl.ch', CHALLENGE_ID)).rejects.toMatchObject({
      code: 'RATE_LIMITED', retryAfter: 42, clientRequestId: CLIENT_REQUEST_ID,
    });
  });

  it('maps non-JSON gateway errors without leaking response text', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('<html>gateway</html>', { status: 502 }));
    const api = new EventVsApi({ apiUrl: 'https://api.example.test', fetchImpl, idFactory });

    await expect(api.startSession('dylan.portmann@epfl.ch', CHALLENGE_ID)).rejects.toMatchObject({
      code: 'HTTP_ERROR', status: 502, clientRequestId: CLIENT_REQUEST_ID,
    });
  });

  it('uses dedicated auth timeout and preserves challenge correlation', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn((url, options) => new Promise((resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    }));
    const api = new EventVsApi({ apiUrl: 'https://api.example.test', fetchImpl, idFactory, authTimeout: 75 });
    const pending = api.startSession('dylan.portmann@epfl.ch', CHALLENGE_ID);
    const assertion = expect(pending).rejects.toMatchObject({ code: 'TIMEOUT', clientRequestId: CLIENT_REQUEST_ID });
    await vi.advanceTimersByTimeAsync(75);
    await assertion;
    vi.useRealTimers();
  });
});
