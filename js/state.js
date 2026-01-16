/**
 * Gestion de l'état global de l'application
 * Pattern: Store centralisé avec événements
 */

import { UserConfig } from './services/user-config.js';

class AppState {
  constructor() {
    // Données principales
    this._tasks = [];
    this._projects = new Set();
    this._people = new Set();
    this._tags = new Map(); // tag -> count

    // Configuration utilisateur (sauvegardée dans le fichier)
    this._userConfig = {
      customTags: [],
      projectRules: [],
      blacklist: []
    };

    // Filtres actifs
    this._filters = {
      project: 'all',
      person: null,
      tag: null,
      status: null,
      showDone: true,
      showLabelDone: true,
      search: ''
    };

    // Mode d'affichage
    this._viewMode = 'project'; // 'project' ou 'date'

    // Fichier en cours (File System Access API)
    this._currentFileHandle = null;
    this._hasUnsavedChanges = false;

    // Listeners pour les changements d'état
    this._listeners = new Map();

    // Connecter UserConfig à ce State
    UserConfig.connectToState(this);
  }

  // ========================================
  // Getters
  // ========================================

  get tasks() {
    return this._tasks;
  }

  get projects() {
    return Array.from(this._projects).sort();
  }

  get people() {
    return Array.from(this._people).sort();
  }

  get tags() {
    return this._tags;
  }

  get filters() {
    return { ...this._filters };
  }

  get viewMode() {
    return this._viewMode;
  }

  get currentFileHandle() {
    return this._currentFileHandle;
  }

  get hasUnsavedChanges() {
    return this._hasUnsavedChanges;
  }

  // ========================================
  // Setters avec notifications
  // ========================================

  setTasks(tasks) {
    this._tasks = tasks;
    this._extractMetadata();
    this._notify('tasks');
  }

  addTask(task) {
    this._tasks.push(task);
    this._extractMetadata();
    this._hasUnsavedChanges = true;
    this._notify('tasks');
    this._notify('unsavedChanges');
  }

  updateTask(key, updates) {
    const index = this._tasks.findIndex(t => t.key === key);
    if (index !== -1) {
      this._tasks[index] = { ...this._tasks[index], ...updates };
      this._extractMetadata();
      this._hasUnsavedChanges = true;
      this._notify('tasks');
      this._notify('unsavedChanges');
      console.log('Task updated:', key, updates);
    } else {
      console.warn('Task not found for update:', key);
    }
  }

  removeTask(key) {
    this._tasks = this._tasks.filter(t => t.key !== key);
    this._extractMetadata();
    this._hasUnsavedChanges = true;
    this._notify('tasks');
    this._notify('unsavedChanges');
  }

  setFilter(filterName, value) {
    if (this._filters.hasOwnProperty(filterName)) {
      this._filters[filterName] = value;
      this._notify('filters');
    }
  }

  setViewMode(mode) {
    if (mode === 'project' || mode === 'date') {
      this._viewMode = mode;
      this._notify('viewMode');
    }
  }

  setCurrentFileHandle(handle) {
    this._currentFileHandle = handle;
    this._notify('fileHandle');
  }

  setUnsavedChanges(value) {
    this._hasUnsavedChanges = value;
    this._notify('unsavedChanges');
  }

  markAsModified() {
    this._hasUnsavedChanges = true;
    this._notify('unsavedChanges');
  }

  resetFilters() {
    this._filters = {
      project: 'all',
      person: null,
      tag: null,
      status: null,
      showDone: true,
      showLabelDone: true,
      search: ''
    };
    this._notify('filters');
  }

  // ========================================
  // Méthodes de calcul
  // ========================================

  /**
   * Extrait les métadonnées (projets, personnes, tags) des tâches
   */
  _extractMetadata() {
    this._projects.clear();
    this._people.clear();
    this._tags.clear();

    this._tasks.forEach(task => {
      // Projet
      if (task.project) {
        this._projects.add(task.project.toLowerCase());
      }

      // Composants comme projets
      if (task.components && Array.isArray(task.components)) {
        task.components.forEach(c => this._projects.add(c.toLowerCase()));
      }

      // Rapporteurs
      if (task.reporter) {
        this._people.add(task.reporter.toLowerCase());
      }

      // Labels comme tags
      if (task.labels && Array.isArray(task.labels)) {
        task.labels.forEach(label => {
          const lowerLabel = label.toLowerCase();
          // Ne pas compter les labels qui sont des personnes ou des projets
          if (!this._people.has(lowerLabel) && !this._projects.has(lowerLabel)) {
            this._tags.set(label, (this._tags.get(label) || 0) + 1);
          }
        });
      }
    });
  }

