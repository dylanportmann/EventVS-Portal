export const GLOBAL_STATUSES = [
  'Reçu',
  'Validation Event en cours',
  'Étude technique',
  'Modification en cours',
  'Annulation en cours',
  'Suppression bloquée',
  'Validé',
  'Refusé',
  'Capacité dépassée',
  'Ressource indisponible',
];

export const TEAM_STATUSES = [
  'À venir',
  'Non requis',
  'En attente',
  'Approuvé',
  'Refusé',
  'Suivi partiel',
  'Obsolète',
  'Approuvé reporté',
];

export const TEAMS = ['Event', 'Infra', 'Sécurité', 'Signalétique', 'IT'];

export const EDITABLE_FIELDS = [
  { path: 'title', label: 'Titre', section: 'Événement', type: 'text' },
  { path: 'labAcronym', label: 'Acronyme du laboratoire', section: 'Événement', type: 'text' },
  { path: 'dateStart', label: 'Date de début', section: 'Événement', type: 'date' },
  { path: 'dateEnd', label: 'Date de fin', section: 'Événement', type: 'date' },
  { path: 'startTime', label: 'Heure de début', section: 'Événement', type: 'time' },
  { path: 'endTime', label: 'Heure de fin', section: 'Événement', type: 'time' },
  { path: 'fields.type', label: "Type d'événement", section: 'Événement', type: 'text' },
  { path: 'fields.participants', label: 'Participants', section: 'Événement', type: 'number' },
  { path: 'fields.publicTarget', label: 'Public cible', section: 'Sécurité', type: 'select', options: ['Interne EPFL', 'Mixte interne EPFL / externe', 'Externe'] },
  { path: 'fields.access', label: 'Accès requis', section: 'Sécurité', type: 'text' },
  { path: 'fields.safety', label: 'Besoins sécurité', section: 'Sécurité', type: 'textarea' },
  { path: 'fields.rooms', label: 'Salles', section: 'Infrastructure', type: 'text' },
  { path: 'fields.cateringSpaces', label: 'Espaces traiteur', section: 'Infrastructure', type: 'text' },
  { path: 'fields.catering', label: 'Traiteur', section: 'Infrastructure', type: 'text' },
  { path: 'fields.furniture', label: 'Mobilier', section: 'Infrastructure', type: 'textarea' },
  { path: 'fields.partitions', label: 'Séparations', section: 'Infrastructure', type: 'textarea' },
  { path: 'fields.screens', label: "Affichage écrans", section: 'Signalétique', type: 'checkbox' },
  { path: 'fields.screenTitle', label: 'Titre affiché', section: 'Signalétique', type: 'text' },
  { path: 'fields.itNeeds', label: 'Besoins audiovisuels / IT', section: 'IT', type: 'textarea' },
  { path: 'fields.remarks', label: 'Remarques', section: 'Remarques', type: 'textarea' },
];

export const LOCKED_FIELDS = [
  { path: 'organizer.name', label: 'Nom organisateur' },
  { path: 'organizer.email', label: 'Email organisateur' },
  { path: 'organizer.phone', label: 'Téléphone organisateur' },
];
