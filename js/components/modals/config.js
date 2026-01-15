/**
 * Composant Modal Configuration
 * Gestion des tags, projets et blacklist
 */

import { UserConfig } from '../../services/user-config.js';
import { Storage } from '../../services/storage.js';
import { State } from '../../state.js';
import { $, $$, setHtml, addClass, removeClass, escapeAttr } from '../../utils/dom.js';

class ConfigModalComponent {
  constructor() {
    this._element = null;
    this._isOpen = false;
    this._activeTab = 'tags';
  }

  /**
   * Initialise le composant
   * @param {string} selector - Sélecteur du conteneur modal
   */
  init(selector) {
    this._element = $(selector);
    if (!this._element) {
      console.error('Config modal container not found:', selector);
      return;
    }

    this._render();
    this._attachEventListeners();

    // S'abonner aux changements de config
    UserConfig.subscribe(() => this._refreshContent());
  }

  /**
   * Rend la structure de la modal
   */
  _render() {
    setHtml(this._element, `
      <div class="modal-content modal-content-large">
        <div class="modal-header">
          <h2>⚙️ Configuration</h2>
          <button id="close-config-modal" class="close-modal-btn">✕</button>
        </div>

        <div class="config-tabs">
          <button class="config-tab active" data-tab="tags">🏷️ Tags</button>
          <button class="config-tab" data-tab="projects">📁 Projets</button>
          <button class="config-tab" data-tab="blacklist">🚫 Blacklist</button>
        </div>

        <div class="modal-body">
          <!-- Onglet Tags -->
          <div id="tab-tags" class="config-tab-content active">
            <div class="config-section">
              <h3>Tags personnalisés</h3>
              <p class="config-hint">Ajoutez des tags qui apparaîtront dans les filtres même s'ils ne sont pas dans les tickets.</p>

              <div class="config-add-form">
                <input type="text" id="new-tag-input" placeholder="Nom du tag..." class="config-input">
                <button id="btn-add-tag" class="config-add-btn">+ Ajouter</button>
              </div>

              <div id="tag-suggestions" class="config-suggestions"></div>

              <div id="custom-tags-list" class="config-items-list"></div>
            </div>
          </div>

          <!-- Onglet Projets -->
          <div id="tab-projects" class="config-tab-content">
            <div class="config-section">
              <h3>Règles de détection de projet</h3>
              <p class="config-hint">Définissez des mots-clés pour détecter automatiquement le projet d'un ticket depuis son titre.</p>

              <div class="config-add-form">
                <input type="text" id="new-project-name" placeholder="Nom du projet..." class="config-input" style="width: 150px;">
                <input type="text" id="new-project-pattern" placeholder="Mot-clé (dans le titre)..." class="config-input">
                <button id="btn-add-project-rule" class="config-add-btn">+ Ajouter</button>
              </div>

              <div id="project-suggestions" class="config-suggestions"></div>

              <div id="project-rules-list" class="config-items-list"></div>
            </div>
          </div>

          <!-- Onglet Blacklist -->
          <div id="tab-blacklist" class="config-tab-content">
            <div class="config-section">
              <h3>Tickets ignorés</h3>
              <p class="config-hint">Les tickets dans cette liste seront exclus de l'affichage.</p>

              <div class="config-add-form">
                <input type="text" id="new-blacklist-key" placeholder="Clé JIRA (ex: PROJ-123)..." class="config-input">
                <button id="btn-add-blacklist" class="config-add-btn">+ Ajouter</button>
              </div>

              <div id="blacklist-items" class="config-items-list"></div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <div class="config-footer-left">
            <button id="btn-refresh-detection" class="config-refresh-btn">🔄 Appliquer aux tickets</button>
            <span id="refresh-status" class="config-refresh-status"></span>
          </div>
          <div class="config-footer-right">
            <button id="btn-import-config" class="config-io-btn">📥 Importer</button>
            <button id="btn-export-config" class="config-io-btn">📤 Exporter</button>
          </div>
        </div>
      </div>
    `);

    this._refreshContent();
  }

