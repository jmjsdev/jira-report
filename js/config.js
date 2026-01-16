/**
 * Configuration de l'application Jira Report
 */
import { icon } from './utils/icons.js';

// Version injectée au build depuis package.json
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';

export const Config = {
  // Mapping des priorités JIRA vers l'application
  priorityMap: {
    'Highest': { value: 5, text: 'Critique', class: 'critical' },
    'High': { value: 4, text: 'Haute', class: 'high' },
    'Medium': { value: 3, text: 'Moyenne', class: 'medium' },
    'Low': { value: 2, text: 'Basse', class: 'low' },
    'Lowest': { value: 1, text: 'Minimale', class: 'lowest' }
  },

  // Mapping des statuts JIRA vers l'application (iconName = nom de l'icône SVG)
  statusMap: {
    // Statuts JIRA standards
    'Open': { key: 'backlog', label: 'Backlog', iconName: 'list', cssClass: 'status-backlog' },
    'To Do': { key: 'backlog', label: 'Backlog', iconName: 'list', cssClass: 'status-backlog' },
    'Backlog': { key: 'backlog', label: 'Backlog', iconName: 'list', cssClass: 'status-backlog' },
    'In Progress': { key: 'inprogress', label: 'En cours', iconName: 'clock', cssClass: 'status-inprogress' },
    'En cours': { key: 'inprogress', label: 'En cours', iconName: 'clock', cssClass: 'status-inprogress' },
    'In Review': { key: 'review', label: 'En revue', iconName: 'eye', cssClass: 'status-review' },
    'Ready for Test': { key: 'ready', label: 'Prêt à livrer', iconName: 'playCircle', cssClass: 'status-ready' },
    'Prêt à livrer': { key: 'ready', label: 'Prêt à livrer', iconName: 'playCircle', cssClass: 'status-ready' },
    'Done': { key: 'done', label: 'Terminé', iconName: 'checkCircle', cssClass: 'status-done' },
    'Terminé': { key: 'done', label: 'Terminé', iconName: 'checkCircle', cssClass: 'status-done' },
    'Closed': { key: 'done', label: 'Terminé', iconName: 'checkCircle', cssClass: 'status-done' },
    'Resolved': { key: 'done', label: 'Terminé', iconName: 'checkCircle', cssClass: 'status-done' },
    'Livré': { key: 'delivered', label: 'Livré', iconName: 'check', cssClass: 'status-delivered' },
    'Delivered': { key: 'delivered', label: 'Livré', iconName: 'check', cssClass: 'status-delivered' }
  },

  // Statut par défaut
  defaultStatus: { key: 'backlog', label: 'Backlog', iconName: 'list', cssClass: 'status-backlog' },

  /**
   * Retourne l'icône SVG pour un statut
   * @param {string} iconName - Nom de l'icône
   * @returns {string} - SVG HTML
   */
  getStatusIcon(iconName) {
    return icon(iconName);
  },

  // Ordre des statuts pour le tri
  statusOrder: {
    'backlog': 1,
    'inprogress': 2,
    'review': 3,
    'ready': 4,
    'delivered': 5,
    'done': 6
  },

  // Labels qui correspondent à des statuts (pour la détection depuis les labels)
  statusLabels: {
    'terminé': 'done',
    'done': 'done',
    'livré': 'delivered',
    'livre': 'delivered',
    'prêt à livrer': 'ready',
    'in progress': 'inprogress',
    'en cours': 'inprogress'
  },

  // Configuration de la timeline
  timeline: {
    dayWidth: 60, // pixels par jour
    taskHeight: 18,
    taskSpacing: 24,
    marginDays: 2, // marge en jours avant/après
    collapsedTaskCount: 6
  },

  // Configuration des fichiers
  file: {
    jsonExtension: '.json',
    xmlExtension: '.xml',
    defaultFilename: 'jira-report-data'
  },

  // Liste des projets par défaut (sera mise à jour dynamiquement)
  defaultProjects: [],

  // Liste des personnes par défaut (sera mise à jour dynamiquement)
  defaultPeople: []
};
