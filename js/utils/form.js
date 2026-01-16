/**
 * Utilitaires pour les formulaires
 */

import { icon } from './icons.js';

/**
 * Liste des statuts disponibles
 */
export const STATUS_OPTIONS = [
  { value: 'backlog', label: 'Backlog', iconName: 'list' },
  { value: 'inprogress', label: 'En cours', iconName: 'clock' },
  { value: 'review', label: 'En revue', iconName: 'eye' },
  { value: 'ready', label: 'Prêt', iconName: 'playCircle' },
  { value: 'delivered', label: 'Livré', iconName: 'check' },
  { value: 'done', label: 'Terminé', iconName: 'checkCircle' }
];

/**
 * Options de date rapide
 */
export const DATE_QUICK_OPTIONS = [
  { value: 'today', label: "Auj." },
  { value: 'tomorrow', label: 'Demain' },
  { value: '+3', label: 'J+3' },
  { value: '+7', label: 'J+7' },
  { value: 'next-monday', label: 'Lundi' },
  { value: 'end-month', label: 'Fin mois' }
];

/**
 * Génère le HTML d'un date picker avec boutons rapides
 * @param {object} options - Options
 * @param {string} options.id - ID de l'input date
 * @param {string} options.value - Valeur initiale (format YYYY-MM-DD)
 * @param {string} options.className - Classes CSS additionnelles
 * @param {boolean} options.inline - Mode inline (compact) ou block
 * @returns {string} HTML du date picker
 */
export function renderDatePicker({ id = 'date-picker', value = '', className = '', inline = false }) {
  const containerClass = inline ? 'date-picker date-picker-inline' : 'date-picker';
  const btnClass = inline ? 'date-quick-btn date-quick-btn-sm' : 'date-quick-btn';

  const buttonsHtml = DATE_QUICK_OPTIONS.map(opt =>
    `<button type="button" class="${btnClass}" data-date="${opt.value}">${opt.label}</button>`
  ).join('');

  return `
    <div class="${containerClass} ${className}">
      <input type="date" id="${id}" class="date-picker-input" value="${value}">
      <div class="date-quick-buttons">
        ${buttonsHtml}
        <button type="button" class="${btnClass} date-quick-btn-clear" data-date="clear">${icon('x')}</button>
      </div>
    </div>
  `;
}

/**
 * Calcule la date cible à partir d'un type de date rapide
 * @param {string} dateType - Type de date (today, tomorrow, +3, +7, next-monday, end-month, clear)
 * @returns {Date|null} Date cible ou null pour clear
 */
export function calculateQuickDate(dateType) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (dateType) {
    case 'today':
      return today;
    case 'tomorrow':
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    case '+3':
      const plus3 = new Date(today);
      plus3.setDate(plus3.getDate() + 3);
      return plus3;
    case '+7':
      const plus7 = new Date(today);
      plus7.setDate(plus7.getDate() + 7);
      return plus7;
    case 'next-monday':
      const nextMonday = new Date(today);
      const dayOfWeek = nextMonday.getDay();
      const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
      nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
      return nextMonday;
    case 'end-month':
      return new Date(today.getFullYear(), today.getMonth() + 1, 0);
    case 'clear':
      return null;
    default:
      return null;
  }
}

/**
 * Applique une date rapide à un input date
 * @param {string} dateType - Type de date
 * @param {HTMLInputElement} input - Input date
 */
export function applyQuickDate(dateType, input) {
  if (!input) return;

  if (dateType === 'clear') {
    input.value = '';
    return;
  }

  const targetDate = calculateQuickDate(dateType);
  if (targetDate) {
    input.value = targetDate.toISOString().split('T')[0];
  }
}

/**
 * Liste des priorités disponibles
 */
export const PRIORITY_OPTIONS = [
  { value: 'Highest', label: 'Critique' },
  { value: 'High', label: 'Haute' },
  { value: 'Medium', label: 'Moyenne' },
  { value: 'Low', label: 'Basse' },
  { value: 'Lowest', label: 'Minimale' }
];

/**
 * Génère le HTML d'un select
 * @param {object} options - Options du select
 * @param {string} options.id - ID du select
 * @param {string} options.name - Nom du select
 * @param {string} options.className - Classes CSS
 * @param {Array} options.options - Options du select [{value, label}]
 * @param {string} options.value - Valeur sélectionnée
 * @param {string} options.placeholder - Placeholder (première option désactivée)
 * @returns {string} HTML du select
 */
export function renderSelect({ id, name, className = '', options = [], value = '', placeholder = '' }) {
  const optionsHtml = options.map(opt => {
    const selected = opt.value === value ? 'selected' : '';
    return `<option value="${opt.value}" ${selected}>${opt.label}</option>`;
  }).join('');

  const placeholderHtml = placeholder
    ? `<option value="" disabled ${!value ? 'selected' : ''}>${placeholder}</option>`
    : '';

  return `
    <select id="${id || ''}" name="${name || ''}" class="${className}">
      ${placeholderHtml}
      ${optionsHtml}
    </select>
  `;
}

/**
 * Génère un select de statut
 * @param {object} options - Options
 * @param {string} options.id - ID du select
 * @param {string} options.value - Valeur sélectionnée
 * @param {string} options.className - Classes CSS additionnelles
 * @returns {string} HTML du select
 */
export function renderStatusSelect({ id = 'status-select', value = '', className = '' }) {
  return renderSelect({
    id,
    className: `status-select ${className}`.trim(),
    options: STATUS_OPTIONS,
    value,
    placeholder: '-- Choisir un statut --'
  });
}

/**
 * Génère un select de priorité
 * @param {object} options - Options
 * @param {string} options.id - ID du select
 * @param {string} options.value - Valeur sélectionnée
 * @param {string} options.className - Classes CSS additionnelles
 * @returns {string} HTML du select
 */
export function renderPrioritySelect({ id = 'priority-select', value = '', className = '' }) {
  return renderSelect({
    id,
    className: `priority-select ${className}`.trim(),
    options: PRIORITY_OPTIONS,
    value,
    placeholder: '-- Choisir une priorité --'
  });
}

/**
 * Retourne les infos d'un statut par sa clé
 * @param {string} statusKey - Clé du statut
 * @returns {object|null} Info du statut
 */
export function getStatusInfo(statusKey) {
  return STATUS_OPTIONS.find(s => s.value === statusKey) || null;
}

/**
 * Retourne les infos d'une priorité par sa valeur
 * @param {string} priorityValue - Valeur de la priorité
 * @returns {object|null} Info de la priorité
 */
export function getPriorityInfo(priorityValue) {
  return PRIORITY_OPTIONS.find(p => p.value === priorityValue) || null;
}
