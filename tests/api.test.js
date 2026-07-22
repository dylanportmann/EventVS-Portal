import { describe, expect, it, vi } from 'vitest';
import { ApiError, EventVsApi } from '../src/api.js';

function response(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('EventVsApi', () => {
  it('posts one action with bearer token and no cookies', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({ ok: true, data: { items: [] } }));
    const api = new EventVsApi({ apiUrl: 'https://api.example.test', tokenProvider: () => 'token', fetchImpl });
    await api.listRequests({ page: 2 });
    expect(fetchImpl).toHaveBeenCalledWith('https://api.example.test', expect.objectContaining({
      method: 'POST',
      credentials: 'omit',
      headers: expect.objectContaining({ Authorization: 'Bearer token', 'Content-Type': 'application/json' }),
      body: JSON.stringify({ action: 'listRequests', payload: { page: 2 } }),
    }));
  });

  it('sends expected revision and changes', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({ ok: true, data: { revision: 4 } }));
    const api = new EventVsApi({ apiUrl: 'https://api.example.test', tokenProvider: () => 'token', fetchImpl });
    await api.updateRequest({ requestId: '42', expectedRevision: 3, changes: { title: 'B' }, identity: { name: 'Dylan' } });
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body).toMatchObject({ action: 'updateRequest', requestId: '42', expectedRevision: 3, changes: { title: 'B' } });
  });

  it('maps stale revision to typed 409 error', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({ ok: false, error: { code: 'REVISION_CONFLICT', message: 'Périmée' } }, 409));
    const api = new EventVsApi({ apiUrl: 'https://api.example.test', tokenProvider: () => 'token', fetchImpl });
    await expect(api.getRequest('42')).rejects.toMatchObject({ name: 'ApiError', status: 409, code: 'REVISION_CONFLICT' });
  });

  it('maps network failure without leaking details to request body', async () => {
    const api = new EventVsApi({ apiUrl: 'https://api.example.test', tokenProvider: () => 'token', fetchImpl: vi.fn().mockRejectedValue(new Error('DNS')) });
    await expect(api.getRequest('42')).rejects.toBeInstanceOf(ApiError);
  });
});
