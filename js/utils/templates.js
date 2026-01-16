/**
 * Templates - Chargement et cache de templates HTML
 */

import { templates as bundledTemplates } from '../templates-bundle.js';
import { Icons } from './icons.js';

// Cache des templates chargés
const cache = new Map();

/**
 * Charge un template HTML
 * @param {string} name - Nom du template (chemin relatif sans extension)
 * @returns {Promise<string>} - Contenu du template
 */
export async function load(name) {
  // Déjà en cache
  if (cache.has(name)) {
    return cache.get(name);
  }

  // Chercher dans le bundle
  let template = bundledTemplates[name];
  if (!template) {
    throw new Error(`Template non trouvé: ${name}`);
  }

  // Remplacer les icônes {{icon:name}}
  template = template.replace(/\{\{icon:(\w+)\}\}/g, (match, iconName) => {
    return Icons[iconName] || '';
  });

  cache.set(name, template);
  return template;
}

/**
 * Charge et interpole un template avec des données
 * @param {string} name - Nom du template
 * @param {Object} data - Données pour l'interpolation
 * @returns {Promise<string>} - HTML interpolé
 */
export async function render(name, data = {}) {
  const template = await load(name);
  return interpolate(template, data);
}

/**
 * Interpole les variables dans un template
 * Syntaxe: {{variable}} ou {{variable.nested}}
 * @param {string} template - Template HTML
 * @param {Object} data - Données
 * @returns {string} - HTML interpolé
 */
export function interpolate(template, data) {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, key) => {
    const value = key.split('.').reduce((obj, k) => obj?.[k], data);
    return value !== undefined ? escapeHtml(value) : '';
  });
}

/**
 * Interpole sans échapper (pour HTML brut)
 * Syntaxe: {{{variable}}}
 * @param {string} template - Template HTML
 * @param {Object} data - Données
 * @returns {string} - HTML interpolé
 */
export function interpolateRaw(template, data) {
  // D'abord les raw {{{...}}}
  let result = template.replace(/\{\{\{(\w+(?:\.\w+)*)\}\}\}/g, (match, key) => {
    const value = key.split('.').reduce((obj, k) => obj?.[k], data);
    return value !== undefined ? value : '';
  });
  // Puis les normaux {{...}}
  return interpolate(result, data);
}

/**
 * Échappe les caractères HTML
 * @param {*} value - Valeur à échapper
 * @returns {string}
 */
function escapeHtml(value) {
  const str = String(value);
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return str.replace(/[&<>"']/g, c => map[c]);
}

/**
 * Précharge plusieurs templates
 * @param {string[]} names - Noms des templates
 * @returns {Promise<void>}
 */
export async function preload(names) {
  await Promise.all(names.map(load));
}

/**
 * Vide le cache (utile pour le dev)
 */
export function clearCache() {
  cache.clear();
}

/**
 * Vérifie si un template est en cache
 * @param {string} name - Nom du template
 * @returns {boolean}
 */
export function isCached(name) {
  return cache.has(name);
}

export const Templates = {
  load,
  render,
  interpolate,
  interpolateRaw,
  preload,
  clearCache,
  isCached
};
