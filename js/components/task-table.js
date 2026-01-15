/**
 * Composant TaskTable - Affichage des tâches en tableau
 */

import { State } from '../state.js';
import { Config } from '../config.js';
import { UserConfig } from '../services/user-config.js';
import { $, setHtml, escapeAttr, delegate } from '../utils/dom.js';
import { formatDate, getDueClass } from '../utils/date.js';

class TaskTableComponent {
  constructor() {
    this._element = null;
    this._unsubscribers = [];
    this._sortState = {}; // { tableId: { key: 'title', dir: 'asc' } }
  }

  /**
   * Initialise le composant
   * @param {string} containerSelector - Sélecteur du conteneur des tables
   */
  init(containerSelector) {
    this._element = $(containerSelector);

    if (!this._element) {
      console.error('Task table container not found:', containerSelector);
      return;
    }

    this.render();
    this._attachEventListeners();
    this._subscribeToState();
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
            <th class="col-key" data-sort="key">Clé<span class="sort-indicator"></span></th>
            <th class="col-title" data-sort="title">Titre<span class="sort-indicator"></span></th>
            <th class="col-project" data-sort="project">Projet<span class="sort-indicator"></span></th>
            <th class="col-reporter" data-sort="person">Rapporteur<span class="sort-indicator"></span></th>
            <th class="col-status" data-sort="status">Statut<span class="sort-indicator"></span></th>
            <th class="col-due ${dueSortClass}" data-sort="due">Échéance<span class="sort-indicator"></span></th>
            <th class="col-labels">Labels</th>
            <th class="col-priority" data-sort="priority">Priorité<span class="sort-indicator"></span></th>
            <th class="col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${tasks.map(task => this._renderTaskRow(task)).join('')}
        </tbody>
      </table>
    `;
  }

  /**
   * Récupère les infos de statut depuis Config.statusMap (case-insensitive)
   * Si pas trouvé, retourne un objet avec le statut brut
   */
  _getStatusInfo(status) {
    if (!status) return Config.defaultStatus;
    const key = Object.keys(Config.statusMap).find(k => k.toLowerCase() === status.toLowerCase());
    if (key) {
      return Config.statusMap[key];
    }
    // Statut non mappé - retourner un objet avec le statut brut
    // Détecter le type de statut basé sur des mots-clés (sauf "terminé" qui ne doit pas être auto-done)
    const statusLower = status.toLowerCase();
    // Seulement "Done", "Closed", "Resolved" sont auto-done, PAS "terminé"
    if (statusLower === 'done' || statusLower === 'closed' || statusLower === 'resolved') {
      return { key: 'done', label: status, icon: '✓', cssClass: 'status-done' };
    }
    if (statusLower.includes('progress') || statusLower.includes('cours') || statusLower.includes('développ') || statusLower.includes('terminé')) {
      return { key: 'inprogress', label: status, icon: '⏳', cssClass: 'status-inprogress' };
    }
    if (statusLower.includes('review') || statusLower.includes('revue')) {
      return { key: 'review', label: status, icon: '👀', cssClass: 'status-review' };
    }
    if (statusLower.includes('livr') || statusLower.includes('deliver')) {
      return { key: 'delivered', label: status, icon: '📦', cssClass: 'status-delivered' };
    }
    if (statusLower.includes('prêt') || statusLower.includes('ready') || statusLower.includes('test')) {
      return { key: 'ready', label: status, icon: '🚀', cssClass: 'status-ready' };
    }
    // Par défaut, afficher le statut brut avec style backlog
    return { key: 'backlog', label: status, icon: '📋', cssClass: 'status-backlog' };
  }

  /**
   * Génère le HTML d'une ligne de tâche
   */
  _renderTaskRow(task) {
    // Toujours recalculer le statut depuis task.status pour avoir les bonnes valeurs
    const statusInfo = this._getStatusInfo(task.status);
    const statusKey = statusInfo.key;
    // task.done est la propriété manuelle "terminé"
    const isManualDone = task.done === true;
    const isStatusDone = statusKey === 'done';
    const hasLabelDone = (task.labels || []).some(l => l.toLowerCase() === 'done');
    const rowClass = isManualDone ? 'task-manual-done' : (isStatusDone ? 'task-done' : (hasLabelDone ? 'task-label-done' : ''));

    const dueDate = formatDate(task.dueDate);
    const dueClass = getDueClass(task.dueDate);

    const statusIcon = statusInfo.icon;
    const statusLabel = statusInfo.label;
    const statusCss = statusInfo.cssClass;

    const priorityText = task.priorityText || '-';
    const priorityCss = task.priorityCssClass || '';

    const labels = (task.labels || []).map(l => this._formatLabel(l)).join('');
    const jiraUrl = task.link || null;
    const taskKey = task.key || '';

    return `
      <tr class="${rowClass}"
          data-key="${escapeAttr(taskKey)}"
          data-title="${escapeAttr(task.summary || '')}"
          data-due="${task.dueDate || ''}"
          data-priority="${task.priorityCssClass || ''}"
          data-person="${escapeAttr(task.reporter || '')}"
          data-project="${escapeAttr(task.project || '')}"
          data-status="${statusKey}">
        <td class="task-key">
          ${jiraUrl ? `<a href="${jiraUrl}" target="_blank" class="task-key-link">${escapeAttr(taskKey)}</a>` : escapeAttr(taskKey)}
        </td>
        <td class="task-title">
          ${escapeAttr(task.summary || '')}
          ${isManualDone ? '<span class="task-manual-done-badge">✓ Terminé</span>' : ''}
          ${!isManualDone && isStatusDone ? '<span class="task-done-badge">✓ Terminé</span>' : ''}
          ${!isManualDone && !isStatusDone && hasLabelDone ? '<span class="task-label-done-badge">✓ Terminé</span>' : ''}
        </td>
        <td class="task-project">${escapeAttr(task.project || '')}</td>
        <td class="task-reporter">${escapeAttr(task.reporter || '')}</td>
        <td class="task-status">
          <span class="status-badge ${statusCss}">${statusIcon} ${statusLabel}</span>
        </td>
        <td class="task-due ${dueClass}">${dueDate}</td>
        <td><div class="task-labels">${labels}</div></td>
        <td class="priority ${priorityCss}">${priorityText}</td>
        <td class="task-actions">
          <button class="action-btn action-done ${task.done ? 'is-done' : ''}" data-action="done" data-key="${escapeAttr(taskKey)}" title="${task.done ? 'Marquer non terminé' : 'Marquer terminé'}">${task.done ? '↩' : '✓'}</button>
          <button class="action-btn action-edit" data-action="edit" data-key="${escapeAttr(taskKey)}" title="Modifier">✏️</button>
          <button class="action-btn action-ban" data-action="ban" data-key="${escapeAttr(taskKey)}" title="Bloquer">🚫</button>
          <button class="action-btn action-delete" data-action="delete" data-key="${escapeAttr(taskKey)}" title="Supprimer">🗑️</button>
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

    // Double-clic sur une ligne pour éditer le ticket
    delegate(this._element, 'dblclick', 'tr[data-key]', (e, row) => {
      const taskKey = row.dataset.key;
      if (taskKey) {
        document.dispatchEvent(new CustomEvent('app:edit-task', {
          detail: { taskKey }
        }));
      }
    });

    // Boutons d'action
    delegate(this._element, 'click', '.action-btn', (e, btn) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const key = btn.dataset.key;

      switch (action) {
        case 'done':
          this._handleToggleDone(key);
          break;
        case 'edit':
          document.dispatchEvent(new CustomEvent('app:edit-task', {
            detail: { taskKey: key }
          }));
          break;
        case 'ban':
          this._handleBan(key);
          break;
        case 'delete':
          this._handleDelete(key);
          break;
      }
    });
  }

  /**
   * Gère le marquage terminé/non terminé d'un ticket
   */
  _handleToggleDone(key) {
    const task = State.tasks.find(t => t.key === key);
    if (task) {
      State.updateTask(key, { done: !task.done });
    }
  }

  /**
   * Gère le blocage d'un ticket
   */
  _handleBan(key) {
    if (confirm(`Bloquer le ticket ${key} ? Il sera masqué de l'affichage.`)) {
      UserConfig.addToBlacklist(key);
    }
  }

  /**
   * Gère la suppression d'un ticket
   */
  _handleDelete(key) {
    if (confirm(`Supprimer définitivement le ticket ${key} ?`)) {
      State.removeTask(key);
    }
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
        case 'key':
          valA = a.dataset.key || '';
          valB = b.dataset.key || '';
          break;
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
    const unsubConfig = State.subscribe('userConfig', () => this.render());

    this._unsubscribers.push(unsubTasks, unsubFilters, unsubViewMode, unsubConfig);
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
