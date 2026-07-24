import './styles.css';
import { EventVsApi } from './api.js';
import { AuthService, MockAuthService } from './auth.js';
import { getConfig, missingConfig } from './config.js';
import { MockEventVsApi } from './mock-data.js';
import { PortalSession } from './session.js';
import { AUTO_REFRESH_INTERVAL_MS, canAutoRefresh } from './polling.js';
import { buildChangeSet, setAtPath } from './routing-rules.js';
import {
  changePreviewView,
  cancelDialogView,
  dashboardView,
  detailView,
  editDrawerView,
  errorView,
  gateView,
  otpView,
  shellView,
} from './views.js';

class EventVsApp {
  constructor(root) {
    this.root = root;
    this.config = getConfig();
    this.auth = null;
    this.api = null;
    this.account = null;
    this.profile = null;
    this.portalSession = new PortalSession();
    this.state = {
      route: 'dashboard',
      filters: {},
      page: 1,
      result: null,
      request: null,
      loading: false,
      editOpen: false,
      changeSet: null,
      cancelOpen: false,
      canceling: false,
      cancellation: null,
    };
    this.searchTimer = null;
    this.autoRefreshTimer = null;
    this.cancellationTimer = null;
    this.polling = false;
    this.bindGlobalEvents();
  }

  async start() {
    if (!this.config.configured && !this.config.mock) {
      const demoUrl = ['localhost', '127.0.0.1'].includes(location.hostname)
        ? `${location.pathname}?demo=1#/dashboard`
        : '';
      this.root.innerHTML = gateView({ type: 'config', missing: missingConfig(this.config), demoUrl });
      return;
    }

    this.auth = this.config.mock ? new MockAuthService() : new AuthService(this.config);
    this.api = this.config.mock
      ? new MockEventVsApi()
      : new EventVsApi({ apiUrl: this.config.apiUrl, sessionProvider: () => this.portalSession.get(this.profile?.email)?.token || '' });

    try {
      this.account = await this.auth.initialize();
      if (!this.account) {
        this.root.innerHTML = gateView();
        return;
      }
      await this.openPortalSession();
    } catch (error) {
      this.root.innerHTML = gateView();
      this.toast(error.message || 'Connexion impossible.', 'error');
    }
  }