  /**
   * Rafraîchit le contenu des onglets
   */
  _refreshContent() {
    this._renderTagSuggestions();
    this._renderTagsList();
    this._renderProjectSuggestions();
    this._renderProjectRules();
    this._renderBlacklist();
  }

  /**
   * Rend la liste des tags personnalisés
   */
  _renderTagsList() {
    const container = $('#custom-tags-list', this._element);
    if (!container) return;

    const tags = UserConfig.customTags;

    if (tags.length === 0) {
      setHtml(container, '<p class="config-empty">Aucun tag personnalisé</p>');
      return;
    }

    setHtml(container, tags.map(tag => `
      <div class="config-item">
        <span class="config-item-label">🏷️ ${escapeAttr(tag)}</span>
        <button class="config-item-remove" data-action="remove-tag" data-value="${escapeAttr(tag)}">✕</button>
      </div>
    `).join(''));
  }

  /**
   * Extrait les suggestions de tags depuis les tickets
   */
  _extractTagSuggestions() {
    const suggestions = new Map(); // name -> { count, source }
    const existingTags = new Set(UserConfig.customTags.map(t => t.toLowerCase()));
    const existingLabels = new Set();

    // Collecter les labels existants dans les tickets
    State.tasks.forEach(task => {
      if (task.labels) {
        task.labels.forEach(l => existingLabels.add(l.toLowerCase()));
      }
    });

    // Suggestions basées sur les statuts
    const statuses = new Map();
    State.tasks.forEach(task => {
      if (task.status) {
        const status = task.status;
        statuses.set(status, (statuses.get(status) || 0) + 1);
      }
    });
    statuses.forEach((count, status) => {
      const lower = status.toLowerCase();
      if (!existingTags.has(lower) && !existingLabels.has(lower)) {
        suggestions.set(status, { count, source: 'status' });
      }
    });

    // Suggestions basées sur les projets
    const projects = new Map();
    State.tasks.forEach(task => {
      if (task.project) {
        const project = task.project;
        projects.set(project, (projects.get(project) || 0) + 1);
      }
    });
    projects.forEach((count, project) => {
      const lower = project.toLowerCase();
      if (!existingTags.has(lower) && !existingLabels.has(lower)) {
        suggestions.set(project, { count, source: 'project' });
      }
    });

    // Suggestions basées sur les composants
    const components = new Map();
    State.tasks.forEach(task => {
      if (task.components && Array.isArray(task.components)) {
        task.components.forEach(comp => {
          components.set(comp, (components.get(comp) || 0) + 1);
        });
      }
    });
    components.forEach((count, comp) => {
      const lower = comp.toLowerCase();
      if (!existingTags.has(lower) && !existingLabels.has(lower) && !suggestions.has(comp)) {
        suggestions.set(comp, { count, source: 'component' });
      }
    });

    // Suggestions basées sur les types de ticket
    const types = new Map();
    State.tasks.forEach(task => {
      if (task.type) {
        types.set(task.type, (types.get(task.type) || 0) + 1);
      }
    });
    types.forEach((count, type) => {
      const lower = type.toLowerCase();
      if (!existingTags.has(lower) && !existingLabels.has(lower) && !suggestions.has(type)) {
        suggestions.set(type, { count, source: 'type' });
      }
    });

    // Suggestions basées sur les priorités
    const priorities = new Map();
    State.tasks.forEach(task => {
      if (task.priority) {
        priorities.set(task.priority, (priorities.get(task.priority) || 0) + 1);
      }
    });
    priorities.forEach((count, priority) => {
      const lower = priority.toLowerCase();
      if (!existingTags.has(lower) && !existingLabels.has(lower) && !suggestions.has(priority)) {
        suggestions.set(priority, { count, source: 'priority' });
      }
    });

    // Trier par fréquence
    return Array.from(suggestions.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 20);
  }

