/**
 * Composant Modal Import - Import XML JIRA
 */

import { State } from '../../state.js';
import { Config } from '../../config.js';
import { UserConfig } from '../../services/user-config.js';
import { Storage } from '../../services/storage.js';
import { $, $$, setHtml, addClass, removeClass, escapeAttr } from '../../utils/dom.js';
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
      <div class="modal-content modal-content-large modal-import">
        <div class="modal-header">
          <h2>Import JIRA XML</h2>
          <button id="close-import-modal" class="close-modal-btn">✕</button>
        </div>
        <div class="modal-body">
          <div class="jira-import-instructions">
            <p>Glissez-déposez un fichier XML ou collez le contenu exporté depuis JIRA.</p>
            <p class="jira-import-hint">Export depuis JIRA : Filtres → Exporter → XML</p>
          </div>

          <div class="jira-input-row">
            <div id="import-dropzone" class="jira-dropzone">
              <div class="jira-dropzone-content">
                <span class="jira-dropzone-icon">📄</span>
                <label class="jira-file-btn">
                  📁 Parcourir
                  <input type="file" id="import-file-input" accept=".xml,text/xml,application/xml" class="hidden">
                </label>
              </div>
            </div>

            <textarea id="import-xml-input" class="jira-xml-input"
                      placeholder="...ou collez le XML JIRA ici"></textarea>
          </div>

          <div class="jira-import-actions">
            <button id="btn-analyze-xml" class="analyze-jira-btn">🔍 Analyser</button>
            <span id="import-status" class="jira-analyze-status"></span>
            <div id="import-stats" class="jira-import-stats hidden"></div>
          </div>

          <div id="import-results" class="jira-import-results hidden"></div>
        </div>
        <div id="import-actions-final" class="modal-footer import-actions-final hidden">
          <div class="import-actions-row">
            <button id="btn-import-add" class="action-btn action-btn-primary">
              ➕ Ajouter les nouveaux
            </button>
            <button id="btn-import-update" class="action-btn action-btn-import">
              🔄 Mettre à jour les existants
            </button>
            <button id="btn-import-replace" class="action-btn action-btn-secondary">
              ⚠️ Tout remplacer
            </button>
          </div>
          <div id="import-update-options" class="import-update-options hidden">
            <div class="update-fields-section">
              <span class="update-options-label">Champs à mettre à jour :</span>
              <div class="update-options-checkboxes">
                <label><input type="checkbox" id="update-summary" checked> Titre</label>
                <label><input type="checkbox" id="update-status" checked> Statut</label>
                <label><input type="checkbox" id="update-priority" checked> Priorité</label>
                <label><input type="checkbox" id="update-duedate" checked> Échéance</label>
                <label><input type="checkbox" id="update-labels"> Labels</label>
                <label><input type="checkbox" id="update-project"> Projet</label>
                <label><input type="checkbox" id="update-assignee"> Assigné</label>
              </div>
            </div>
            <div class="update-tickets-section">
              <div class="update-tickets-header">
                <span class="update-options-label">Tickets à mettre à jour :</span>
                <label class="select-all-label"><input type="checkbox" id="update-select-all" checked> Tout sélectionner</label>
              </div>
              <div id="update-tickets-list" class="update-tickets-list"></div>
            </div>
            <button id="btn-confirm-update" class="action-btn action-btn-primary">
              ✓ Confirmer la mise à jour
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

    // Bouton mettre à jour (affiche les options)
    const updateBtn = $('#btn-import-update', this._element);
    updateBtn?.addEventListener('click', () => this._showUpdateOptions());

    // Bouton confirmer la mise à jour
    const confirmUpdateBtn = $('#btn-confirm-update', this._element);
    confirmUpdateBtn?.addEventListener('click', () => this._importUpdate());

    // Bouton remplacer
    const replaceBtn = $('#btn-import-replace', this._element);
    replaceBtn?.addEventListener('click', () => this._importReplace());
  }

  /**
   * Affiche les options de mise à jour
   */
  _showUpdateOptions() {
    const optionsEl = $('#import-update-options', this._element);
    if (optionsEl) {
      const isHidden = optionsEl.classList.contains('hidden');
      optionsEl.classList.toggle('hidden');

      // Remplir la liste des tickets existants si on ouvre
      if (isHidden) {
        this._renderUpdateTicketsList();
      }
    }
  }

  /**
   * Rend la liste des tickets à mettre à jour
   */
  _renderUpdateTicketsList() {
    const listEl = $('#update-tickets-list', this._element);
    if (!listEl || !this._parsedTickets) return;

    // Trouver les tickets qui existent déjà
    const existingTickets = this._parsedTickets.filter(ticket =>
      State.tasks.some(t => t.key.toUpperCase() === ticket.key.toUpperCase())
    );

    if (existingTickets.length === 0) {
      setHtml(listEl, '<span class="no-tickets">Aucun ticket existant à mettre à jour</span>');
      return;
    }

    const html = existingTickets.map(ticket => `
      <label class="update-ticket-item">
        <input type="checkbox" class="update-ticket-checkbox" data-key="${escapeAttr(ticket.key)}" checked>
        <span class="update-ticket-key">${escapeAttr(ticket.key)}</span>
        <span class="update-ticket-summary">${escapeAttr(ticket.summary || '')}</span>
      </label>
    `).join('');

    setHtml(listEl, html);

    // Attacher l'événement "tout sélectionner"
    const selectAllEl = $('#update-select-all', this._element);
    if (selectAllEl) {
      selectAllEl.checked = true;
      selectAllEl.onchange = () => {
        const checkboxes = $$('.update-ticket-checkbox', this._element);
        checkboxes.forEach(cb => cb.checked = selectAllEl.checked);
      };
    }
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
    const statsEl = $('#import-stats', this._element);
    const resultsEl = $('#import-results', this._element);
    const actionsEl = $('#import-actions-final', this._element);

    // Afficher les stats inline
    if (statsEl) {
      setHtml(statsEl, `
        <span class="jira-stat-inline jira-stat-total">
          <strong>${results.total}</strong> tickets
        </span>
        <span class="jira-stat-inline jira-stat-new">
          <strong>${results.new.length}</strong> nouveaux
        </span>
        <span class="jira-stat-inline jira-stat-existing">
          <strong>${results.existing.length}</strong> existants
        </span>
      `);
      removeClass(statsEl, 'hidden');
    }

    if (!resultsEl) return;

    let html = '';

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
            <th>Projet</th>
            <th>Résumé</th>
            <th>Statut</th>
            <th>Priorité</th>
            <th>Échéance</th>
          </tr>
        </thead>
        <tbody>
          ${tickets.map(t => `
            <tr class="${isExisting ? 'jira-row-existing' : ''}">
              <td>
                <a href="${t.link || '#'}" target="_blank">${t.key}</a>
              </td>
              <td>${escapeAttr(t.project || '-')}</td>
              <td>${escapeAttr(t.summary || '')}</td>
              <td><span class="jira-status">${t.status || '-'}</span></td>
              <td>${t.priority || '-'}</td>
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
    const statsEl = $('#import-stats', this._element);
    const resultsEl = $('#import-results', this._element);
    const actionsEl = $('#import-actions-final', this._element);

    if (statsEl) addClass(statsEl, 'hidden');
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
   * Import mode: Mettre à jour les existants
   */
  _importUpdate() {
    if (!this._parsedTickets || this._parsedTickets.length === 0) {
      this._setStatus('⚠️ Aucun ticket à mettre à jour', 'error');
      return;
    }

    // Récupérer les tickets sélectionnés
    const selectedKeys = new Set();
    $$('.update-ticket-checkbox:checked', this._element).forEach(cb => {
      selectedKeys.add(cb.dataset.key.toUpperCase());
    });

    if (selectedKeys.size === 0) {
      this._setStatus('⚠️ Aucun ticket sélectionné', 'error');
      return;
    }

    // Récupérer les champs à mettre à jour
    const fieldsToUpdate = {
      summary: $('#update-summary', this._element)?.checked || false,
      status: $('#update-status', this._element)?.checked || false,
      priority: $('#update-priority', this._element)?.checked || false,
      dueDate: $('#update-duedate', this._element)?.checked || false,
      labels: $('#update-labels', this._element)?.checked || false,
      project: $('#update-project', this._element)?.checked || false,
      assignee: $('#update-assignee', this._element)?.checked || false
    };

    let updatedCount = 0;

    // Parcourir les tickets parsés et mettre à jour les sélectionnés
    this._parsedTickets.forEach(importedTicket => {
      const ticketKeyUpper = importedTicket.key.toUpperCase();

      // Vérifier si ce ticket est sélectionné
      if (!selectedKeys.has(ticketKeyUpper)) return;

      const existingTask = State.tasks.find(
        t => t.key.toUpperCase() === ticketKeyUpper
      );

      if (existingTask) {
        const updates = {};

        if (fieldsToUpdate.summary && importedTicket.summary) {
          updates.summary = importedTicket.summary;
        }
        if (fieldsToUpdate.status && importedTicket.status) {
          updates.status = importedTicket.status;
          updates.statusKey = importedTicket.statusKey;
          updates.statusLabel = importedTicket.statusLabel;
          updates.statusIcon = importedTicket.statusIcon;
          updates.statusCssClass = importedTicket.statusCssClass;
        }
        if (fieldsToUpdate.priority && importedTicket.priority) {
          updates.priority = importedTicket.priority;
          updates.priorityValue = importedTicket.priorityValue;
          updates.priorityText = importedTicket.priorityText;
          updates.priorityCssClass = importedTicket.priorityCssClass;
        }
        if (fieldsToUpdate.dueDate) {
          updates.dueDate = importedTicket.dueDate;
        }
        if (fieldsToUpdate.labels && importedTicket.labels) {
          updates.labels = importedTicket.labels;
        }
        if (fieldsToUpdate.project && importedTicket.project) {
          updates.project = importedTicket.project;
        }
        if (fieldsToUpdate.assignee) {
          updates.assignee = importedTicket.assignee;
        }

        if (Object.keys(updates).length > 0) {
          State.updateTask(existingTask.key, updates);
          updatedCount++;
        }
      }
    });

    this._setStatus(`✓ ${updatedCount} tickets mis à jour`, 'success');
    setTimeout(() => this.close(), 1500);
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

  /**
   * Ouvre la modal avec un fichier et lance l'analyse
   * @param {File} file - Fichier XML à analyser
   */
  async openWithFile(file) {
    // Ouvrir la modal
    this.open();

    // Traiter le fichier
    if (file) {
      await this._handleFileDrop([file]);
    }
  }
}

export const ImportModal = new ImportModalComponent();