  bindGlobalEvents() {
    this.root.addEventListener('click', (event) => this.onClick(event));
    this.root.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && event.target.matches('[data-request-id]')) {
        location.hash = `#/requests/${encodeURIComponent(event.target.dataset.requestId)}`;
      }
      if (event.key === 'Escape' && this.state.editOpen) this.closeEdit();
      if (event.key === 'Escape' && this.state.cancelOpen && !this.state.canceling) this.closeCancel();
    });
    this.root.addEventListener('input', (event) => this.onInput(event));
    this.root.addEventListener('change', (event) => this.onChange(event));
    this.root.addEventListener('submit', (event) => this.onSubmit(event));
    window.addEventListener('hashchange', () => this.account && this.navigate());
    window.addEventListener('focus', () => this.poll());
    document.addEventListener('visibilitychange', () => this.poll());
  }

  async onClick(event) {
    const actionTarget = event.target.closest('[data-action]');
    const row = event.target.closest('[data-request-id]');
    const page = event.target.closest('[data-page]');

    if (row) {
      location.hash = `#/requests/${encodeURIComponent(row.dataset.requestId)}`;
      return;
    }
    if (page && !page.disabled) {
      this.state.page = Number(page.dataset.page);
      await this.loadDashboard();
      return;
    }
    if (!actionTarget) return;

    const action = actionTarget.dataset.action;
    if (action === 'login') await this.login(actionTarget);
    if (action === 'resend-otp') await this.sendOtp();
    if (action === 'logout') await this.logout();
    if (action === 'refresh') await this.refresh();
    if (action === 'back') location.hash = '#/dashboard';
    if (action === 'edit') this.openEdit();
    if (action === 'close-edit') this.closeEdit();
    if (action === 'open-cancel') this.openCancel();
    if (action === 'close-cancel' && !this.state.canceling) this.closeCancel();
  }

  onInput(event) {
    if (event.target.closest('#edit-form')) {
      this.updateEditPreview();
      return;
    }
    if (event.target.name === 'search') {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => this.updateFilters(), 280);
    }
  }

  onChange(event) {
    if (event.target.name === 'confirmation' && event.target.closest('#cancel-form')) {
      const confirm = document.querySelector('#confirm-cancel');
      if (confirm) confirm.disabled = !event.target.checked;
      return;
    }
    if (event.target.closest('#edit-form')) {
      this.updateEditPreview();
      return;
    }
    if (event.target.closest('#filters')) this.updateFilters();
  }

  async onSubmit(event) {
    if (event.target.id === 'otp-form') {
      event.preventDefault();
      await this.verifyOtp(event.target);
      return;
    }
    if (event.target.id === 'cancel-form') {
      event.preventDefault();
      await this.cancelEvent(event.target);
      return;
    }
    if (event.target.id !== 'edit-form') return;
    event.preventDefault();
    await this.saveEdit(event.target);
  }

  async login(button) {
    button.disabled = true;
    try {
      const account = await this.auth.login();
      if (account) {
        this.account = account;
        location.hash ||= '#/dashboard';
        await this.openPortalSession();
      }
    } catch (error) {
      this.root.innerHTML = gateView();
      this.toast(error.message || 'Connexion annulée.', 'error');
    }
  }

  async logout() {
    this.stopAutoRefresh();
    this.portalSession.clear();
    this.profile = null;
    await this.auth.logout();
    this.account = null;
    this.root.innerHTML = gateView();
  }

  async openPortalSession() {
    this.profile = await this.auth.profile();
    if (this.config.mock || this.portalSession.get(this.profile.email)) {
      await this.navigate();
      this.startAutoRefresh();
      return;
    }
    await this.sendOtp();
  }

  async sendOtp() {
    const email = this.profile?.email || this.account?.username || '';
    this.root.innerHTML = otpView({ email });
    try {
      await this.api.startSession(email);
      this.toast('Code envoyé.', 'success');
    } catch (error) {
      this.root.innerHTML = otpView({ email, error: error.message });
    }
  }

  async verifyOtp(form) {
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Vérification…';
    try {
      const result = await this.api.verifySession(this.profile.email, form.elements.code.value.trim());
      this.portalSession.set(result);
      await this.navigate();
      this.startAutoRefresh();
    } catch (error) {
      this.root.innerHTML = otpView({ email: this.profile.email, error: error.message });
    }
  }

  async navigate() {
    this.stopCancellationPolling();
    const match = location.hash.match(/^#\/requests\/([^/]+)$/);
    if (match) {
      this.state.route = 'detail';
      await this.loadDetail(decodeURIComponent(match[1]));
      return;
    }
    this.state.route = 'dashboard';
    if (!location.hash) history.replaceState(null, '', '#/dashboard');
    await this.loadDashboard();
  }

  renderShell(body, active = 'dashboard') {
    this.root.innerHTML = shellView({ account: this.account, config: this.config, active, body });
  }

  async loadDashboard() {
    this.state.loading = true;
    this.renderShell(dashboardView(this.state));
    try {
      this.state.result = await this.api.listRequests({
        page: this.state.page,
        pageSize: this.config.pageSize,
        filters: this.state.filters,
      });
      this.state.loading = false;
      this.renderShell(dashboardView(this.state));
    } catch (error) {
      this.state.loading = false;
      this.renderShell(`${dashboardView(this.state).replace(/<section class="panel" aria-busy="false">[\s\S]*<\/section>$/, '')}${errorView(error.message)}`);
    }
  }

  async loadDetail(requestId) {
    this.state.request = null;
    this.renderShell(detailView(null, { loading: true }), 'detail');
    try {
      this.state.request = await this.api.getRequest(requestId);
      this.renderShell(detailView(this.state.request), 'detail');
    } catch (error) {
      this.renderShell(`<button class="back-link" data-action="back">← Retour aux demandes</button>${errorView(error.message)}`, 'detail');
    }
  }

  async refresh() {
    if (this.state.route === 'detail' && this.state.request) await this.loadDetail(this.state.request.id);
    else await this.loadDashboard();
  }

  startAutoRefresh() {
    if (this.autoRefreshTimer) return;
    this.autoRefreshTimer = window.setInterval(() => this.poll(), AUTO_REFRESH_INTERVAL_MS);
  }

  stopAutoRefresh() {
    if (!this.autoRefreshTimer) return;
    window.clearInterval(this.autoRefreshTimer);
    this.autoRefreshTimer = null;
  }

  async poll() {
    if (!canAutoRefresh({
      account: this.account,
      profile: this.profile,
      loading: this.state.loading,
      editOpen: this.state.editOpen,
      polling: this.polling,
      visibilityState: document.visibilityState,
    })) return;

    this.polling = true;
    const route = this.state.route;
    const requestId = this.state.request?.id;
    try {
      if (route === 'detail' && requestId) {
        const latest = await this.api.getRequest(requestId);
        if (this.state.route === route && this.state.request?.id === requestId && !this.state.editOpen) {
          this.state.request = latest;
          this.renderShell(detailView(latest), 'detail');
        }
        return;
      }

      if (route === 'dashboard') {
        const latest = await this.api.listRequests({
          page: this.state.page,
          pageSize: this.config.pageSize,
          filters: this.state.filters,
        });
        if (this.state.route === route && !this.state.editOpen) {
          this.state.result = latest;
          this.renderShell(dashboardView(this.state));
        }
      }
    } catch {
      const warning = 'Mise à jour automatique impossible. Nouvelle tentative dans 15 secondes.';
      if (route === 'detail' && this.state.request?.id === requestId && !this.state.editOpen) {
        this.state.request = {
          ...this.state.request,
          sync: { ...(this.state.request.sync || {}), status: 'error', warning, failedAt: new Date().toISOString() },
        };
        this.renderShell(detailView(this.state.request), 'detail');
      } else if (route === 'dashboard' && this.state.result && !this.state.editOpen) {
        this.state.result = {
          ...this.state.result,
          sync: { ...(this.state.result.sync || {}), status: 'error', warning, failedAt: new Date().toISOString() },
        };
        this.renderShell(dashboardView(this.state));
      }
    } finally {
      this.polling = false;
    }
  }

  updateFilters() {
    const form = this.root.querySelector('#filters');
    if (!form) return;
    this.state.filters = Object.fromEntries(new FormData(form).entries());
    this.state.page = 1;
    this.loadDashboard();
  }

  openEdit() {
    if (!this.state.request?.allowedActions?.includes('update')) return;
    this.state.editOpen = true;
    this.root.insertAdjacentHTML('beforeend', editDrawerView(this.state.request));
    document.body.style.overflow = 'hidden';
    document.querySelector('.drawer .close')?.focus();
    this.updateEditPreview();
  }

  closeEdit() {
    document.querySelector('.drawer-backdrop')?.remove();
    document.querySelector('.drawer')?.remove();
    document.body.style.overflow = '';
    this.state.editOpen = false;
    this.state.changeSet = null;
  }

  openCancel() {
    if (!this.state.request?.allowedActions?.includes('cancel')) return;
    this.state.cancelOpen = true;
    this.root.insertAdjacentHTML('beforeend', cancelDialogView(this.state.request));
    document.body.style.overflow = 'hidden';
    document.querySelector('#cancel-reason')?.focus();
  }

  closeCancel() {
    document.querySelector('.confirm-backdrop')?.remove();
    document.querySelector('.confirm-modal')?.remove();
    document.body.style.overflow = '';
    this.state.cancelOpen = false;
  }

  async cancelEvent(form) {
    if (!form.elements.confirmation.checked || this.state.canceling) return;
    const button = form.querySelector('#confirm-cancel');
    const errorBox = form.querySelector('#cancel-error');
    this.state.canceling = true;
    button.disabled = true;
    button.textContent = 'Annulation en cours…';
    errorBox.hidden = true;
    try {
      const cancellation = await this.api.cancelEvent({
        requestId: this.state.request.id,
        expectedRevision: this.state.request.revision,
        confirmation: true,
        reason: form.elements.reason.value.trim(),
      });
      const requestId = this.state.request.id;
      this.state.cancellation = cancellation;
      this.closeCancel();
      this.state.request = {
        ...this.state.request,
        revision: cancellation.revision || this.state.request.revision,
        status: 'Annulation en cours',
        currentStep: 'Suppression des données et libération des ressources',
        allowedActions: [],
      };
      this.renderShell(detailView(this.state.request), 'detail');
      this.toast('Annulation lancée. Ressources en cours de libération.', 'success');
      await this.monitorCancellation(requestId);
    } catch (error) {
      this.state.canceling = false;
      button.disabled = !form.elements.confirmation.checked;
      button.textContent = 'Annuler et supprimer';
      errorBox.hidden = false;
      errorBox.textContent = error.message || 'Suppression impossible.';
      if (error.code === 'REVISION_CONFLICT') await this.loadDetail(this.state.request.id);
    }
  }

  async monitorCancellation(requestId) {
    this.stopCancellationPolling();
    const check = async () => {
      try {
        const result = await this.api.getCancellationStatus(requestId);
        this.state.cancellation = result;
        if (['Completed', 'CompletedWithWarning'].includes(result.status)) {
          this.stopCancellationPolling();
          this.state.canceling = false;
          location.hash = '#/dashboard';
          await this.loadDashboard();
          this.toast(result.status === 'CompletedWithWarning'
            ? 'Événement supprimé. Email de confirmation non remis.'
            : 'Événement annulé et supprimé partout.', result.status === 'CompletedWithWarning' ? 'error' : 'success');
          return;
        }
        if (result.status === 'Blocked') {
          this.stopCancellationPolling();
          this.state.canceling = false;
          this.state.request = {
            ...this.state.request,
            status: 'Suppression bloquée',
            currentStep: result.errors?.map(({ message }) => message).filter(Boolean).join(' · ') || 'Intervention requise',
            allowedActions: ['cancel'],
          };
          this.renderShell(detailView(this.state.request), 'detail');
          this.toast('Suppression bloquée. Aucun élément ambigu supprimé.', 'error');
          return;
        }
      } catch {
        // Job continues server-side; next status poll retries safely.
      }
      this.cancellationTimer = window.setTimeout(check, 3000);
    };
    await check();
  }

  stopCancellationPolling() {
    if (!this.cancellationTimer) return;
    window.clearTimeout(this.cancellationTimer);
    this.cancellationTimer = null;
  }

  readEditCandidate() {
    const candidate = structuredClone(this.state.request);
    document.querySelectorAll('#edit-form [data-edit-path]:not(:disabled)').forEach((field) => {
      let value = field.type === 'checkbox' ? field.checked : field.value;
      if (field.type === 'number' && value !== '') value = Number(value);
      setAtPath(candidate, field.dataset.editPath, value);
    });
    return candidate;
  }

  updateEditPreview() {
    const preview = document.querySelector('#change-preview');
    if (!preview) return;
    this.state.changeSet = buildChangeSet(this.state.request, this.readEditCandidate());
    preview.innerHTML = changePreviewView(this.state.changeSet);
    const save = document.querySelector('#save-edit');
    if (save) save.disabled = this.state.changeSet.fields.length === 0;
  }

  async saveEdit(form) {
    const changeSet = this.state.changeSet;
    if (!changeSet?.fields.length) return;
    const button = form.querySelector('#save-edit');
    button.disabled = true;
    button.textContent = 'Enregistrement…';
    try {
      const updated = await this.api.updateRequest({
        requestId: this.state.request.id,
        expectedRevision: this.state.request.revision,
        changes: changeSet.changes,
        reason: form.elements.reason.value.trim(),
        identity: this.account,
      });
      this.closeEdit();
      this.state.request = updated;
      this.renderShell(detailView(updated), 'detail');
      const approvalChanges = updated.approvalChanges || changeSet.approvalChanges;
      const created = approvalChanges?.created?.map(({ team }) => team).join(', ') || 'aucune';
      const canceled = approvalChanges?.canceled?.map(({ team }) => team).join(', ') || 'aucune';
      this.toast(`Modification enregistrée. Approvals créées : ${created}. Annulées : ${canceled}.`, 'success');
    } catch (error) {
      button.disabled = false;
      button.textContent = 'Confirmer modification';
      if (error.code === 'REVISION_CONFLICT' || error.status === 409) {
        this.closeEdit();
        this.toast(error.message, 'error');
        await this.loadDetail(this.state.request.id);
        return;
      }
      this.toast(error.message || 'Modification impossible.', 'error');
    }
  }

  toast(message, type = '') {
    let region = document.querySelector('.toast-region');
    if (!region) {
      region = document.createElement('div');
      region.className = 'toast-region';
      region.setAttribute('aria-live', 'assertive');
      document.body.appendChild(region);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    region.appendChild(toast);
    setTimeout(() => toast.remove(), 6000);
  }
}

const app = new EventVsApp(document.querySelector('#app'));
app.start();

export { EventVsApp };
