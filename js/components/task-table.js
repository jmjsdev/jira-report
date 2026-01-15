/**
 * Composant TaskTable - Affichage des tâches en tableau
 */

import { State } from '../state.js';
import { Config } from '../config.js';
import { $, setHtml, escapeAttr, delegate } from '../utils/dom.js';
import { formatDate, getDueClass } from '../utils/date.js';

class TaskTableComponent {
  constructor() {
    this._element = null;
    this._viewModeElement = null;
    this._unsubscribers = [];
    this._sortState = {}; // { tableId: { key: 'title', dir: 'asc' } }
  }

  /**
   * Initialise le composant
   * @param {string} containerSelector - Sélecteur du conteneur des tables
   * @param {string} viewModeSelector - Sélecteur du sélecteur de vue
   */
  init(containerSelector, viewModeSelector) {
    this._element = $(containerSelector);
    this._viewModeElement = $(viewModeSelector);

    if (!this._element) {
      console.error('Task table container not found:', containerSelector);
      return;
    }

    this._renderViewModeSelector();
    this.render();
    this._attachEventListeners();
    this._subscribeToState();
  }

  /**
   * Rend le sélecteur de mode de vue
   */
  _renderViewModeSelector() {
    if (!this._viewModeElement) return;

    const viewMode = State.viewMode;
    setHtml(this._viewModeElement, `
      <div class="view-mode">
        <button id="view-by-project" class="view-mode-btn ${viewMode === 'project' ? 'active' : ''}">
          Par projet
        </button>
        <button id="view-by-date" class="view-mode-btn ${viewMode === 'date' ? 'active' : ''}">
          Par date d'échéance
        </button>
      </div>
    `);

    // Events
    const projectBtn = $('#view-by-project', this._viewModeElement);
    const dateBtn = $('#view-by-date', this._viewModeElement);

    projectBtn?.addEventListener('click', () => {
      State.setViewMode('project');
      this._updateViewModeButtons();
    });

    dateBtn?.addEventListener('click', () => {
      State.setViewMode('date');
      this._updateViewModeButtons();
    });
  }

  /**
   * Met à jour les boutons de mode de vue
   */
  _updateViewModeButtons() {
    const projectBtn = $('#view-by-project', this._viewModeElement);
    const dateBtn = $('#view-by-date', this._viewModeElement);
    const viewMode = State.viewMode;

    projectBtn?.classList.toggle('active', viewMode === 'project');
    dateBtn?.classList.toggle('active', viewMode === 'date');
  }

  /**
   * Rend les tables selon le mode de vue
   */
  render() {
    if (State.viewMode === 'project') {
      this._renderByProject();
    } else {
      this._renderByDate();
    }
  }

  /**
   * Rend les tâches groupées par projet
   */
  _renderByProject() {
    const tasksByProject = State.getTasksByProject();
    const projectNames = Object.keys(tasksByProject).sort();

    if (projectNames.length === 0) {
      setHtml(this._element, `
        <div class="empty-state">
          <p>Aucune tâche à afficher</p>
          <p>Importez un fichier XML JIRA ou ouvrez un projet existant.</p>
        </div>
      `);
      return;
    }

    let html = '';
    projectNames.forEach(projectName => {
      const tasks = tasksByProject[projectName];
      if (tasks.length === 0) return;

      html += `
        <h2 class="project-title">${projectName.toUpperCase()}</h2>
        ${this._renderTable(tasks, `table-${projectName}`)}
      `;
    });

    setHtml(this._element, html);
  }

  /**
   * Rend les tâches triées par date
   */
  _renderByDate() {
    const tasks = State.getTasksByDate();

    if (tasks.length === 0) {
      setHtml(this._element, `
        <div class="empty-state">
          <p>Aucune tâche à afficher</p>
          <p>Importez un fichier XML JIRA ou ouvrez un projet existant.</p>
        </div>
      `);
      return;
    }

    setHtml(this._element, `
      <h2 class="project-title">TÂCHES TRIÉES PAR DATE D'ÉCHÉANCE</h2>
      ${this._renderTable(tasks, 'table-by-date', true)}
    `);
  }

  /**
   * Génère le HTML d'une table de tâches
   */
  _renderTable(tasks, tableId, sortedByDate = false) {
    const sortState = this._sortState[tableId];
    const dueSortClass = sortedByDate ? 'sort-asc' : '';

    return `
      <table class="tasks-table" data-sortable="true" data-table-id="${tableId}">
        <thead>
          <tr>
            <th class="col-title" data-sort="title">Titre<span class="sort-indicator"></span></th>
            <th class="col-project" data-sort="project">Projet<span class="sort-indicator"></span></th>
            <th class="col-status" data-sort="status">Statut<span class="sort-indicator"></span></th>
            <th class="col-due ${dueSortClass}" data-sort="due">Échéance<span class="sort-indicator"></span></th>
            <th class="col-labels">Labels</th>
            <th class="col-priority" data-sort="priority">Priorité<span class="sort-indicator"></span></th>
            <th class="col-link">Lien</th>
          </tr>
        </thead>
        <tbody>
          ${tasks.map(task => this._renderTaskRow(task)).join('')}
        </tbody>
      </table>
    `;
  }

