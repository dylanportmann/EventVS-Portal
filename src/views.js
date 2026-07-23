import { EDITABLE_FIELDS, GLOBAL_STATUSES, LOCKED_FIELDS, TEAMS } from './constants.js';
import { displayValue, escapeHtml, formatDate, initials, slug } from './format.js';
import { getAtPath } from './routing-rules.js';

export function gateView({ type = 'login', missing = [], demoUrl = '' } = {}) {
  const config = type === 'config';
  return `
    <main class="gate" id="app-main">
      <section class="gate-card">
        <span class="brand-mark" aria-hidden="true">EV</span>
        <h1>Event VS<br>pilotage</h1>
        <p>${config
          ? `Configuration production incomplète : <strong>${missing.map(escapeHtml).join(', ')}</strong>. Aucune donnée chargée.`
          : 'Suivi centralisé des demandes, validations techniques et réservations EPFL Valais Wallis.'}</p>
        ${config
          ? (demoUrl ? `<a class="button secondary" href="${escapeHtml(demoUrl)}">Ouvrir démo locale</a>` : '<span class="status">Configuration requise</span>')
          : '<button class="button" data-action="login">Connexion EPFL</button>'}
        <p class="gate-note">Accès réservé aux gestionnaires autorisés. Authentification Microsoft Entra ID obligatoire.</p>
      </section>
    </main>`;
}

export function otpView({ email, error = '' } = {}) {
  return `
    <main class="gate" id="app-main">
      <section class="gate-card">
        <span class="brand-mark" aria-hidden="true">EV</span>
        <h1>Vérification<br>Event VS</h1>
        <p>Code envoyé à <strong>${escapeHtml(email || '')}</strong>. Valable 10 minutes.</p>
        ${error ? `<div class="otp-error" role="alert">${escapeHtml(error)}</div>` : ''}
        <form class="otp-form" id="otp-form">
          <label for="otp-code">Code à 6 chiffres</label>
          <input class="input otp-code" id="otp-code" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required autofocus>
          <button class="button" type="submit">Valider le code</button>
        </form>
        <button class="button ghost" type="button" data-action="resend-otp">Renvoyer le code</button>
        <button class="button ghost" type="button" data-action="logout">Changer de compte</button>
        <p class="gate-note">Entra ID confirme compte EPFL. Code email protège données SharePoint sans permission Power Automate supplémentaire.</p>
      </section>
    </main>`;
}

export function shellView({ account, config, active = 'dashboard', body = '' }) {
  const name = account?.name || account?.username || 'Gestionnaire';
  return `
    <div class="app-shell">
      <aside class="sidebar">
        <a class="brand" href="#/dashboard" aria-label="Event VS, tableau de bord">
          <span class="brand-mark" aria-hidden="true">EV</span>
          <span class="brand-copy"><strong>Event VS</strong><small>Pilotage</small></span>
        </a>
        <nav class="nav" aria-label="Navigation principale">
          <a class="nav-link ${active === 'dashboard' ? 'active' : ''}" href="#/dashboard" aria-current="${active === 'dashboard' ? 'page' : 'false'}"><b aria-hidden="true">▦</b><span>Demandes</span></a>
          ${config.requestFormUrl ? `<a class="nav-link" href="${escapeHtml(config.requestFormUrl)}" target="_blank" rel="noopener"><b aria-hidden="true">＋</b><span>Nouvelle demande</span></a>` : ''}
        </nav>
        <div class="sidebar-foot">
          <div class="identity">
            <span class="avatar">${escapeHtml(initials(name))}</span>
            <span class="identity-copy"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(account?.username || '')}</span></span>
          </div>
          <button class="logout" data-action="logout">Se déconnecter</button>
        </div>
      </aside>
      <main class="content" id="app-main">${body}</main>
      <div class="toast-region" aria-live="assertive" aria-atomic="true"></div>
    </div>`;
}

