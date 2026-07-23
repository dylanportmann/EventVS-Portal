import { describe, expect, it } from 'vitest';
import {
  aggregateApprovalStatus,
  applyApprovalResponse,
  approvalTaskKey,
  guardApprovalResponse,
  planLegacyApprovalMigration,
  previewApprovalChanges,
  replaceApprovalsForRevision,
  scopeHashForTeam,
} from '../src/approval-model.js';

function request(overrides = {}) {
  return {
    id: '42',
    revision: 3,
    title: 'Event',
    dateStart: '2026-09-01',
    dateEnd: '2026-09-01',
    startTime: '09:00',
    endTime: '17:00',
    fields: {
      rooms: 'A', cateringSpaces: '', catering: '', furniture: '', partitions: '',
      participants: 80, access: '', publicTarget: 'Interne', safety: '', remarks: '',
      screens: false, screenTitle: '', itNeeds: 'Micro',
    },
    approvals: [
      { team: 'Event', current: true, taskKey: '42|Event|1', revision: 1, status: 'Approuvé', deliveryStatus: 'responded' },
      { team: 'Infra', current: true, taskKey: '42|Infra|3', revision: 3, status: 'En attente', deliveryStatus: 'delivered', scopeHash: 'old-infra' },
      { team: 'Sécurité', current: true, taskKey: '42|Sécurité|2', revision: 2, status: 'Approuvé', deliveryStatus: 'responded', scopeHash: 'old-security' },
      { team: 'Signalétique', current: true, taskKey: '42|Signalétique|1', revision: 1, status: 'Non requis', deliveryStatus: 'not_required' },
      { team: 'IT', current: true, taskKey: '42|IT|2', revision: 2, status: 'Approuvé', deliveryStatus: 'responded', scopeHash: 'old-it' },
    ],
    ...overrides,
  };
}

describe('approval model', () => {
  it('uses unique request/team/revision task keys', () => {
    expect(approvalTaskKey('42', 'Infra', 4)).toBe('42|Infra|4');
    expect(approvalTaskKey('42', 'Sécurité', 4)).not.toBe(approvalTaskKey('42', 'Infra', 4));
  });

  it('hashes only team scope deterministically', () => {
    const before = request();
    const unrelated = structuredClone(before);
    unrelated.fields.itNeeds = 'Deux micros';
    expect(scopeHashForTeam(before, 'Infra')).toBe(scopeHashForTeam(unrelated, 'Infra'));
    unrelated.fields.rooms = 'B';
    expect(scopeHashForTeam(before, 'Infra')).not.toBe(scopeHashForTeam(unrelated, 'Infra'));
  });

  it('previews created, canceled, and kept teams exactly', () => {
    const before = request();
    const after = structuredClone(before);
    after.fields.rooms = 'B';
    const preview = previewApprovalChanges(before, after, ['Infra']);
    expect(preview.created).toEqual([expect.objectContaining({ team: 'Infra', revision: 4, taskKey: '42|Infra|4' })]);
    expect(preview.canceled).toEqual([{ team: 'Infra', revision: 3, taskKey: '42|Infra|3' }]);
    expect(preview.kept.map(({ team }) => team)).toEqual(['Event', 'Sécurité', 'IT']);
  });

  it('obsoletes only open touched task and preserves completed history', () => {
    const before = request();
    const after = structuredClone(before);
    after.fields.rooms = 'B';
    after.fields.participants = 100;
    const result = replaceApprovalsForRevision(before, after, ['Infra', 'Sécurité'], '2026-07-23T10:00:00Z');
    expect(result.approvals.find(({ taskKey }) => taskKey === '42|Infra|3')).toMatchObject({ status: 'Obsolète', current: false, deliveryStatus: 'canceled' });
    expect(result.approvals.find(({ taskKey }) => taskKey === '42|Sécurité|2')).toMatchObject({ status: 'Approuvé', current: false });
    expect(result.approvals.filter(({ current }) => current).map(({ taskKey }) => taskKey))
      .toEqual(expect.arrayContaining(['42|Infra|4', '42|Sécurité|4', '42|Event|1', '42|IT|2', '42|Signalétique|1']));
  });

  it('ignores stale responses by full correlation guard', () => {
    const before = request();
    expect(guardApprovalResponse(before, {
      team: 'Infra', taskKey: '42|Infra|3', revision: 3, scopeHash: 'old-infra',
    }).accepted).toBe(true);
    expect(guardApprovalResponse(before, {
      team: 'Infra', taskKey: '42|Infra|2', revision: 3, scopeHash: 'old-infra',
    }).accepted).toBe(false);
    expect(guardApprovalResponse(before, {
      team: 'Infra', taskKey: '42|Infra|3', revision: 3, scopeHash: 'other',
    }).accepted).toBe(false);
  });

  it('aggregates current tasks without overwriting simultaneous team responses', () => {
    const pending = request({
      approvals: [
        { team: 'Event', current: true, taskKey: '42|Event|1', revision: 1, status: 'Approuvé', deliveryStatus: 'responded' },
        { team: 'Infra', current: true, taskKey: '42|Infra|3', revision: 3, status: 'En attente', deliveryStatus: 'delivered', scopeHash: 'infra' },
        { team: 'IT', current: true, taskKey: '42|IT|3', revision: 3, status: 'En attente', deliveryStatus: 'delivered', scopeHash: 'it' },
      ],
    });
    const infra = applyApprovalResponse(pending, { team: 'Infra', taskKey: '42|Infra|3', revision: 3, scopeHash: 'infra', outcome: 'Approve' }).request;
    expect(aggregateApprovalStatus(infra.approvals)).toBe('Modification en cours');
    const complete = applyApprovalResponse(infra, { team: 'IT', taskKey: '42|IT|3', revision: 3, scopeHash: 'it', outcome: 'Approve' }).request;
    expect(complete.status).toBe('Validé');
    expect(complete.approvals.find(({ team }) => team === 'Infra').status).toBe('Approuvé');
  });

  it('sets global refusal from one current team', () => {
    const rejected = applyApprovalResponse(request(), {
      team: 'Infra', taskKey: '42|Infra|3', revision: 3, scopeHash: 'old-infra', outcome: 'Reject', comment: 'Capacité', responder: 'Dylan',
    }).request;
    expect(rejected.status).toBe('Refusé');
    expect(rejected.approvals.find(({ team }) => team === 'Infra')).toMatchObject({ status: 'Refusé', comment: 'Capacité', responder: 'Dylan' });
  });

  it('plans manual cancellation and separate tasks for grouped legacy Approval', () => {
    const legacy = request({
      approvals: [
        { team: 'Event', revision: 1, status: 'Approuvé', approvalId: 'event-id' },
        { team: 'Infra', revision: 3, status: 'En attente', deliveryStatus: 'delivered', approvalId: 'group-id' },
        { team: 'Sécurité', revision: 3, status: 'En attente', deliveryStatus: 'delivered', approvalId: 'group-id' },
        { team: 'IT', revision: 2, status: 'Approuvé', deliveryStatus: 'responded', approvalId: 'it-id' },
      ],
    });
    const plan = planLegacyApprovalMigration(legacy);
    expect(plan.manualCancelApprovalIds).toEqual(['group-id']);
    expect(plan.tasks.map(({ taskKey }) => taskKey)).toEqual(['42|Infra|3', '42|Sécurité|3']);
    expect(plan.tasks.every(({ assignee }) => assignee === 'dylan.portmann@epfl.ch')).toBe(true);
    expect(plan.preserved.map(({ team }) => team)).toEqual(['Event', 'IT']);
  });
});
