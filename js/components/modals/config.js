/**
 * Composant Modal Configuration
 * Gestion des tags, projets et blacklist
 */

import { UserConfig } from '../../services/user-config.js';
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
          <button id="btn-export-config" class="action-btn action-btn-secondary">📤 Exporter</button>
          <button id="btn-import-config" class="action-btn action-btn-secondary">📥 Importer</button>
          <button id="btn-reset-config" class="action-btn" style="border-color: var(--color-error); color: var(--color-error);">🗑️ Réinitialiser</button>
        </div>
      </div>
    `);

    this._refreshContent();
  }

  /**
   * Rafraîchit le contenu des onglets
   */
  _refreshContent() {
    this._renderTagsList();
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
          <span class="config-item-label">📁 <strong>${escapeAttr(rule.name)}</strong></span>
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
    });

    // Export/Import/Reset
    $('#btn-export-config', this._element)?.addEventListener('click', () => this._exportConfig());
    $('#btn-import-config', this._element)?.addEventListener('click', () => this._importConfig());
    $('#btn-reset-config', this._element)?.addEventListener('click', () => this._resetConfig());
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