export function dashboardView(state) {
  const { result, filters, loading } = state;
  const counts = result?.counts || { total: 0, active: 0, waiting: 0, late: 0 };
  return `
    <header class="topbar">
      <div><p class="eyebrow">Vue opérationnelle</p><h1>Demandes d'événements</h1><p>Validations, ressources et points d'attente en un coup d'œil.</p></div>
      <div class="top-actions"><button class="button secondary" data-action="refresh">Actualiser</button></div>
    </header>
    <section class="stats" aria-label="Indicateurs">
      ${stat('Demandes', counts.total, 'Total suivi', '#7b87a0')}
      ${stat('En cours', counts.active, 'Hors dossiers terminés', '#e6332a')}
      ${stat('En attente', counts.waiting, 'Action humaine attendue', '#d28b16')}
      ${stat('En retard', counts.late, 'Échéance dépassée', '#9f332c')}
    </section>
    <form class="panel filter-panel" id="filters">
      <div class="field search-field"><label for="search">Recherche</label><input class="input" id="search" name="search" type="search" value="${escapeHtml(filters.search || '')}" placeholder="Événement, référence, organisateur…"></div>
      <div class="field"><label for="status">Statut</label><select class="select" id="status" name="status">${options(['', ...GLOBAL_STATUSES], filters.status, 'Tous')}</select></div>
      <div class="field"><label for="team">Équipe</label><select class="select" id="team" name="team">${options(['', ...TEAMS], filters.team, 'Toutes')}</select></div>
      <div class="field"><label for="dateFrom">Dès le</label><input class="input" id="dateFrom" name="dateFrom" type="date" value="${escapeHtml(filters.dateFrom || '')}"></div>
      <div class="field"><label for="dateTo">Jusqu'au</label><input class="input" id="dateTo" name="dateTo" type="date" value="${escapeHtml(filters.dateTo || '')}"></div>
      <div class="field"><label for="late">Retard</label><select class="select" id="late" name="late"><option value="">Tous</option><option value="true" ${String(filters.late) === 'true' ? 'selected' : ''}>En retard</option></select></div>
    </form>
    <section class="panel" aria-busy="${loading}">
      ${loading ? loadingView('Chargement des demandes…') : requestsTable(result)}
    </section>`;
}

function stat(label, value, detail, color) {
  return `<article class="stat" style="--stat-color:${color}"><span class="stat-label">${label}</span><strong>${Number(value) || 0}</strong><small>${detail}</small></article>`;
}

function requestsTable(result = {}) {
  const items = result.items || [];
  if (!items.length) return `<div class="empty"><h2>Aucune demande</h2><p>Modifie filtres ou actualise liste.</p></div>`;
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize));
  return `
    <div class="table-wrap"><table class="requests-table">
      <thead><tr><th>Événement</th><th>Date</th><th>Organisateur</th><th>Statut</th><th>Étape actuelle</th><th>Attendu de</th></tr></thead>
      <tbody>${items.map((item) => `
        <tr class="table-row" tabindex="0" data-request-id="${escapeHtml(item.id)}">
          <td class="event-cell"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.id)} · rév. ${item.revision}</span></td>
          <td>${formatDate(item.dateStart)}</td>
          <td>${escapeHtml(item.organizer?.name || '—')}</td>
          <td><span class="status ${slug(item.status)}">${escapeHtml(item.status)}</span></td>
          <td>${escapeHtml(item.currentStep || 'Historique non disponible')}</td>
          <td>${escapeHtml(item.waitingFor?.join(', ') || '—')}${item.late ? '<br><span class="status refuse">En retard</span>' : ''}</td>
        </tr>`).join('')}</tbody>
    </table></div>
    <footer class="pagination"><span>${result.total} demande${result.total > 1 ? 's' : ''} · page ${result.page}/${pages}</span><span class="pagination-buttons"><button class="button secondary" data-page="${result.page - 1}" ${result.page <= 1 ? 'disabled' : ''}>Précédent</button><button class="button secondary" data-page="${result.page + 1}" ${result.page >= pages ? 'disabled' : ''}>Suivant</button></span></footer>`;
}

