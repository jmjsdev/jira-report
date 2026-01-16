/**
 * Parser pour les exports XML de JIRA
 *
 * Format XML JIRA attendu:
 * <rss>
 *   <channel>
 *     <item>
 *       <key>PROJECT-123</key>
 *       <summary>Titre du ticket</summary>
 *       <type>Bug</type>
 *       <status id="1">Open</status>
 *       <priority id="3">Medium</priority>
 *       <assignee username="john">John Doe</assignee>
 *       <reporter username="jane">Jane Doe</reporter>
 *       <created>Mon, 15 Jan 2024 10:00:00 +0100</created>
 *       <updated>Mon, 20 Jan 2024 15:30:00 +0100</updated>
 *       <due>Mon, 01 Feb 2024 00:00:00 +0100</due>
 *       <resolution>Fixed</resolution>
 *       <labels>
 *         <label>label1</label>
 *         <label>label2</label>
 *       </labels>
 *       <component>Component Name</component>
 *       <description>Description du ticket</description>
 *       <project key="PROJ">Project Name</project>
 *       <customfields>
 *         <customfield>...</customfield>
 *       </customfields>
 *     </item>
 *   </channel>
 * </rss>
 */

import { Config } from '../config.js';
import { parseJiraDate } from '../utils/date.js';

/**
 * Parse un export XML JIRA et retourne un tableau de tickets
 * @param {string} xmlString - Contenu XML
 * @returns {object[]} Tableau de tickets parsés
 * @throws {Error} Si le XML est invalide
 */
export function parseJiraXml(xmlString) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

  // Vérifier les erreurs de parsing
  const parseError = xmlDoc.querySelector('parsererror');
  if (parseError) {
    throw new Error('XML invalide: ' + parseError.textContent.substring(0, 100));
  }

  const items = xmlDoc.querySelectorAll('item');
  const tickets = [];

  items.forEach(item => {
    const ticket = parseItem(item);
    if (ticket && ticket.key) {
      tickets.push(ticket);
    }
  });

  return tickets;
}

/**
 * Parse un élément <item> JIRA
 * @param {Element} item - Élément XML item
 * @returns {object} Ticket parsé
 */
function parseItem(item) {
  const getTextContent = (selector) => {
    const el = item.querySelector(selector);
    return el ? el.textContent.trim() : '';
  };

  const getAttribute = (selector, attr) => {
    const el = item.querySelector(selector);
    return el ? el.getAttribute(attr) || '' : '';
  };

  // Extraire les labels
  const labels = [];
  item.querySelectorAll('labels label').forEach(label => {
    const text = label.textContent.trim();
    if (text) labels.push(text);
  });

  // Extraire les composants (aussi ajoutés comme labels)
  const components = [];
  item.querySelectorAll('component').forEach(comp => {
    const text = comp.textContent.trim();
    if (text) {
      components.push(text);
    }
  });

  // Extraire les fix versions
  const fixVersions = [];
  item.querySelectorAll('fixVersion').forEach(v => {
    const text = v.textContent.trim();
    if (text) fixVersions.push(text);
  });

  // Parser les dates
  const createdDate = parseJiraDate(getTextContent('created'));
  const updatedDate = parseJiraDate(getTextContent('updated'));
  const dueDate = parseJiraDate(getTextContent('due'));

  // Récupérer le statut JIRA et le mapper
  const jiraStatus = getTextContent('status');
  const statusInfo = getStatusInfo(jiraStatus, labels);

  // Récupérer la priorité JIRA et la mapper
  const jiraPriority = getTextContent('priority');
  const priorityInfo = getPriorityInfo(jiraPriority);

  // Construire le ticket normalisé
  return {
    // Identifiants
    key: getTextContent('key'),
    id: getAttribute('key', 'id'),

    // Informations principales
    summary: getTextContent('summary'),
    description: getTextContent('description'),
    type: getTextContent('type'),

    // Statut
    status: jiraStatus,
    statusId: getAttribute('status', 'id'),
    statusKey: statusInfo.key,
    statusLabel: statusInfo.label,
    statusIconName: statusInfo.iconName,
    statusCssClass: statusInfo.cssClass,

    // Priorité
    priority: jiraPriority,
    priorityId: getAttribute('priority', 'id'),
    priorityValue: priorityInfo.value,
    priorityText: priorityInfo.text,
    priorityCssClass: priorityInfo.class,

    // Personnes
    assignee: getTextContent('assignee') || getAttribute('assignee', 'username'),
    reporter: getTextContent('reporter') || getAttribute('reporter', 'username'),

    // Projet
    project: getAttribute('project', 'key') || getTextContent('project'),
    projectName: getTextContent('project'),

    // Dates
    created: createdDate ? createdDate.toISOString() : null,
    updated: updatedDate ? updatedDate.toISOString() : null,
    dueDate: dueDate ? dueDate.toISOString() : null,

    // Résolution
    resolution: getTextContent('resolution'),

    // Labels et composants
    labels: labels,
    components: components,
    fixVersions: fixVersions,

    // Liens
    link: getTextContent('link')
  };
}

