import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const sourcePath = path.resolve(process.cwd(), '../page_reservation_v2.html');
const flowPath = path.resolve(process.cwd(), '../flow_pagereservation_def.json');
const workspaceFilesAvailable = fs.existsSync(sourcePath) && fs.existsSync(flowPath);
let dom;

afterEach(() => dom?.window.close());

function loadForm() {
  const html = fs.readFileSync(sourcePath, 'utf8').replace('__RESOURCE_CATALOG__', '{}');
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 501 }), { status: 200 }));
  dom = new JSDOM(html, {
    url: 'https://eventvs.example.test/form',
    runScripts: 'dangerously',
    beforeParse(window) {
      window.fetch = fetchMock;
      window.scrollTo = () => {};
      window.HTMLElement.prototype.scrollIntoView = () => {};
    },
  });
  return { window: dom.window, document: dom.window.document, fetchMock };
}

describe.skipIf(!workspaceFilesAvailable)('workspace public form draft', () => {
  it('saves, resumes, and excludes resource selections', () => {
    const { window, document } = loadForm();
    document.querySelector('#titre').value = 'Forum Valais';
    document.querySelector('#participants').value = '120';
    document.querySelector('#m_tables').checked = true;
    document.querySelector('#salles').innerHTML = '<input class="rsel" type="checkbox" value="ALP 1 107" checked>';
    document.querySelector('#btnDraftSave').click();

    document.querySelector('#titre').value = '';
    document.querySelector('#participants').value = '';
    document.querySelector('#m_tables').checked = false;
    document.querySelector('#btnDraftResume').click();

    expect(document.querySelector('#titre').value).toBe('Forum Valais');
    expect(document.querySelector('#participants').value).toBe('120');
    expect(document.querySelector('#m_tables').checked).toBe(true);
    expect(document.querySelector('.rsel')).toBeNull();
    expect(document.querySelector('#draftStatus').textContent).toContain('Salles et espaces traiteur non restaurés');
    expect(JSON.parse(window.localStorage.getItem('eventvs.public-request-draft.v1')).resourcesRequireRefresh).toBe(true);
  });

  it('keeps failed submission draft and clears it only after success', async () => {
    const { window, document, fetchMock } = loadForm();
    const values = {
      titre: 'Forum Valais', date: '2026-09-01', datefin: '2026-09-01', debut: '09:00', fin: '17:00',
      participants: '80', type: 'Conférence', nom: 'Claire Martin', email: 'claire.martin@epfl.ch', tel: '+41216930000',
    };
    Object.entries(values).forEach(([id, value]) => { document.getElementById(id).value = value; });
    document.querySelector('#btnDraftSave').click();

    fetchMock.mockRejectedValueOnce(new Error('network'));
    document.querySelector('#btnSubmit').click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(window.localStorage.getItem('eventvs.public-request-draft.v1')).not.toBeNull();

    document.querySelector('#btnSubmit').click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(window.localStorage.getItem('eventvs.public-request-draft.v1')).toBeNull();
    expect(document.querySelector('#draftStatus').textContent).toContain('brouillon local supprimé');
  });

  it('deletes drafts older than 30 days when resumed', () => {
    const { window, document } = loadForm();
    window.localStorage.setItem('eventvs.public-request-draft.v1', JSON.stringify({
      version: 1,
      savedAt: '2020-01-01T00:00:00.000Z',
      data: { titre: 'Ancien événement' },
      resourcesRequireRefresh: true,
    }));
    document.querySelector('#btnDraftResume').disabled = false;
    document.querySelector('#btnDraftResume').click();

    expect(window.localStorage.getItem('eventvs.public-request-draft.v1')).toBeNull();
    expect(document.querySelector('#btnDraftResume').disabled).toBe(true);
    expect(document.querySelector('#draftStatus').textContent).toContain('expiré après 30 jours');
  });

  it('embeds same draft implementation in generated Power Automate definition', () => {
    const flow = fs.readFileSync(flowPath, 'utf8');
    expect(flow).toContain('eventvs.public-request-draft.v1');
    expect(flow).toContain('DRAFT_MAX_AGE_MS');
    expect(flow).toContain('Salles et espaces traiteur non restaur');
  });
});
