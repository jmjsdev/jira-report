/**
 * Composant Sidebar - Filtres et actions
 */

import { State } from '../state.js';
import { UserConfig } from '../services/user-config.js';
import { $, $$, setHtml, addClass, removeClass, delegate, debounce } from '../utils/dom.js';
import { icon } from '../utils/icons.js';

class SidebarComponent {
  constructor() {
    this._element = null;
    this._searchInput = null;
    this._unsubscribers = [];
  }

  /**
   * Initialise le composant
   * @param {string} selector - Sélecteur du conteneur
   */
  init(selector) {
    this._element = $(selector);
    if (!this._element) {
      console.error('Sidebar container not found:', selector);
      return;
    }

    this.render();
    this._attachDelegatedListeners();
    this._attachButtonListeners();
    this._subscribeToState();
  }

  /**
   * Rend le composant
   */
  render() {
    const projectCounts = State.getProjectCounts();
    const { counts: peopleCounts, noPersonCount } = State.getPeopleCounts();
    const tagCounts = State.getTagCounts();
    const statusCounts = State.getStatusCounts();
    const totalTasks = State.tasks.length;

    // Compter les tâches avec label "done"
    const doneLabelsCount = tagCounts.get('done') || 0;

    setHtml(this._element, `
      <h2 class="sidebar-title">Filtres</h2>

      <!-- Reset -->
      <button id="btn-reset-filters" class="reset-filters-btn">Réinitialiser</button>

      <!-- Recherche -->
      <div class="filter-group search-filter-group">
        <h3>Recherche</h3>
        <div class="search-box">
          <span class="search-icon">${icon('search')}</span>
          <input type="text" id="search-input" placeholder="Rechercher..." autocomplete="off">
          <button id="clear-search" class="clear-search-btn hidden">${icon('x')}</button>
        </div>
        <div id="search-results-count" class="search-results-count hidden"></div>
      </div>

      <!-- Statut -->
      <div class="filter-group" data-filter-type="status">
        <h3>Statut</h3>
        <div class="task-labels">
          ${this._renderStatusFilters(statusCounts)}
        </div>
      </div>

      <!-- Options -->
      <div class="filter-group" data-filter-type="options">
        <h3>Options</h3>
        <div class="task-labels">
          <button class="filter-btn ${State.filters.showDone ? 'active' : ''}" data-filter="show-done">
            Afficher terminées <span class="tag-count">${icon('check')}</span>
          </button>
          ${doneLabelsCount > 0 ? `
            <button class="filter-btn ${State.filters.showLabelDone ? 'active' : ''}" data-filter="label-done">
              Afficher label done <span class="tag-count">${doneLabelsCount}</span>
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Projets -->
      <div class="filter-group" data-filter-type="projects">
        <h3>Projets</h3>
        <div class="task-labels">
          <button class="filter-btn ${State.filters.project === 'all' ? 'active' : ''}" data-filter="all">
            Tous <span class="tag-count">${totalTasks}</span>
          </button>
          ${this._renderProjectFilters(projectCounts)}
        </div>
      </div>

      <!-- Rapporteurs -->
      <div class="filter-group" data-filter-type="people">
        <h3>Rapporteurs</h3>
        <div class="task-labels">
          ${this._renderPeopleFilters(peopleCounts, noPersonCount)}
        </div>
      </div>

      <!-- Tags -->
      <div class="filter-group" data-filter-type="tags">
        <h3>Tags</h3>
        <div class="task-labels">
          ${this._renderTagFilters(tagCounts)}
        </div>
      </div>
    `);
  }

  /**
   * Génère le HTML des filtres de projets
   * N'affiche que les projets déclarés dans la config
   */
  _renderProjectFilters(projectCounts) {
    const declaredProjects = UserConfig.projectRules;

    // Si aucun projet déclaré, ne rien afficher
    if (declaredProjects.length === 0) {
      return '<span class="no-filters">Aucun projet déclaré</span>';
    }

    return declaredProjects
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(rule => {
        const projectName = rule.name.toLowerCase();
        const count = projectCounts.get(projectName) || 0;
        return `
          <button class="filter-btn ${State.filters.project === projectName ? 'active' : ''}"
                  data-filter="${projectName}">
            ${rule.name} <span class="tag-count">${count}</span>
          </button>
        `;
      }).join('');
  }

  /**
   * Génère le HTML des filtres de personnes
   */
  _renderPeopleFilters(peopleCounts, noPersonCount) {
    let html = Array.from(peopleCounts.entries())
      .filter(([, count]) => count > 0)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([person, count]) => `
        <button class="filter-btn ${State.filters.person === person ? 'active' : ''}"
                data-filter="${person}">
          ${person} <span class="tag-count">${count}</span>
        </button>
      `).join('');

    if (noPersonCount > 0) {
      html += `
        <button class="filter-btn ${State.filters.person === 'nopeople' ? 'active' : ''}"
                data-filter="nopeople">
          Sans rapporteur <span class="tag-count">${noPersonCount}</span>
        </button>
      `;
    }

    return html;
  }

  /**
   * Génère le HTML des filtres de tags
   */
  _renderTagFilters(tagCounts) {
    return Array.from(tagCounts.entries())
      .filter(([tag]) => tag.toLowerCase() !== 'done')
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([tag, count]) => `
        <button class="filter-btn ${State.filters.tag === tag.toLowerCase() ? 'active' : ''}"
                data-filter="${tag.toLowerCase()}">
          ${tag} <span class="tag-count">${count}</span>
        </button>
      `).join('');
  }

  /**
   * Génère le HTML des filtres de statut
   */
  _renderStatusFilters(statusCounts) {
    const statusLabels = {
      'backlog': 'Backlog',
      'inprogress': 'En cours',
      'review': 'En revue',
      'ready': 'Prêt',
      'delivered': 'Livré',
      'done': 'Terminé'
    };

    const statusOrder = ['backlog', 'inprogress', 'review', 'ready', 'delivered', 'done'];

    return statusOrder
      .filter(key => statusCounts.get(key) > 0)
      .map(key => {
        const count = statusCounts.get(key) || 0;
        const label = statusLabels[key] || key;
        return `
          <button class="filter-btn ${State.filters.status === key ? 'active' : ''}"
                  data-filter="${key}">
            ${label} <span class="tag-count">${count}</span>
          </button>
        `;
      }).join('');
  }

  /**
   * Attache les écouteurs délégués (une seule fois)
   * Ces listeners utilisent la délégation d'événements et ne doivent pas être dupliqués
   */
  _attachDelegatedListeners() {
    // Délégation d'événements pour les boutons de filtre
    delegate(this._element, 'click', '.filter-btn', (e, btn) => {
      this._handleFilterClick(btn);
    });

    // Délégation pour la recherche (input)
    delegate(this._element, 'input', '#search-input', debounce((e) => {
      this._handleSearch(e.target.value);
    }, 300));

    // Délégation pour escape dans la recherche
    delegate(this._element, 'keydown', '#search-input', (e) => {
      if (e.key === 'Escape') {
        this._clearSearch();
      }
    });

    // Délégation pour clear search
    delegate(this._element, 'click', '#clear-search', () => this._clearSearch());

    // Délégation pour reset filters
    delegate(this._element, 'click', '#btn-reset-filters', () => {
      State.resetFilters();
      this.render();
    });
  }

  /**
   * Attache les écouteurs sur les boutons (après chaque render si nécessaire)
   */
  _attachButtonListeners() {
    this._searchInput = $('#search-input', this._element);

    // Restaurer la valeur de recherche si présente
    if (State.filters.search && this._searchInput) {
      this._searchInput.value = State.filters.search;
      $('#clear-search', this._element)?.classList.remove('hidden');
    }
  }

  /**
   * Gère le clic sur un bouton de filtre
   */
  _handleFilterClick(btn) {
    const filterValue = btn.dataset.filter;
    const filterGroup = btn.closest('.filter-group');
    const filterType = filterGroup?.dataset.filterType;

    switch (filterType) {
      case 'status':
        this._handleStatusFilter(btn, filterValue, filterGroup);
        break;
      case 'options':
        this._handleOptionsFilter(btn, filterValue);
        break;
      case 'projects':
        this._handleProjectFilter(btn, filterValue, filterGroup);
        break;
      case 'people':
        this._handlePeopleFilter(btn, filterValue, filterGroup);
        break;
      case 'tags':
        this._handleTagFilter(btn, filterValue, filterGroup);
        break;
    }
  }

  /**
   * Gère le filtre de statut
   */
  _handleStatusFilter(btn, filterValue, filterGroup) {
    if (btn.classList.contains('active')) {
      removeClass(btn, 'active');
      State.setFilter('status', null);
    } else {
      $$('.filter-btn', filterGroup).forEach(b => removeClass(b, 'active'));
      addClass(btn, 'active');
      State.setFilter('status', filterValue);
    }
  }

  /**
   * Gère les options (showDone, showLabelDone)
   */
  _handleOptionsFilter(btn, filterValue) {
    if (filterValue === 'show-done') {
      const newValue = !State.filters.showDone;
      State.setFilter('showDone', newValue);
      btn.classList.toggle('active', newValue);
    } else if (filterValue === 'label-done') {
      const newValue = !State.filters.showLabelDone;
      State.setFilter('showLabelDone', newValue);
      btn.classList.toggle('active', newValue);
    }
  }

  /**
   * Gère le filtre de projet
   */
  _handleProjectFilter(btn, filterValue, filterGroup) {
    $$('.filter-btn', filterGroup).forEach(b => removeClass(b, 'active'));
    addClass(btn, 'active');
    State.setFilter('project', filterValue);
  }

  /**
   * Gère le filtre de personne
   */
  _handlePeopleFilter(btn, filterValue, filterGroup) {
    if (btn.classList.contains('active')) {
      removeClass(btn, 'active');
      State.setFilter('person', null);
    } else {
      $$('.filter-btn', filterGroup).forEach(b => removeClass(b, 'active'));
      addClass(btn, 'active');
      State.setFilter('person', filterValue);
    }
  }

  /**
   * Gère le filtre de tag
   */
  _handleTagFilter(btn, filterValue, filterGroup) {
    if (btn.classList.contains('active')) {
      removeClass(btn, 'active');
      State.setFilter('tag', null);
    } else {
      $$('.filter-btn', filterGroup).forEach(b => removeClass(b, 'active'));
      addClass(btn, 'active');
      State.setFilter('tag', filterValue);
    }
  }

  /**
   * Gère la recherche
   */
  _handleSearch(value) {
    const query = value.trim().toLowerCase();
    State.setFilter('search', query);

    const clearBtn = $('#clear-search', this._element);
    const resultsCount = $('#search-results-count', this._element);

    if (query) {
      clearBtn?.classList.remove('hidden');
      const count = State.getFilteredTasks().length;
      if (resultsCount) {
        resultsCount.textContent = `${count} résultat${count > 1 ? 's' : ''} pour "${value}"`;
        resultsCount.classList.remove('hidden');
      }
    } else {
      clearBtn?.classList.add('hidden');
      resultsCount?.classList.add('hidden');
    }
  }

  /**
   * Efface la recherche
   */
  _clearSearch() {
    if (this._searchInput) {
      this._searchInput.value = '';
    }
    State.setFilter('search', '');
    $('#clear-search', this._element)?.classList.add('hidden');
    $('#search-results-count', this._element)?.classList.add('hidden');
  }

  /**
   * S'abonne aux changements d'état
   */
  _subscribeToState() {
    // Re-render quand les tâches changent
    const unsubTasks = State.subscribe('tasks', () => {
      this.render();
      this._attachButtonListeners();
    });
    this._unsubscribers.push(unsubTasks);

    // Re-render quand la config utilisateur change (projets, blacklist, etc.)
    const unsubConfig = State.subscribe('userConfig', () => {
      this.render();
      this._attachButtonListeners();
    });
    this._unsubscribers.push(unsubConfig);
  }

  /**
   * Met à jour l'affichage du nombre de résultats
   */
  updateResultsCount() {
    const resultsCount = $('#search-results-count', this._element);
    if (resultsCount && State.filters.search) {
      const count = State.getFilteredTasks().length;
      resultsCount.textContent = `${count} résultat${count > 1 ? 's' : ''} pour "${State.filters.search}"`;
    }
  }

  /**
   * Nettoie le composant
   */
  destroy() {
    this._unsubscribers.forEach(unsub => unsub());
    this._unsubscribers = [];
  }
}

export const Sidebar = new SidebarComponent();
