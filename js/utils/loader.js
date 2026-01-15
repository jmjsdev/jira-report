/**
 * Loader - Chargement dynamique de scripts JS à la demande
 */

// Map des modules disponibles
const MODULES = {
  zip: 'vendors/pako.min.js'
};

// Cache des scripts déjà chargés
const loaded = new Set();

// Cache des promesses en cours
const loading = new Map();

/**
 * Charge un module JS à la demande
 * @param {string} name - Nom du module (clé dans MODULES)
 * @returns {Promise<void>}
 */
export async function load(name) {
  const path = MODULES[name];

  if (!path) {
    throw new Error(`Module inconnu: ${name}`);
  }

  // Déjà chargé
  if (loaded.has(name)) {
    return;
  }

  // Chargement en cours
  if (loading.has(name)) {
    return loading.get(name);
  }

  // Charger le script
  const promise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = path;
    script.onload = () => {
      loaded.add(name);
      loading.delete(name);
      resolve();
    };
    script.onerror = () => {
      loading.delete(name);
      reject(new Error(`Échec du chargement: ${path}`));
    };
    document.head.appendChild(script);
  });

  loading.set(name, promise);
  return promise;
}

/**
 * Vérifie si un module est chargé
 * @param {string} name - Nom du module
 * @returns {boolean}
 */
export function isLoaded(name) {
  return loaded.has(name);
}

/**
 * Charge plusieurs modules en parallèle
 * @param {string[]} names - Noms des modules
 * @returns {Promise<void>}
 */
export async function loadAll(names) {
  await Promise.all(names.map(load));
}

export const Loader = { load, isLoaded, loadAll };
