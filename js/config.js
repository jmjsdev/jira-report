/**
 * Configuration de l'application Jira Report
 */
export const Config = {
  // URLs externes
  urls: {
    ajir: 'https://ajir.axa-fr.intraxa/browse/'
  },

  // Mapping des priorités JIRA vers l'application
  priorityMap: {
    'Highest': { value: 5, text: 'Critique', class: 'critical' },
    'High': { value: 4, text: 'Haute', class: 'high' },
    'Medium': { value: 3, text: 'Moyenne', class: 'medium' },
    'Low': { value: 2, text: 'Basse', class: 'low' },
    'Lowest': { value: 1, text: 'Minimale', class: 'lowest' }
  },

  // Mapping des statuts JIRA vers l'application
  statusMap: {
    // Statuts JIRA standards
    'Open': { key: 'backlog', label: 'Backlog', icon: '📋', cssClass: 'status-backlog' },
    'To Do': { key: 'backlog', label: 'Backlog', icon: '📋', cssClass: 'status-backlog' },
    'Backlog': { key: 'backlog', label: 'Backlog', icon: '📋', cssClass: 'status-backlog' },
    'In Progress': { key: 'inprogress', label: 'En cours', icon: '⏳', cssClass: 'status-inprogress' },
    'En cours': { key: 'inprogress', label: 'En cours', icon: '⏳', cssClass: 'status-inprogress' },
    'In Review': { key: 'review', label: 'En revue', icon: '👀', cssClass: 'status-review' },
    'Ready for Test': { key: 'ready', label: 'Prêt à livrer', icon: '🚀', cssClass: 'status-ready' },
    'Prêt à livrer': { key: 'ready', label: 'Prêt à livrer', icon: '🚀', cssClass: 'status-ready' },
    'Done': { key: 'done', label: 'Terminé', icon: '✓', cssClass: 'status-done' },
    'Terminé': { key: 'done', label: 'Terminé', icon: '✓', cssClass: 'status-done' },
    'Closed': { key: 'done', label: 'Terminé', icon: '✓', cssClass: 'status-done' },
    'Resolved': { key: 'done', label: 'Terminé', icon: '✓', cssClass: 'status-done' },
    'Livré': { key: 'delivered', label: 'Livré', icon: '📦', cssClass: 'status-delivered' },
    'Delivered': { key: 'delivered', label: 'Livré', icon: '📦', cssClass: 'status-delivered' }
  },

  // Statut par défaut
  defaultStatus: { key: 'backlog', label: 'Backlog', icon: '📋', cssClass: 'status-backlog' },

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
