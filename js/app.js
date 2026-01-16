/**
 * Application principale Jira Report
 *
 * Application HTML/JS pure pour la gestion de rapports JIRA
 * - Import XML JIRA
 * - Sauvegarde/Chargement JSON avec File System Access API
 * - Filtres, timeline, rapports
 */

import { Debug } from './utils/debug.js';
import { State } from './state.js';
import { Storage } from './services/storage.js';
import { Sidebar } from './components/sidebar.js';
import { Timeline } from './components/timeline.js';
import { TaskTable } from './components/task-table.js';
import { Toolbar } from './components/toolbar.js';
import { ImportModal } from './components/modals/import.js';
import { ReportModal } from './components/modals/report.js';
import { ConfigModal } from './components/modals/config.js';
import { EditTaskModal } from './components/modals/edit-task.js';
import { isFileSystemAccessSupported } from './utils/file.js';
import { $ } from './utils/dom.js';
import { icon } from './utils/icons.js';
import { APP_VERSION } from './config.js';

// Initialiser le debug en premier
Debug.init();

class JiraReportApp {
  constructor() {
    this._initialized = false;
  }

  /**
   * Initialise l'application
   */
  async init() {
    if (this._initialized) return;

    Debug.log('App.init() START');

    try {
      // Initialiser les composants un par un avec logging (async pour les templates)
      Debug.log('Initializing Toolbar...');
      await Toolbar.init('#toolbar');

      Debug.log('Initializing Sidebar...');
      Sidebar.init('#filters');

      Debug.log('Initializing Timeline...');
      Timeline.init('#timeline-container');

      Debug.log('Initializing TaskTable...');
      TaskTable.init('#projects-container');

      Debug.log('Initializing ImportModal...');
      await ImportModal.init('#import-modal');

      Debug.log('Initializing ReportModal...');
      await ReportModal.init('#report-modal');

      Debug.log('Initializing ConfigModal...');
      await ConfigModal.init('#config-modal');

      Debug.log('Initializing EditTaskModal...');
      await EditTaskModal.init('#edit-task-modal');

      Debug.log('Attaching keyboard shortcuts...');
      this._attachKeyboardShortcuts();

      Debug.log('Attaching custom events...');
      this._attachCustomEvents();

      Debug.log('Attaching drag & drop...');
      this._attachGlobalDragDrop();

      Debug.log('Attaching beforeunload...');
      this._attachBeforeUnload();

      Debug.log('Updating FS indicator...');
      this._updateFileSystemIndicator();

      Debug.log('Subscribing to state changes...');
      State.subscribe('unsavedChanges', () => this._updateUnsavedIndicator());

      Debug.log('Attempting auto-load...');
      await this._tryAutoLoadLastFile();

      Debug.log('Enabling live save...');
      Storage.enableLiveSave();

      this._initialized = true;
      Debug.success('App.init() COMPLETE');
    } catch (err) {
      Debug.error('App.init() FAILED: ' + err.message);
      Debug.show(); // Afficher le panneau de debug
      throw err;
    }
  }

  /**
   * Tente de recharger automatiquement le dernier fichier
   * Note: Cette fonctionnalité peut être bloquée dans les environnements d'entreprise
   */
  async _tryAutoLoadLastFile() {
    try {
      const result = await Storage.tryLoadLastProject();
      if (result.success) {
        this._showNotification(result.message, 'success');
      }
    } catch (err) {
      // Échec silencieux - pas de notification d'erreur
      // Cela peut arriver dans les environnements d'entreprise restrictifs
      console.warn('Auto-load failed (may be blocked by enterprise policy):', err);
    }
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
        EditTaskModal.close();
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
    document.addEventListener('app:save-as', () => this._handleSaveAs());
    document.addEventListener('app:import-xml', () => ImportModal.open());
    document.addEventListener('app:backup', () => this._handleBackup());
    document.addEventListener('app:clear', () => this._handleClear());
    document.addEventListener('app:report-text', () => ReportModal.openText());
    document.addEventListener('app:report-html', () => ReportModal.openHtml());
    document.addEventListener('app:config', () => ConfigModal.open());
    document.addEventListener('app:edit-task', (e) => {
      if (e.detail && e.detail.taskKey) {
        EditTaskModal.open(e.detail.taskKey);
      }
    });
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
   * Attache le drag & drop global pour les fichiers XML
   */
  _attachGlobalDragDrop() {
    // Empêcher le comportement par défaut du navigateur
    document.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    document.addEventListener('dragenter', (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Ajouter un indicateur visuel
      document.body.classList.add('drag-over');
    });

    document.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Retirer l'indicateur seulement si on quitte vraiment le document
      if (e.relatedTarget === null || !document.body.contains(e.relatedTarget)) {
        document.body.classList.remove('drag-over');
      }
    });

    document.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      document.body.classList.remove('drag-over');

      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      const file = files[0];
      const fileName = file.name.toLowerCase();

      // Fichier XML -> Import JIRA
      if (fileName.endsWith('.xml') || file.type.includes('xml')) {
        await ImportModal.openWithFile(file);
      }
      // Fichier JSON -> Ouvrir projet
      else if (fileName.endsWith('.json') || file.type.includes('json')) {
        try {
          const content = await file.text();
          const data = JSON.parse(content);
          State.fromJSON(data);
          this._showNotification(`Fichier chargé: ${file.name}`, 'success');
        } catch (err) {
          this._showNotification('Erreur: ' + err.message, 'error');
        }
      }
      else {
        this._showNotification('Format non supporté. Utilisez XML ou JSON.', 'error');
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
   * Gère l'effacement de tous les tickets
   */
  _handleClear() {
    const taskCount = State.tasks.length;
    if (taskCount === 0) {
      this._showNotification('Aucun ticket à effacer', 'info');
      return;
    }

    if (confirm(`Effacer tous les ${taskCount} tickets ? Cette action est irréversible.`)) {
      State.reset();
      this._showNotification('Tous les tickets ont été effacés', 'success');
    }
  }

  /**
   * Met à jour l'indicateur de support File System API
   */
  _updateFileSystemIndicator() {
    const indicator = $('#fs-support-indicator');
    if (indicator) {
      if (isFileSystemAccessSupported()) {
        indicator.innerHTML = icon('check') + ' File System Access API supporté';
        indicator.classList.add('supported');
      } else {
        indicator.innerHTML = icon('alertTriangle') + ' File System Access API non supporté - Mode téléchargement';
        indicator.classList.add('unsupported');
      }
    }

    // Afficher la version
    const versionEl = $('#app-version');
    if (versionEl) {
      versionEl.textContent = 'v' + APP_VERSION;
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

// Gestionnaire d'erreurs global pour éviter les plantages
window.addEventListener('error', (e) => {
  console.error('Erreur globale capturée:', e.error);
  // Empêcher le plantage complet
  e.preventDefault();
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Promise rejetée non gérée:', e.reason);
  // Empêcher le plantage complet
  e.preventDefault();
});

// Initialiser au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
  try {
    App.init().catch(err => {
      console.error('Erreur initialisation async:', err);
    });
  } catch (err) {
    console.error('Erreur initialisation:', err);
  }
});

// Exporter pour utilisation éventuelle
export { App };
