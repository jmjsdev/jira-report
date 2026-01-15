/**
 * Composant Stats - Affichage des statistiques
 */

import { State } from '../state.js';
import { $, setHtml } from '../utils/dom.js';
import { formatDateTime } from '../utils/date.js';

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
    this._subscribeToState();
  }

  /**
   * Rend les statistiques
   */
  render() {
    const stats = State.getStats();
    const now = new Date();

    setHtml(this._element, `
      <div class="stat-item">
        <div class="stat-value" id="total-tasks">${stats.totalTasks}</div>
        <div class="stat-label">Tâches</div>
      </div>
      <div class="stat-item">
        <div class="stat-value" id="total-projects">${stats.totalProjects}</div>
        <div class="stat-label">Projets</div>
      </div>
      <div class="stat-item">
        <div class="stat-value" id="generated-date">${now.toLocaleDateString('fr-FR')}</div>
        <div class="stat-label">Date</div>
      </div>
      <div class="stat-item">
        <div class="stat-value" id="generated-time">${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
        <div class="stat-label">Heure</div>
      </div>
    `);
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
