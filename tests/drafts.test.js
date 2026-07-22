import { beforeEach, describe, expect, it } from 'vitest';
import { deleteDraft, DRAFT_KEY, loadDraft, sanitizeDraft, saveDraft } from '../src/drafts.js';

describe('local request drafts', () => {
  let storage;
  beforeEach(() => {
    const values = new Map();
    storage = {
      getItem: (key) => values.has(key) ? values.get(key) : null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key),
      clear: () => values.clear(),
    };
  });

  it('saves and restores same-device draft', () => {
    const saved = saveDraft({ title: 'Forum', participants: 80 }, storage, new Date('2026-07-22T10:00:00Z'));
    expect(saved.savedAt).toBe('2026-07-22T10:00:00.000Z');
    expect(loadDraft(storage)).toMatchObject({ data: { title: 'Forum', participants: 80 }, resourcesRequireRefresh: true });
  });

  it('never restores rooms or catering spaces', () => {
    const sanitized = sanitizeDraft({
      title: 'Forum', rooms: ['ALP 1 107'], nested: { cateringSpaces: ['ALP 1 94.3'], note: 'keep' },
    });
    expect(sanitized).toEqual({ title: 'Forum', nested: { note: 'keep' } });
  });

  it('deletes draft after successful submission', () => {
    saveDraft({ title: 'Forum' }, storage);
    deleteDraft(storage);
    expect(storage.getItem(DRAFT_KEY)).toBeNull();
    expect(loadDraft(storage)).toBeNull();
  });

  it('ignores corrupt or incompatible drafts', () => {
    storage.setItem(DRAFT_KEY, '{bad json');
    expect(loadDraft(storage)).toBeNull();
    storage.setItem(DRAFT_KEY, JSON.stringify({ version: 2, data: {} }));
    expect(loadDraft(storage)).toBeNull();
  });
});
