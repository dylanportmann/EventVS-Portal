import { EDITABLE_FIELDS } from './constants.js';
import { previewApprovalChanges } from './approval-model.js';

const ALL_TECHNICAL = ['Infra', 'Sécurité', 'Signalétique', 'IT'];
const SCHEDULE = new Set(['dateStart', 'dateEnd', 'startTime', 'endTime']);
const INFRA = new Set(['fields.rooms', 'fields.cateringSpaces', 'fields.catering', 'fields.furniture', 'fields.partitions']);
const SECURITY = new Set(['fields.participants', 'fields.access', 'fields.publicTarget', 'fields.safety']);
const SIGNAGE = new Set(['fields.screens', 'fields.screenTitle']);
const IT = new Set(['fields.itNeeds']);

export function getAtPath(object, path) {
  return path.split('.').reduce((value, key) => value?.[key], object);
}

export function setAtPath(object, path, value) {
  const parts = path.split('.');
  let cursor = object;
  parts.forEach((key, index) => {
    if (index === parts.length - 1) cursor[key] = value;
    else cursor = cursor[key] ||= {};
  });
  return object;
}

export function normalizeValue(value) {
  if (typeof value === 'string') return value.trim().replace(/\s+/g, ' ');
  if (value === null || value === undefined) return '';
  return value;
}

export function changedFields(request, candidate) {
  return EDITABLE_FIELDS.filter(({ path }) => normalizeValue(getAtPath(request, path)) !== normalizeValue(getAtPath(candidate, path)));
}

export function requiredTechnicalTeams(request) {
  return (request.approvals || [])
    .filter(({ team, status }) => team !== 'Event' && status !== 'Non requis')
    .map(({ team }) => team);
}

export function computeReroutes(request, changed) {
  const paths = new Set(changed.map((field) => typeof field === 'string' ? field : field.path));
  const teams = new Set();
  const reasons = [];

  if ([...paths].some((path) => SCHEDULE.has(path))) {
    ALL_TECHNICAL.forEach((team) => teams.add(team));
    reasons.push('Date ou horaire modifiée : toutes équipes techniques');
  }
  if ([...paths].some((path) => INFRA.has(path))) {
    teams.add('Infra');
    reasons.push('Salle, traiteur, mobilier ou séparations modifiés');
  }
  if ([...paths].some((path) => SECURITY.has(path))) {
    teams.add('Sécurité');
    reasons.push('Capacité, participants, accès, public ou sécurité modifiés');
  }
  if ([...paths].some((path) => SIGNAGE.has(path))) {
    teams.add('Signalétique');
    reasons.push('Données écrans modifiées');
  }
  if (paths.has('title') && (request.fields?.screens || candidateValue(request, changed, 'fields.screens'))) {
    teams.add('Signalétique');
    reasons.push('Titre modifié avec affichage écrans actif');
  }
  if ([...paths].some((path) => IT.has(path))) {
    teams.add('IT');
    reasons.push('Besoins audiovisuels / IT modifiés');
  }
  if (paths.has('fields.remarks')) {
    ALL_TECHNICAL.forEach((team) => teams.add(team));
    reasons.push('Remarques libres modifiées : toutes équipes techniques');
  }

  return { teams: [...teams], reasons };
}

function candidateValue(request, changed, path) {
  const item = changed.find((field) => field.path === path);
  return item?.value ?? getAtPath(request, path);
}

export function buildChangeSet(request, candidate) {
  const fields = changedFields(request, candidate).map((field) => ({
    ...field,
    before: getAtPath(request, field.path),
    after: getAtPath(candidate, field.path),
    value: getAtPath(candidate, field.path),
  }));
  const reroutes = computeReroutes(request, fields);
  const approvalChanges = previewApprovalChanges(request, candidate, reroutes.teams);
  const changes = Object.fromEntries(fields.map(({ path, after }) => [path, after]));
  return { fields, changes, reroutes, approvalChanges };
}

export function scopeHash(fields, team) {
  const source = fields
    .filter(({ teams = [] }) => teams.includes(team))
    .sort((a, b) => a.path.localeCompare(b.path))
    .map(({ path, value }) => `${path}:${JSON.stringify(value)}`)
    .join('|');
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export { ALL_TECHNICAL };
