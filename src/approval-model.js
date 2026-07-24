import { approvalAssignee } from './approval-recipients.js';

export const TECHNICAL_TEAMS = ['Infra', 'Sécurité', 'Signalétique', 'IT'];
export const APPROVED_STATUSES = new Set(['Approuvé', 'Approuvé reporté']);
export const OPEN_STATUSES = new Set(['En attente', 'Création en cours']);

const SHARED_SCOPE = ['dateStart', 'dateEnd', 'startTime', 'endTime', 'fields.remarks'];
const TEAM_SCOPE = {
  Infra: ['fields.rooms', 'fields.cateringSpaces', 'fields.catering', 'fields.furniture', 'fields.partitions'],
  'Sécurité': ['fields.participants', 'fields.access', 'fields.publicTarget', 'fields.safety'],
  'Signalétique': ['title', 'fields.screens', 'fields.screenTitle'],
  IT: ['fields.itNeeds'],
};

function getAtPath(object, path) {
  return path.split('.').reduce((value, key) => value?.[key], object);
}

function normalizeValue(value) {
  if (typeof value === 'string') return value.trim().replace(/\s+/g, ' ');
  if (value === null || value === undefined) return '';
  return value;
}

export function approvalTaskKey(requestId, team, revision) {
  return `${requestId}|${team}|${revision}`;
}

export function scopeHashForTeam(request, team) {
  const paths = [...SHARED_SCOPE, ...(TEAM_SCOPE[team] || [])].sort();
  const source = paths
    .map((path) => `${path}:${JSON.stringify(normalizeValue(getAtPath(request, path)))}`)
    .join('|');
  return `${fnv1a(source, 2166136261)}${fnv1a(source, 3339675911)}`;
}

