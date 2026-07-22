import './styles.css';
import { EventVsApi } from './api.js';
import { AuthService, MockAuthService } from './auth.js';
import { getConfig, missingConfig } from './config.js';
import { MockEventVsApi } from './mock-data.js';
import { PortalSession } from './session.js';
import { buildChangeSet, setAtPath } from './routing-rules.js';
import {
  changePreviewView,
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
    };
    this.searchTimer = null;
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
    });
    this.root.addEventListener('input', (event) => this.onInput(event));
    this.root.addEventListener('change', (event) => this.onChange(event));
    this.root.addEventListener('submit', (event) => this.onSubmit(event));
    window.addEventListener('hashchange', () => this.account && this.navigate());
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
    } catch (error) {
      this.root.innerHTML = otpView({ email: this.profile.email, error: error.message });
    }
  }

  async navigate() {
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
      const teams = changeSet.reroutes.teams.join(', ') || 'aucune équipe';
      this.toast(`Modification enregistrée. Équipes relancées : ${teams}.`, 'success');
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
