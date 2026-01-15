/**
 * Module de debug pour les environnements d'entreprise
 * Affiche les logs directement dans l'interface sans nécessiter la console
 * Les logs sont persistés dans localStorage et peuvent être exportés
 */

// Clé localStorage
const STORAGE_KEY = 'jira-report-debug-logs';
const MAX_LOGS = 500;

// Stockage des logs
let _logs = [];
let _debugPanel = null;
let _debugEnabled = true;
let _persistLogs = true;

/**
 * Charge les logs depuis localStorage
 */
function loadLogsFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      _logs = JSON.parse(stored);
    }
  } catch (e) {
    // localStorage peut être bloqué
    _persistLogs = false;
  }
}

/**
 * Sauvegarde les logs dans localStorage
 */
function saveLogsToStorage() {
  if (!_persistLogs) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_logs));
  } catch (e) {
    _persistLogs = false;
  }
}

/**
 * Crée le panneau de debug dans l'UI
 */
function createDebugPanel() {
  if (_debugPanel) return _debugPanel;

  try {
    _debugPanel = document.createElement('div');
    _debugPanel.id = 'debug-panel';
    _debugPanel.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      max-height: 250px;
      overflow-y: auto;
      background: #1a1a2e;
      color: #0f0;
      font-family: monospace;
      font-size: 11px;
      padding: 8px;
      z-index: 99999;
      border-top: 2px solid #ff0;
      display: none;
    `;

    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px solid #333; padding-bottom: 4px;';
    header.innerHTML = `
      <span style="color: #ff0; font-weight: bold;">DEBUG PANEL (Ctrl+D pour toggle)</span>
      <span>
        <button id="debug-export" style="background:#333;color:#fff;border:none;padding:2px 8px;cursor:pointer;margin-right:4px;">Export</button>
        <button id="debug-clear" style="background:#333;color:#fff;border:none;padding:2px 8px;cursor:pointer;margin-right:4px;">Clear</button>
        <button id="debug-close" style="background:#333;color:#fff;border:none;padding:2px 8px;cursor:pointer;">X</button>
      </span>
    `;
    _debugPanel.appendChild(header);

    const content = document.createElement('div');
    content.id = 'debug-content';
    _debugPanel.appendChild(content);

    document.body.appendChild(_debugPanel);

    // Event listeners
    document.getElementById('debug-close').onclick = () => hideDebugPanel();
    document.getElementById('debug-clear').onclick = () => clearLogs();
    document.getElementById('debug-export').onclick = () => exportLogs();

    // Raccourci Ctrl+D
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        toggleDebugPanel();
      }
    });

    return _debugPanel;
  } catch (e) {
    // Si même la création du panel échoue, on continue sans debug
    return null;
  }
}

/**
 * Affiche le panneau de debug
 */
export function showDebugPanel() {
  const panel = createDebugPanel();
  if (panel) {
    panel.style.display = 'block';
    renderLogs();
  }
}

/**
 * Cache le panneau de debug
 */
export function hideDebugPanel() {
  if (_debugPanel) {
    _debugPanel.style.display = 'none';
  }
}

/**
 * Toggle le panneau de debug
 */
export function toggleDebugPanel() {
  if (_debugPanel && _debugPanel.style.display !== 'none') {
    hideDebugPanel();
  } else {
    showDebugPanel();
  }
}

/**
 * Rend les logs dans le panneau
 */
function renderLogs() {
  const content = document.getElementById('debug-content');
  if (!content) return;

  content.innerHTML = _logs.map(log => {
    const color = log.level === 'error' ? '#f55' :
                  log.level === 'warn' ? '#fa0' :
                  log.level === 'success' ? '#5f5' : '#0f0';
    return `<div style="color:${color};margin:2px 0;word-break:break-all;">[${log.time}] ${log.level.toUpperCase()}: ${log.message}</div>`;
  }).join('');

  content.scrollTop = content.scrollHeight;
}

/**
 * Ajoute un log
 */
function addLog(level, message) {
  const now = new Date();
  const time = now.toLocaleTimeString();
  const timestamp = now.toISOString();

  _logs.push({ time, timestamp, level, message: String(message) });

  // Garder seulement les MAX_LOGS derniers logs
  if (_logs.length > MAX_LOGS) {
    _logs.shift();
  }

  // Persister immédiatement dans localStorage
  saveLogsToStorage();

  // Mettre à jour le panneau si visible
  if (_debugPanel && _debugPanel.style.display !== 'none') {
    renderLogs();
  }

  // Aussi logger dans la console si disponible
  try {
    console[level === 'success' ? 'log' : level](message);
  } catch (e) {
    // Console peut ne pas être disponible
  }
}

/**
 * Exporte les logs en fichier téléchargeable
 */
export function exportLogs() {
  try {
    const content = _logs.map(log =>
      `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`
    ).join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jira-report-debug-${new Date().toISOString().slice(0, 10)}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    alert('Export failed: ' + e.message);
  }
}

/**
 * Efface les logs
 */
export function clearLogs() {
  _logs.length = 0;
  renderLogs();
}

/**
 * Log info
 */
export function log(message) {
  addLog('info', message);
}

/**
 * Log warning
 */
export function warn(message) {
  addLog('warn', message);
}

/**
 * Log error
 */
export function error(message) {
  addLog('error', message);
}

/**
 * Log success
 */
export function success(message) {
  addLog('success', message);
}

/**
 * Wrapper pour exécuter du code avec gestion d'erreur et logging
 */
export function safeExecute(name, fn) {
  return async (...args) => {
    log(`>>> ${name} START`);
    try {
      const result = await fn(...args);
      success(`<<< ${name} OK`);
      return result;
    } catch (err) {
      error(`<<< ${name} FAILED: ${err.message || err}`);
      throw err;
    }
  };
}

/**
 * Wrapper synchrone
 */
export function safeExecuteSync(name, fn) {
  return (...args) => {
    log(`>>> ${name} START`);
    try {
      const result = fn(...args);
      success(`<<< ${name} OK`);
      return result;
    } catch (err) {
      error(`<<< ${name} FAILED: ${err.message || err}`);
      throw err;
    }
  };
}

/**
 * Initialise le debug au chargement
 */
export function initDebug() {
  // Charger les logs précédents
  loadLogsFromStorage();

  log('=== JIRA REPORT DEBUG SESSION START ===');
  log('User Agent: ' + (navigator.userAgent || 'unknown'));
  log('Platform: ' + (navigator.platform || 'unknown'));

  // Détecter les APIs disponibles
  log('File System Access API: ' + ('showOpenFilePicker' in window));
  log('IndexedDB: ' + ('indexedDB' in window));
  log('localStorage: ' + (typeof localStorage !== 'undefined'));

  // Capturer les erreurs globales
  try {
    window.addEventListener('error', (e) => {
      error(`GLOBAL ERROR: ${e.message} at ${e.filename}:${e.lineno}`);
      showDebugPanel(); // Afficher automatiquement en cas d'erreur
    });

    window.addEventListener('unhandledrejection', (e) => {
      error(`UNHANDLED REJECTION: ${e.reason}`);
      showDebugPanel(); // Afficher automatiquement en cas d'erreur
    });
    log('Global error handlers attached');
  } catch (e) {
    error('Failed to attach error handlers: ' + e.message);
  }
}

// Export un objet Debug pour usage facile
export const Debug = {
  log,
  warn,
  error,
  success,
  show: showDebugPanel,
  hide: hideDebugPanel,
  toggle: toggleDebugPanel,
  clear: clearLogs,
  export: exportLogs,
  init: initDebug,
  safeExecute,
  safeExecuteSync
};
