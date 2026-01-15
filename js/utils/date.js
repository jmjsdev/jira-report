/**
 * Utilitaires pour la gestion des dates
 */

/**
 * Formate une date en format français
 * @param {string|Date} dateStr - Date à formater
 * @returns {string} Date formatée ou chaîne vide
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';

  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';

  // Ignorer les dates invalides de JIRA
  if (d.getFullYear() < 1970) return '';

  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Paris'
  });
}

/**
 * Formate une date courte (jour/mois)
 * @param {Date} date - Date à formater
 * @returns {string} Date formatée
 */
export function formatDateShort(date) {
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit'
  });
}

/**
 * Formate une date complète avec heure
 * @param {Date} date - Date à formater
 * @returns {string} Date et heure formatées
 */
export function formatDateTime(date) {
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Détermine la classe CSS selon la proximité de la date d'échéance
 * @param {string|Date} dateStr - Date d'échéance
 * @returns {string} Classe CSS ('overdue', 'soon', ou '')
 */
export function getDueClass(dateStr) {
  if (!dateStr) return '';

  const d = new Date(dateStr);
  if (isNaN(d.getTime()) || d.getFullYear() < 1970) return '';

  const now = new Date();
  const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'overdue';
  if (diffDays <= 3) return 'soon';
  return '';
}

/**
 * Normalise une date au début du jour (minuit)
 * @param {Date} date - Date à normaliser
 * @returns {Date} Date normalisée
 */
export function normalizeToMidnight(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Calcule le nombre de jours entre deux dates
 * @param {Date} start - Date de début
 * @param {Date} end - Date de fin
 * @returns {number} Nombre de jours
 */
export function daysBetween(start, end) {
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.ceil((end - start) / oneDay);
}

/**
 * Vérifie si une date est aujourd'hui
 * @param {Date} date - Date à vérifier
 * @returns {boolean}
 */
export function isToday(date) {
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
}

/**
 * Parse une date JIRA (format ISO ou autre)
 * @param {string} dateStr - Chaîne de date
 * @returns {Date|null} Date parsée ou null
 */
export function parseJiraDate(dateStr) {
  if (!dateStr) return null;

  // Essayer le parsing standard
  const d = new Date(dateStr);
  if (!isNaN(d.getTime()) && d.getFullYear() >= 1970) {
    return d;
  }

  return null;
}

/**
 * Génère une plage de dates
 * @param {Date} start - Date de début
 * @param {Date} end - Date de fin
 * @returns {Date[]} Tableau de dates
 */
export function generateDateRange(start, end) {
  const dates = [];
  const current = new Date(start);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}
