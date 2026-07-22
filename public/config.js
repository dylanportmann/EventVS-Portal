/* Runtime configuration. Values are public SPA identifiers, never secrets. */
window.EVENTVS_CONFIG = Object.freeze({
  tenantId: 'f6c2556a-c4fb-4ab1-a2c7-9e220df11c43',
  clientId: 'REPLACE_WITH_ENTRA_SPA_CLIENT_ID',
  apiUrl: 'REPLACE_WITH_PROTECTED_POWER_AUTOMATE_HTTP_URL',
  apiScope: 'https://service.flow.microsoft.com//user_impersonation',
  redirectUri: 'https://dylanportmann.github.io/EventVS-Portal/',
  requestFormUrl: '',
  pageSize: 12,
});
