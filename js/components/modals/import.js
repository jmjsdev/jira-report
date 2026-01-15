/**
 * Composant Modal Import - Import XML JIRA
 */

import { State } from '../../state.js';
import { Config } from '../../config.js';
import { Storage } from '../../services/storage.js';
import { $, setHtml, addClass, removeClass, escapeAttr } from '../../utils/dom.js';
import { parseJiraXml, compareTickets } from '../../parsers/jira-xml.js';
import { formatDate } from '../../utils/date.js';
import { readFileAsText, isXmlFile } from '../../utils/file.js';

class ImportModalComponent {
  constructor() {
    this._element = null;
    this._isOpen = false;
  }

  /**
   * Initialise le composant
   * @param {string} selector - Sélecteur du conteneur modal
   */
  init(selector) {
    this._element = $(selector);
    if (!this._element) {
      console.error('Import modal container not found:', selector);
      return;
    }

    this._render();
    this._attachEventListeners();
  }

  /**
   * Rend la structure de la modal
   */
  _render() {
    setHtml(this._element, `
      <div class="modal-content modal-content-large">
        <div class="modal-header">
          <h2>Import JIRA XML</h2>
          <button id="close-import-modal" class="close-modal-btn">✕</button>
        </div>
        <div class="modal-body">
          <div class="jira-import-instructions">
            <p>Glissez-déposez un fichier XML ou collez le contenu exporté depuis JIRA.</p>
            <p class="jira-import-hint">Export depuis JIRA : Filtres → Exporter → XML</p>
          </div>

          <div id="import-dropzone" class="jira-dropzone">
            <div class="jira-dropzone-content">
              <span class="jira-dropzone-icon">📄</span>
              <span class="jira-dropzone-text">Glissez un fichier XML ici</span>
              <span class="jira-dropzone-or">ou</span>
              <label class="jira-file-btn">
                📁 Parcourir
                <input type="file" id="import-file-input" accept=".xml,text/xml,application/xml" class="hidden">
              </label>
            </div>
          </div>

          <textarea id="import-xml-input" class="jira-xml-input"
                    placeholder="...ou collez le XML JIRA ici"></textarea>

          <div class="jira-import-actions">
            <button id="btn-analyze-xml" class="analyze-jira-btn">🔍 Analyser</button>
            <span id="import-status" class="jira-analyze-status"></span>
          </div>

          <div id="import-results" class="jira-import-results hidden"></div>

          <div id="import-actions-final" class="import-actions-final hidden">
            <button id="btn-import-add" class="action-btn action-btn-primary">
              ➕ Ajouter les nouveaux tickets
            </button>
            <button id="btn-import-replace" class="action-btn action-btn-secondary">
              🔄 Remplacer tout
            </button>
          </div>
        </div>
      </div>
    `);
  }

  /**
   * Attache les écouteurs d'événements
   */
  _attachEventListeners() {
    // Fermer la modal
    const closeBtn = $('#close-import-modal', this._element);
    closeBtn?.addEventListener('click', () => this.close());

    // Clic en dehors
    this._element.addEventListener('click', (e) => {
      if (e.target === this._element) {
        this.close();
      }
    });

    // Drag & Drop
    const dropzone = $('#import-dropzone', this._element);
    if (dropzone) {
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        addClass(dropzone, 'dragover');
      });