/**
 * Détermine le statut normalisé à partir du statut JIRA et des labels
 * @param {string} jiraStatus - Statut JIRA
 * @param {string[]} labels - Labels du ticket
 * @returns {object} Information de statut
 */
function getStatusInfo(jiraStatus, labels) {
  // D'abord vérifier le statut JIRA (case-insensitive)
  if (jiraStatus) {
    const statusKey = Object.keys(Config.statusMap).find(
      k => k.toLowerCase() === jiraStatus.toLowerCase()
    );
    if (statusKey) {
      return Config.statusMap[statusKey];
    }
  }

  // Ensuite vérifier les labels pour des indications de statut
  const labelsLower = labels.map(l => l.toLowerCase());
  for (const [labelPattern, statusKey] of Object.entries(Config.statusLabels)) {
    if (labelsLower.includes(labelPattern)) {
      // Trouver le statut correspondant dans statusMap
      for (const statusInfo of Object.values(Config.statusMap)) {
        if (statusInfo.key === statusKey) {
          return statusInfo;
        }
      }
    }
  }

  // Détection par mots-clés dans le statut JIRA (sauf "terminé" qui ne doit pas être auto-done)
  if (jiraStatus) {
    const statusLower = jiraStatus.toLowerCase();
    // Seulement "Done", "Closed", "Resolved" sont auto-done, PAS "terminé"
    if (statusLower === 'done' || statusLower === 'closed' || statusLower === 'resolved') {
      return { key: 'done', label: jiraStatus, iconName: 'checkCircle', cssClass: 'status-done' };
    }
    if (statusLower.includes('progress') || statusLower.includes('cours') || statusLower.includes('développ') || statusLower.includes('terminé')) {
      return { key: 'inprogress', label: jiraStatus, iconName: 'clock', cssClass: 'status-inprogress' };
    }
    if (statusLower.includes('review') || statusLower.includes('revue')) {
      return { key: 'review', label: jiraStatus, iconName: 'eye', cssClass: 'status-review' };
    }
    if (statusLower.includes('livr') || statusLower.includes('deliver')) {
      return { key: 'delivered', label: jiraStatus, iconName: 'check', cssClass: 'status-delivered' };
    }
    if (statusLower.includes('prêt') || statusLower.includes('ready') || statusLower.includes('test')) {
      return { key: 'ready', label: jiraStatus, iconName: 'playCircle', cssClass: 'status-ready' };
    }
    // Statut non reconnu - utiliser le label original avec style backlog
    return { key: 'backlog', label: jiraStatus, iconName: 'list', cssClass: 'status-backlog' };
  }

  // Statut par défaut
  return Config.defaultStatus;
}

/**
 * Détermine la priorité normalisée à partir de la priorité JIRA
 * @param {string} jiraPriority - Priorité JIRA
 * @returns {object} Information de priorité
 */
