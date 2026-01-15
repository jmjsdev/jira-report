/**
 * Composant Modal Edit Task - Edition des labels et date d'un ticket
 */

import { State } from '../../state.js';
import { Config } from '../../config.js';
import { UserConfig } from '../../services/user-config.js';
import { $, $$, setHtml, addClass, removeClass, escapeAttr } from '../../utils/dom.js';
import { formatDate } from '../../utils/date.js';

class EditTaskModalComponent {
  constructor() {
    this._element = null;
    this._isOpen = false;
    this._currentTaskKey = null;
  }

  /**
   * Initialise le composant
   * @param {string} selector - Sélecteur du conteneur modal
   */
  init(selector) {
    this._element = $(selector);
    if (!this._element) {
      console.error('Edit task modal container not found:', selector);
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
      <div class="modal-content modal-content-medium">
        <div class="modal-header">
          <h2 id="edit-task-title">Edition du ticket</h2>
          <button id="close-edit-task-modal" class="close-modal-btn">&times;</button>
        </div>

        <div class="modal-body">
          <!-- Lien JIRA -->
          <div class="edit-section">
            <label>Ticket JIRA</label>
            <a id="edit-task-jira-link" href="#" target="_blank" class="jira-link"></a>
          </div>

          <!-- Titre -->
          <div class="edit-section">
            <label for="edit-task-summary">Titre</label>
            <input type="text" id="edit-task-summary" class="edit-input" placeholder="Titre du ticket...">
          </div>

          <!-- Projet et Statut sur la même ligne -->
          <div class="edit-section edit-section-row">
            <div class="edit-field">
              <label for="edit-task-project">Projet</label>
              <input type="text" id="edit-task-project" class="edit-input" list="project-list" placeholder="Projet...">
              <datalist id="project-list"></datalist>
            </div>
            <div class="edit-field">
              <label for="edit-task-status">Statut</label>
              <select id="edit-task-status" class="edit-input"></select>
            </div>
          </div>

          <!-- Date d'échéance -->
          <div class="edit-section">
            <label for="edit-task-duedate">Date d'échéance</label>
            <input type="date" id="edit-task-duedate" class="edit-input">
            <div class="date-quick-buttons">
              <button type="button" class="date-quick-btn" data-date="today">Aujourd'hui</button>
              <button type="button" class="date-quick-btn" data-date="tomorrow">Demain</button>
              <button type="button" class="date-quick-btn" data-date="+3">J+3</button>
              <button type="button" class="date-quick-btn" data-date="+7">J+7</button>
              <button type="button" class="date-quick-btn" data-date="next-monday">Lundi</button>
              <button type="button" class="date-quick-btn" data-date="end-month">Fin mois</button>
              <button type="button" class="date-quick-btn date-quick-btn-clear" data-date="clear">✕</button>
            </div>
          </div>

          <!-- Labels -->
          <div class="edit-section">
            <label>Labels</label>
            <div id="edit-task-labels" class="edit-labels-container"></div>
            <div class="edit-add-label">
              <input type="text" id="edit-new-label" placeholder="Nouveau label..." class="edit-input edit-input-small">
              <button id="btn-add-label" class="edit-add-btn">+ Ajouter</button>
            </div>
            <div class="edit-suggested-labels">
              <span class="suggested-label-hint">Labels suggérés:</span>
              <div id="edit-suggested-labels-list"></div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button id="btn-save-task" class="save-task-btn">Enregistrer</button>
          <button id="btn-cancel-task" class="cancel-task-btn">Annuler</button>
        </div>
      </div>
    `);
  }

  /**
   * Attache les écouteurs d'événements
   */
  _attachEventListeners() {
    // Fermer la modal
    const closeBtn = $('#close-edit-task-modal', this._element);
    closeBtn?.addEventListener('click', () => this.close());

    const cancelBtn = $('#btn-cancel-task', this._element);
    cancelBtn?.addEventListener('click', () => this.close());

    // Clic en dehors
    this._element.addEventListener('click', (e) => {
      if (e.target === this._element) {
        this.close();
      }
    });

    // Sauvegarder
    const saveBtn = $('#btn-save-task', this._element);
    saveBtn?.addEventListener('click', () => this._saveTask());

    // Ajouter label
    const addLabelBtn = $('#btn-add-label', this._element);
    addLabelBtn?.addEventListener('click', () => this._addLabel());

    const newLabelInput = $('#edit-new-label', this._element);
    newLabelInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this._addLabel();
    });

    // Supprimer label (délégation)
    this._element.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('.label-remove-btn');
      if (removeBtn) {
        const label = removeBtn.dataset.label;
        this._removeLabel(label);
      }

      // Label suggéré
      const suggestedLabel = e.target.closest('.suggested-label');
      if (suggestedLabel) {
        const label = suggestedLabel.dataset.label;
        this._addLabelValue(label);
      }

      // Boutons de date rapide
      const dateBtn = e.target.closest('.date-quick-btn');
      if (dateBtn) {
        this._handleQuickDate(dateBtn.dataset.date);
      }
    });
  }

  /**
   * Gère les boutons de date rapide
   */
  _handleQuickDate(dateType) {
    const dueDateInput = $('#edit-task-duedate', this._element);
    if (!dueDateInput) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let targetDate = null;

    switch (dateType) {
      case 'today':
        targetDate = today;
        break;
      case 'tomorrow':
        targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + 1);
        break;
      case '+3':
        targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + 3);
        break;
      case '+7':
        targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + 7);
        break;
      case 'next-monday':
        targetDate = new Date(today);
        const dayOfWeek = targetDate.getDay();
        const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
        targetDate.setDate(targetDate.getDate() + daysUntilMonday);
        break;
      case 'end-month':
        targetDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'clear':
        dueDateInput.value = '';
        return;
    }

    if (targetDate) {
      dueDateInput.value = targetDate.toISOString().split('T')[0];
    }
  }

  /**
   * Ouvre la modal pour un ticket
   * @param {string} taskKey - Clé du ticket
   */
  open(taskKey) {
    this._currentTaskKey = taskKey;
    const task = State.tasks.find(t => t.key === taskKey);

    if (!task) {
      console.error('Task not found:', taskKey);
      return;
    }

    // Mettre à jour le titre
    $('#edit-task-title', this._element).textContent = `Edition: ${task.key}`;

    // Lien JIRA
    const jiraLink = $('#edit-task-jira-link', this._element);
    jiraLink.href = task.link || '#';
    jiraLink.textContent = `${task.key} - ${task.summary}`;

    // Titre
    $('#edit-task-summary', this._element).value = task.summary || '';

    // Projet
    const projectInput = $('#edit-task-project', this._element);
    projectInput.value = task.project || '';
    this._populateProjectList();

    // Statut
    this._populateStatusSelect(task.status);

    // Date d'échéance
    const dueDateInput = $('#edit-task-duedate', this._element);
    if (task.dueDate) {
      const date = new Date(task.dueDate);
      dueDateInput.value = date.toISOString().split('T')[0];
    } else {
      dueDateInput.value = '';
    }

    // Labels
    this._renderLabels(task.labels || []);

    // Labels suggérés
    this._renderSuggestedLabels(task.labels || []);

    // Ouvrir
    addClass(this._element, 'show');
    this._isOpen = true;
  }

  /**
   * Ferme la modal
   */
  close() {
    removeClass(this._element, 'show');
    this._isOpen = false;
    this._currentTaskKey = null;
  }

  /**
   * Remplit la liste des projets disponibles
   */
  _populateProjectList() {
    const datalist = $('#project-list', this._element);
    const projects = State.projects;

    setHtml(datalist, projects.map(p => `<option value="${escapeAttr(p)}">`).join(''));
  }

  /**
   * Remplit le select des statuts
   */
  _populateStatusSelect(currentStatus) {
    const select = $('#edit-task-status', this._element);
    const currentStatusLower = (currentStatus || '').toLowerCase();

    // Collecter tous les statuts uniques depuis les tickets
    const statusesFromTasks = new Set();
    State.tasks.forEach(task => {
      if (task.status) {
        statusesFromTasks.add(task.status);
      }
    });

    // Ajouter les statuts du Config.statusMap
    const allStatuses = new Set([...statusesFromTasks, ...Object.keys(Config.statusMap)]);

    // Fonction pour trouver le statusInfo (insensible à la casse)
    const getStatusInfo = (status) => {
      const key = Object.keys(Config.statusMap).find(k => k.toLowerCase() === status.toLowerCase());
      return key ? Config.statusMap[key] : null;
    };

    // Trier par ordre de statut
    const sortedStatuses = Array.from(allStatuses).sort((a, b) => {
      const infoA = getStatusInfo(a);
      const infoB = getStatusInfo(b);
      const orderA = infoA?.key ? Config.statusOrder[infoA.key] || 99 : 99;
      const orderB = infoB?.key ? Config.statusOrder[infoB.key] || 99 : 99;
      return orderA - orderB;
    });

    let html = '';
    sortedStatuses.forEach(status => {
      const selected = status.toLowerCase() === currentStatusLower ? 'selected' : '';
      const statusInfo = getStatusInfo(status);
      const icon = statusInfo?.icon || '📋';
      html += `<option value="${escapeAttr(status)}" ${selected}>${icon} ${escapeAttr(status)}</option>`;
    });

    setHtml(select, html);
  }

  /**
   * Rend la liste des labels
   */
  _renderLabels(labels) {
    const container = $('#edit-task-labels', this._element);
    if (labels.length === 0) {
      setHtml(container, '<span class="no-labels">Aucun label</span>');
      return;
    }

    setHtml(container, labels.map(label => `
      <span class="edit-label ${label.toLowerCase() === 'done' ? 'label-done' : ''}">
        ${escapeAttr(label)}
        <button class="label-remove-btn" data-label="${escapeAttr(label)}">&times;</button>
      </span>
    `).join(''));
  }

  /**
   * Rend les labels suggérés
   */
  _renderSuggestedLabels(currentLabels) {
    const container = $('#edit-suggested-labels-list', this._element);

    // Récupérer tous les tags du state + tags personnalisés
    const allTags = new Set();

    // Tags des tâches
    State.tags.forEach((count, tag) => {
      allTags.add(tag);
    });

    // Tags personnalisés
    UserConfig.customTags.forEach(tag => {
      allTags.add(tag);
    });

    // Ajouter 'done' si pas présent
    allTags.add('done');

    // Filtrer ceux déjà présents
    const suggestions = Array.from(allTags)
      .filter(tag => !currentLabels.some(l => l.toLowerCase() === tag.toLowerCase()))
      .sort();

    if (suggestions.length === 0) {
      setHtml(container, '<span class="no-suggestions">Aucune suggestion</span>');
      return;
    }

    setHtml(container, suggestions.map(tag => `
      <button class="suggested-label" data-label="${escapeAttr(tag)}">${escapeAttr(tag)}</button>
    `).join(''));
  }

  /**
   * Ajoute un label
   */
  _addLabel() {
    const input = $('#edit-new-label', this._element);
    const label = input.value.trim();
    if (label) {
      this._addLabelValue(label);
      input.value = '';
    }
  }

  /**
   * Ajoute une valeur de label
   */
  _addLabelValue(label) {
    if (!this._currentTaskKey) return;

    // Lire les labels depuis le DOM, pas depuis State
    const currentLabels = this._getCurrentLabelsFromDom();
    if (!currentLabels.some(l => l.toLowerCase() === label.toLowerCase())) {
      const newLabels = [...currentLabels, label];
      this._renderLabels(newLabels);
      this._renderSuggestedLabels(newLabels);
    }
  }

  /**
   * Supprime un label
   */
  _removeLabel(label) {
    if (!this._currentTaskKey) return;

    // Lire les labels depuis le DOM, pas depuis State
    const currentLabels = this._getCurrentLabelsFromDom();
    const newLabels = currentLabels.filter(l => l !== label);
    this._renderLabels(newLabels);
    this._renderSuggestedLabels(newLabels);
  }

  /**
   * Récupère les labels actuels depuis le DOM
   */
  _getCurrentLabelsFromDom() {
    const labelElements = $$('.edit-label .label-remove-btn', this._element);
    return Array.from(labelElements).map(el => el.dataset.label);
  }

  /**
   * Sauvegarde les modifications
   */
  _saveTask() {
    if (!this._currentTaskKey) return;

    // Récupérer le titre
    const summary = $('#edit-task-summary', this._element).value.trim();

    // Récupérer le projet
    const project = $('#edit-task-project', this._element).value.trim();

    // Récupérer le statut (recherche insensible à la casse)
    const status = $('#edit-task-status', this._element).value;
    const statusMapKey = Object.keys(Config.statusMap).find(
      k => k.toLowerCase() === status.toLowerCase()
    );
    const statusInfo = statusMapKey ? Config.statusMap[statusMapKey] : Config.defaultStatus;

    // Récupérer les labels depuis le DOM
    const labels = this._getCurrentLabelsFromDom();

    // Récupérer la date d'échéance
    const dueDateInput = $('#edit-task-duedate', this._element);
    const dueDate = dueDateInput.value || null;

    // Mettre à jour le state avec toutes les modifications
    State.updateTask(this._currentTaskKey, {
      summary,
      project,
      status,
      statusKey: statusInfo.key,
      statusLabel: statusInfo.label,
      statusIcon: statusInfo.icon,
      statusCssClass: statusInfo.cssClass,
      labels,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null
    });

    this.close();
  }

  /**
   * Vérifie si la modal est ouverte
   */
  get isOpen() {
    return this._isOpen;
  }
}

export const EditTaskModal = new EditTaskModalComponent();
