export const AUTO_REFRESH_INTERVAL_MS = 15_000;

export function canAutoRefresh({ account, profile, loading, editOpen, polling, visibilityState }) {
  return Boolean(account && profile)
    && !loading
    && !editOpen
    && !polling
    && visibilityState === 'visible';
}

export function changed(previous, next) {
  return JSON.stringify(previous) !== JSON.stringify(next);
}
