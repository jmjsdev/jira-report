/**
 * Service de stockage pour l'application Jira Report
 * Gère la persistance des données avec File System Access API
 */

import { State } from '../state.js';
import { UserConfig } from './user-config.js';
import {
  isFileSystemAccessSupported,
  openJsonFile,
  openXmlFile,
  saveToHandle,
  saveAsJsonFile,
  downloadJson,
  generateFilename,
  readFileAsText,
  saveFileHandle,
  tryLoadLastFile,
  saveBackupToIndexedDB,
  getBackupFromIndexedDB
} from '../utils/file.js';
import { parseJiraXml, mergeTickets } from '../parsers/jira-xml.js';

class StorageService {
  constructor() {
    this._autoSaveEnabled = false;
    this._autoSaveInterval = null;
    this._lastSaveTime = null;
    this._liveSaveEnabled = false;
    this._liveSaveTimeout = null;
    this._liveSaveDelay = 1500; // 1.5 secondes après la dernière modification
  }

  /**
   * Active le live save (sauvegarde automatique après chaque modification)
   */
  enableLiveSave() {
    if (this._liveSaveEnabled) return;

    this._liveSaveEnabled = true;

    // S'abonner aux changements
    State.subscribe('unsavedChanges', () => {
      if (State.hasUnsavedChanges && State.currentFileHandle && this._liveSaveEnabled) {
        this._scheduleLiveSave();
      }
    });

    console.log('Live save activé');
  }

  /**
   * Désactive le live save
   */
  disableLiveSave() {
    this._liveSaveEnabled = false;
    if (this._liveSaveTimeout) {
      clearTimeout(this._liveSaveTimeout);
      this._liveSaveTimeout = null;
    }
  }

  /**
   * Programme une sauvegarde live (debounced)
   */
  _scheduleLiveSave() {
    // Annuler le timeout précédent
    if (this._liveSaveTimeout) {
      clearTimeout(this._liveSaveTimeout);
    }

    // Programmer une nouvelle sauvegarde
    this._liveSaveTimeout = setTimeout(async () => {
      if (State.hasUnsavedChanges) {
        try {
          const data = State.toJSON();

          // Sauvegarder dans le fichier si handle disponible
          if (State.currentFileHandle) {
            await saveToHandle(State.currentFileHandle, data);
            console.log('Live save fichier effectué');
          }

          // Toujours sauvegarder en backup dans IndexedDB
          await saveBackupToIndexedDB(data);
          console.log('Live save IndexedDB effectué');

          State.setUnsavedChanges(false);
          this._lastSaveTime = new Date();
        } catch (err) {
          console.warn('Erreur live save:', err);
        }
      }
    }, this._liveSaveDelay);
  }

  /**
   * Retourne si le live save est actif
   */
  get isLiveSaveEnabled() {
    return this._liveSaveEnabled;
  }

  /**
   * Applique les règles de détection de projet aux tickets
   * @param {object[]} tickets - Tickets à traiter
   * @returns {object[]} Tickets avec projet détecté
   */
  _applyProjectRules(tickets) {
    return tickets.map(ticket => {
      // Essayer de détecter le projet depuis le titre
      const detectedProject = UserConfig.detectProjectFromTitle(ticket.summary);
      if (detectedProject) {
        return { ...ticket, project: detectedProject };
      }
      return ticket;
    });
  }

  /**
   * Rafraîchit les tickets en réappliquant les règles de projet
   * @returns {object} Résultat du rafraîchissement
   */
  refreshProjectDetection() {
    const currentTasks = State.tasks;
    if (currentTasks.length === 0) {
      return { success: false, message: 'Aucun ticket à rafraîchir' };
    }

    const updatedTasks = this._applyProjectRules(currentTasks);
    State.setTasks(updatedTasks);
    State.markAsModified();

    return { success: true, message: `${updatedTasks.length} tickets mis à jour` };
  }

  /**
   * Vérifie si le File System Access API est supporté
   */
  get isFileSystemSupported() {
    return isFileSystemAccessSupported();
  }

