/**
 * Utilitaires pour la gestion des fichiers
 * Utilise l'API File System Access pour la sauvegarde directe
 */

/**
 * Vérifie si l'API File System Access est disponible
 * @returns {boolean}
 */
export function isFileSystemAccessSupported() {
  return 'showOpenFilePicker' in window && 'showSaveFilePicker' in window;
}

/**
 * Ouvre un sélecteur de fichier JSON
 * @returns {Promise<{handle: FileSystemFileHandle, content: object}>}
 */
export async function openJsonFile() {
  if (!isFileSystemAccessSupported()) {
    // Fallback pour les navigateurs non supportés
    return openJsonFileFallback();
  }

  const [handle] = await window.showOpenFilePicker({
    types: [{
      description: 'Fichiers JSON',
      accept: { 'application/json': ['.json'] }
    }],
    multiple: false
  });

  const file = await handle.getFile();
  const text = await file.text();
  const content = JSON.parse(text);

  return { handle, content };
}

/**
 * Fallback pour ouvrir un fichier JSON sans File System Access API
 * @returns {Promise<{handle: null, content: object}>}
 */
function openJsonFileFallback() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) {
        reject(new Error('Aucun fichier sélectionné'));
        return;
      }

      try {
        const text = await file.text();
        const content = JSON.parse(text);
        resolve({ handle: null, content, filename: file.name });
      } catch (err) {
        reject(new Error('Erreur lors de la lecture du fichier: ' + err.message));
      }
    };

    input.click();
  });
}

/**
 * Ouvre un sélecteur de fichier XML
 * @returns {Promise<{handle: FileSystemFileHandle, content: string}>}
 */
export async function openXmlFile() {
  if (!isFileSystemAccessSupported()) {
    return openXmlFileFallback();
  }

  const [handle] = await window.showOpenFilePicker({
    types: [{
      description: 'Fichiers XML',
      accept: { 'application/xml': ['.xml'], 'text/xml': ['.xml'] }
    }],
    multiple: false
  });

  const file = await handle.getFile();
  const content = await file.text();

  return { handle, content };
}

/**
 * Fallback pour ouvrir un fichier XML sans File System Access API
 * @returns {Promise<{handle: null, content: string}>}
 */
function openXmlFileFallback() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xml,application/xml,text/xml';

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) {
        reject(new Error('Aucun fichier sélectionné'));
        return;
      }

      try {
        const content = await file.text();
        resolve({ handle: null, content, filename: file.name });
      } catch (err) {
        reject(new Error('Erreur lors de la lecture du fichier: ' + err.message));
      }
    };

    input.click();
  });
}

/**
 * Sauvegarde dans un fichier existant (File System Access API)
 * @param {FileSystemFileHandle} handle - Handle du fichier
 * @param {object} data - Données à sauvegarder
 * @returns {Promise<void>}
 */
export async function saveToHandle(handle, data) {
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();
}

/**
 * Sauvegarde avec "Save As" (nouveau fichier)
 * @param {object} data - Données à sauvegarder
 * @param {string} suggestedName - Nom suggéré
 * @returns {Promise<FileSystemFileHandle>} Nouveau handle
 */
export async function saveAsJsonFile(data, suggestedName = 'jira-report-data.json') {
  if (!isFileSystemAccessSupported()) {
    downloadJson(data, suggestedName);
    return null;
  }

  const handle = await window.showSaveFilePicker({
    suggestedName,
    types: [{
      description: 'Fichiers JSON',
      accept: { 'application/json': ['.json'] }
    }]
  });

  await saveToHandle(handle, data);
  return handle;
}

/**
 * Télécharge un fichier JSON (méthode classique)
 * @param {object} data - Données à télécharger
 * @param {string} filename - Nom du fichier
 */
export function downloadJson(data, filename = 'jira-report-data.json') {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Lit un fichier texte
 * @param {File} file - Fichier à lire
 * @returns {Promise<string>} Contenu du fichier
 */
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'));
    reader.readAsText(file);
  });
}

/**
 * Vérifie si un fichier est de type XML
 * @param {File} file - Fichier à vérifier
 * @returns {boolean}
 */
export function isXmlFile(file) {
  return file.name.endsWith('.xml') ||
         file.type === 'text/xml' ||
         file.type === 'application/xml';
}

/**
 * Vérifie si un fichier est de type JSON
 * @param {File} file - Fichier à vérifier
 * @returns {boolean}
 */
export function isJsonFile(file) {
  return file.name.endsWith('.json') ||
         file.type === 'application/json';
}

/**
 * Génère un nom de fichier avec timestamp
 * @param {string} base - Base du nom
 * @param {string} ext - Extension
 * @returns {string} Nom de fichier
 */
export function generateFilename(base = 'jira-report', ext = 'json') {
  const date = new Date();
  const timestamp = date.toISOString().slice(0, 10);
  return `${base}-${timestamp}.${ext}`;
}
