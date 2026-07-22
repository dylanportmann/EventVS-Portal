import { describe, expect, it } from 'vitest';
import { changePreviewView, dashboardView, otpView } from '../src/views.js';

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
    });
    expect(html).toContain('Sécurité');
    expect(html).toContain('Validation Event initiale jamais relancée');
  });

  it('renders OTP screen without trusting email HTML', () => {
    const html = otpView({ email: '<img src=x>@epfl.ch' });
    expect(html).not.toContain('<img src=x>');
    expect(html).toContain('autocomplete="one-time-code"');
  });
});
