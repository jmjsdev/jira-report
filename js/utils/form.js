/**
 * Utilitaires pour les formulaires
 */

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
