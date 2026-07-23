import { describe, expect, it } from 'vitest';
import { buildChangeSet, computeReroutes, scopeHash } from '../src/routing-rules.js';

function request(overrides = {}) {
  return {
    title: 'Événement',
    dateStart: '2026-09-01',
    dateEnd: '2026-09-01',
    startTime: '09:00',
    endTime: '17:00',
    labAcronym: '',
    fields: {
      type: 'Conférence', participants: 80, publicTarget: 'Interne EPFL', access: '', safety: '', rooms: 'A',
      cateringSpaces: '', catering: '', furniture: '', partitions: '', screens: false, screenTitle: '', itNeeds: '', remarks: '',
    },
    approvals: [
      { team: 'Event', status: 'Approuvé' },
      { team: 'Infra', status: 'Approuvé' },
      { team: 'Sécurité', status: 'En attente' },
      { team: 'Signalétique', status: 'Non requis' },
      { team: 'IT', status: 'Approuvé' },
    ],
    ...overrides,
  };
}

describe('routing rules', () => {
  it.each([
    ['fields.rooms', 'B', ['Infra']],
    ['fields.catering', 'Zenhäusern', ['Infra']],
    ['fields.participants', 120, ['Sécurité']],
    ['fields.publicTarget', 'Externe', ['Sécurité']],
    ['fields.screens', true, ['Signalétique']],
    ['fields.itNeeds', 'Deux micros', ['IT']],
  ])('routes %s to expected team', (path, value, expected) => {
    expect(computeReroutes(request(), [{ path, value }]).teams).toEqual(expected);
  });

  it('reroutes all technical teams on schedule change', () => {
    expect(computeReroutes(request(), [{ path: 'dateStart', value: '2026-09-02' }]).teams)
      .toEqual(['Infra', 'Sécurité', 'Signalétique', 'IT']);
  });

  it('reroutes all technical teams on remarks', () => {
    expect(computeReroutes(request(), [{ path: 'fields.remarks', value: 'Nouveau risque' }]).teams)
      .toEqual(['Infra', 'Sécurité', 'Signalétique', 'IT']);
  });

  it('reroutes signage for title only when screens are active', () => {
    expect(computeReroutes(request(), [{ path: 'title', value: 'Nouveau' }]).teams).toEqual([]);
    expect(computeReroutes(request({ fields: { ...request().fields, screens: true } }), [{ path: 'title', value: 'Nouveau' }]).teams)
      .toEqual(['Signalétique']);
  });

  it('never reroutes Event validation and deduplicates combined changes', () => {
    const result = computeReroutes(request(), [
      { path: 'dateStart', value: '2026-09-02' },
      { path: 'fields.rooms', value: 'B' },
      { path: 'fields.itNeeds', value: 'Micros' },
    ]);
    expect(result.teams).toEqual(['Infra', 'Sécurité', 'Signalétique', 'IT']);
    expect(result.teams).not.toContain('Event');
  });

  it('builds dotted-path changes with before/after preview', () => {
    const before = request();
    const after = structuredClone(before);
    after.fields.participants = 95;
    after.title = 'Nouveau titre';
    const result = buildChangeSet(before, after);
    expect(result.changes).toEqual({ title: 'Nouveau titre', 'fields.participants': 95 });
    expect(result.fields.find(({ path }) => path === 'fields.participants')).toMatchObject({ before: 80, after: 95 });
    expect(result.approvalChanges.created.map(({ team }) => team)).toEqual(['Sécurité']);
  });

  it('generates deterministic scope hash', () => {
    const fields = [
      { path: 'b', value: 2, teams: ['Infra'] },
      { path: 'a', value: 1, teams: ['Infra'] },
    ];
    expect(scopeHash(fields, 'Infra')).toBe(scopeHash([...fields].reverse(), 'Infra'));
    expect(scopeHash(fields, 'Infra')).not.toBe(scopeHash([{ ...fields[0], value: 3 }], 'Infra'));
  });
});