  /**
   * Retourne les tâches filtrées selon les filtres actifs
   */
  getFilteredTasks() {
    return this._tasks.filter(task => {
      // Exclure les tickets blacklistés
      if (UserConfig.isBlacklisted(task.key)) {
        return false;
      }

      // Filtre projet
      if (this._filters.project !== 'all') {
        const taskProject = (task.project || '').toLowerCase();
        const taskComponents = (task.components || []).map(c => c.toLowerCase());
        if (taskProject !== this._filters.project && !taskComponents.includes(this._filters.project)) {
          return false;
        }
      }

      // Filtre rapporteur
      if (this._filters.person) {
        if (this._filters.person === 'nopeople') {
          if (task.reporter) return false;
        } else {
          const reporter = (task.reporter || '').toLowerCase();
          if (reporter !== this._filters.person) return false;
        }
      }

      // Filtre tag
      if (this._filters.tag) {
        const taskLabels = (task.labels || []).map(l => l.toLowerCase());
        if (!taskLabels.includes(this._filters.tag)) return false;
      }

      // Filtre statut
      if (this._filters.status) {
        if (task.statusKey !== this._filters.status) return false;
      }

      // Filtre terminé
      if (!this._filters.showDone && task.statusKey === 'done') {
        return false;
      }

      // Filtre label done
      if (!this._filters.showLabelDone) {
        const taskLabels = (task.labels || []).map(l => l.toLowerCase());
        if (taskLabels.includes('done')) return false;
      }

      // Filtre recherche (uniquement sur le titre, pas la clé)
      if (this._filters.search) {
        const searchLower = this._filters.search.toLowerCase();
        const titleLower = (task.summary || '').toLowerCase();
        if (!titleLower.includes(searchLower)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Retourne les tâches groupées par projet
   */
  getTasksByProject() {
    const filtered = this.getFilteredTasks();
    const grouped = {};

    filtered.forEach(task => {
      const project = task.project || 'noproject';
      if (!grouped[project]) {
        grouped[project] = [];
      }
      grouped[project].push(task);
    });

    return grouped;
  }

  /**
   * Retourne les tâches triées par date
   */
  getTasksByDate() {
    const filtered = this.getFilteredTasks();
    return filtered.sort((a, b) => {
      const dateA = a.dueDate ? new Date(a.dueDate) : new Date('9999-12-31');
      const dateB = b.dueDate ? new Date(b.dueDate) : new Date('9999-12-31');
      return dateA - dateB;
    });
  }

  /**
   * Retourne les statistiques des compteurs
   */
  getStats() {
    const filtered = this.getFilteredTasks();
    const projectSet = new Set();

    filtered.forEach(task => {
      if (task.project) projectSet.add(task.project);
    });

    return {
      totalTasks: filtered.length,
      totalProjects: projectSet.size,
      totalPeople: this._people.size
    };
  }

  /**
   * Compte les tâches par projet (exclut les blacklistés)
   */
  getProjectCounts() {
    const counts = new Map();
    this._tasks.forEach(task => {
      // Ignorer les tickets blacklistés
      if (UserConfig.isBlacklisted(task.key)) return;

      const project = (task.project || 'noproject').toLowerCase();
      counts.set(project, (counts.get(project) || 0) + 1);
    });
    return counts;
  }

  /**
   * Compte les tâches par rapporteur (exclut les blacklistés)
   */
  getPeopleCounts() {
    const counts = new Map();
    let noPersonCount = 0;

    this._tasks.forEach(task => {
      // Ignorer les tickets blacklistés
      if (UserConfig.isBlacklisted(task.key)) return;

      if (task.reporter) {
        const person = task.reporter.toLowerCase();
        counts.set(person, (counts.get(person) || 0) + 1);
      } else {
        noPersonCount++;
      }
    });

    return { counts, noPersonCount };
  }

  /**
   * Compte les tâches par tag
   */
  getTagCounts() {
    const counts = new Map();

    // Ajouter les tags personnalisés avec count 0 initialement
    UserConfig.customTags.forEach(tag => {
      counts.set(tag, 0);
    });

    this._tasks.forEach(task => {
      // Ignorer les tickets blacklistés
      if (UserConfig.isBlacklisted(task.key)) return;

      if (task.labels && Array.isArray(task.labels)) {
        task.labels.forEach(label => {
          const lowerLabel = label.toLowerCase();
          // Exclure les labels qui sont des personnes, projets ou 'done'
          if (!this._people.has(lowerLabel) &&
              !this._projects.has(lowerLabel)) {
            counts.set(label, (counts.get(label) || 0) + 1);
          }
        });
      }
    });
    return counts;
  }

  /**
   * Compte les tâches par statut (exclut les blacklistés)
   */
  getStatusCounts() {
    const counts = new Map();

    this._tasks.forEach(task => {
      // Ignorer les tickets blacklistés
      if (UserConfig.isBlacklisted(task.key)) return;

      const statusKey = task.statusKey || 'backlog';
      counts.set(statusKey, (counts.get(statusKey) || 0) + 1);
    });

    return counts;
  }

  // ========================================
  // Système d'événements
  // ========================================

  /**
   * S'abonner aux changements d'état
   * @param {string} event - Nom de l'événement
   * @param {function} callback - Fonction à appeler
   */
  subscribe(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);

    // Retourne une fonction pour se désabonner
    return () => {
      this._listeners.get(event).delete(callback);
    };
  }

  /**
   * Notifier les listeners d'un changement
   * @param {string} event - Nom de l'événement
   */
  _notify(event) {
    if (this._listeners.has(event)) {
      this._listeners.get(event).forEach(callback => {
        try {
          callback(this);
        } catch (e) {
          console.error(`Erreur dans le listener ${event}:`, e);
        }
      });
    }
  }

  // ========================================
  // Sérialisation
  // ========================================

  /**
   * Exporte l'état pour sauvegarde JSON
   */
  toJSON() {
    return {
      version: '1.1',
      exportDate: new Date().toISOString(),
      tasks: this._tasks,
      config: this._userConfig,
      metadata: {
        projects: Array.from(this._projects),
        people: Array.from(this._people)
      }
    };
  }

  /**
   * Importe l'état depuis un JSON
   */
  fromJSON(data) {
    if (!data || !data.tasks) {
      throw new Error('Format JSON invalide');
    }

    this._tasks = data.tasks;

    // Charger la config si présente
    if (data.config) {
      this._userConfig = {
        customTags: data.config.customTags || [],
        projectRules: data.config.projectRules || [],
        blacklist: data.config.blacklist || []
      };
    }

    this._extractMetadata();
    this._hasUnsavedChanges = false;
    this._notify('tasks');
    this._notify('userConfig');
    this._notify('unsavedChanges');
  }

  // ========================================
  // Édition de tickets
  // ========================================

  /**
   * Met à jour les labels d'un ticket
   */
  updateTaskLabels(key, labels) {
    const task = this._tasks.find(t => t.key === key);
    if (task) {
      task.labels = [...labels];
      this._extractMetadata();
      this._hasUnsavedChanges = true;
      this._notify('tasks');
      this._notify('unsavedChanges');
      return true;
    }
    return false;
  }

  /**
   * Ajoute un label à un ticket
   */
  addLabelToTask(key, label) {
    const task = this._tasks.find(t => t.key === key);
    if (task) {
      if (!task.labels) task.labels = [];
      if (!task.labels.includes(label)) {
        task.labels.push(label);
        this._extractMetadata();
        this._hasUnsavedChanges = true;
        this._notify('tasks');
        this._notify('unsavedChanges');
        return true;
      }
    }
    return false;
  }

  /**
   * Supprime un label d'un ticket
   */
  removeLabelFromTask(key, label) {
    const task = this._tasks.find(t => t.key === key);
    if (task && task.labels) {
      const index = task.labels.indexOf(label);
      if (index !== -1) {
        task.labels.splice(index, 1);
        this._extractMetadata();
        this._hasUnsavedChanges = true;
        this._notify('tasks');
        this._notify('unsavedChanges');
        return true;
      }
    }
    return false;
  }

  /**
   * Met à jour la date d'échéance d'un ticket
   */
  updateTaskDueDate(key, dueDate) {
    const task = this._tasks.find(t => t.key === key);
    if (task) {
      task.dueDate = dueDate ? new Date(dueDate).toISOString() : null;
      this._hasUnsavedChanges = true;
      this._notify('tasks');
      this._notify('unsavedChanges');
      return true;
    }
    return false;
  }

  /**
   * Réinitialise l'état
   */
  reset() {
    this._tasks = [];
    this._projects.clear();
    this._people.clear();
    this._tags.clear();
    this._currentFileHandle = null;
    this._hasUnsavedChanges = false;
    this.resetFilters();
    this._notify('tasks');
    this._notify('fileHandle');
    this._notify('unsavedChanges');
  }
}

// Export singleton
export const State = new AppState();
