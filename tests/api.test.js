import { describe, expect, it, vi } from 'vitest';
import { ApiError, EventVsApi } from '../src/api.js';

function response(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('EventVsApi', () => {
  it('posts one action with portal session and no CORS preflight header', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({ ok: true, data: { items: [] } }));
    const api = new EventVsApi({ apiUrl: 'https://api.example.test', sessionProvider: () => 'session', fetchImpl });
    await api.listRequests({ page: 2 });
    expect(fetchImpl).toHaveBeenCalledWith('https://api.example.test', expect.objectContaining({
      method: 'POST',
      credentials: 'omit',
      headers: expect.objectContaining({ 'Content-Type': 'text/plain;charset=UTF-8' }),
      body: JSON.stringify({ action: 'listRequests', payload: { page: 2 }, sessionToken: 'session' }),
    }));
    expect(fetchImpl.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
  });

  it('starts and verifies email challenge without existing session', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response({ ok: true, data: { challenge: true } }, 202))
      .mockResolvedValueOnce(response({ ok: true, data: { sessionToken: 'abc', expiresAt: '2099-01-01T00:00:00Z', email: 'dylan.portmann@epfl.ch' } }));
    const api = new EventVsApi({ apiUrl: 'https://api.example.test', fetchImpl });
    await api.startSession('dylan.portmann@epfl.ch');
    await api.verifySession('dylan.portmann@epfl.ch', '123456');
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({ action: 'startSession', email: 'dylan.portmann@epfl.ch' });
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body)).toEqual({ action: 'verifySession', email: 'dylan.portmann@epfl.ch', code: '123456' });
  });

  it('sends expected revision and changes', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({ ok: true, data: { revision: 4 } }));
    const api = new EventVsApi({ apiUrl: 'https://api.example.test', sessionProvider: () => 'session', fetchImpl });
    await api.updateRequest({ requestId: '42', expectedRevision: 3, changes: { title: 'B' }, identity: { name: 'Dylan' } });
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body).toMatchObject({ action: 'updateRequest', requestId: '42', expectedRevision: 3, changes: { title: 'B' } });
  });

  it('maps stale revision to typed 409 error', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({ ok: false, error: { code: 'REVISION_CONFLICT', message: 'Périmée' } }, 409));
    const api = new EventVsApi({ apiUrl: 'https://api.example.test', sessionProvider: () => 'session', fetchImpl });
    await expect(api.getRequest('42')).rejects.toMatchObject({ name: 'ApiError', status: 409, code: 'REVISION_CONFLICT' });
  });

  it('maps network failure without leaking details to request body', async () => {
    const api = new EventVsApi({ apiUrl: 'https://api.example.test', sessionProvider: () => 'session', fetchImpl: vi.fn().mockRejectedValue(new Error('DNS')) });
    await expect(api.getRequest('42')).rejects.toBeInstanceOf(ApiError);
  });
});
