import { describe, expect, it } from 'vitest';
import { cancelDialogView, changePreviewView, dashboardView, detailView, history, otpView } from '../src/views.js';

describe('views', () => {
  it('escapes API strings before rendering', () => {
    const html = dashboardView({
      result: {
        items: [{ id: '1', revision: 1, title: '<img src=x onerror=alert(1)>', dateStart: '2026-01-01', organizer: { name: '<b>X</b>' }, status: 'Reçu', currentStep: '', waitingFor: [] }],
        counts: {}, page: 1, pageSize: 12, total: 1,
      },
      filters: {},
      loading: false,
    });
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<b>X</b>');
    expect(html).toContain('&lt;img');
  });

  it('shows rerouted teams before confirmation', () => {
    const html = changePreviewView({
      fields: [{ label: 'Participants', before: 10, after: 20 }],
      reroutes: { teams: ['Sécurité'], reasons: ['Participants modifiés'] },
      approvalChanges: {
        created: [{ team: 'Sécurité' }],
        canceled: [{ team: 'Sécurité' }],
        kept: [{ team: 'Infra' }, { team: 'IT' }],
      },
    });
    expect(html).toContain('Sécurité');
    expect(html).toContain('Demandes ouvertes annulées');
    expect(html).toContain('Infra, IT');
    expect(html).toContain('Validation Event initiale jamais relancée');
  });

  it('renders one team card with replacement metadata and history', () => {
    const html = detailView({
      id: '42', revision: 4, title: 'Event', status: 'Modification en cours', dateStart: '2026-09-01', startTime: '09:00', endTime: '17:00', organizer: {}, fields: {}, approvals: [
        { team: 'Infra', current: false, taskKey: '42|Infra|3', revision: 3, status: 'Obsolète', deliveryStatus: 'canceled', supersededBy: '42|Infra|4' },
        { team: 'Infra', current: true, taskKey: '42|Infra|4', revision: 4, status: 'En attente', deliveryStatus: 'delivered', replacesTaskKey: '42|Infra|3', scopeHash: 'abc' },
      ], timeline: [], history: [], reservations: [], waitingFor: ['Infra'], allowedActions: [],
    });
    expect((html.match(/<article class="approval-team">/g) || []).length).toBe(1);
    expect(html).toContain('42|Infra|4');
    expect(html).toContain('Remplace 42|Infra|3');
    expect(html).toContain('Historique (1)');
  });

  it('renders OTP screen without trusting email HTML', () => {
    const html = otpView({ email: '<img src=x>@epfl.ch' });
    expect(html).not.toContain('<img src=x>');
    expect(html).toContain('autocomplete="one-time-code"');
  });

  it('renders destructive action only when backend authorizes it', () => {
    const request = {
      id: '42', revision: 2, title: 'Event', status: 'Validé', dateStart: '2026-09-01', startTime: '09:00', endTime: '17:00',
      organizer: {}, fields: {}, approvals: [], timeline: [], history: [], reservations: [], waitingFor: [], allowedActions: ['cancel'],
    };
    expect(detailView(request)).toContain('Annuler et supprimer');
    expect(detailView({ ...request, allowedActions: [] })).not.toContain('Annuler et supprimer');
  });

  it('requires checkbox in cancellation dialog and escapes request data', () => {
    const html = cancelDialogView({ id: '<42>', revision: 2, title: '<img src=x>' });
    expect(html).not.toContain('<img src=x>');
    expect(html).toContain('name="confirmation" type="checkbox" required');
    expect(html).toContain('id="confirm-cancel" disabled');
    expect(html).toContain('maxlength="2000"');
  });

  it('renders persisted object changes returned by Power Automate', () => {
    const html = history([{
      revision: 3,
      actor: 'dylan.portmann@epfl.ch',
      reason: 'Capacité ajustée',
      changes: { 'fields.participants': 80 },
      before: { fields: { participants: 50 } },
      reroutedTeams: ['Sécurité'],
      at: '2026-07-22T15:00:00Z',
    }]);
    expect(html).toContain('fields.participants');
    expect(html).toContain('50 → 80');
    expect(html).toContain('Sécurité');
  });
});