function fnv1a(source, seed) {
  let hash = seed;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function isOpenApproval(approval = {}) {
  return OPEN_STATUSES.has(approval.status)
    && !['canceled', 'cancel_failed', 'obsolete', 'create_failed'].includes(approval.deliveryStatus);
}

export function currentApprovals(approvals = []) {
  const current = new Map();
  approvals.forEach((approval, index) => {
    if (!approval?.team) return;
    const score = approval.current === true
      ? Number.MAX_SAFE_INTEGER
      : approval.current === false
        ? Number.MIN_SAFE_INTEGER
        : (Number(approval.revision) || 0) * 1000 + index;
    const previous = current.get(approval.team);
    if (!previous || score > previous.score) current.set(approval.team, { approval, score });
  });
  return [...current.values()].map(({ approval }) => approval);
}

export function previewApprovalChanges(request, candidate, teams) {
  const affected = new Set(teams);
  const revision = Number(request.revision) + 1;
  const current = currentApprovals(request.approvals);
  const created = teams.map((team) => ({
    team,
    revision,
    taskKey: approvalTaskKey(request.id, team, revision),
    scopeHash: scopeHashForTeam(candidate, team),
  }));
  const canceled = current
    .filter((approval) => affected.has(approval.team) && isOpenApproval(approval))
    .map((approval) => ({
      team: approval.team,
      revision: approval.revision,
      taskKey: approval.taskKey || approvalTaskKey(request.id, approval.team, approval.revision),
    }));
  const kept = current
    .filter((approval) => !affected.has(approval.team) && approval.status !== 'Non requis')
    .map((approval) => ({
      team: approval.team,
      revision: approval.revision,
      status: approval.status,
      taskKey: approval.taskKey || approvalTaskKey(request.id, approval.team, approval.revision),
    }));
  return { created, canceled, kept, errors: [] };
}

export function replaceApprovalsForRevision(request, candidate, teams, now = new Date().toISOString()) {
  const changes = previewApprovalChanges(request, candidate, teams);
  const affected = new Set(teams);
  const replacements = new Map(changes.created.map((item) => [item.team, item]));
  const current = new Map(currentApprovals(request.approvals).map((approval) => [approval.team, approval]));
  const approvals = (request.approvals || []).map((approval) => {
    if (!affected.has(approval.team) || current.get(approval.team) !== approval) return { ...approval };
    const replacement = replacements.get(approval.team);
    if (!isOpenApproval(approval)) return { ...approval, current: false };
    return {
      ...approval,
      current: false,
      status: 'Obsolète',
      deliveryStatus: 'canceled',
      canceledAt: now,
      supersededBy: replacement.taskKey,
    };
  });

  changes.created.forEach((task) => {
    const replaced = current.get(task.team);
    approvals.push({
      ...task,
      current: true,
      status: 'En attente',
      deliveryStatus: 'queued',
      assignee: approvalAssignee(task.team),
      requestedAt: now,
      replacesTaskKey: replaced?.taskKey || (replaced
        ? approvalTaskKey(request.id, replaced.team, replaced.revision)
        : ''),
    });
  });
  return { approvals, approvalChanges: changes };
}

export function aggregateApprovalStatus(approvals = []) {
  const required = currentApprovals(approvals).filter(({ status }) => status !== 'Non requis' && status !== 'Obsolète');
  if (required.some(({ status }) => status === 'Refusé')) return 'Refusé';
  if (required.some((approval) => isOpenApproval(approval) || approval.status === 'Obsolète')) return 'Modification en cours';
  if (required.length && required.every(({ status }) => APPROVED_STATUSES.has(status))) return 'Validé';
  return 'Modification en cours';
}

export function guardApprovalResponse(request, response) {
  const approval = currentApprovals(request.approvals)
    .find((item) => item.team === response.team && item.taskKey === response.taskKey);
  const accepted = Boolean(
    approval
    && isOpenApproval(approval)
    && Number(approval.revision) === Number(request.revision)
    && Number(response.revision) === Number(request.revision)
    && approval.scopeHash === response.scopeHash,
  );
  return { accepted, approval, reason: accepted ? '' : 'taskKey, révision ou scopeHash obsolète' };
}

export function applyApprovalResponse(request, response, now = new Date().toISOString()) {
  const guard = guardApprovalResponse(request, response);
  if (!guard.accepted) return { request: structuredClone(request), ignored: true, reason: guard.reason };
  const approvals = request.approvals.map((approval) => approval === guard.approval ? {
    ...approval,
    status: String(response.outcome).toLowerCase() === 'approve' ? 'Approuvé' : 'Refusé',
    deliveryStatus: 'responded',
    response: response.outcome,
    comment: response.comment || '',
    responder: response.responder || '',
    respondedAt: now,
  } : { ...approval });
  const status = aggregateApprovalStatus(approvals);
  return {
    ignored: false,
    request: {
      ...structuredClone(request),
      approvals,
      status,
      currentStep: status === 'Modification en cours' ? 'Revalidation technique en cours' : 'Terminé',
      waitingFor: currentApprovals(approvals)
        .filter(isOpenApproval)
        .map(({ team }) => team),
      updatedAt: now,
    },
  };
}

export function planLegacyApprovalMigration(request) {
  const current = currentApprovals(request.approvals);
  const groupedIds = new Map();
  current.forEach((approval) => {
    if (!approval.approvalId) return;
    const teams = groupedIds.get(approval.approvalId) || [];
    teams.push(approval.team);
    groupedIds.set(approval.approvalId, teams);
  });
  const manualCancelApprovalIds = [...groupedIds]
    .filter(([, teams]) => teams.length > 1)
    .map(([approvalId]) => approvalId);
  const tasks = current
    .filter((approval) => approval.team !== 'Event' && isOpenApproval(approval) && !approval.taskKey)
    .map((approval) => ({
      team: approval.team,
      revision: Number(request.revision),
      taskKey: approvalTaskKey(request.id, approval.team, request.revision),
      scopeHash: scopeHashForTeam(request, approval.team),
      assignee: approvalAssignee(approval.team),
      replacesApprovalId: approval.approvalId || '',
      deliveryStatus: 'queued',
    }));
  const preserved = current
    .filter((approval) => approval.team === 'Event' || !isOpenApproval(approval))
    .map(({ team, status, revision, taskKey = '', assignee = '' }) => ({
      team, status, revision, taskKey, assignee,
    }));
  return { requestId: request.id, revision: request.revision, manualCancelApprovalIds, tasks, preserved };
}
