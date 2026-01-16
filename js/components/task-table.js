/**
 * Composant TaskTable - Affichage des tâches en tableau
 */

import { State } from '../state.js';
import { Config } from '../config.js';
import { UserConfig } from '../services/user-config.js';
import { $, setHtml, escapeAttr, delegate } from '../utils/dom.js';
import { formatDate, getDueClass } from '../utils/date.js';
import { icon } from '../utils/icons.js';
import { renderSelect, renderPrioritySelect, renderDatePicker, applyQuickDate } from '../utils/form.js';

class TaskTableComponent {
  constructor() {
    this._element = null;
    this._unsubscribers = [];
    this._sortState = {}; // { tableId: { key: 'title', dir: 'asc' } }
    this._selectedKeys = new Set(); // Tickets sélectionnés pour batch
    this._lastClickedCheckbox = null; // Pour la sélection shift-click
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
    this._updateBatchToolbar();
  }

  /**
   * Rend la toolbar de batch editing (sticky)
   */
  _renderBatchToolbar() {
    let toolbar = document.getElementById('batch-toolbar');
    if (!toolbar) {
      toolbar = document.createElement('div');
      toolbar.id = 'batch-toolbar';
      toolbar.className = 'batch-toolbar';
      toolbar.innerHTML = `
        <div class="batch-toolbar-content">
          <span class="batch-count"><span id="batch-selected-count">0</span> ticket(s) sélectionné(s)</span>
          <div class="batch-actions">
            <select id="batch-field" class="batch-select">
              <option value="">-- Champ à modifier --</option>
              <option value="dueDate">Date d'échéance</option>
              <option value="project">Projet</option>
              <option value="reporter">Rapporteur</option>
              <option value="status">Statut</option>
              <option value="priority">Priorité</option>
            </select>
            <div id="batch-value-container">
              <input type="text" id="batch-value" class="batch-input" placeholder="Nouvelle valeur...">
            </div>
            <button id="batch-apply" class="batch-btn batch-btn-apply">Appliquer</button>
            <button id="batch-clear" class="batch-btn batch-btn-clear">Désélectionner</button>
          </div>
        </div>
      `;
      document.body.appendChild(toolbar);
      this._attachBatchListeners(toolbar);
    }
    return toolbar;
  }

  /**
   * Met à jour la toolbar de batch
   */
  _updateBatchToolbar() {
    const toolbar = this._renderBatchToolbar();
    const count = this._selectedKeys.size;
    const countEl = document.getElementById('batch-selected-count');
    if (countEl) countEl.textContent = count;

    if (count > 0) {
      toolbar.classList.add('show');
    } else {
      toolbar.classList.remove('show');
    }
  }

  /**
   * Attache les listeners de la toolbar batch
   */
  _attachBatchListeners(toolbar) {
    const fieldSelect = document.getElementById('batch-field');
    const valueContainer = document.getElementById('batch-value-container');
    const applyBtn = document.getElementById('batch-apply');
    const clearBtn = document.getElementById('batch-clear');

    // Changer le type d'input selon le champ
    fieldSelect?.addEventListener('change', () => {
      const field = fieldSelect.value;

      if (field === 'status') {
        valueContainer.innerHTML = this._renderStatusSelectFromTasks();
      } else if (field === 'priority') {
        valueContainer.innerHTML = renderPrioritySelect({
          id: 'batch-value',
          className: 'batch-select'
        });
      } else if (field === 'project') {
        valueContainer.innerHTML = this._renderProjectSelect();
      } else if (field === 'dueDate') {
        valueContainer.innerHTML = renderDatePicker({ id: 'batch-value', inline: true });
        this._attachDatePickerListeners(valueContainer);
      } else {
        valueContainer.innerHTML = '<input type="text" id="batch-value" class="batch-input" placeholder="Nouvelle valeur...">';
      }
    });

    applyBtn?.addEventListener('click', () => this._applyBatchEdit());
    clearBtn?.addEventListener('click', () => this._clearSelection());
  }

