/**
 * Service de configuration utilisateur
 * Stocké dans le fichier projet JSON (pas localStorage)
 */

// Singleton pour accès global - sera connecté au State
let _stateRef = null;

class UserConfigService {
  constructor() {
    this._listeners = new Set();
  }

  /**
   * Connecte le service au State (appelé par State)
   */
  connectToState(state) {
    _stateRef = state;
  }

  /**
   * Retourne la config depuis le State
   */
  _getConfig() {
    if (!_stateRef) {
      return this._getDefaultConfig();
    }
    return _stateRef._userConfig || this._getDefaultConfig();
  }

  /**
   * Met à jour la config dans le State
   */
  _setConfig(config) {
    if (_stateRef) {
      _stateRef._userConfig = config;
      _stateRef._hasUnsavedChanges = true;
      _stateRef._notify('userConfig');
      _stateRef._notify('unsavedChanges');
    }
    this._notify();
  }

  /**
   * Config par défaut
   */
  _getDefaultConfig() {
    return {
      customTags: [],
      projectRules: [],
      blacklist: []
    };
  }

  // ========================================
  // Getters
  // ========================================

  get customTags() {
    return [...(this._getConfig().customTags || [])];
  }

  get projectRules() {
    const rules = this._getConfig().projectRules || [];
    return rules.map(r => ({ ...r, patterns: [...r.patterns] }));
  }

  get blacklist() {
    return [...(this._getConfig().blacklist || [])];
  }

  // ========================================
  // Tags personnalisés
  // ========================================

  addCustomTag(tag) {
    const config = { ...this._getConfig() };
    const normalizedTag = tag.trim();
    if (normalizedTag && !config.customTags.includes(normalizedTag)) {
      config.customTags = [...config.customTags, normalizedTag];
      this._setConfig(config);
      return true;
    }
    return false;
  }

  removeCustomTag(tag) {
    const config = { ...this._getConfig() };
    const index = config.customTags.indexOf(tag);
    if (index !== -1) {
      config.customTags = config.customTags.filter(t => t !== tag);
      this._setConfig(config);
      return true;
    }
    return false;
  }

  // ========================================
  // Règles de projet
  // ========================================

  addProjectRule(name, patterns = []) {
    const config = { ...this._getConfig() };
    const normalizedName = name.trim();
    const nameLower = normalizedName.toLowerCase();
    const existingIndex = config.projectRules.findIndex(r => r.name.toLowerCase() === nameLower);

    if (existingIndex !== -1) {
      // Ajouter les patterns à la règle existante
      const existingRule = config.projectRules[existingIndex];
      patterns.forEach(p => {
        const normalizedPattern = p.trim().toLowerCase();
        if (normalizedPattern && !existingRule.patterns.some(ep => ep.toLowerCase() === normalizedPattern)) {
          existingRule.patterns.push(normalizedPattern);
        }
      });
      config.projectRules = [...config.projectRules];
    } else {
      // Créer une nouvelle règle
      config.projectRules = [...config.projectRules, {
        name: normalizedName,
        patterns: patterns.map(p => p.trim().toLowerCase()).filter(p => p)
      }];
    }

    this._setConfig(config);
    return true;
  }

  removeProjectRule(name) {
    const config = { ...this._getConfig() };
    const nameLower = name.toLowerCase();
    const index = config.projectRules.findIndex(r => r.name.toLowerCase() === nameLower);
    if (index !== -1) {
      config.projectRules = config.projectRules.filter(r => r.name.toLowerCase() !== nameLower);
      this._setConfig(config);
      return true;
    }
    return false;
  }

  renameProject(oldName, newName) {
    const config = { ...this._getConfig() };
    const oldNameLower = oldName.toLowerCase();
    const rule = config.projectRules.find(r => r.name.toLowerCase() === oldNameLower);
    if (rule && newName.trim()) {
      rule.name = newName.trim();
      config.projectRules = [...config.projectRules];
      this._setConfig(config);
      return true;
    }
    return false;
  }

