/**
 * Service de configuration utilisateur
 * Stocké en localStorage pour persistance
 */

const STORAGE_KEY = 'jira-report-config';

class UserConfigService {
  constructor() {
    this._config = {
      // Tags personnalisés (affichés dans les filtres même si pas dans les tickets)
      customTags: [],

      // Règles de détection de projet basées sur le titre
      // Format: { name: 'PROJECT', patterns: ['pattern1', 'pattern2'] }
      projectRules: [],

      // Liste noire de tickets (clés JIRA à ignorer)
      blacklist: []
    };

    this._listeners = new Set();
    this._load();
  }

  // ========================================
  // Getters
  // ========================================

  get customTags() {
    return [...this._config.customTags];
  }

  get projectRules() {
    return this._config.projectRules.map(r => ({ ...r, patterns: [...r.patterns] }));
  }

  get blacklist() {
    return [...this._config.blacklist];
  }

  // ========================================
  // Tags personnalisés
  // ========================================

  addCustomTag(tag) {
    const normalizedTag = tag.trim();
    if (normalizedTag && !this._config.customTags.includes(normalizedTag)) {
      this._config.customTags.push(normalizedTag);
      this._save();
      this._notify();
      return true;
    }
    return false;
  }

  removeCustomTag(tag) {
    const index = this._config.customTags.indexOf(tag);
    if (index !== -1) {
      this._config.customTags.splice(index, 1);
      this._save();
      this._notify();
      return true;
    }
    return false;
  }

  // ========================================
  // Règles de projet
  // ========================================

  addProjectRule(name, patterns = []) {
    const normalizedName = name.trim().toUpperCase();
    const existingRule = this._config.projectRules.find(r => r.name === normalizedName);

    if (existingRule) {
      // Ajouter les patterns à la règle existante
      patterns.forEach(p => {
        const normalizedPattern = p.trim().toLowerCase();
        if (normalizedPattern && !existingRule.patterns.includes(normalizedPattern)) {
          existingRule.patterns.push(normalizedPattern);
        }
      });
    } else {
      // Créer une nouvelle règle
      this._config.projectRules.push({
        name: normalizedName,
        patterns: patterns.map(p => p.trim().toLowerCase()).filter(p => p)
      });
    }

    this._save();
    this._notify();
    return true;
  }

  updateProjectRule(name, newPatterns) {
    const rule = this._config.projectRules.find(r => r.name === name);
    if (rule) {
      rule.patterns = newPatterns.map(p => p.trim().toLowerCase()).filter(p => p);
      this._save();
      this._notify();
      return true;
    }
    return false;
  }

  removeProjectRule(name) {
    const index = this._config.projectRules.findIndex(r => r.name === name);
    if (index !== -1) {
      this._config.projectRules.splice(index, 1);
      this._save();
      this._notify();
      return true;
    }
    return false;
  }

  addPatternToProject(projectName, pattern) {
    const rule = this._config.projectRules.find(r => r.name === projectName);
    const normalizedPattern = pattern.trim().toLowerCase();

    if (rule && normalizedPattern && !rule.patterns.includes(normalizedPattern)) {
      rule.patterns.push(normalizedPattern);
      this._save();
      this._notify();
      return true;
    }
    return false;
  }

  removePatternFromProject(projectName, pattern) {
    const rule = this._config.projectRules.find(r => r.name === projectName);
    if (rule) {
      const index = rule.patterns.indexOf(pattern);
      if (index !== -1) {
        rule.patterns.splice(index, 1);
        this._save();
        this._notify();
        return true;
      }
    }
    return false;
  }

  /**
   * Détecte le projet d'un ticket basé sur son titre
   * @param {string} title - Titre du ticket
   * @returns {string|null} - Nom du projet détecté ou null
   */
  detectProjectFromTitle(title) {
    if (!title) return null;
    const titleLower = title.toLowerCase();

    for (const rule of this._config.projectRules) {
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
    const normalizedKey = ticketKey.trim().toUpperCase();
    if (normalizedKey && !this._config.blacklist.includes(normalizedKey)) {
      this._config.blacklist.push(normalizedKey);
      this._save();
      this._notify();
      return true;
    }
    return false;
  }

  removeFromBlacklist(ticketKey) {
    const normalizedKey = ticketKey.trim().toUpperCase();
    const index = this._config.blacklist.indexOf(normalizedKey);
    if (index !== -1) {
      this._config.blacklist.splice(index, 1);
      this._save();
      this._notify();
      return true;
    }
    return false;
  }

  isBlacklisted(ticketKey) {
    if (!ticketKey) return false;
    return this._config.blacklist.includes(ticketKey.toUpperCase());
  }

  // ========================================
  // Persistance
  // ========================================

  _load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this._config = {
          customTags: parsed.customTags || [],
          projectRules: parsed.projectRules || [],
          blacklist: parsed.blacklist || []
        };
      }
    } catch (e) {
      console.error('Erreur chargement config:', e);
    }
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._config));
    } catch (e) {
      console.error('Erreur sauvegarde config:', e);
    }
  }

  // ========================================
  // Export/Import
  // ========================================

  exportConfig() {
    return JSON.stringify(this._config, null, 2);
  }

  importConfig(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      this._config = {
        customTags: parsed.customTags || [],
        projectRules: parsed.projectRules || [],
        blacklist: parsed.blacklist || []
      };
      this._save();
      this._notify();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  reset() {
    this._config = {
      customTags: [],
      projectRules: [],
      blacklist: []
    };
    this._save();
    this._notify();
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
