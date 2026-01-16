/**
 * Composant Stats - Barre d'outils et statistiques
 */

import { State } from '../state.js';
import { $, setHtml, delegate } from '../utils/dom.js';
import { Templates } from '../utils/templates.js';

class StatsComponent {
  constructor() {
    this._element = null;
    this._unsubscribers = [];
    this._template = null;
  }

  /**
   * Initialise le composant
   * @param {string} selector - Sélecteur du conteneur
   */
  async init(selector) {
    this._element = $(selector);
    if (!this._element) {
      console.error('Stats container not found:', selector);
      return;
    }

    // Charger le template
    this._template = await Templates.load('components/toolbar');

    this.render();
    this._attachEventListeners();
    this._subscribeToState();
  }

  /**
   * Rend la barre
   */
  render() {
    if (!this._template) return;

    const stats = State.getStats();
    const html = Templates.interpolate(this._template, {
      totalTasks: stats.totalTasks,
      totalProjects: stats.totalProjects
    });

    setHtml(this._element, html);
    this._updateViewModeButtons();
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
    delegate(this._element, 'click', '#btn-save-as', () => {
      document.dispatchEvent(new CustomEvent('app:save-as'));
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
