/**
 * Composant Modal Import - Import XML JIRA
 */

import { Debug } from '../../utils/debug.js';
import { State } from '../../state.js';
import { Config } from '../../config.js';
import { UserConfig } from '../../services/user-config.js';
import { Storage } from '../../services/storage.js';
import { $, $$, setHtml, addClass, removeClass, escapeAttr } from '../../utils/dom.js';
import { parseJiraXml, compareTickets } from '../../parsers/jira-xml.js';
import { formatDate } from '../../utils/date.js';
import { readFileAsText, isXmlFile } from '../../utils/file.js';
import { Templates } from '../../utils/templates.js';
import { icon } from '../../utils/icons.js';

class ImportModalComponent {
  constructor() {
    this._element = null;
    this._isOpen = false;
    this._template = null;
  }

  /**
   * Initialise le composant
   * @param {string} selector - Sélecteur du conteneur modal
   */
  async init(selector) {
    this._element = $(selector);
    if (!this._element) {
      console.error('Import modal container not found:', selector);
      return;
    }

    // Charger le template
    this._template = await Templates.load('modals/import');

    this._render();
    this._attachEventListeners();
  }

  /**
   * Rend la structure de la modal
   */
  _render() {
    if (!this._template) return;
    setHtml(this._element, this._template);
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
      Debug.log('File input change event');
      try {
        if (e.target.files && e.target.files.length > 0) {
          Debug.log('File selected: ' + e.target.files[0].name);
          await this._handleFileDrop(e.target.files);
        }
        e.target.value = ''; // Reset pour pouvoir recharger le même fichier
      } catch (err) {
        Debug.error('File input error: ' + err.message);
      }
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
    Debug.log('_handleFileDrop START');

    if (!files || files.length === 0) {
      Debug.warn('No files provided');
      return;
    }

    const file = files[0];
    Debug.log('Processing file: ' + file.name + ' (' + file.type + ', ' + file.size + ' bytes)');

    if (!isXmlFile(file)) {
      Debug.warn('File is not XML');
      this._setStatus(icon('xCircle') + ' Le fichier doit être au format XML', 'error');
      return;
    }

    try {
      Debug.log('Reading file content...');
      const content = await readFileAsText(file);
      Debug.log('File read OK, length: ' + content.length);

      const xmlInput = $('#import-xml-input', this._element);
      if (xmlInput) {
        Debug.log('Setting textarea value...');
        xmlInput.value = content;
        Debug.log('Textarea value set OK');
      }

      Debug.log('Starting analysis...');
      this._analyze();
      Debug.success('_handleFileDrop COMPLETE');
    } catch (err) {
      Debug.error('_handleFileDrop FAILED: ' + err.message);
      this._setStatus(icon('xCircle') + ' ' + err.message, 'error');
    }
  }

  /**
   * Analyse le XML
   */
  _analyze() {
    Debug.log('_analyze START');

    const xmlInput = $('#import-xml-input', this._element);
    const xmlContent = xmlInput?.value?.trim();

    if (!xmlContent) {
      Debug.warn('No XML content');
      this._setStatus(icon('alertTriangle') + ' Veuillez coller le contenu XML', 'error');
      return;
    }

    Debug.log('XML content length: ' + xmlContent.length);

    try {
      this._setStatus(icon('loader') + ' Analyse en cours...', '');

      Debug.log('Parsing XML...');
      const tickets = parseJiraXml(xmlContent);
      Debug.log('Parsed ' + tickets.length + ' tickets');

      if (tickets.length === 0) {
        Debug.warn('No tickets found in XML');
        this._setStatus(icon('alertTriangle') + ' Aucun ticket trouvé dans le XML', 'error');
        return;
      }

      // Stocker les tickets pour l'import
      this._parsedTickets = tickets;

      Debug.log('Comparing with existing tasks...');
      const comparison = compareTickets(tickets, State.tasks);
      Debug.log('New: ' + comparison.new.length + ', Existing: ' + comparison.existing.length);

      Debug.log('Displaying results...');
      this._displayResults(comparison);

      this._setStatus(icon('check') + ` ${tickets.length} tickets analysés`, 'success');
      Debug.success('_analyze COMPLETE');

    } catch (err) {
      Debug.error('_analyze FAILED: ' + err.message);
      this._setStatus(icon('xCircle') + ' ' + err.message, 'error');
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
          <h3 class="jira-section-title jira-section-new">${icon('plusCircle')} Tickets à ajouter (${results.new.length})</h3>
          ${this._renderTicketsTable(results.new)}
        </div>
      `;
    }

    // Tickets existants
    if (results.existing.length > 0) {
      html += `
        <div class="jira-results-section">
          <h3 class="jira-section-title jira-section-existing">${icon('checkCircle')} Tickets déjà présents (${results.existing.length})</h3>
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
      this._setStatus(icon('alertTriangle') + ' Aucun ticket à importer', 'error');
      return;
    }

    const result = Storage.importXmlFromString(
      $('#import-xml-input', this._element)?.value || '',
      { mergeWithExisting: true, updateExisting: false }
    );

    if (result.success) {
      this._setStatus(icon('check') + ` ${result.imported} tickets importés`, 'success');
      setTimeout(() => this.close(), 1500);
    } else {
      this._setStatus(icon('xCircle') + ' ' + (result.message || 'Erreur'), 'error');
    }
  }

  /**
   * Import mode: Mettre à jour les existants
   */
  _importUpdate() {
    if (!this._parsedTickets || this._parsedTickets.length === 0) {
      this._setStatus(icon('alertTriangle') + ' Aucun ticket à mettre à jour', 'error');
      return;
    }

    // Récupérer les tickets sélectionnés
    const selectedKeys = new Set();
    $$('.update-ticket-checkbox:checked', this._element).forEach(cb => {
      selectedKeys.add(cb.dataset.key.toUpperCase());
    });

    if (selectedKeys.size === 0) {
      this._setStatus(icon('alertTriangle') + ' Aucun ticket sélectionné', 'error');
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

    this._setStatus(icon('check') + ` ${updatedCount} tickets mis à jour`, 'success');
    setTimeout(() => this.close(), 1500);
  }

  /**
   * Import mode: Remplacer tout
   */
  _importReplace() {
    if (!this._parsedTickets || this._parsedTickets.length === 0) {
      this._setStatus(icon('alertTriangle') + ' Aucun ticket à importer', 'error');
      return;
    }

    const result = Storage.importXmlFromString(
      $('#import-xml-input', this._element)?.value || '',
      { mergeWithExisting: false }
    );

    if (result.success) {
      this._setStatus(icon('check') + ` ${result.imported} tickets importés (remplacement)`, 'success');
      setTimeout(() => this.close(), 1500);
    } else {
      this._setStatus(icon('xCircle') + ' ' + (result.message || 'Erreur'), 'error');
    }
  }

  /**
   * Définit le message de statut
   */
  _setStatus(message, type) {
    const statusEl = $('#import-status', this._element);
    if (statusEl) {
      statusEl.innerHTML = message;
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