export function detailView(request, { loading = false } = {}) {
  if (loading || !request) return loadingView('Chargement du dossier…');
  const editable = request.allowedActions?.includes('update');
  return `
    <button class="back-link" data-action="back">← Retour aux demandes</button>
    <section class="detail-hero">
      <div><span class="status ${slug(request.status)}">${escapeHtml(request.status)}</span><h1>${escapeHtml(request.title)}</h1><div class="detail-meta"><span>${escapeHtml(request.id)}</span><span>${formatDate(request.dateStart)} · ${escapeHtml(request.startTime)}–${escapeHtml(request.endTime)}</span><span>${escapeHtml(request.organizer?.name)}</span></div></div>
      <div class="detail-actions"><span class="revision">Révision ${request.revision}</span><button class="button secondary" data-action="refresh">Actualiser</button>${editable ? '<button class="button" data-action="edit">Modifier</button>' : ''}</div>
    </section>
    <div class="detail-grid">
      <div>
        <section class="panel section"><div class="section-head"><h2>Demande</h2><span class="section-kicker">Dernière action ${formatDate(request.updatedAt, true)}</span></div>${requestData(request)}</section>
        <section class="panel section"><div class="section-head"><h2>Chronologie</h2></div>${timeline(request.timeline)}</section>
        <section class="panel section"><div class="section-head"><h2>Historique des modifications</h2></div>${history(request.history)}</section>
      </div>
      <div>
        <section class="panel section"><div class="section-head"><h2>Validations</h2><span class="section-kicker">5 équipes</span></div>${approvals(request.approvals)}</section>
        <section class="panel section"><div class="section-head"><h2>Réservations</h2></div>${reservations(request.reservations)}</section>
        <section class="panel section"><div class="section-head"><h2>Point d'attente</h2></div><p style="margin:0;font-size:14px">${escapeHtml(request.currentStep || 'Historique non disponible')}</p><p class="subtle">${escapeHtml(request.waitingFor?.join(', ') || 'Aucune personne en attente')}</p></section>
      </div>
    </div>`;
}

function requestData(request) {
  const values = [
    ...LOCKED_FIELDS.map((field) => ({ ...field, locked: true })),
    ...EDITABLE_FIELDS,
  ];
  return `<dl class="data-grid">${values.map((field) => `<div class="datum"><dt class="${field.locked ? 'locked' : ''}">${escapeHtml(field.label)}</dt><dd>${escapeHtml(displayValue(getAtPath(request, field.path)))}</dd></div>`).join('')}</dl>`;
}

function approvals(items = []) {
  if (!items.length) return fallbackHistory();
  return `<div class="approvals">${items.map((item) => `
    <article class="approval">
      <span class="approval-dot ${['Approuvé', 'Approuvé reporté'].includes(item.status) ? 'ok' : ''}" aria-hidden="true">${['Approuvé', 'Approuvé reporté'].includes(item.status) ? '✓' : '•'}</span>
      <div class="approval-copy"><strong>${escapeHtml(item.team)}</strong><span>${escapeHtml(item.assignee || 'Aucun destinataire')}${item.respondedAt ? ` · ${formatDate(item.respondedAt, true)}` : ''}</span></div>
      <span class="status ${slug(item.status)}">${escapeHtml(item.status)}</span>
      ${item.comment ? `<p class="approval-comment">${escapeHtml(item.comment)}</p>` : ''}
    </article>`).join('')}</div>`;
}

function timeline(items = []) {
  if (!items.length) return fallbackHistory();
  return `<div class="timeline">${items.map((item) => `<article class="timeline-item"><span class="timeline-dot"></span><div class="timeline-content"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.detail || '')}</p><time datetime="${escapeHtml(item.at)}">${formatDate(item.at, true)} · ${escapeHtml(item.actor || 'Système')}</time></div></article>`).join('')}</div>`;
}

export function history(items = []) {
  if (!items.length) return fallbackHistory();
  return `<div class="timeline">${items.map((item) => {
    const changes = Array.isArray(item.changes)
      ? item.changes
      : Object.entries(item.changes || {}).map(([field, after]) => ({
        field,
        before: getAtPath(item.before || {}, field),
        after,
      }));
    return `<article class="timeline-item"><span class="timeline-dot"></span><div class="timeline-content"><strong>Révision ${item.revision} · ${escapeHtml(item.actor || 'Système')}</strong><p>${escapeHtml(item.reason || 'Sans motif.')}</p>${changes.map((change) => `<p><b>${escapeHtml(change.field)}</b> : ${escapeHtml(displayValue(change.before))} → ${escapeHtml(displayValue(change.after))}</p>`).join('')}<p>Équipes relancées : ${escapeHtml(item.reroutedTeams?.join(', ') || 'aucune')}</p><time>${formatDate(item.at, true)}</time></div></article>`;
  }).join('')}</div>`;
}