  /**
   * Attache les listeners pour le date picker
   */
  _attachDatePickerListeners(container) {
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.date-quick-btn');
      if (btn) {
        const dateType = btn.dataset.date;
        const input = container.querySelector('#batch-value');
        applyQuickDate(dateType, input);
      }
    });
  }

  /**
   * Génère le select des projets (depuis la config utilisateur)
   */
  _renderProjectSelect() {
    const projectRules = UserConfig.projectRules;

    const options = projectRules
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(rule => ({
        value: rule.name,
        label: rule.name
      }));

    return renderSelect({
      id: 'batch-value',
      className: 'batch-select',
      options,
      placeholder: '-- Choisir un projet --'
    });
  }

  /**
   * Génère le select des statuts (depuis les tâches existantes)
   */
  _renderStatusSelectFromTasks() {
    // Extraire tous les statuts uniques des tâches
    const statusMap = new Map();
    State.tasks.forEach(task => {
      if (task.statusKey && task.statusLabel) {
        statusMap.set(task.statusKey, {
          value: task.statusKey,
          label: task.statusLabel,
          iconName: task.statusIconName
        });
      }
    });

    const options = Array.from(statusMap.values())
      .sort((a, b) => {
        const order = Config.statusOrder;
        return (order[a.value] || 99) - (order[b.value] || 99);
      });

    return renderSelect({
      id: 'batch-value',
      className: 'batch-select',
      options,
      placeholder: '-- Choisir un statut --'
    });
  }

  /**
   * Applique la modification batch
   */
  _applyBatchEdit() {
    const field = document.getElementById('batch-field')?.value;
    const value = document.getElementById('batch-value')?.value;

    if (!field) {
      alert('Sélectionnez un champ à modifier');
      return;
    }

    if (this._selectedKeys.size === 0) {
      alert('Aucun ticket sélectionné');
      return;
    }

    const updates = {};
    if (field === 'dueDate') {
      updates.dueDate = value ? new Date(value).toISOString() : null;
    } else if (field === 'project') {
      updates.project = value;
    } else if (field === 'reporter') {
      updates.reporter = value;
    } else if (field === 'status') {
      // Trouver les infos du statut depuis une tâche existante avec ce statusKey
      const sampleTask = State.tasks.find(t => t.statusKey === value);
      if (sampleTask) {
        updates.statusKey = sampleTask.statusKey;
        updates.statusLabel = sampleTask.statusLabel;
        updates.statusIconName = sampleTask.statusIconName;
        updates.statusCssClass = sampleTask.statusCssClass;
        updates.status = sampleTask.status;
      }
    } else if (field === 'priority') {
      updates.priority = value;
      // Mettre à jour les infos de priorité
      const priorityMap = {
        'Highest': { value: 5, text: 'Critique', class: 'critical' },
        'High': { value: 4, text: 'Haute', class: 'high' },
        'Medium': { value: 3, text: 'Moyenne', class: 'medium' },
        'Low': { value: 2, text: 'Basse', class: 'low' },
        'Lowest': { value: 1, text: 'Minimale', class: 'lowest' }
      };
      const pInfo = priorityMap[value] || { value: 3, text: value, class: 'medium' };
      updates.priorityValue = pInfo.value;
      updates.priorityText = pInfo.text;
      updates.priorityCssClass = pInfo.class;
    }

    // Appliquer à tous les tickets sélectionnés
    this._selectedKeys.forEach(key => {
      State.updateTask(key, updates);
    });

    // Vider la sélection
    this._clearSelection();
  }

  /**
   * Vide la sélection
   */
  _clearSelection() {
    this._selectedKeys.clear();
    this._updateBatchToolbar();
    // Décocher toutes les checkboxes
    this._element?.querySelectorAll('.task-checkbox').forEach(cb => cb.checked = false);
    this._element?.querySelectorAll('.select-all-checkbox').forEach(cb => cb.checked = false);
  }

  /**
   * Rend les tâches groupées par projet
   */
  _renderByProject() {
    const tasksByProject = State.getTasksByProject();
    const projectNames = Object.keys(tasksByProject).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

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
            <th class="col-select"><input type="checkbox" class="select-all-checkbox" data-table-id="${tableId}" title="Tout sélectionner"></th>
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
      return { key: 'done', label: status, iconName: 'checkCircle', cssClass: 'status-done' };
    }
    if (statusLower.includes('progress') || statusLower.includes('cours') || statusLower.includes('développ') || statusLower.includes('terminé')) {
      return { key: 'inprogress', label: status, iconName: 'clock', cssClass: 'status-inprogress' };
    }
    if (statusLower.includes('review') || statusLower.includes('revue')) {
      return { key: 'review', label: status, iconName: 'eye', cssClass: 'status-review' };
    }
    if (statusLower.includes('livr') || statusLower.includes('deliver')) {
      return { key: 'delivered', label: status, iconName: 'check', cssClass: 'status-delivered' };
    }
    if (statusLower.includes('prêt') || statusLower.includes('ready') || statusLower.includes('test')) {
      return { key: 'ready', label: status, iconName: 'playCircle', cssClass: 'status-ready' };
    }
    // Par défaut, afficher le statut brut avec style backlog
    return { key: 'backlog', label: status, iconName: 'list', cssClass: 'status-backlog' };
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

    const statusIconHtml = icon(statusInfo.iconName || 'list');
    const statusLabel = statusInfo.label;
    const statusCss = statusInfo.cssClass;

    const priorityText = task.priorityText || '-';
    const priorityCss = task.priorityCssClass || '';

    const labels = (task.labels || []).map(l => this._formatLabel(l)).join('');
    const jiraUrl = task.link || null;
    const taskKey = task.key || '';

    const checkIcon = icon('check');
    const undoIcon = icon('refresh');
    const editIcon = icon('edit');
    const banIcon = icon('ban');
    const trashIcon = icon('trash');

    return `
      <tr class="${rowClass}"
          data-key="${escapeAttr(taskKey)}"
          data-title="${escapeAttr(task.summary || '')}"
          data-due="${task.dueDate || ''}"
          data-priority="${task.priorityCssClass || ''}"
          data-person="${escapeAttr(task.reporter || '')}"
          data-project="${escapeAttr(task.project || '')}"
          data-status="${statusKey}">
        <td class="task-select">
          <input type="checkbox" class="task-checkbox" data-key="${escapeAttr(taskKey)}" ${this._selectedKeys.has(taskKey) ? 'checked' : ''}>
        </td>
        <td class="task-key">
          ${jiraUrl ? `<a href="${jiraUrl}" target="_blank" class="task-key-link">${escapeAttr(taskKey)}</a>` : escapeAttr(taskKey)}
        </td>
        <td class="task-title">
          ${escapeAttr(task.summary || '')}
          ${isManualDone ? `<span class="task-manual-done-badge">${checkIcon} Terminé</span>` : ''}
          ${!isManualDone && isStatusDone ? `<span class="task-done-badge">${checkIcon} Terminé</span>` : ''}
          ${!isManualDone && !isStatusDone && hasLabelDone ? `<span class="task-label-done-badge">${checkIcon} Terminé</span>` : ''}
        </td>
        <td class="task-project">${escapeAttr(task.project || '')}</td>
        <td class="task-reporter">${escapeAttr(task.reporter || '')}</td>
        <td class="task-status">
          <span class="status-badge ${statusCss}">${statusIconHtml} ${statusLabel}</span>
        </td>
        <td class="task-due ${dueClass}">${dueDate}</td>
        <td><div class="task-labels">${labels}</div></td>
        <td class="priority ${priorityCss}">${priorityText}</td>
        <td class="task-actions">
          <button class="action-btn action-done ${task.done ? 'is-done' : ''}" data-action="done" data-key="${escapeAttr(taskKey)}" title="${task.done ? 'Marquer non terminé' : 'Marquer terminé'}">${task.done ? undoIcon : checkIcon}</button>
          <button class="action-btn action-edit" data-action="edit" data-key="${escapeAttr(taskKey)}" title="Modifier">${editIcon}</button>
          <button class="action-btn action-ban" data-action="ban" data-key="${escapeAttr(taskKey)}" title="Bloquer">${banIcon}</button>
          <button class="action-btn action-delete" data-action="delete" data-key="${escapeAttr(taskKey)}" title="Supprimer">${trashIcon}</button>
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

    // Checkbox individuelle avec support shift-click
    delegate(this._element, 'click', '.task-checkbox', (e, cb) => {
      e.stopPropagation();
      const key = cb.dataset.key;
      const table = cb.closest('table');

      // Shift-click : sélectionner tous les items entre le dernier cliqué et celui-ci
      if (e.shiftKey && this._lastClickedCheckbox && table) {
        const checkboxes = Array.from(table.querySelectorAll('.task-checkbox'));
        const lastIndex = checkboxes.indexOf(this._lastClickedCheckbox);
        const currentIndex = checkboxes.indexOf(cb);

        if (lastIndex !== -1 && currentIndex !== -1) {
          const start = Math.min(lastIndex, currentIndex);
          const end = Math.max(lastIndex, currentIndex);
          const shouldCheck = cb.checked;

          for (let i = start; i <= end; i++) {
            const checkbox = checkboxes[i];
            checkbox.checked = shouldCheck;
            const itemKey = checkbox.dataset.key;
            if (shouldCheck) {
              this._selectedKeys.add(itemKey);
            } else {
              this._selectedKeys.delete(itemKey);
            }
          }
        }
      } else {
        // Clic normal
        if (cb.checked) {
          this._selectedKeys.add(key);
        } else {
          this._selectedKeys.delete(key);
        }
      }

      this._lastClickedCheckbox = cb;
      this._updateBatchToolbar();
    });

    // Checkbox "tout sélectionner"
    delegate(this._element, 'change', '.select-all-checkbox', (e, cb) => {
      const table = cb.closest('table');
      const checkboxes = table?.querySelectorAll('.task-checkbox') || [];
      checkboxes.forEach(checkbox => {
        checkbox.checked = cb.checked;
        const key = checkbox.dataset.key;
        if (cb.checked) {
          this._selectedKeys.add(key);
        } else {
          this._selectedKeys.delete(key);
        }
      });
      this._updateBatchToolbar();
    });

    // Empêcher le double-clic sur checkbox d'ouvrir la modal
    delegate(this._element, 'dblclick', '.task-checkbox', (e) => {
      e.preventDefault();
      e.stopPropagation();
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