function getPriorityInfo(jiraPriority) {
  if (jiraPriority && Config.priorityMap[jiraPriority]) {
    return Config.priorityMap[jiraPriority];
  }

  // Priorité par défaut
  return { value: 3, text: 'Moyenne', class: 'medium' };
}

/**
 * Compare les tickets importés avec les tickets existants
 * @param {object[]} importedTickets - Tickets importés
 * @param {object[]} existingTasks - Tâches existantes
 * @returns {object} Résultat de la comparaison
 */
export function compareTickets(importedTickets, existingTasks) {
  const existingKeys = new Set(
    existingTasks.map(t => (t.key || '').toUpperCase())
  );

  const results = {
    new: [],
    existing: [],
    total: importedTickets.length
  };

  importedTickets.forEach(ticket => {
    const keyUpper = (ticket.key || '').toUpperCase();
    if (existingKeys.has(keyUpper)) {
      results.existing.push(ticket);
    } else {
      results.new.push(ticket);
    }
  });

  return results;
}

/**
 * Fusionne les tickets importés avec les tâches existantes
 * @param {object[]} importedTickets - Tickets importés
 * @param {object[]} existingTasks - Tâches existantes
 * @param {object} options - Options de fusion
 * @returns {object[]} Tâches fusionnées
 */
export function mergeTickets(importedTickets, existingTasks, options = {}) {
  const {
    updateExisting = true,  // Mettre à jour les tickets existants
    addNew = true           // Ajouter les nouveaux tickets
  } = options;

  // Créer un Map des tâches existantes par clé
  const existingMap = new Map(
    existingTasks.map(t => [(t.key || '').toUpperCase(), t])
  );

  const result = [...existingTasks];
  const addedKeys = new Set();

  importedTickets.forEach(ticket => {
    const keyUpper = (ticket.key || '').toUpperCase();

    if (existingMap.has(keyUpper)) {
      // Le ticket existe déjà
      if (updateExisting) {
        const index = result.findIndex(t => (t.key || '').toUpperCase() === keyUpper);
        if (index !== -1) {
          // Fusionner les données (garder certaines données locales)
          result[index] = {
            ...ticket,
            // Préserver les données locales qui ne viennent pas de JIRA
            localNotes: result[index].localNotes
          };
        }
      }
    } else if (addNew && !addedKeys.has(keyUpper)) {
      // Nouveau ticket
      result.push(ticket);
      addedKeys.add(keyUpper);
    }
  });

  return result;
}

/**
 * Valide un ticket parsé
 * @param {object} ticket - Ticket à valider
 * @returns {object} Résultat de validation
 */
export function validateTicket(ticket) {
  const errors = [];
  const warnings = [];

  if (!ticket.key) {
    errors.push('Clé manquante');
  }

  if (!ticket.summary) {
    warnings.push('Résumé manquant');
  }

  if (!ticket.status) {
    warnings.push('Statut manquant, utilisation du statut par défaut');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Extrait les métadonnées d'une liste de tickets
 * @param {object[]} tickets - Liste de tickets
 * @returns {object} Métadonnées extraites
 */
export function extractMetadata(tickets) {
  const projects = new Set();
  const people = new Set();
  const statuses = new Set();
  const priorities = new Set();
  const labels = new Map();
  const components = new Set();

  tickets.forEach(ticket => {
    if (ticket.project) projects.add(ticket.project);
    if (ticket.assignee) people.add(ticket.assignee);
    if (ticket.reporter) people.add(ticket.reporter);
    if (ticket.status) statuses.add(ticket.status);
    if (ticket.priority) priorities.add(ticket.priority);

    if (ticket.labels) {
      ticket.labels.forEach(label => {
        labels.set(label, (labels.get(label) || 0) + 1);
      });
    }

    if (ticket.components) {
      ticket.components.forEach(c => components.add(c));
    }
  });

  return {
    projects: Array.from(projects).sort(),
    people: Array.from(people).sort(),
    statuses: Array.from(statuses),
    priorities: Array.from(priorities),
    labels: labels,
    components: Array.from(components).sort()
  };
}
