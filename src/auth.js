import {
  InteractionRequiredAuthError,
  PublicClientApplication,
} from '@azure/msal-browser';

export class AuthService {
  constructor(config) {
    this.config = config;
    this.client = new PublicClientApplication({
      auth: {
        clientId: config.clientId,
        authority: `https://login.microsoftonline.com/${config.tenantId}`,
        redirectUri: config.redirectUri,
        postLogoutRedirectUri: config.redirectUri,
        navigateToLoginRequestUrl: false,
      },
      cache: {
        cacheLocation: 'sessionStorage',
        storeAuthStateInCookie: false,
      },
      system: {
        allowPlatformBroker: false,
      },
    });
  }

  async initialize() {
    await this.client.initialize();
    const response = await this.client.handleRedirectPromise();
    const account = response?.account || this.client.getActiveAccount() || this.client.getAllAccounts()[0] || null;
    if (account) this.client.setActiveAccount(account);
    return account;
  }

  get account() {
    return this.client.getActiveAccount() || this.client.getAllAccounts()[0] || null;
  }

  async login() {
    await this.client.loginRedirect({
      scopes: [this.config.apiScope],
      prompt: 'select_account',
    });
    return null;
  }

  async token() {
    const account = this.account;
    if (!account) throw new Error('AUTH_REQUIRED');
    const request = { account, scopes: [this.config.apiScope] };
    try {
      return (await this.client.acquireTokenSilent(request)).accessToken;
    } catch (error) {
      if (!(error instanceof InteractionRequiredAuthError)) throw error;
      return (await this.client.acquireTokenPopup(request)).accessToken;
    }
  }

  async logout() {
    await this.client.logoutRedirect({ account: this.account });
  }

  async profile() {
    const account = this.account;
    if (!account) throw new Error('AUTH_REQUIRED');
    const claims = account.idTokenClaims || {};
    return {
      id: claims.oid || account.localAccountId || '',
      name: claims.name || account.name || '',
      email: String(claims.email || claims.preferred_username || account.username || '').toLowerCase(),
    };
  }
}

export class MockAuthService {
  constructor() {
    this._account = {
      name: 'Dylan Portmann',
      username: 'dylan.portmann@epfl.ch',
      tenantId: 'f6c2556a-c4fb-4ab1-a2c7-9e220df11c43',
      localAccountId: 'demo-user',
    };
  }
  initialize() { return Promise.resolve(this._account); }
  login() { return Promise.resolve(this._account); }
  token() { return Promise.resolve('local-demo-token'); }
  profile() { return Promise.resolve({ id: 'demo-user', name: this._account.name, email: this._account.username }); }
  logout() { this._account = null; return Promise.resolve(); }
  get account() { return this._account; }
}