  /**
   * Ouvre un fichier JSON et charge les données
   * @returns {Promise<void>}
   */
  async openProject() {
    try {
      const { handle, content, filename } = await openJsonFile();

      // Valider le contenu
      if (!content || !content.tasks) {
        throw new Error('Format de fichier invalide');
      }

      // Charger les données dans l'état
      State.fromJSON(content);

      // Stocker le handle si disponible (File System Access API)
      if (handle) {
        State.setCurrentFileHandle(handle);
        // Persister le handle dans IndexedDB pour rechargement
        await saveFileHandle(handle);
      }

      return {
        success: true,
        message: `Fichier chargé: ${filename || 'projet.json'}`,
        taskCount: content.tasks.length
      };
    } catch (err) {
      if (err.name === 'AbortError') {
        // L'utilisateur a annulé
        return { success: false, cancelled: true };
      }
      throw err;
    }
  }

  /**
   * Tente de recharger le dernier fichier ouvert ou le backup IndexedDB
   * @returns {Promise<object>} Résultat du chargement
   */
  async tryLoadLastProject() {
    // D'abord essayer de recharger le fichier
    try {
      const result = await tryLoadLastFile();

      if (result.success && result.content && result.content.tasks) {
        State.fromJSON(result.content);
        if (result.handle) {
          State.setCurrentFileHandle(result.handle);
        }
        return {
          success: true,
          message: `Fichier rechargé: ${result.filename || 'projet.json'}`,
          taskCount: result.content.tasks.length
        };
      }
    } catch (err) {
      console.warn('Erreur rechargement fichier:', err);
    }

    // Sinon essayer le backup IndexedDB
    try {
      const backup = await getBackupFromIndexedDB();
      if (backup && backup.data && backup.data.tasks) {
        State.fromJSON(backup.data);
        return {
          success: true,
          message: `Backup restauré (${backup.savedAt})`,
          taskCount: backup.data.tasks.length,
          fromBackup: true
        };
      }
    } catch (err) {
      console.warn('Erreur rechargement backup:', err);
    }

    return { success: false };
  }

  /**
   * Importe un fichier XML JIRA
   * @param {object} options - Options d'import
   * @returns {Promise<object>} Résultat de l'import
   */
  async importXml(options = {}) {
    const {
      mergeWithExisting = true,
      updateExisting = true
    } = options;

    try {
      const { content, filename } = await openXmlFile();

      // Parser le XML
      let tickets = parseJiraXml(content);

      if (tickets.length === 0) {
        return {
          success: false,
          message: 'Aucun ticket trouvé dans le fichier XML'
        };
      }

      // Appliquer les règles de détection de projet
      tickets = this._applyProjectRules(tickets);

      // Fusionner ou remplacer
      let finalTasks;
      if (mergeWithExisting && State.tasks.length > 0) {
        finalTasks = mergeTickets(tickets, State.tasks, { updateExisting });
      } else {
        finalTasks = tickets;
      }

      // Mettre à jour l'état
      State.setTasks(finalTasks);
      State.setUnsavedChanges(true);

      return {
        success: true,
        message: `${tickets.length} tickets importés depuis ${filename || 'fichier.xml'}`,
        imported: tickets.length,
        total: finalTasks.length
      };
    } catch (err) {
      if (err.name === 'AbortError') {
        return { success: false, cancelled: true };
      }
      throw err;
    }
  }

  /**
   * Importe du XML depuis une chaîne de caractères
   * @param {string} xmlString - Contenu XML
   * @param {object} options - Options d'import
   * @returns {object} Résultat de l'import
   */
  importXmlFromString(xmlString, options = {}) {
    const {
      mergeWithExisting = true,
      updateExisting = true
    } = options;

    // Parser le XML
    let tickets = parseJiraXml(xmlString);

    if (tickets.length === 0) {
      return {
        success: false,
        message: 'Aucun ticket trouvé dans le XML'
      };
    }

    // Appliquer les règles de détection de projet
    tickets = this._applyProjectRules(tickets);

    // Fusionner ou remplacer
    let finalTasks;
    if (mergeWithExisting && State.tasks.length > 0) {
      finalTasks = mergeTickets(tickets, State.tasks, { updateExisting });
    } else {
      finalTasks = tickets;
    }

    // Mettre à jour l'état
    State.setTasks(finalTasks);
    State.setUnsavedChanges(true);

    return {
      success: true,
      imported: tickets.length,
      total: finalTasks.length,
      tickets: tickets
    };
  }

