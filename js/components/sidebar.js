/**
 * Composant Sidebar - Filtres et actions
 */

import { State } from '../state.js';
import { $, $$, setHtml, addClass, removeClass, delegate, debounce } from '../utils/dom.js';

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
    this._attachEventListeners();
    this._subscribeToState();
  }

  /**
   * Rend le composant
   */
  render() {
    const projectCounts = State.getProjectCounts();
    const { counts: peopleCounts, noPersonCount } = State.getPeopleCounts();
    const tagCounts = State.getTagCounts();
    const totalTasks = State.tasks.length;

    // Compter les tâches avec label "done"
    const doneLabelsCount = tagCounts.get('done') || 0;

    setHtml(this._element, `
      <h2 class="sidebar-title">Filtres</h2>

      <!-- Boutons d'action fichiers -->
      <div class="file-actions">
        <button id="btn-open" class="action-btn action-btn-secondary" title="Ouvrir un projet (Ctrl+O)">
          <span class="btn-icon">📂</span> Ouvrir
        </button>
        <button id="btn-save" class="action-btn action-btn-primary" title="Sauvegarder (Ctrl+S)">
          <span class="btn-icon">💾</span> Sauvegarder
        </button>
      </div>

      <div class="file-actions">
        <button id="btn-import-xml" class="action-btn action-btn-import" title="Importer un fichier XML JIRA">
          <span class="btn-icon">📥</span> Import XML
        </button>
        <button id="btn-backup" class="action-btn action-btn-secondary" title="Télécharger un backup">
          <span class="btn-icon">⬇️</span> Backup
        </button>
      </div>

      <div class="file-actions">
        <button id="btn-config" class="action-btn action-btn-secondary" title="Configuration (Ctrl+,)">
          <span class="btn-icon">⚙️</span> Configuration
        </button>
      </div>

      <!-- Boutons rapport -->
      <div class="report-buttons-container">
        <button id="btn-report-text" class="generate-report-btn">📝 Texte</button>
        <button id="btn-report-html" class="generate-html-report-btn">🌐 HTML</button>
      </div>

      <!-- Reset -->
      <button id="btn-reset-filters" class="reset-filters-btn">🔄 Réinitialiser les filtres</button>

      <!-- Recherche -->
      <div class="filter-group search-filter-group">
        <h3>Recherche</h3>
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" id="search-input" placeholder="Rechercher..." autocomplete="off">
          <button id="clear-search" class="clear-search-btn hidden">✕</button>
        </div>
        <div id="search-results-count" class="search-results-count hidden"></div>
      </div>

      <!-- Statut -->
      <div class="filter-group">
        <h3>Statut</h3>
        <div class="task-labels">
          <button class="filter-btn ${State.filters.showDone ? 'active' : ''}" data-filter="show-done">
            Afficher terminées <span class="tag-count">✓</span>
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

    this._searchInput = $('#search-input', this._element);

    // Restaurer la valeur de recherche si présente
    if (State.filters.search) {
      this._searchInput.value = State.filters.search;
      $('#clear-search', this._element).classList.remove('hidden');
    }
  }

  /**
   * Génère le HTML des filtres de projets
   */
  _renderProjectFilters(projectCounts) {
    return Array.from(projectCounts.entries())
      .filter(([, count]) => count > 0)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([project, count]) => `
        <button class="filter-btn ${State.filters.project === project ? 'active' : ''}"
                data-filter="${project}">
          ${project} <span class="tag-count">${count}</span>
        </button>
      `).join('');
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
   * Attache les écouteurs d'événements
   */
  _attachEventListeners() {
    // Délégation d'événements pour les boutons de filtre
    delegate(this._element, 'click', '.filter-btn', (e, btn) => {
      this._handleFilterClick(btn);
    });

    // Recherche
    const searchInput = $('#search-input', this._element);
    if (searchInput) {
      searchInput.addEventListener('input', debounce((e) => {
        this._handleSearch(e.target.value);
      }, 300));

      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this._clearSearch();
        }
      });
    }

    // Clear search
    const clearBtn = $('#clear-search', this._element);
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this._clearSearch());
    }

    // Reset filters
    const resetBtn = $('#btn-reset-filters', this._element);
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        State.resetFilters();
        this.render();
      });
    }

    // Boutons d'action - dispatch des événements personnalisés
    this._attachActionButton('btn-open', 'app:open');
    this._attachActionButton('btn-save', 'app:save');
    this._attachActionButton('btn-import-xml', 'app:import-xml');
    this._attachActionButton('btn-backup', 'app:backup');
    this._attachActionButton('btn-report-text', 'app:report-text');
    this._attachActionButton('btn-report-html', 'app:report-html');
    this._attachActionButton('btn-config', 'app:config');
  }

  /**
   * Attache un bouton à un événement personnalisé
   */
  _attachActionButton(id, eventName) {
    const btn = $(`#${id}`, this._element);
    if (btn) {
      btn.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent(eventName));
      });
    }
  }

  /**
   * Gère le clic sur un bouton de filtre
   */
  _handleFilterClick(btn) {
    const filterValue = btn.dataset.filter;
    const filterGroup = btn.closest('.filter-group');
    const groupTitle = filterGroup?.querySelector('h3')?.textContent.trim();

    switch (groupTitle) {
      case 'Statut':
        this._handleStatusFilter(btn, filterValue);
        break;
      case 'Projets':
        this._handleProjectFilter(btn, filterValue, filterGroup);
        break;
      case 'Rapporteurs':
        this._handlePeopleFilter(btn, filterValue, filterGroup);
        break;
      case 'Tags':
        this._handleTagFilter(btn, filterValue, filterGroup);
        break;
    }
  }

  /**
   * Gère le filtre de statut
   */
  _handleStatusFilter(btn, filterValue) {
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
      this._attachEventListeners();
    });
    this._unsubscribers.push(unsubTasks);
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