  addPatternToProject(projectName, pattern) {
    const config = { ...this._getConfig() };
    const projectNameLower = projectName.toLowerCase();
    const rule = config.projectRules.find(r => r.name.toLowerCase() === projectNameLower);
    const normalizedPattern = pattern.trim().toLowerCase();

    if (rule && normalizedPattern && !rule.patterns.includes(normalizedPattern)) {
      rule.patterns.push(normalizedPattern);
      config.projectRules = [...config.projectRules];
      this._setConfig(config);
      return true;
    }
    return false;
  }

  removePatternFromProject(projectName, pattern) {
    const config = { ...this._getConfig() };
    const projectNameLower = projectName.toLowerCase();
    const rule = config.projectRules.find(r => r.name.toLowerCase() === projectNameLower);
    if (rule) {
      const patternLower = pattern.toLowerCase();
      const index = rule.patterns.findIndex(p => p.toLowerCase() === patternLower);
      if (index !== -1) {
        rule.patterns.splice(index, 1);
        config.projectRules = [...config.projectRules];
        this._setConfig(config);
        return true;
      }
    }
    return false;
  }

  /**
   * Détecte le projet d'un ticket basé sur son titre
   * Priorité: texte entre crochets [] > reste du titre
   */
  detectProjectFromTitle(title) {
    if (!title) return null;
    const titleLower = title.toLowerCase();
    const rules = this._getConfig().projectRules || [];

    // Extraire le texte entre crochets
    const bracketMatches = title.match(/\[([^\]]+)\]/g);
    const bracketTexts = bracketMatches
      ? bracketMatches.map(m => m.slice(1, -1).toLowerCase())
      : [];

    // 1. Priorité aux correspondances dans les crochets
    for (const rule of rules) {
      for (const pattern of rule.patterns) {
        for (const bracketText of bracketTexts) {
          if (bracketText.includes(pattern) || pattern.includes(bracketText)) {
            return rule.name;
          }
        }
      }
    }

    // 2. Sinon, chercher dans le titre complet
    for (const rule of rules) {
      for (const pattern of rule.patterns) {
        if (titleLower.includes(pattern)) {
          return rule.name;
        }
      }
    }

    return null;
  }

  // ========================================
  // Blacklist
  // ========================================

  addToBlacklist(ticketKey) {
    const config = { ...this._getConfig() };
    const normalizedKey = ticketKey.trim().toUpperCase();
    if (normalizedKey && !config.blacklist.includes(normalizedKey)) {
      config.blacklist = [...config.blacklist, normalizedKey];
      this._setConfig(config);
      return true;
    }
    return false;
  }

  removeFromBlacklist(ticketKey) {
    const config = { ...this._getConfig() };
    const normalizedKey = ticketKey.trim().toUpperCase();
    const index = config.blacklist.indexOf(normalizedKey);
    if (index !== -1) {
      config.blacklist = config.blacklist.filter(k => k !== normalizedKey);
      this._setConfig(config);
      return true;
    }
    return false;
  }

  isBlacklisted(ticketKey) {
    if (!ticketKey) return false;
    const blacklist = this._getConfig().blacklist || [];
    return blacklist.includes(ticketKey.toUpperCase());
  }

  // ========================================
  // Reset
  // ========================================

  reset() {
    this._setConfig(this._getDefaultConfig());
  }

  // ========================================
  // Import / Export
  // ========================================

  /**
   * Exporte la configuration en JSON
   * @returns {string} JSON de la configuration
   */
  exportConfig() {
    const config = this._getConfig();
    return JSON.stringify({
      version: '1.0',
      exportDate: new Date().toISOString(),
      config: config
    }, null, 2);
  }

  /**
   * Importe une configuration depuis JSON
   * @param {string} jsonString - JSON de la configuration
   * @returns {object} Résultat de l'import
   */
  importConfig(jsonString) {
    try {
      const data = JSON.parse(jsonString);

      if (!data.config) {
        return { success: false, error: 'Format invalide: config manquante' };
      }

      const newConfig = {
        customTags: data.config.customTags || [],
        projectRules: data.config.projectRules || [],
        blacklist: data.config.blacklist || []
      };

      this._setConfig(newConfig);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ========================================
  // Événements
  // ========================================

  subscribe(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  _notify() {
    this._listeners.forEach(cb => {
      try {
        cb(this);
      } catch (e) {
        console.error('Erreur callback config:', e);
      }
    });
  }
}

export const UserConfig = new UserConfigService();