  /**
   * Sauvegarde les données dans le fichier actuel (Ctrl+S)
   * @returns {Promise<object>} Résultat de la sauvegarde
   */
  async save() {
    const handle = State.currentFileHandle;
    const data = State.toJSON();

    // Toujours sauvegarder en backup IndexedDB
    try {
      await saveBackupToIndexedDB(data);
    } catch (err) {
      console.warn('Erreur backup IndexedDB:', err);
    }

    if (handle && isFileSystemAccessSupported()) {
      // Sauvegarder dans le fichier existant
      try {
        await saveToHandle(handle, data);
        State.setUnsavedChanges(false);
        this._lastSaveTime = new Date();

        return {
          success: true,
          message: 'Fichier sauvegardé'
        };
      } catch (err) {
        console.error('Erreur de sauvegarde:', err);
        return this.saveAs();
      }
    } else {
      return this.saveAs();
    }
  }

  /**
   * Sauvegarde les données dans un nouveau fichier (Ctrl+Shift+S)
   * @returns {Promise<object>} Résultat de la sauvegarde
   */
  async saveAs() {
    try {
      const data = State.toJSON();
      const filename = generateFilename('jira-report', 'json');

      const handle = await saveAsJsonFile(data, filename);

      if (handle) {
        State.setCurrentFileHandle(handle);
        // Persister le handle dans IndexedDB pour rechargement
        await saveFileHandle(handle);
      }

      State.setUnsavedChanges(false);
      this._lastSaveTime = new Date();

      return {
        success: true,
        message: 'Fichier sauvegardé'
      };
    } catch (err) {
      if (err.name === 'AbortError') {
        return { success: false, cancelled: true };
      }
      throw err;
    }
  }

  /**
   * Télécharge un backup JSON (sans File System Access API)
   * @returns {object} Résultat du téléchargement
   */
  downloadBackup() {
    const data = State.toJSON();
    const filename = generateFilename('jira-report-backup', 'json');
    downloadJson(data, filename);

    return {
      success: true,
      message: `Backup téléchargé: ${filename}`
    };
  }

  /**
   * Crée un nouveau projet vide
   */
  newProject() {
    State.reset();
    return {
      success: true,
      message: 'Nouveau projet créé'
    };
  }

  /**
   * Active l'auto-save
   * @param {number} intervalMs - Intervalle en millisecondes
   */
  enableAutoSave(intervalMs = 60000) {
    if (this._autoSaveInterval) {
      clearInterval(this._autoSaveInterval);
    }

    this._autoSaveEnabled = true;
    this._autoSaveInterval = setInterval(async () => {
      if (State.hasUnsavedChanges && State.currentFileHandle) {
        await this.save();
        console.log('Auto-save effectué');
      }
    }, intervalMs);
  }

  /**
   * Désactive l'auto-save
   */
  disableAutoSave() {
    this._autoSaveEnabled = false;
    if (this._autoSaveInterval) {
      clearInterval(this._autoSaveInterval);
      this._autoSaveInterval = null;
    }
  }

  /**
   * Vérifie s'il y a des modifications non sauvegardées
   * @returns {boolean}
   */
  hasUnsavedChanges() {
    return State.hasUnsavedChanges;
  }

  /**
   * Retourne la date de dernière sauvegarde
   * @returns {Date|null}
   */
  getLastSaveTime() {
    return this._lastSaveTime;
  }

  /**
   * Gère le drag and drop de fichiers
   * @param {DataTransfer} dataTransfer - Objet DataTransfer
   * @returns {Promise<object>} Résultat de l'import
   */
  async handleFileDrop(dataTransfer) {
    const files = dataTransfer.files;
    if (files.length === 0) {
      return { success: false, message: 'Aucun fichier' };
    }

    const file = files[0];
    const content = await readFileAsText(file);

    if (file.name.endsWith('.xml') || file.type.includes('xml')) {
      return this.importXmlFromString(content);
    } else if (file.name.endsWith('.json') || file.type.includes('json')) {
      const data = JSON.parse(content);
      State.fromJSON(data);
      return {
        success: true,
        message: `Fichier chargé: ${file.name}`,
        taskCount: data.tasks.length
      };
    } else {
      return { success: false, message: 'Format de fichier non supporté' };
    }
  }
}

// Export singleton
export const Storage = new StorageService();
