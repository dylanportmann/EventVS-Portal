import { describe, expect, it } from 'vitest';
import { AuthService } from '../src/auth.js';

describe('AuthService profile', () => {
  it('uses signed ID-token claims without opening second interaction', async () => {
    const account = {
      name: 'Dylan Portmann',
      username: 'fallback@epfl.ch',
      localAccountId: 'local',
      idTokenClaims: {
        oid: 'object-id',
        name: 'Dylan Portmann',
        preferred_username: 'Dylan.Portmann@epfl.ch',
      },
    };
    const auth = Object.create(AuthService.prototype);
    auth.client = {
      getActiveAccount: () => account,
      getAllAccounts: () => [account],
    };

    await expect(auth.profile()).resolves.toEqual({
      id: 'object-id',
      name: 'Dylan Portmann',
      email: 'dylan.portmann@epfl.ch',
    });
  });
});