      dropzone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        removeClass(dropzone, 'dragover');
      });

      dropzone.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        removeClass(dropzone, 'dragover');
        await this._handleFileDrop(e.dataTransfer.files);
      });
    }

    // Input fichier
    const fileInput = $('#import-file-input', this._element);
    fileInput?.addEventListener('change', async (e) => {
      if (e.target.files.length > 0) {
        await this._handleFileDrop(e.target.files);
      }
      e.target.value = ''; // Reset pour pouvoir recharger le même fichier
    });

    // Bouton analyser
    const analyzeBtn = $('#btn-analyze-xml', this._element);
    analyzeBtn?.addEventListener('click', () => this._analyze());

    // Bouton ajouter
    const addBtn = $('#btn-import-add', this._element);
    addBtn?.addEventListener('click', () => this._importAdd());

    // Bouton remplacer
    const replaceBtn = $('#btn-import-replace', this._element);
    replaceBtn?.addEventListener('click', () => this._importReplace());
  }

  /**
   * Gère le drop de fichier
   */
  async _handleFileDrop(files) {
    if (files.length === 0) return;

    const file = files[0];
    if (!isXmlFile(file)) {
      this._setStatus('❌ Le fichier doit être au format XML', 'error');
      return;
    }

    try {
      const content = await readFileAsText(file);
      const xmlInput = $('#import-xml-input', this._element);
      if (xmlInput) {
        xmlInput.value = content;
      }
      // Analyser automatiquement
      this._analyze();
    } catch (err) {
      this._setStatus('❌ ' + err.message, 'error');
    }
  }

  /**
   * Analyse le XML
   */
  _analyze() {
    const xmlInput = $('#import-xml-input', this._element);
    const xmlContent = xmlInput?.value.trim();

    if (!xmlContent) {
      this._setStatus('⚠️ Veuillez coller le contenu XML', 'error');
      return;
    }

    try {
      this._setStatus('⏳ Analyse en cours...', '');

      const tickets = parseJiraXml(xmlContent);

      if (tickets.length === 0) {
        this._setStatus('⚠️ Aucun ticket trouvé dans le XML', 'error');
        return;
      }

      // Stocker les tickets pour l'import
      this._parsedTickets = tickets;

      // Comparer avec les tickets existants
      const comparison = compareTickets(tickets, State.tasks);

      // Afficher les résultats
      this._displayResults(comparison);

      this._setStatus(`✓ ${tickets.length} tickets analysés`, 'success');

    } catch (err) {
      this._setStatus('❌ ' + err.message, 'error');
      this._hideResults();
    }
  }

  /**
   * Affiche les résultats de l'analyse
   */
  _displayResults(results) {
    const resultsEl = $('#import-results', this._element);
    const actionsEl = $('#import-actions-final', this._element);

    if (!resultsEl) return;

    let html = `
      <div class="jira-results-summary">
        <div class="jira-stat jira-stat-total">
          <span class="jira-stat-value">${results.total}</span>
          <span class="jira-stat-label">Tickets JIRA</span>
        </div>
        <div class="jira-stat jira-stat-new">
          <span class="jira-stat-value">${results.new.length}</span>
          <span class="jira-stat-label">Nouveaux</span>
        </div>
        <div class="jira-stat jira-stat-existing">
          <span class="jira-stat-value">${results.existing.length}</span>
          <span class="jira-stat-label">Déjà présents</span>
        </div>
      </div>
    `;

    // Nouveaux tickets
    if (results.new.length > 0) {
      html += `
        <div class="jira-results-section">
          <h3 class="jira-section-title jira-section-new">🆕 Tickets à ajouter (${results.new.length})</h3>
          ${this._renderTicketsTable(results.new)}
        </div>
      `;
    }

    // Tickets existants
    if (results.existing.length > 0) {
      html += `
        <div class="jira-results-section">
          <h3 class="jira-section-title jira-section-existing">✓ Tickets déjà présents (${results.existing.length})</h3>
          <details class="jira-existing-details">
            <summary>Afficher les ${results.existing.length} tickets existants</summary>
            ${this._renderTicketsTable(results.existing, true)}
          </details>
        </div>
      `;
    }

    setHtml(resultsEl, html);
    removeClass(resultsEl, 'hidden');

    // Afficher les boutons d'action
    if (actionsEl) {
      removeClass(actionsEl, 'hidden');
    }
  }

  /**
   * Génère le HTML d'une table de tickets
   */
  _renderTicketsTable(tickets, isExisting = false) {
    return `
      <table class="jira-results-table">
        <thead>
          <tr>
            <th>Clé</th>
            <th>Résumé</th>
            <th>Statut</th>
            <th>Priorité</th>
            <th>Assigné</th>
            <th>Échéance</th>
          </tr>
        </thead>
        <tbody>
          ${tickets.map(t => `
            <tr class="${isExisting ? 'jira-row-existing' : ''}">
              <td>
                <a href="${Config.urls.ajir}${t.key}" target="_blank">${t.key}</a>
              </td>
              <td>${escapeAttr(t.summary || '')}</td>
              <td><span class="jira-status">${t.status || '-'}</span></td>
              <td>${t.priority || '-'}</td>
              <td>${t.assignee || '-'}</td>
              <td>${t.dueDate ? formatDate(t.dueDate) : '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  /**
   * Cache les résultats
   */
  _hideResults() {
    const resultsEl = $('#import-results', this._element);
    const actionsEl = $('#import-actions-final', this._element);

    if (resultsEl) addClass(resultsEl, 'hidden');
    if (actionsEl) addClass(actionsEl, 'hidden');
  }

  /**
   * Import mode: Ajouter les nouveaux
   */
  _importAdd() {
    if (!this._parsedTickets || this._parsedTickets.length === 0) {
      this._setStatus('⚠️ Aucun ticket à importer', 'error');
      return;
    }

    const result = Storage.importXmlFromString(
      $('#import-xml-input', this._element)?.value || '',
      { mergeWithExisting: true, updateExisting: false }
    );

    if (result.success) {
      this._setStatus(`✓ ${result.imported} tickets importés`, 'success');
      setTimeout(() => this.close(), 1500);
    } else {
      this._setStatus('❌ ' + (result.message || 'Erreur'), 'error');
    }
  }

  /**
   * Import mode: Remplacer tout
   */
  _importReplace() {
    if (!this._parsedTickets || this._parsedTickets.length === 0) {
      this._setStatus('⚠️ Aucun ticket à importer', 'error');
      return;
    }

    const result = Storage.importXmlFromString(
      $('#import-xml-input', this._element)?.value || '',
      { mergeWithExisting: false }
    );

    if (result.success) {
      this._setStatus(`✓ ${result.imported} tickets importés (remplacement)`, 'success');
      setTimeout(() => this.close(), 1500);
    } else {
      this._setStatus('❌ ' + (result.message || 'Erreur'), 'error');
    }
  }

  /**
   * Définit le message de statut
   */
  _setStatus(message, type) {
    const statusEl = $('#import-status', this._element);
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.className = 'jira-analyze-status';
      if (type === 'error') {
        addClass(statusEl, 'jira-status-error');
      } else if (type === 'success') {
        addClass(statusEl, 'jira-status-success');
      }
    }
  }

  /**
   * Ouvre la modal
   */
  open() {
    if (this._element) {
      addClass(this._element, 'show');
      this._isOpen = true;

      // Reset
      const xmlInput = $('#import-xml-input', this._element);
      if (xmlInput) xmlInput.value = '';
      this._hideResults();
      this._setStatus('', '');
      this._parsedTickets = null;
    }
  }

  /**
   * Ferme la modal
   */
  close() {
    if (this._element) {
      removeClass(this._element, 'show');
      this._isOpen = false;
    }
  }

  /**
   * Toggle la modal
   */
  toggle() {
    if (this._isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
}

export const ImportModal = new ImportModalComponent();
