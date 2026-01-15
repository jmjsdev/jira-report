/**
 * Application principale Jira Report
 *
 * Application HTML/JS pure pour la gestion de rapports JIRA
 * - Import XML JIRA
 * - Sauvegarde/Chargement JSON avec File System Access API
 * - Filtres, timeline, rapports
 */

import { State } from './state.js';
import { Storage } from './services/storage.js';
import { Sidebar } from './components/sidebar.js';
import { Timeline } from './components/timeline.js';
import { TaskTable } from './components/task-table.js';
import { Stats } from './components/stats.js';
import { ImportModal } from './components/modals/import.js';
import { ReportModal } from './components/modals/report.js';
import { ConfigModal } from './components/modals/config.js';
import { isFileSystemAccessSupported } from './utils/file.js';
import { $ } from './utils/dom.js';

class JiraReportApp {
  constructor() {
    this._initialized = false;
  }

  /**
   * Initialise l'application
   */
  async init() {
    if (this._initialized) return;

    console.log('Jira Report App - Initialisation...');

    // Initialiser les composants
    Stats.init('#stats');
    Sidebar.init('#filters');
    Timeline.init('#timeline-container');
    TaskTable.init('#projects-container', '#view-mode-container');
    ImportModal.init('#import-modal');
    ReportModal.init('#report-modal');
    ConfigModal.init('#config-modal');

    // Attacher les raccourcis clavier
    this._attachKeyboardShortcuts();

    // Attacher les événements personnalisés
    this._attachCustomEvents();

    // Attacher les événements de beforeunload
    this._attachBeforeUnload();

    // Mettre à jour l'indicateur de support File System API
    this._updateFileSystemIndicator();

    // Souscrire aux changements d'état pour l'indicateur de modifications
    State.subscribe('unsavedChanges', () => this._updateUnsavedIndicator());

    this._initialized = true;
    console.log('Jira Report App - Initialisé');
  }

  /**
   * Attache les raccourcis clavier
   */
  _attachKeyboardShortcuts() {
    document.addEventListener('keydown', async (e) => {
      // Ctrl+S ou Cmd+S : Sauvegarder
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        await this._handleSave();
      }

      // Ctrl+Shift+S ou Cmd+Shift+S : Sauvegarder sous
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        await this._handleSaveAs();
      }

      // Ctrl+O ou Cmd+O : Ouvrir
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        await this._handleOpen();
      }

      // Ctrl+I ou Cmd+I : Importer XML
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        ImportModal.open();
      }

      // Echap : Fermer les modales
      if (e.key === 'Escape') {
        ImportModal.close();
        ReportModal.close();
        ConfigModal.close();
      }

      // Ctrl+, ou Cmd+, : Configuration
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        ConfigModal.open();
      }
    });
  }

  /**
   * Attache les événements personnalisés (émis par les composants)
   */
  _attachCustomEvents() {
    document.addEventListener('app:open', () => this._handleOpen());
    document.addEventListener('app:save', () => this._handleSave());
    document.addEventListener('app:import-xml', () => ImportModal.open());
    document.addEventListener('app:backup', () => this._handleBackup());
    document.addEventListener('app:report-text', () => ReportModal.openText());
    document.addEventListener('app:report-html', () => ReportModal.openHtml());
    document.addEventListener('app:config', () => ConfigModal.open());
  }

  /**
   * Attache l'événement beforeunload pour avertir des modifications non sauvegardées
   */
  _attachBeforeUnload() {
    window.addEventListener('beforeunload', (e) => {
      if (State.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'Vous avez des modifications non sauvegardées. Êtes-vous sûr de vouloir quitter ?';
        return e.returnValue;
      }
    });
  }

  /**
   * Gère l'ouverture d'un fichier
   */
  async _handleOpen() {
    try {
      const result = await Storage.openProject();
      if (result.success) {
        this._showNotification(result.message, 'success');
      } else if (!result.cancelled) {
        this._showNotification('Erreur lors de l\'ouverture', 'error');
      }
    } catch (err) {
      console.error('Erreur ouverture:', err);
      this._showNotification('Erreur: ' + err.message, 'error');
    }
  }

  /**
   * Gère la sauvegarde (Ctrl+S)
   */
  async _handleSave() {
    try {
      const result = await Storage.save();
      if (result.success) {
        this._showNotification('Sauvegardé', 'success');
      } else if (!result.cancelled) {
        this._showNotification('Erreur de sauvegarde', 'error');
      }
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
      this._showNotification('Erreur: ' + err.message, 'error');
    }
  }

  /**
   * Gère la sauvegarde sous (Ctrl+Shift+S)
   */
  async _handleSaveAs() {
    try {
      const result = await Storage.saveAs();
      if (result.success) {
        this._showNotification('Fichier créé', 'success');
      } else if (!result.cancelled) {
        this._showNotification('Erreur de sauvegarde', 'error');
      }
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
      this._showNotification('Erreur: ' + err.message, 'error');
    }
  }

  /**
   * Gère le backup (téléchargement simple)
   */
  _handleBackup() {
    const result = Storage.downloadBackup();
    if (result.success) {
      this._showNotification(result.message, 'success');
    }
  }

  /**
   * Met à jour l'indicateur de support File System API
   */
  _updateFileSystemIndicator() {
    const indicator = $('#fs-support-indicator');
    if (indicator) {
      if (isFileSystemAccessSupported()) {
        indicator.textContent = '✓ File System Access API supporté';
        indicator.classList.add('supported');
      } else {
        indicator.textContent = '⚠️ File System Access API non supporté - Mode téléchargement';
        indicator.classList.add('unsupported');
      }
    }
  }

  /**
   * Met à jour l'indicateur de modifications non sauvegardées
   */
  _updateUnsavedIndicator() {
    const titleEl = document.querySelector('title');
    const baseTitle = 'Jira Report';

    if (State.hasUnsavedChanges) {
      document.title = '● ' + baseTitle;
      document.body.classList.add('has-unsaved-changes');
    } else {
      document.title = baseTitle;
      document.body.classList.remove('has-unsaved-changes');
    }
  }

  /**
   * Affiche une notification
   */
  _showNotification(message, type = 'info') {
    // Créer l'élément de notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Trouver ou créer le conteneur
    let container = $('#notification-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-container';
      document.body.appendChild(container);
    }

    container.appendChild(notification);

    // Animation d'entrée
    setTimeout(() => notification.classList.add('show'), 10);

    // Suppression après 3 secondes
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// Instance globale
const App = new JiraReportApp();

// Initialiser au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

// Exporter pour utilisation éventuelle
export { App };
