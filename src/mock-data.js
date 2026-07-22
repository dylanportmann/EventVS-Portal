const baseApprovals = [
  { team: 'Event', status: 'Approuvé', assignee: 'Jennifer Brady', revision: 1, requestedAt: '2026-07-08T08:18:00Z', respondedAt: '2026-07-08T09:02:00Z', response: 'Approve', comment: 'Demande complète.' },
  { team: 'Infra', status: 'En attente', assignee: 'Équipe Infrastructure VS', revision: 2, requestedAt: '2026-07-10T12:44:00Z', scopeHash: 'a42e1c90' },
  { team: 'Sécurité', status: 'Approuvé reporté', assignee: 'Sécurité EPFL VS', revision: 1, requestedAt: '2026-07-08T09:05:00Z', respondedAt: '2026-07-09T07:31:00Z', response: 'Approve', comment: 'Accès externe validé.', scopeHash: 'c18f2a77' },
  { team: 'Signalétique', status: 'Non requis', assignee: '', revision: 1 },
  { team: 'IT', status: 'Approuvé', assignee: 'Support IT Valais', revision: 1, requestedAt: '2026-07-08T09:05:00Z', respondedAt: '2026-07-08T14:18:00Z', response: 'Approve', comment: 'Visioconférence confirmée.', scopeHash: 'fb4a8801' },
];

const mainRequest = {
  id: 'EVS-2026-0042',
  revision: 2,
  title: 'Symposium Énergie & Territoire',
  labAcronym: 'ESL',
  dateStart: '2026-09-17',
  dateEnd: '2026-09-17',
  startTime: '09:00',
  endTime: '18:00',
  createdAt: '2026-07-08T08:12:00Z',
  updatedAt: '2026-07-10T12:44:00Z',
  status: 'Modification en cours',
  currentStep: 'Étude Infrastructure',
  waitingFor: ['Équipe Infrastructure VS'],
  late: true,
  organizer: {
    name: 'Claire Martin',
    email: 'claire.martin@epfl.ch',
    phone: '+41 21 693 00 00',
  },
  fields: {
    type: 'Conférence',
    participants: 145,
    publicTarget: 'Mixte interne EPFL / externe',
    access: 'ALPOLE — rez et 1er étage',
    safety: 'Accueil visiteurs externes et contrôle accès.',
    rooms: 'ALP 1 107; ALP 1 109',
    cateringSpaces: 'ALP 1 94.3',
    catering: 'Zenhäusern',
    furniture: '12 tables événement; 6 tables hautes; 4 poster boards',
    partitions: 'Ouvrir ALP 1 109 / 107',
    screens: false,
    screenTitle: '',
    itNeeds: 'Visioconférence, 2 micros et régie hybride.',
    remarks: 'Installation prévue dès 06:00. Accueil de quatre intervenants externes.',
  },
  approvals: baseApprovals,
  timeline: [
    { id: 't5', title: 'Nouvelle validation Infrastructure', detail: 'Révision 2 envoyée après modification mobilier.', at: '2026-07-10T12:44:00Z', actor: 'Dylan Portmann' },
    { id: 't4', title: 'Demande modifiée', detail: 'Mobilier ajusté. Approbation Infra réinitialisée.', at: '2026-07-10T12:42:00Z', actor: 'Dylan Portmann' },
    { id: 't3', title: 'Validation Event obtenue', detail: 'Demande complète.', at: '2026-07-08T09:02:00Z', actor: 'Jennifer Brady' },
    { id: 't2', title: 'Validation Event demandée', detail: 'Destinataire : Jennifer Brady.', at: '2026-07-08T08:18:00Z', actor: 'Flux Event VS' },
    { id: 't1', title: 'Demande reçue', detail: 'Créée depuis formulaire public.', at: '2026-07-08T08:12:00Z', actor: 'Claire Martin' },
  ],
  history: [
    {
      id: 'h1',
      revision: 2,
      at: '2026-07-10T12:42:00Z',
      actor: 'Dylan Portmann',
      reason: 'Disposition confirmée avec organisatrice.',
      reroutedTeams: ['Infra'],
      changes: [{ field: 'Mobilier', before: '8 tables événement', after: '12 tables événement; 6 tables hautes; 4 poster boards' }],
    },
  ],
  reservations: [
    { id: 'r1', resource: 'ALP 1 107', type: 'Salle', calendar: 'alp1107@epfl.ch', eventId: 'AAMk-demo-1', start: '2026-09-17T06:00:00+02:00', end: '2026-09-17T21:00:00+02:00', revision: 2, status: 'Réservé' },
    { id: 'r2', resource: 'ALP 1 109', type: 'Salle', calendar: 'alp1109@epfl.ch', eventId: 'AAMk-demo-2', start: '2026-09-17T06:00:00+02:00', end: '2026-09-17T21:00:00+02:00', revision: 2, status: 'Réservé' },
    { id: 'r3', resource: 'ALP 1 94.3', type: 'Espace traiteur', calendar: 'ALP194.3@epfl.ch', eventId: 'AAMk-demo-3', start: '2026-09-17T06:00:00+02:00', end: '2026-09-17T21:00:00+02:00', revision: 2, status: 'Réservé' },
  ],
  allowedActions: ['update'],
};

