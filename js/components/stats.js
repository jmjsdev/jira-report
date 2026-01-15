/**
 * Composant Stats - Barre d'outils et statistiques
 */

import { State } from '../state.js';
import { $, setHtml, delegate } from '../utils/dom.js';

class StatsComponent {
  constructor() {
    this._element = null;
    this._unsubscribers = [];
  }

  /**
   * Initialise le composant
   * @param {string} selector - Sélecteur du conteneur
   */
  init(selector) {
    this._element = $(selector);
    if (!this._element) {
      console.error('Stats container not found:', selector);
      return;
    }

    this.render();
    this._attachEventListeners();
    this._subscribeToState();
  }

  /**
   * Rend la barre
   */
  render() {
    const stats = State.getStats();
    const viewMode = State.viewMode;

    setHtml(this._element, `
      <div class="toolbar-group">
        <span class="toolbar-group-title">Statistiques</span>
        <div class="toolbar-group-content">
          <span class="toolbar-info"><strong>${stats.totalTasks}</strong> tâches</span>
          <span class="toolbar-info"><strong>${stats.totalProjects}</strong> projets</span>
        </div>
      </div>

      <span class="toolbar-sep"></span>

      <div class="toolbar-group">
        <span class="toolbar-group-title">Fichier</span>
        <div class="toolbar-group-content">
          <button id="btn-open" class="toolbar-btn" title="Ouvrir (Ctrl+O)">
            <span class="btn-icon">📂</span><span class="btn-label">Ouvrir</span>
          </button>
          <button id="btn-save" class="toolbar-btn toolbar-btn-primary" title="Sauvegarder (Ctrl+S)">
            <span class="btn-icon">💾</span><span class="btn-label">Sauver</span>
          </button>
          <button id="btn-import-xml" class="toolbar-btn" title="Import XML (Ctrl+I)">
            <span class="btn-icon">📥</span><span class="btn-label">Import</span>
          </button>
          <button id="btn-backup" class="toolbar-btn" title="Télécharger backup">
            <span class="btn-icon">⬇️</span><span class="btn-label">Backup</span>
          </button>
          <button id="btn-clear" class="toolbar-btn toolbar-btn-danger" title="Effacer tous les tickets">
            <span class="btn-icon">🗑️</span><span class="btn-label">Clear</span>
          </button>
        </div>
      </div>

      <span class="toolbar-sep"></span>

      <div class="toolbar-group">
        <span class="toolbar-group-title">Affichage</span>
        <div class="toolbar-group-content">
          <button id="view-by-project" class="toolbar-btn toolbar-btn-toggle ${viewMode === 'project' ? 'active' : ''}" title="Vue par projet">
            <span class="btn-icon">📁</span><span class="btn-label">Projet</span>
          </button>
          <button id="view-by-date" class="toolbar-btn toolbar-btn-toggle ${viewMode === 'date' ? 'active' : ''}" title="Vue par date">
            <span class="btn-icon">📅</span><span class="btn-label">Date</span>
          </button>
        </div>
      </div>

      <span class="toolbar-sep"></span>

      <div class="toolbar-group">
        <span class="toolbar-group-title">Rapport</span>
        <div class="toolbar-group-content">
          <button id="btn-report-text" class="toolbar-btn" title="Rapport texte">
            <span class="btn-icon">📝</span><span class="btn-label">Texte</span>
          </button>
          <button id="btn-report-html" class="toolbar-btn" title="Rapport HTML">
            <span class="btn-icon">🌐</span><span class="btn-label">HTML</span>
          </button>
        </div>
      </div>

      <span class="toolbar-spacer"></span>

      <button id="btn-config" class="toolbar-btn" title="Configuration (Ctrl+,)">
        <span class="btn-icon">⚙️</span><span class="btn-label">Config</span>
      </button>
    `);
  }

  /**
   * Attache les écouteurs d'événements
   */
  _attachEventListeners() {
    // Boutons d'action
    delegate(this._element, 'click', '#btn-open', () => {
      document.dispatchEvent(new CustomEvent('app:open'));
    });
    delegate(this._element, 'click', '#btn-save', () => {
      document.dispatchEvent(new CustomEvent('app:save'));
    });
    delegate(this._element, 'click', '#btn-import-xml', () => {
      document.dispatchEvent(new CustomEvent('app:import-xml'));
    });
    delegate(this._element, 'click', '#btn-backup', () => {
      document.dispatchEvent(new CustomEvent('app:backup'));
    });
    delegate(this._element, 'click', '#btn-clear', () => {
      document.dispatchEvent(new CustomEvent('app:clear'));
    });
    delegate(this._element, 'click', '#btn-report-text', () => {
      document.dispatchEvent(new CustomEvent('app:report-text'));
    });
    delegate(this._element, 'click', '#btn-report-html', () => {
      document.dispatchEvent(new CustomEvent('app:report-html'));
    });
    delegate(this._element, 'click', '#btn-config', () => {
      document.dispatchEvent(new CustomEvent('app:config'));
    });

    // Boutons de vue
    delegate(this._element, 'click', '#view-by-project', () => {
      State.setViewMode('project');
      this._updateViewModeButtons();
    });
    delegate(this._element, 'click', '#view-by-date', () => {
      State.setViewMode('date');
      this._updateViewModeButtons();
    });
  }

  /**
   * Met à jour les boutons de vue
   */
  _updateViewModeButtons() {
    const projectBtn = $('#view-by-project', this._element);
    const dateBtn = $('#view-by-date', this._element);
    const viewMode = State.viewMode;

    projectBtn?.classList.toggle('active', viewMode === 'project');
    dateBtn?.classList.toggle('active', viewMode === 'date');
  }

  /**
   * S'abonne aux changements d'état
   */
  _subscribeToState() {
    const unsubTasks = State.subscribe('tasks', () => this.render());
    const unsubFilters = State.subscribe('filters', () => this.render());

    this._unsubscribers.push(unsubTasks, unsubFilters);
  }

  /**
   * Nettoie le composant
   */
  destroy() {
    this._unsubscribers.forEach(unsub => unsub());
    this._unsubscribers = [];
  }
}

export const Stats = new StatsComponent();
