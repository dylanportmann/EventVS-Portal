import recipients from './approval-recipients.json';

const EXPECTED_TEAMS = ['Event', 'Infra', 'Sécurité', 'Signalétique', 'IT'];
const EPFL_EMAIL = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@epfl\.ch$/i;

function validateRecipients(mapping) {
  const keys = Object.keys(mapping);
  if (keys.length !== EXPECTED_TEAMS.length || EXPECTED_TEAMS.some((team) => !keys.includes(team))) {
    throw new Error('Approval recipient mapping must contain every EventVS team exactly once');
  }
  EXPECTED_TEAMS.forEach((team) => {
    const emails = mapping[team];
    if (!Array.isArray(emails) || emails.length === 0) {
      throw new Error(`Approval recipient mapping has no recipient for ${team}`);
    }
    emails.forEach((email) => {
      if (typeof email !== 'string' || email !== email.trim().toLowerCase() || !EPFL_EMAIL.test(email)) {
        throw new Error(`Invalid EPFL approval recipient for ${team}: ${String(email)}`);
      }
      if (emails.indexOf(email) !== emails.lastIndexOf(email)) {
        throw new Error(`Duplicate approval recipient within ${team}: ${email}`);
      }
    });
  });
  return Object.freeze(Object.fromEntries(
    EXPECTED_TEAMS.map((team) => [team, Object.freeze([...mapping[team]])]),
  ));
}

export const APPROVAL_RECIPIENTS = validateRecipients(recipients);

export function approvalAssignee(team) {
  const emails = APPROVAL_RECIPIENTS[team];
  if (!emails) throw new Error(`Unknown approval team: ${team}`);
  return emails.join(';');
}

export function formatApprovalRecipients(value) {
  const recipientsList = Array.isArray(value)
    ? value
    : String(value || '').split(/[;,]/);
  return recipientsList.map((email) => String(email).trim()).filter(Boolean).join(', ');
}