const samples = [
  ['0041', 'Journée portes ouvertes ALPOLE', '2026-08-29', 'Jennifer Brady', 'Étude technique', 'Sécurité', 'Sécurité EPFL VS', false],
  ['0040', 'Workshop Data Science', '2026-08-15', 'Marc Dubois', 'Validé', 'Terminé', '', false],
  ['0039', 'Accueil délégation ETHZ', '2026-08-08', 'Sofia Rossi', 'Validation Event en cours', 'Validation Event', 'Jennifer Brady', true],
  ['0038', 'Séminaire EESD', '2026-07-31', 'Luc Perrin', 'Refusé', 'Terminé', '', false],
  ['0037', 'Conférence Hydrogène', '2026-09-04', 'Anna Keller', 'Étude technique', 'IT', 'Support IT Valais', false],
  ['0036', 'Repas de laboratoire', '2026-08-21', 'Noé Favre', 'Ressource indisponible', 'Réservation', 'Dylan Portmann', false],
  ['0035', 'Forum startups', '2026-10-02', 'Maya Rey', 'Reçu', 'Triage', 'Équipe Events VS', false],
  ['0034', 'Congrès alpin', '2026-10-15', 'Lina Meier', 'Capacité dépassée', 'Contrôle capacité', 'Jennifer Brady', false],
  ['0033', 'Séance direction', '2026-07-28', 'Paul Roch', 'Validé', 'Terminé', '', false],
  ['0032', 'Animation Campus durable', '2026-09-12', 'Emma Blanc', 'Étude technique', 'Signalétique', 'Communication VS', true],
  ['0031', 'Workshop robotique', '2026-09-25', 'Hugo Berset', 'Modification en cours', 'Infrastructure', 'Équipe Infrastructure VS', false],
  ['0030', 'Séminaire architecture', '2026-08-19', 'Julie Zufferey', 'Validé', 'Terminé', '', false],
  ['0029', 'Événement historique importé', '2026-06-04', 'Historique', 'Validé', 'Historique non disponible', '', false],
];

export const mockRequests = [
  mainRequest,
  ...samples.map(([id, title, date, organizer, status, step, waiting, late], index) => ({
    ...structuredClone(mainRequest),
    id: `EVS-2026-${id}`,
    revision: index % 3 + 1,
    title,
    dateStart: date,
    dateEnd: date,
    status,
    currentStep: step,
    waitingFor: waiting ? [waiting] : [],
    late,
    organizer: { name: organizer, email: `${organizer.toLowerCase().replace(/\s+/g, '.')}@epfl.ch`, phone: '+41 21 693 00 00' },
    approvals: baseApprovals.map((approval) => ({ ...approval })),
    timeline: title.includes('historique') ? [] : mainRequest.timeline.map((item) => ({ ...item })),
    history: title.includes('historique') ? [] : mainRequest.history.map((item) => ({ ...item })),
  })),
];

export class MockEventVsApi {
  constructor(requests = mockRequests) {
    this.requests = structuredClone(requests);
  }

  async listRequests({ page = 1, pageSize = 12, filters = {} } = {}) {
    await pause();
    let items = [...this.requests];
    const query = (filters.search || '').trim().toLowerCase();
    if (query) items = items.filter((item) => [item.id, item.title, item.organizer.name].some((value) => value.toLowerCase().includes(query)));
    if (filters.status) items = items.filter((item) => item.status === filters.status);
    if (filters.team) items = items.filter((item) => item.approvals.some((approval) => approval.team === filters.team && approval.status !== 'Non requis'));
    if (filters.late === true || filters.late === 'true') items = items.filter((item) => item.late);
    if (filters.dateFrom) items = items.filter((item) => item.dateStart >= filters.dateFrom);
    if (filters.dateTo) items = items.filter((item) => item.dateStart <= filters.dateTo);
    const start = (page - 1) * pageSize;
    return {
      items: items.slice(start, start + pageSize).map(summary),
      page,
      pageSize,
      total: items.length,
      counts: {
        total: this.requests.length,
        active: this.requests.filter((item) => !['Validé', 'Refusé'].includes(item.status)).length,
        waiting: this.requests.filter((item) => item.waitingFor.length).length,
        late: this.requests.filter((item) => item.late).length,
      },
    };
  }

  async getRequest(requestId) {
    await pause();
    const item = this.requests.find(({ id }) => id === requestId);
    if (!item) throw new Error('Demande introuvable.');
    return structuredClone(item);
  }

  async updateRequest({ requestId, expectedRevision, changes, reason = '', identity = {} }) {
    await pause();
    const item = this.requests.find(({ id }) => id === requestId);
    if (!item) throw new Error('Demande introuvable.');
    if (item.revision !== expectedRevision) {
      const error = new Error('Demande modifiée par une autre personne. Recharge avant de continuer.');
      error.code = 'REVISION_CONFLICT';
      error.status = 409;
      throw error;
    }
    const before = structuredClone(item);
    Object.entries(changes).forEach(([path, value]) => setAtPath(item, path, value));
    item.revision += 1;
    item.updatedAt = new Date().toISOString();
    item.status = 'Modification en cours';
    item.history.unshift({
      id: `h${item.history.length + 1}`,
      revision: item.revision,
      at: item.updatedAt,
      actor: identity.name || 'Gestionnaire Event VS',
      reason,
      reroutedTeams: [],
      changes: Object.keys(changes).map((path) => ({ field: path, before: getAtPath(before, path), after: getAtPath(item, path) })),
    });
    return structuredClone(item);
  }
}

function summary(item) {
  const { approvals, timeline, history, reservations, fields, allowedActions, ...result } = item;
  return result;
}

function getAtPath(object, path) {
  return path.split('.').reduce((value, key) => value?.[key], object);
}

function setAtPath(object, path, value) {
  const parts = path.split('.');
  let cursor = object;
  parts.forEach((key, index) => {
    if (index === parts.length - 1) cursor[key] = value;
    else cursor = cursor[key] ||= {};
  });
}

function pause(ms = 80) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
