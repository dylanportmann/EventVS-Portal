import { describe, expect, it } from 'vitest';
import {
  APPROVAL_RECIPIENTS,
  approvalAssignee,
  formatApprovalRecipients,
} from '../src/approval-recipients.js';

describe('approval recipients', () => {
  it('exposes complete exact team routing in stable order', () => {
    expect(APPROVAL_RECIPIENTS).toEqual({
      Event: ['jennifer.brady@epfl.ch'],
      Infra: ['lou.mahieu@epfl.ch', 'oscar.teti@epfl.ch'],
      'Sécurité': ['julien.howald@epfl.ch'],
      'Signalétique': ['jennifer.brady@epfl.ch'],
      IT: ['dylan.portmann@epfl.ch', 'jean.perruchoud@epfl.ch', 'cedric.passerini@epfl.ch'],
    });
    expect(approvalAssignee('IT')).toBe('dylan.portmann@epfl.ch;jean.perruchoud@epfl.ch;cedric.passerini@epfl.ch');
  });

  it('formats API semicolon recipients with readable commas', () => {
    expect(formatApprovalRecipients(approvalAssignee('Infra')))
      .toBe('lou.mahieu@epfl.ch, oscar.teti@epfl.ch');
  });
});