function reservations(items = []) {
  if (!items.length) return '<p class="subtle">Aucune réservation liée.</p>';
  return items.map((item) => `<article class="reservation"><strong>${escapeHtml(item.resource)}</strong><span>${escapeHtml(item.type)} · rév. ${item.revision} · ${escapeHtml(item.status)}</span><br><span>${formatDate(item.start, true)} → ${formatDate(item.end, true)}</span></article>`).join('');
}

function fallbackHistory() {
  return '<p class="subtle">Historique non disponible.</p>';
}

export function editDrawerView(request) {
  const sections = [...new Set(EDITABLE_FIELDS.map(({ section }) => section))];
  return `
    <div class="drawer-backdrop" data-action="close-edit"></div>
    <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="edit-title">
      <header class="drawer-head"><div><p class="eyebrow">Révision ${request.revision}</p><h2 id="edit-title">Modifier demande</h2></div><button class="close" data-action="close-edit" aria-label="Fermer">×</button></header>
      <form id="edit-form" class="edit-form">
        <section class="form-section"><h3>Organisateur — champs verrouillés</h3><div class="form-grid">${LOCKED_FIELDS.map((field) => formField(field, request, true)).join('')}</div></section>
        ${sections.map((section) => `<section class="form-section"><h3>${escapeHtml(section)}</h3><div class="form-grid">${EDITABLE_FIELDS.filter((field) => field.section === section).map((field) => formField(field, request)).join('')}</div></section>`).join('')}
        <section class="form-section"><h3>Aperçu avant / après</h3><div class="change-preview" id="change-preview"><p class="subtle">Aucun changement.</p></div></section>
        <section class="form-section"><div class="field"><label for="edit-reason">Motif facultatif</label><textarea class="textarea" id="edit-reason" name="reason" placeholder="Contexte utile pour historique et équipes…"></textarea></div></section>
        <footer class="drawer-actions"><button type="button" class="button secondary" data-action="close-edit">Annuler</button><button type="submit" class="button" id="save-edit" disabled>Confirmer modification</button></footer>
      </form>
    </aside>`;
}

function formField(field, request, locked = false) {
  const value = getAtPath(request, field.path);
  const common = `class="${field.type === 'textarea' ? 'textarea' : field.type === 'select' ? 'select' : 'input'}" data-edit-path="${escapeHtml(field.path)}" id="edit-${slug(field.path)}" ${locked ? 'disabled' : ''}`;
  let control;
  if (field.type === 'textarea') control = `<textarea ${common}>${escapeHtml(value || '')}</textarea>`;
  else if (field.type === 'select') control = `<select ${common}>${options(field.options, value)}</select>`;
  else if (field.type === 'checkbox') control = `<label class="check"><input type="checkbox" data-edit-path="${escapeHtml(field.path)}" ${value ? 'checked' : ''}> Actif</label>`;
  else control = `<input ${common} type="${field.type || 'text'}" value="${escapeHtml(value ?? '')}">`;
  return `<div class="field"><label for="edit-${slug(field.path)}">${escapeHtml(field.label)}</label>${control}</div>`;
}

export function changePreviewView(changeSet) {
  if (!changeSet.fields.length) return '<p class="subtle">Aucun changement.</p>';
  return `
    ${changeSet.fields.map((field) => `<div class="change"><span class="change-label">${escapeHtml(field.label)}</span><span class="change-old">${escapeHtml(displayValue(field.before))}</span><span class="change-arrow">→</span><span class="change-new">${escapeHtml(displayValue(field.after))}</span></div>`).join('')}
    <div class="reroute"><strong>Équipes relancées :</strong> ${escapeHtml(changeSet.reroutes.teams.join(', ') || 'aucune')}<br>${changeSet.reroutes.reasons.map(escapeHtml).join('<br>') || 'Approval existante conservée par scope hash.'}<br><strong>Validation Event initiale jamais relancée.</strong></div>`;
}

export function loadingView(label = 'Chargement…') {
  return `<div class="empty"><span class="spinner"></span><p>${escapeHtml(label)}</p></div>`;
}

export function errorView(message) {
  return `<section class="panel error-panel"><h2>Impossible de charger</h2><p>${escapeHtml(message)}</p><button class="button secondary" data-action="refresh">Réessayer</button></section>`;
}

function options(values, selected, emptyLabel = '') {
  return values.map((value) => `<option value="${escapeHtml(value)}" ${String(value) === String(selected ?? '') ? 'selected' : ''}>${escapeHtml(value || emptyLabel)}</option>`).join('');
}
