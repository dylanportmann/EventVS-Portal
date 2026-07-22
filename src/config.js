const PLACEHOLDER = /REPLACE_WITH|YOUR-FLOW-URL|00000000-0000-0000-0000-000000000000/i;

function envValue(name) {
  return typeof import.meta !== 'undefined' ? import.meta.env?.[name] : undefined;
}

export function getConfig(location = window.location) {
  const runtime = window.EVENTVS_CONFIG || {};
  const tenantId = envValue('VITE_EVENTVS_TENANT_ID') || runtime.tenantId || '';
  const clientId = envValue('VITE_EVENTVS_CLIENT_ID') || runtime.clientId || '';
  const apiUrl = envValue('VITE_EVENTVS_API_URL') || runtime.apiUrl || '';
  const apiScope = envValue('VITE_EVENTVS_API_SCOPE') || runtime.apiScope || '';
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  const mock = local && new URLSearchParams(location.search).get('demo') === '1';

  return Object.freeze({
    tenantId,
    clientId,
    apiUrl,
    apiScope,
    redirectUri: local ? `${location.origin}/EventVS-Portal/` : (runtime.redirectUri || `${location.origin}${location.pathname}`),
    requestFormUrl: runtime.requestFormUrl || '',
    pageSize: Number(runtime.pageSize) || 12,
    mock,
    configured: ![tenantId, clientId, apiUrl, apiScope].some((value) => !value || PLACEHOLDER.test(value)),
  });
}

export function missingConfig(config) {
  return [
    ['tenantId', config.tenantId],
    ['clientId', config.clientId],
    ['apiUrl', config.apiUrl],
    ['apiScope', config.apiScope],
  ].filter(([, value]) => !value || PLACEHOLDER.test(value)).map(([name]) => name);
}
