export const DRAFT_KEY = 'eventvs.public-request-draft.v1';

const RESOURCE_KEYS = new Set([
  'rooms',
  'selectedRooms',
  'salles',
  'cateringSpaces',
  'selectedCateringSpaces',
  'traiteur',
]);

export function sanitizeDraft(value) {
  if (Array.isArray(value)) return value.map(sanitizeDraft);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !RESOURCE_KEYS.has(key))
      .map(([key, child]) => [key, sanitizeDraft(child)]),
  );
}

export function saveDraft(formData, storage = localStorage, now = new Date()) {
  const draft = {
    version: 1,
    savedAt: now.toISOString(),
    data: sanitizeDraft(formData),
    resourcesRequireRefresh: true,
  };
  storage.setItem(DRAFT_KEY, JSON.stringify(draft));
  return draft;
}

export function loadDraft(storage = localStorage) {
  const raw = storage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw);
    if (draft.version !== 1 || !draft.data || typeof draft.data !== 'object') return null;
    return { ...draft, data: sanitizeDraft(draft.data), resourcesRequireRefresh: true };
  } catch {
    return null;
  }
}

export function deleteDraft(storage = localStorage) {
  storage.removeItem(DRAFT_KEY);
}