  /**
   * Rend les suggestions de tags
   */
  _renderTagSuggestions() {
    const container = $('#tag-suggestions', this._element);
    if (!container) return;

    const suggestions = this._extractTagSuggestions();

    if (suggestions.length === 0) {
      setHtml(container, '');
      return;
    }

    const sourceIcons = {
      status: '📊',
      project: '📁',
      component: '🧩',
      type: '📋',
      priority: '⚡'
    };

    setHtml(container, `
      <div class="config-suggestions-box">
        <span class="config-suggestions-hint">💡 Suggestions (clic = ajouter) :</span>
        <div class="config-suggestions-list">
          ${suggestions.map(([name, { count, source }]) => `
            <button class="config-suggestion config-tag-suggestion" data-tag-suggestion="${escapeAttr(name)}" title="${source}">
              ${sourceIcons[source] || '🏷️'} ${escapeAttr(name)} <span class="suggestion-count">${count}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `);
  }

  /**
   * Extrait les suggestions de noms de projets depuis les titres des tickets
   */
  _extractProjectSuggestions() {
    const suggestions = new Map(); // name -> count
    const existingProjects = new Set(UserConfig.projectRules.map(r => r.name.toLowerCase()));
    const existingPatterns = new Set();
    UserConfig.projectRules.forEach(r => r.patterns.forEach(p => existingPatterns.add(p.toLowerCase())));

    State.tasks.forEach(task => {
      const title = task.summary || '';

      // Extraire les mots entre crochets [...]
      const bracketMatches = title.match(/\[([^\]]+)\]/g);
      if (bracketMatches) {
        bracketMatches.forEach(match => {
          const name = match.slice(1, -1).trim();
          if (name && !existingProjects.has(name.toLowerCase()) && !existingPatterns.has(name.toLowerCase())) {
            suggestions.set(name, (suggestions.get(name) || 0) + 1);
          }
        });
      }

      // Extraire les mots en MAJUSCULES de 2+ caractères (potentiels acronymes de projet)
      const acronymMatches = title.match(/\b[A-Z]{2,}(?:\d+)?\b/g);
      if (acronymMatches) {
        acronymMatches.forEach(name => {
          // Ignorer les mots courants en majuscules
          const ignore = ['API', 'URL', 'HTTP', 'HTTPS', 'JSON', 'XML', 'HTML', 'CSS', 'SQL', 'PHP', 'TODO', 'FIXME', 'BUG', 'WIP'];
          if (!ignore.includes(name) && !existingProjects.has(name.toLowerCase()) && !existingPatterns.has(name.toLowerCase())) {
            suggestions.set(name, (suggestions.get(name) || 0) + 1);
          }
        });
      }
    });

    // Trier par fréquence
    return Array.from(suggestions.entries())
      .filter(([, count]) => count >= 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
  }

  /**
   * Rend les suggestions de projets
   */
  _renderProjectSuggestions() {
    const container = $('#project-suggestions', this._element);
    if (!container) return;

    const suggestions = this._extractProjectSuggestions();

    if (suggestions.length === 0) {
      setHtml(container, '');
      return;
    }

    setHtml(container, `
      <div class="config-suggestions-box">
        <span class="config-suggestions-hint">💡 Suggestions depuis les titres (clic = ajouter) :</span>
        <div class="config-suggestions-list">
          ${suggestions.map(([name, count]) => `
            <button class="config-suggestion" data-suggestion="${escapeAttr(name)}">
              ${escapeAttr(name)} <span class="suggestion-count">${count}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `);
  }

  /**
   * Rend la liste des règles de projet
   */
  _renderProjectRules() {
    const container = $('#project-rules-list', this._element);
    if (!container) return;

    const rules = UserConfig.projectRules;

    if (rules.length === 0) {
      setHtml(container, '<p class="config-empty">Aucune règle de projet</p>');
      return;
    }

    setHtml(container, rules.map(rule => `
      <div class="config-item config-item-project">
        <div class="config-project-header">
          <span class="config-item-label">📁</span>
          <input type="text" class="config-project-name-input" value="${escapeAttr(rule.name)}" data-original="${escapeAttr(rule.name)}">
          <button class="config-item-remove" data-action="remove-project" data-value="${escapeAttr(rule.name)}">✕</button>
        </div>
        <div class="config-project-patterns">
          ${rule.patterns.map(p => `
            <span class="config-pattern">
              ${escapeAttr(p)}
              <button class="config-pattern-remove" data-action="remove-pattern" data-project="${escapeAttr(rule.name)}" data-pattern="${escapeAttr(p)}">✕</button>
            </span>
          `).join('')}
          <div class="config-add-pattern-inline">
            <input type="text" placeholder="+ pattern" class="config-input-small" data-project="${escapeAttr(rule.name)}">
          </div>
        </div>
      </div>
    `).join(''));
  }

  /**
   * Rend la liste noire
   */
  _renderBlacklist() {
    const container = $('#blacklist-items', this._element);
    if (!container) return;

    const blacklist = UserConfig.blacklist;

    if (blacklist.length === 0) {
      setHtml(container, '<p class="config-empty">Aucun ticket dans la blacklist</p>');
      return;
    }

    setHtml(container, blacklist.map(key => `
      <div class="config-item">
        <span class="config-item-label">🚫 ${escapeAttr(key)}</span>
        <button class="config-item-remove" data-action="remove-blacklist" data-value="${escapeAttr(key)}">✕</button>
      </div>
    `).join(''));
  }

  /**
   * Attache les écouteurs d'événements
   */
  _attachEventListeners() {
    // Fermer la modal
    const closeBtn = $('#close-config-modal', this._element);
    closeBtn?.addEventListener('click', () => this.close());

    // Clic en dehors
    this._element.addEventListener('click', (e) => {
      if (e.target === this._element) {
        this.close();
      }
    });

    // Onglets
    this._element.addEventListener('click', (e) => {
      const tab = e.target.closest('.config-tab');
      if (tab) {
        this._switchTab(tab.dataset.tab);
      }
    });

    // Ajouter tag
    $('#btn-add-tag', this._element)?.addEventListener('click', () => this._addTag());
    $('#new-tag-input', this._element)?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this._addTag();
    });

    // Ajouter règle projet
    $('#btn-add-project-rule', this._element)?.addEventListener('click', () => this._addProjectRule());
    $('#new-project-pattern', this._element)?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this._addProjectRule();
    });

    // Ajouter blacklist
    $('#btn-add-blacklist', this._element)?.addEventListener('click', () => this._addToBlacklist());
    $('#new-blacklist-key', this._element)?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this._addToBlacklist();
    });

    // Actions de suppression (délégation)
    this._element.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const action = btn.dataset.action;
      const value = btn.dataset.value;

      switch (action) {
        case 'remove-tag':
          UserConfig.removeCustomTag(value);
          break;
        case 'remove-project':
          UserConfig.removeProjectRule(value);
          break;
        case 'remove-pattern':
          UserConfig.removePatternFromProject(btn.dataset.project, btn.dataset.pattern);
          break;
        case 'remove-blacklist':
          UserConfig.removeFromBlacklist(value);
          break;
      }
    });

    // Ajouter pattern inline
    this._element.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && e.target.classList.contains('config-input-small')) {
        const projectName = e.target.dataset.project;
        const pattern = e.target.value.trim();
        if (pattern && projectName) {
          UserConfig.addPatternToProject(projectName, pattern);
          e.target.value = '';
        }
      }
      // Renommer projet sur Enter
      if (e.key === 'Enter' && e.target.classList.contains('config-project-name-input')) {
        e.target.blur();
      }
    });

    // Renommer projet sur blur
    this._element.addEventListener('blur', (e) => {
      if (e.target.classList.contains('config-project-name-input')) {
        const originalName = e.target.dataset.original;
        const newName = e.target.value.trim();
        if (newName && newName !== originalName) {
          UserConfig.renameProject(originalName, newName);
        } else if (!newName) {
          e.target.value = originalName; // Restaurer si vide
        }
      }
    }, true);

    // Cliquer sur une suggestion de projet = ajouter directement
    this._element.addEventListener('click', (e) => {
      const suggestion = e.target.closest('.config-suggestion');
      if (!suggestion) return;

      // Suggestion de tag
      const tagName = suggestion.dataset.tagSuggestion;
      if (tagName) {
        UserConfig.addCustomTag(tagName);
        return;
      }

      // Suggestion de projet
      const projectName = suggestion.dataset.suggestion;
      if (projectName) {
        // Ajouter le nom comme pattern (sans crochets)
        UserConfig.addProjectRule(projectName, [projectName.toLowerCase()]);
      }
    });

    // Rafraîchir la détection de projet
    $('#btn-refresh-detection', this._element)?.addEventListener('click', () => this._refreshDetection());

    // Import/Export config
    $('#btn-export-config', this._element)?.addEventListener('click', () => this._exportConfig());
    $('#btn-import-config', this._element)?.addEventListener('click', () => this._importConfig());
  }

  /**
   * Change d'onglet
   */
  _switchTab(tabName) {
    this._activeTab = tabName;

    // Update tab buttons
    $$('.config-tab', this._element).forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update tab content
    $$('.config-tab-content', this._element).forEach(content => {
      content.classList.toggle('active', content.id === `tab-${tabName}`);
    });
  }

  /**
   * Ajoute un tag
   */
  _addTag() {
    const input = $('#new-tag-input', this._element);
    if (input && input.value.trim()) {
      UserConfig.addCustomTag(input.value.trim());
      input.value = '';
    }
  }

  /**
   * Ajoute une règle de projet
   */
  _addProjectRule() {
    const nameInput = $('#new-project-name', this._element);
    const patternInput = $('#new-project-pattern', this._element);

    if (nameInput && patternInput && nameInput.value.trim()) {
      const patterns = patternInput.value.trim() ? [patternInput.value.trim()] : [];
      UserConfig.addProjectRule(nameInput.value.trim(), patterns);
      nameInput.value = '';
      patternInput.value = '';
    }
  }

  /**
   * Ajoute à la blacklist
   */
  _addToBlacklist() {
    const input = $('#new-blacklist-key', this._element);
    if (input && input.value.trim()) {
      UserConfig.addToBlacklist(input.value.trim());
      input.value = '';
    }
  }

  /**
   * Rafraîchit la détection de projet sur tous les tickets
   */
  _refreshDetection() {
    const statusEl = $('#refresh-status', this._element);
    const result = Storage.refreshProjectDetection();

    if (statusEl) {
      statusEl.textContent = result.success ? `✓ ${result.message}` : `⚠️ ${result.message}`;
      statusEl.className = 'config-refresh-status ' + (result.success ? 'success' : 'error');

      // Effacer le message après 3 secondes
      setTimeout(() => {
        statusEl.textContent = '';
      }, 3000);
    }

    // Rafraîchir les suggestions
    this._renderProjectSuggestions();
  }

  /**
   * Exporte la configuration
   */
  _exportConfig() {
    const config = UserConfig.exportConfig();
    const blob = new Blob([config], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jira-report-config.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Importe la configuration
   */
  _importConfig() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        const text = await file.text();
        const result = UserConfig.importConfig(text);
        if (!result.success) {
          alert('Erreur lors de l\'import: ' + result.error);
        }
      }
    };
    input.click();
  }

  /**
   * Réinitialise la configuration
   */
  _resetConfig() {
    if (confirm('Voulez-vous vraiment réinitialiser toute la configuration ?')) {
      UserConfig.reset();
    }
  }

  /**
   * Ouvre la modal
   */
  open() {
    if (this._element) {
      addClass(this._element, 'show');
      this._isOpen = true;
      this._refreshContent();
    }
  }

  /**
   * Ferme la modal
   */
  close() {
    if (this._element) {
      removeClass(this._element, 'show');
      this._isOpen = false;
    }
  }
}

export const ConfigModal = new ConfigModalComponent();