  /**
   * Génère le HTML d'une ligne de tâche
   */
  _renderTaskRow(task) {
    const isDone = task.statusKey === 'done';
    const hasLabelDone = (task.labels || []).some(l => l.toLowerCase() === 'done');
    const rowClass = isDone ? 'task-done' : (hasLabelDone ? 'task-label-done' : '');

    const dueDate = formatDate(task.dueDate);
    const dueClass = getDueClass(task.dueDate);

    const statusIcon = task.statusIcon || '📋';
    const statusLabel = task.statusLabel || 'Backlog';
    const statusCss = task.statusCssClass || 'status-backlog';

    const priorityText = task.priorityText || '-';
    const priorityCss = task.priorityCssClass || '';

    const labels = (task.labels || []).map(l => this._formatLabel(l)).join('');
    const ajirUrl = task.key ? `${Config.urls.ajir}${task.key}` : null;

    return `
      <tr class="${rowClass}"
          data-key="${escapeAttr(task.key || '')}"
          data-title="${escapeAttr(task.summary || '')}"
          data-due="${task.dueDate || ''}"
          data-priority="${task.priorityCssClass || ''}"
          data-person="${escapeAttr(task.reporter || '')}"
          data-project="${escapeAttr(task.project || '')}"
          data-status="${task.statusKey || 'backlog'}">
        <td class="task-title">
          ${escapeAttr(task.summary || '')}
          ${isDone ? '<span class="task-done-badge">✓ Terminé</span>' : ''}
          ${!isDone && hasLabelDone ? '<span class="task-label-done-badge">✓ Terminé</span>' : ''}
        </td>
        <td class="task-project">${escapeAttr(task.project || '')}</td>
        <td class="task-status">
          <span class="status-badge ${statusCss}">${statusIcon} ${statusLabel}</span>
        </td>
        <td class="task-due ${dueClass}">${dueDate}</td>
        <td><div class="task-labels">${labels}</div></td>
        <td class="priority ${priorityCss}">${priorityText}</td>
        <td class="task-link">
          ${ajirUrl ? `<a href="${ajirUrl}" target="_blank">ajir</a>` : ''}
        </td>
      </tr>
    `;
  }

  /**
   * Formate un label
   */
  _formatLabel(label) {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel === 'done') {
      return `<span class="label label-done" data-label="done">${escapeAttr(label)}</span>`;
    }
    return `<span class="label">${escapeAttr(label)}</span>`;
  }

  /**
   * Attache les écouteurs d'événements
   */
  _attachEventListeners() {
    // Délégation pour le tri des colonnes
    delegate(this._element, 'click', 'th[data-sort]', (e, th) => {
      this._handleSort(th);
    });
  }

  /**
   * Gère le tri d'une colonne
   */
  _handleSort(th) {
    const table = th.closest('table');
    if (!table) return;

    const tableId = table.dataset.tableId;
    const sortKey = th.dataset.sort;
    const currentDir = th.classList.contains('sort-asc') ? 'asc' :
                       (th.classList.contains('sort-desc') ? 'desc' : null);
    const newDir = currentDir === 'asc' ? 'desc' : 'asc';

    // Réinitialiser les autres headers
    table.querySelectorAll('th[data-sort]').forEach(header => {
      header.classList.remove('sort-asc', 'sort-desc');
    });

    // Appliquer le nouveau tri
    th.classList.add('sort-' + newDir);

    // Sauvegarder l'état
    this._sortState[tableId] = { key: sortKey, dir: newDir };

    // Trier les lignes
    this._sortTable(table, sortKey, newDir);
  }

  /**
   * Trie les lignes d'une table
   */
  _sortTable(table, sortKey, direction) {
    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    const rows = Array.from(tbody.querySelectorAll('tr'));

    rows.sort((a, b) => {
      let valA, valB;

      switch (sortKey) {
        case 'title':
          valA = a.dataset.title || '';
          valB = b.dataset.title || '';
          break;
        case 'due':
          valA = a.dataset.due || '9999-12-31';
          valB = b.dataset.due || '9999-12-31';
          break;
        case 'priority':
          const priorityOrder = { 'critical': 1, 'high': 2, 'medium': 3, 'low': 4, 'lowest': 5, '': 6 };
          valA = priorityOrder[a.dataset.priority] || 6;
          valB = priorityOrder[b.dataset.priority] || 6;
          break;
        case 'person':
          valA = a.dataset.person || 'zzz';
          valB = b.dataset.person || 'zzz';
          break;
        case 'status':
          valA = Config.statusOrder[a.dataset.status] || 0;
          valB = Config.statusOrder[b.dataset.status] || 0;
          break;
        case 'project':
          valA = a.dataset.project || '';
          valB = b.dataset.project || '';
          break;
        default:
          valA = '';
          valB = '';
      }

      let result;
      if (sortKey === 'priority' || sortKey === 'status') {
        result = valA - valB;
      } else {
        result = String(valA).localeCompare(String(valB));
      }

      return direction === 'desc' ? -result : result;
    });

    // Réinsérer les lignes triées
    rows.forEach(row => tbody.appendChild(row));
  }

  /**
   * S'abonne aux changements d'état
   */
  _subscribeToState() {
    const unsubTasks = State.subscribe('tasks', () => this.render());
    const unsubFilters = State.subscribe('filters', () => this.render());
    const unsubViewMode = State.subscribe('viewMode', () => this.render());

    this._unsubscribers.push(unsubTasks, unsubFilters, unsubViewMode);
  }

  /**
   * Nettoie le composant
   */
  destroy() {
    this._unsubscribers.forEach(unsub => unsub());
    this._unsubscribers = [];
  }
}

export const TaskTable = new TaskTableComponent();
