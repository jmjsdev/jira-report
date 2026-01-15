/**
 * Utilitaires pour la gestion des fichiers
 * Utilise l'API File System Access pour la sauvegarde directe
 *
 * Note: Dans les environnements d'entreprise (Edge managé), certaines APIs
 * peuvent être bloquées par politique. Ce module gère ces cas gracieusement.
 */

// Flag pour désactiver File System Access si détecté comme bloqué
let _fileSystemAccessBlocked = false;

// Flag pour désactiver IndexedDB si détecté comme bloqué
let _indexedDBBlocked = false;

/**
 * Vérifie si l'API File System Access est disponible et fonctionnelle
 * @returns {boolean}
 */
export function isFileSystemAccessSupported() {
  if (_fileSystemAccessBlocked) return false;
  return 'showOpenFilePicker' in window && 'showSaveFilePicker' in window;
}

/**
 * Vérifie si IndexedDB est disponible et fonctionnel
 * @returns {boolean}
 */
export function isIndexedDBSupported() {
  if (_indexedDBBlocked) return false;
  return 'indexedDB' in window;
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

  try {
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
  } catch (err) {
    // Si l'API est bloquée par politique d'entreprise, utiliser le fallback
    if (err.name === 'SecurityError' || err.name === 'NotAllowedError' ||
        err.message?.includes('blocked') || err.message?.includes('policy')) {
      console.warn('File System Access API bloquée, utilisation du fallback');
      _fileSystemAccessBlocked = true;
      return openJsonFileFallback();
    }
    throw err;
  }
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

  try {
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
  } catch (err) {
    // Si l'API est bloquée par politique d'entreprise, utiliser le fallback
    if (err.name === 'SecurityError' || err.name === 'NotAllowedError' ||
        err.message?.includes('blocked') || err.message?.includes('policy')) {
      console.warn('File System Access API bloquée, utilisation du fallback');
      _fileSystemAccessBlocked = true;
      return openXmlFileFallback();
    }
    throw err;
  }
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

  try {
    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: [{
        description: 'Fichiers JSON',
        accept: { 'application/json': ['.json'] }
      }]
    });

    await saveToHandle(handle, data);
    return handle;
  } catch (err) {
    // Si l'API est bloquée par politique d'entreprise, utiliser le téléchargement
    if (err.name === 'SecurityError' || err.name === 'NotAllowedError' ||
        err.message?.includes('blocked') || err.message?.includes('policy')) {
      console.warn('File System Access API bloquée, utilisation du téléchargement');
      _fileSystemAccessBlocked = true;
      downloadJson(data, suggestedName);
      return null;
    }
    throw err;
  }
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

// ========================================
// Persistance du FileHandle dans IndexedDB
// ========================================

const DB_NAME = 'jira-report-db';
const DB_VERSION = 1;
const STORE_NAME = 'file-handles';

/**
 * Ouvre la base IndexedDB
 * @returns {Promise<IDBDatabase>}
 */
function openDatabase() {
  return new Promise((resolve, reject) => {
    // Vérifier si IndexedDB est disponible
    if (!isIndexedDBSupported()) {
      reject(new Error('IndexedDB non disponible'));
      return;
    }

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      // Timeout de sécurité (certains environnements bloquent silencieusement)
      const timeout = setTimeout(() => {
        _indexedDBBlocked = true;
        reject(new Error('IndexedDB timeout - probablement bloqué'));
      }, 3000);

      request.onerror = () => {
        clearTimeout(timeout);
        // Marquer IndexedDB comme bloqué si erreur de sécurité
        if (request.error?.name === 'SecurityError' ||
            request.error?.message?.includes('blocked')) {
          _indexedDBBlocked = true;
        }
        reject(request.error);
      };

      request.onsuccess = () => {
        clearTimeout(timeout);
        resolve(request.result);
      };

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onblocked = () => {
        clearTimeout(timeout);
        _indexedDBBlocked = true;
        reject(new Error('IndexedDB bloqué'));
      };
    } catch (err) {
      _indexedDBBlocked = true;
      reject(err);
    }
  });
}

/**
 * Sauvegarde le file handle dans IndexedDB
 * @param {FileSystemFileHandle} handle - Handle à sauvegarder
 * @returns {Promise<void>}
 */
export async function saveFileHandle(handle) {
  if (!handle || !isIndexedDBSupported()) return;

  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(handle, 'lastFile');
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (err) {
    // Silencieux - la fonctionnalité n'est pas critique
    console.warn('Impossible de sauvegarder le file handle:', err);
  }
}

/**
 * Récupère le file handle depuis IndexedDB
 * @returns {Promise<FileSystemFileHandle|null>}
 */
export async function getStoredFileHandle() {
  if (!isIndexedDBSupported()) return null;

  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get('lastFile');

    const handle = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    db.close();
    return handle || null;
  } catch (err) {
    // Silencieux - la fonctionnalité n'est pas critique
    console.warn('Impossible de récupérer le file handle:', err);
    return null;
  }
}

/**
 * Supprime le file handle stocké
 * @returns {Promise<void>}
 */
export async function clearStoredFileHandle() {
  if (!isIndexedDBSupported()) return;

  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete('lastFile');
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (err) {
    // Silencieux - la fonctionnalité n'est pas critique
    console.warn('Impossible de supprimer le file handle:', err);
  }
}

/**
 * Tente de recharger le dernier fichier ouvert
 * @returns {Promise<{success: boolean, handle?: FileSystemFileHandle, content?: object}>}
 */
export async function tryLoadLastFile() {
  // Si File System Access ou IndexedDB sont bloqués, ne pas tenter
  if (!isFileSystemAccessSupported() || !isIndexedDBSupported()) {
    return { success: false };
  }

  let handle;
  try {
    handle = await getStoredFileHandle();
  } catch (err) {
    console.warn('Erreur récupération handle:', err);
    return { success: false };
  }

  if (!handle) {
    return { success: false };
  }

  try {
    // Vérifier/demander la permission avec timeout
    const permissionPromise = handle.queryPermission({ mode: 'readwrite' });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Permission timeout')), 2000)
    );

    let permission;
    try {
      permission = await Promise.race([permissionPromise, timeoutPromise]);
    } catch (err) {
      console.warn('Permission check failed:', err);
      _fileSystemAccessBlocked = true;
      return { success: false };
    }

    if (permission !== 'granted') {
      try {
        const requestResult = await handle.requestPermission({ mode: 'readwrite' });
        if (requestResult !== 'granted') {
          return { success: false };
        }
      } catch (err) {
        console.warn('Permission request failed:', err);
        _fileSystemAccessBlocked = true;
        return { success: false };
      }
    }

    // Lire le fichier
    const file = await handle.getFile();
    const text = await file.text();
    const content = JSON.parse(text);

    return { success: true, handle, content, filename: file.name };
  } catch (err) {
    console.warn('Impossible de recharger le fichier:', err);
    // Ne pas essayer de clear si IndexedDB pose problème
    try {
      await clearStoredFileHandle();
    } catch (e) {
      // Ignorer
    }
    return { success: false };
  }
}
