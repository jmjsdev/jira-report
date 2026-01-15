(() => {
  // js/services/user-config.js
  var _stateRef = null;
  var UserConfigService = class {
    constructor() {
      this._listeners = /* @__PURE__ */ new Set();
    }
    /**
     * Connecte le service au State (appelé par State)
     */
    connectToState(state) {
      _stateRef = state;
    }
    /**
     * Retourne la config depuis le State
     */
    _getConfig() {
      if (!_stateRef) {
        return this._getDefaultConfig();
      }
      return _stateRef._userConfig || this._getDefaultConfig();
    }
    /**
     * Met à jour la config dans le State
     */
    _setConfig(config) {
      if (_stateRef) {
        _stateRef._userConfig = config;
        _stateRef._hasUnsavedChanges = true;
        _stateRef._notify("userConfig");
        _stateRef._notify("unsavedChanges");
      }
      this._notify();
    }
    /**
     * Config par défaut
     */
    _getDefaultConfig() {
      return {
        customTags: [],
        projectRules: [],
        blacklist: []
      };
    }
    // ========================================
    // Getters
    // ========================================
    get customTags() {
      return [...this._getConfig().customTags || []];
    }
    get projectRules() {
      const rules = this._getConfig().projectRules || [];
      return rules.map((r) => ({ ...r, patterns: [...r.patterns] }));
    }
    get blacklist() {
      return [...this._getConfig().blacklist || []];
    }
    // ========================================
    // Tags personnalisés
    // ========================================
    addCustomTag(tag) {
      const config = { ...this._getConfig() };
      const normalizedTag = tag.trim();
      if (normalizedTag && !config.customTags.includes(normalizedTag)) {
        config.customTags = [...config.customTags, normalizedTag];
        this._setConfig(config);
        return true;
      }
      return false;
    }
    removeCustomTag(tag) {
      const config = { ...this._getConfig() };
      const index = config.customTags.indexOf(tag);
      if (index !== -1) {
        config.customTags = config.customTags.filter((t) => t !== tag);
        this._setConfig(config);
        return true;
      }
      return false;
    }
    // ========================================
    // Règles de projet
    // ========================================
    addProjectRule(name, patterns = []) {
      const config = { ...this._getConfig() };
      const normalizedName = name.trim();
      const nameLower = normalizedName.toLowerCase();
      const existingIndex = config.projectRules.findIndex((r) => r.name.toLowerCase() === nameLower);
      if (existingIndex !== -1) {
        const existingRule = config.projectRules[existingIndex];
        patterns.forEach((p) => {
          const normalizedPattern = p.trim().toLowerCase();
          if (normalizedPattern && !existingRule.patterns.some((ep) => ep.toLowerCase() === normalizedPattern)) {
            existingRule.patterns.push(normalizedPattern);
          }
        });
        config.projectRules = [...config.projectRules];
      } else {
        config.projectRules = [...config.projectRules, {
          name: normalizedName,
          patterns: patterns.map((p) => p.trim().toLowerCase()).filter((p) => p)
        }];
      }
      this._setConfig(config);
      return true;
    }
    removeProjectRule(name) {
      const config = { ...this._getConfig() };
      const nameLower = name.toLowerCase();
      const index = config.projectRules.findIndex((r) => r.name.toLowerCase() === nameLower);
      if (index !== -1) {
        config.projectRules = config.projectRules.filter((r) => r.name.toLowerCase() !== nameLower);
        this._setConfig(config);
        return true;
      }
      return false;
    }
    renameProject(oldName, newName) {
      const config = { ...this._getConfig() };
      const oldNameLower = oldName.toLowerCase();
      const rule = config.projectRules.find((r) => r.name.toLowerCase() === oldNameLower);
      if (rule && newName.trim()) {
        rule.name = newName.trim();
        config.projectRules = [...config.projectRules];
        this._setConfig(config);
        return true;
      }
      return false;
    }
    addPatternToProject(projectName, pattern) {
      const config = { ...this._getConfig() };
      const projectNameLower = projectName.toLowerCase();
      const rule = config.projectRules.find((r) => r.name.toLowerCase() === projectNameLower);
      const normalizedPattern = pattern.trim().toLowerCase();
      if (rule && normalizedPattern && !rule.patterns.includes(normalizedPattern)) {
        rule.patterns.push(normalizedPattern);
        config.projectRules = [...config.projectRules];
        this._setConfig(config);
        return true;
      }
      return false;
    }
    removePatternFromProject(projectName, pattern) {
      const config = { ...this._getConfig() };
      const projectNameLower = projectName.toLowerCase();
      const rule = config.projectRules.find((r) => r.name.toLowerCase() === projectNameLower);
      if (rule) {
        const patternLower = pattern.toLowerCase();
        const index = rule.patterns.findIndex((p) => p.toLowerCase() === patternLower);
        if (index !== -1) {
          rule.patterns.splice(index, 1);
          config.projectRules = [...config.projectRules];
          this._setConfig(config);
          return true;
        }
      }
      return false;
    }
    /**
     * Détecte le projet d'un ticket basé sur son titre
     * Priorité: texte entre crochets [] > reste du titre
     */
    detectProjectFromTitle(title) {
      if (!title) return null;
      const titleLower = title.toLowerCase();
      const rules = this._getConfig().projectRules || [];
      const bracketMatches = title.match(/\[([^\]]+)\]/g);
      const bracketTexts = bracketMatches ? bracketMatches.map((m) => m.slice(1, -1).toLowerCase()) : [];
      for (const rule of rules) {
        for (const pattern of rule.patterns) {
          for (const bracketText of bracketTexts) {
            if (bracketText.includes(pattern) || pattern.includes(bracketText)) {
              return rule.name;
            }
          }
        }
      }
      for (const rule of rules) {
        for (const pattern of rule.patterns) {
          if (titleLower.includes(pattern)) {
            return rule.name;
          }
        }
      }
      return null;
    }
    // ========================================
    // Blacklist
    // ========================================
    addToBlacklist(ticketKey) {
      const config = { ...this._getConfig() };
      const normalizedKey = ticketKey.trim().toUpperCase();
      if (normalizedKey && !config.blacklist.includes(normalizedKey)) {
        config.blacklist = [...config.blacklist, normalizedKey];
        this._setConfig(config);
        return true;
      }
      return false;
    }
    removeFromBlacklist(ticketKey) {
      const config = { ...this._getConfig() };
      const normalizedKey = ticketKey.trim().toUpperCase();
      const index = config.blacklist.indexOf(normalizedKey);
      if (index !== -1) {
        config.blacklist = config.blacklist.filter((k) => k !== normalizedKey);
        this._setConfig(config);
        return true;
      }
      return false;
    }
    isBlacklisted(ticketKey) {
      if (!ticketKey) return false;
      const blacklist = this._getConfig().blacklist || [];
      return blacklist.includes(ticketKey.toUpperCase());
    }
    // ========================================
    // Reset
    // ========================================
    reset() {
      this._setConfig(this._getDefaultConfig());
    }
    // ========================================
    // Import / Export
    // ========================================
    /**
     * Exporte la configuration en JSON
     * @returns {string} JSON de la configuration
     */
    exportConfig() {
      const config = this._getConfig();
      return JSON.stringify({
        version: "1.0",
        exportDate: (/* @__PURE__ */ new Date()).toISOString(),
        config
      }, null, 2);
    }
    /**
     * Importe une configuration depuis JSON
     * @param {string} jsonString - JSON de la configuration
     * @returns {object} Résultat de l'import
     */
    importConfig(jsonString) {
      try {
        const data = JSON.parse(jsonString);
        if (!data.config) {
          return { success: false, error: "Format invalide: config manquante" };
        }
        const newConfig = {
          customTags: data.config.customTags || [],
          projectRules: data.config.projectRules || [],
          blacklist: data.config.blacklist || []
        };
        this._setConfig(newConfig);
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
    // ========================================
    // Événements
    // ========================================
    subscribe(callback) {
      this._listeners.add(callback);
      return () => this._listeners.delete(callback);
    }
    _notify() {
      this._listeners.forEach((cb) => {
        try {
          cb(this);
        } catch (e) {
          console.error("Erreur callback config:", e);
        }
      });
    }
  };
  var UserConfig = new UserConfigService();

  // js/state.js
  var AppState = class {
    constructor() {
      this._tasks = [];
      this._projects = /* @__PURE__ */ new Set();
      this._people = /* @__PURE__ */ new Set();
      this._tags = /* @__PURE__ */ new Map();
      this._userConfig = {
        customTags: [],
        projectRules: [],
        blacklist: []
      };
      this._filters = {
        project: "all",
        person: null,
        tag: null,
        showDone: true,
        showLabelDone: true,
        search: ""
      };
      this._viewMode = "project";
      this._currentFileHandle = null;
      this._hasUnsavedChanges = false;
      this._listeners = /* @__PURE__ */ new Map();
      UserConfig.connectToState(this);
    }
    // ========================================
    // Getters
    // ========================================
    get tasks() {
      return this._tasks;
    }
    get projects() {
      return Array.from(this._projects).sort();
    }
    get people() {
      return Array.from(this._people).sort();
    }
    get tags() {
      return this._tags;
    }
    get filters() {
      return { ...this._filters };
    }
    get viewMode() {
      return this._viewMode;
    }
    get currentFileHandle() {
      return this._currentFileHandle;
    }
    get hasUnsavedChanges() {
      return this._hasUnsavedChanges;
    }
    // ========================================
    // Setters avec notifications
    // ========================================
    setTasks(tasks) {
      this._tasks = tasks;
      this._extractMetadata();
      this._notify("tasks");
    }
    addTask(task) {
      this._tasks.push(task);
      this._extractMetadata();
      this._hasUnsavedChanges = true;
      this._notify("tasks");
      this._notify("unsavedChanges");
    }
    updateTask(key, updates) {
      const index = this._tasks.findIndex((t) => t.key === key);
      if (index !== -1) {
        this._tasks[index] = { ...this._tasks[index], ...updates };
        this._extractMetadata();
        this._hasUnsavedChanges = true;
        this._notify("tasks");
        this._notify("unsavedChanges");
        console.log("Task updated:", key, updates);
      } else {
        console.warn("Task not found for update:", key);
      }
    }
    removeTask(key) {
      this._tasks = this._tasks.filter((t) => t.key !== key);
      this._extractMetadata();
      this._hasUnsavedChanges = true;
      this._notify("tasks");
      this._notify("unsavedChanges");
    }
    setFilter(filterName, value) {
      if (this._filters.hasOwnProperty(filterName)) {
        this._filters[filterName] = value;
        this._notify("filters");
      }
    }
    setViewMode(mode) {
      if (mode === "project" || mode === "date") {
        this._viewMode = mode;
        this._notify("viewMode");
      }
    }
    setCurrentFileHandle(handle) {
      this._currentFileHandle = handle;
      this._notify("fileHandle");
    }
    setUnsavedChanges(value) {
      this._hasUnsavedChanges = value;
      this._notify("unsavedChanges");
    }
    markAsModified() {
      this._hasUnsavedChanges = true;
      this._notify("unsavedChanges");
    }
    resetFilters() {
      this._filters = {
        project: "all",
        person: null,
        tag: null,
        showDone: true,
        showLabelDone: true,
        search: ""
      };
      this._notify("filters");
    }
    // ========================================
    // Méthodes de calcul
    // ========================================
    /**
     * Extrait les métadonnées (projets, personnes, tags) des tâches
     */
    _extractMetadata() {
      this._projects.clear();
      this._people.clear();
      this._tags.clear();
      this._tasks.forEach((task) => {
        if (task.project) {
          this._projects.add(task.project.toLowerCase());
        }
        if (task.components && Array.isArray(task.components)) {
          task.components.forEach((c) => this._projects.add(c.toLowerCase()));
        }
        if (task.reporter) {
          this._people.add(task.reporter.toLowerCase());
        }
        if (task.labels && Array.isArray(task.labels)) {
          task.labels.forEach((label) => {
            const lowerLabel = label.toLowerCase();
            if (!this._people.has(lowerLabel) && !this._projects.has(lowerLabel)) {
              this._tags.set(label, (this._tags.get(label) || 0) + 1);
            }
          });
        }
      });
    }
    /**
     * Retourne les tâches filtrées selon les filtres actifs
     */
    getFilteredTasks() {
      return this._tasks.filter((task) => {
        if (UserConfig.isBlacklisted(task.key)) {
          return false;
        }
        if (this._filters.project !== "all") {
          const taskProject = (task.project || "").toLowerCase();
          const taskComponents = (task.components || []).map((c) => c.toLowerCase());
          if (taskProject !== this._filters.project && !taskComponents.includes(this._filters.project)) {
            return false;
          }
        }
        if (this._filters.person) {
          if (this._filters.person === "nopeople") {
            if (task.reporter) return false;
          } else {
            const reporter = (task.reporter || "").toLowerCase();
            if (reporter !== this._filters.person) return false;
          }
        }
        if (this._filters.tag) {
          const taskLabels = (task.labels || []).map((l) => l.toLowerCase());
          if (!taskLabels.includes(this._filters.tag)) return false;
        }
        if (!this._filters.showDone && task.statusKey === "done") {
          return false;
        }
        if (!this._filters.showLabelDone) {
          const taskLabels = (task.labels || []).map((l) => l.toLowerCase());
          if (taskLabels.includes("done")) return false;
        }
        if (this._filters.search) {
          const searchLower = this._filters.search.toLowerCase();
          const titleLower = (task.summary || "").toLowerCase();
          if (!titleLower.includes(searchLower)) {
            return false;
          }
        }
        return true;
      });
    }
    /**
     * Retourne les tâches groupées par projet
     */
    getTasksByProject() {
      const filtered = this.getFilteredTasks();
      const grouped = {};
      filtered.forEach((task) => {
        const project = task.project || "noproject";
        if (!grouped[project]) {
          grouped[project] = [];
        }
        grouped[project].push(task);
      });
      return grouped;
    }
    /**
     * Retourne les tâches triées par date
     */
    getTasksByDate() {
      const filtered = this.getFilteredTasks();
      return filtered.sort((a, b) => {
        const dateA = a.dueDate ? new Date(a.dueDate) : /* @__PURE__ */ new Date("9999-12-31");
        const dateB = b.dueDate ? new Date(b.dueDate) : /* @__PURE__ */ new Date("9999-12-31");
        return dateA - dateB;
      });
    }
    /**
     * Retourne les statistiques des compteurs
     */
    getStats() {
      const filtered = this.getFilteredTasks();
      const projectSet = /* @__PURE__ */ new Set();
      filtered.forEach((task) => {
        if (task.project) projectSet.add(task.project);
      });
      return {
        totalTasks: filtered.length,
        totalProjects: projectSet.size,
        totalPeople: this._people.size
      };
    }
    /**
     * Compte les tâches par projet (exclut les blacklistés)
     */
    getProjectCounts() {
      const counts = /* @__PURE__ */ new Map();
      this._tasks.forEach((task) => {
        if (UserConfig.isBlacklisted(task.key)) return;
        const project = (task.project || "noproject").toLowerCase();
        counts.set(project, (counts.get(project) || 0) + 1);
      });
      return counts;
    }
    /**
     * Compte les tâches par rapporteur (exclut les blacklistés)
     */
    getPeopleCounts() {
      const counts = /* @__PURE__ */ new Map();
      let noPersonCount = 0;
      this._tasks.forEach((task) => {
        if (UserConfig.isBlacklisted(task.key)) return;
        if (task.reporter) {
          const person = task.reporter.toLowerCase();
          counts.set(person, (counts.get(person) || 0) + 1);
        } else {
          noPersonCount++;
        }
      });
      return { counts, noPersonCount };
    }
    /**
     * Compte les tâches par tag
     */
    getTagCounts() {
      const counts = /* @__PURE__ */ new Map();
      UserConfig.customTags.forEach((tag) => {
        counts.set(tag, 0);
      });
      this._tasks.forEach((task) => {
        if (UserConfig.isBlacklisted(task.key)) return;
        if (task.labels && Array.isArray(task.labels)) {
          task.labels.forEach((label) => {
            const lowerLabel = label.toLowerCase();
            if (!this._people.has(lowerLabel) && !this._projects.has(lowerLabel)) {
              counts.set(label, (counts.get(label) || 0) + 1);
            }
          });
        }
      });
      return counts;
    }
    // ========================================
    // Système d'événements
    // ========================================
    /**
     * S'abonner aux changements d'état
     * @param {string} event - Nom de l'événement
     * @param {function} callback - Fonction à appeler
     */
    subscribe(event, callback) {
      if (!this._listeners.has(event)) {
        this._listeners.set(event, /* @__PURE__ */ new Set());
      }
      this._listeners.get(event).add(callback);
      return () => {
        this._listeners.get(event).delete(callback);
      };
    }
    /**
     * Notifier les listeners d'un changement
     * @param {string} event - Nom de l'événement
     */
    _notify(event) {
      if (this._listeners.has(event)) {
        this._listeners.get(event).forEach((callback) => {
          try {
            callback(this);
          } catch (e) {
            console.error(`Erreur dans le listener ${event}:`, e);
          }
        });
      }
    }
    // ========================================
    // Sérialisation
    // ========================================
    /**
     * Exporte l'état pour sauvegarde JSON
     */
    toJSON() {
      return {
        version: "1.1",
        exportDate: (/* @__PURE__ */ new Date()).toISOString(),
        tasks: this._tasks,
        config: this._userConfig,
        metadata: {
          projects: Array.from(this._projects),
          people: Array.from(this._people)
        }
      };
    }
    /**
     * Importe l'état depuis un JSON
     */
    fromJSON(data) {
      if (!data || !data.tasks) {
        throw new Error("Format JSON invalide");
      }
      this._tasks = data.tasks;
      if (data.config) {
        this._userConfig = {
          customTags: data.config.customTags || [],
          projectRules: data.config.projectRules || [],
          blacklist: data.config.blacklist || []
        };
      }
      this._extractMetadata();
      this._hasUnsavedChanges = false;
      this._notify("tasks");
      this._notify("userConfig");
      this._notify("unsavedChanges");
    }
    // ========================================
    // Édition de tickets
    // ========================================
    /**
     * Met à jour les labels d'un ticket
     */
    updateTaskLabels(key, labels) {
      const task = this._tasks.find((t) => t.key === key);
      if (task) {
        task.labels = [...labels];
        this._extractMetadata();
        this._hasUnsavedChanges = true;
        this._notify("tasks");
        this._notify("unsavedChanges");
        return true;
      }
      return false;
    }
    /**
     * Ajoute un label à un ticket
     */
    addLabelToTask(key, label) {
      const task = this._tasks.find((t) => t.key === key);
      if (task) {
        if (!task.labels) task.labels = [];
        if (!task.labels.includes(label)) {
          task.labels.push(label);
          this._extractMetadata();
          this._hasUnsavedChanges = true;
          this._notify("tasks");
          this._notify("unsavedChanges");
          return true;
        }
      }
      return false;
    }
    /**
     * Supprime un label d'un ticket
     */
    removeLabelFromTask(key, label) {
      const task = this._tasks.find((t) => t.key === key);
      if (task && task.labels) {
        const index = task.labels.indexOf(label);
        if (index !== -1) {
          task.labels.splice(index, 1);
          this._extractMetadata();
          this._hasUnsavedChanges = true;
          this._notify("tasks");
          this._notify("unsavedChanges");
          return true;
        }
      }
      return false;
    }
    /**
     * Met à jour la date d'échéance d'un ticket
     */
    updateTaskDueDate(key, dueDate) {
      const task = this._tasks.find((t) => t.key === key);
      if (task) {
        task.dueDate = dueDate ? new Date(dueDate).toISOString() : null;
        this._hasUnsavedChanges = true;
        this._notify("tasks");
        this._notify("unsavedChanges");
        return true;
      }
      return false;
    }
    /**
     * Réinitialise l'état
     */
    reset() {
      this._tasks = [];
      this._projects.clear();
      this._people.clear();
      this._tags.clear();
      this._currentFileHandle = null;
      this._hasUnsavedChanges = false;
      this.resetFilters();
      this._notify("tasks");
      this._notify("fileHandle");
      this._notify("unsavedChanges");
    }
  };
  var State = new AppState();

  // js/utils/file.js
  function isFileSystemAccessSupported() {
    return "showOpenFilePicker" in window && "showSaveFilePicker" in window;
  }
  async function openJsonFile() {
    if (!isFileSystemAccessSupported()) {
      return openJsonFileFallback();
    }
    const [handle] = await window.showOpenFilePicker({
      types: [{
        description: "Fichiers JSON",
        accept: { "application/json": [".json"] }
      }],
      multiple: false
    });
    const file = await handle.getFile();
    const text = await file.text();
    const content = JSON.parse(text);
    return { handle, content };
  }
  function openJsonFileFallback() {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,application/json";
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) {
          reject(new Error("Aucun fichier s\xE9lectionn\xE9"));
          return;
        }
        try {
          const text = await file.text();
          const content = JSON.parse(text);
          resolve({ handle: null, content, filename: file.name });
        } catch (err) {
          reject(new Error("Erreur lors de la lecture du fichier: " + err.message));
        }
      };
      input.click();
    });
  }
  async function openXmlFile() {
    if (!isFileSystemAccessSupported()) {
      return openXmlFileFallback();
    }
    const [handle] = await window.showOpenFilePicker({
      types: [{
        description: "Fichiers XML",
        accept: { "application/xml": [".xml"], "text/xml": [".xml"] }
      }],
      multiple: false
    });
    const file = await handle.getFile();
    const content = await file.text();
    return { handle, content };
  }
  function openXmlFileFallback() {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".xml,application/xml,text/xml";
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) {
          reject(new Error("Aucun fichier s\xE9lectionn\xE9"));
          return;
        }
        try {
          const content = await file.text();
          resolve({ handle: null, content, filename: file.name });
        } catch (err) {
          reject(new Error("Erreur lors de la lecture du fichier: " + err.message));
        }
      };
      input.click();
    });
  }
  async function saveToHandle(handle, data) {
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
  }
  async function saveAsJsonFile(data, suggestedName = "jira-report-data.json") {
    if (!isFileSystemAccessSupported()) {
      downloadJson(data, suggestedName);
      return null;
    }
    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: [{
        description: "Fichiers JSON",
        accept: { "application/json": [".json"] }
      }]
    });
    await saveToHandle(handle, data);
    return handle;
  }
  function downloadJson(data, filename = "jira-report-data.json") {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error("Erreur lors de la lecture du fichier"));
      reader.readAsText(file);
    });
  }
  function isXmlFile(file) {
    return file.name.endsWith(".xml") || file.type === "text/xml" || file.type === "application/xml";
  }
  function generateFilename(base = "jira-report", ext = "json") {
    const date = /* @__PURE__ */ new Date();
    const timestamp = date.toISOString().slice(0, 10);
    return `${base}-${timestamp}.${ext}`;
  }
  var DB_NAME = "jira-report-db";
  var DB_VERSION = 1;
  var STORE_NAME = "file-handles";
  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    });
  }
  async function saveFileHandle(handle) {
    if (!handle) return;
    try {
      const db = await openDatabase();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put(handle, "lastFile");
      await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    } catch (err) {
      console.warn("Impossible de sauvegarder le file handle:", err);
    }
  }
  async function getStoredFileHandle() {
    try {
      const db = await openDatabase();
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get("lastFile");
      const handle = await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      db.close();
      return handle || null;
    } catch (err) {
      console.warn("Impossible de r\xE9cup\xE9rer le file handle:", err);
      return null;
    }
  }
  async function clearStoredFileHandle() {
    try {
      const db = await openDatabase();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.delete("lastFile");
      await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    } catch (err) {
      console.warn("Impossible de supprimer le file handle:", err);
    }
  }
  async function tryLoadLastFile() {
    if (!isFileSystemAccessSupported()) {
      return { success: false };
    }
    const handle = await getStoredFileHandle();
    if (!handle) {
      return { success: false };
    }
    try {
      const permission = await handle.queryPermission({ mode: "readwrite" });
      if (permission !== "granted") {
        const requestResult = await handle.requestPermission({ mode: "readwrite" });
        if (requestResult !== "granted") {
          return { success: false };
        }
      }
      const file = await handle.getFile();
      const text = await file.text();
      const content = JSON.parse(text);
      return { success: true, handle, content, filename: file.name };
    } catch (err) {
      console.warn("Impossible de recharger le fichier:", err);
      await clearStoredFileHandle();
      return { success: false };
    }
  }

  // js/config.js
  var Config = {
    // Mapping des priorités JIRA vers l'application
    priorityMap: {
      "Highest": { value: 5, text: "Critique", class: "critical" },
      "High": { value: 4, text: "Haute", class: "high" },
      "Medium": { value: 3, text: "Moyenne", class: "medium" },
      "Low": { value: 2, text: "Basse", class: "low" },
      "Lowest": { value: 1, text: "Minimale", class: "lowest" }
    },
    // Mapping des statuts JIRA vers l'application
    statusMap: {
      // Statuts JIRA standards
      "Open": { key: "backlog", label: "Backlog", icon: "\u{1F4CB}", cssClass: "status-backlog" },
      "To Do": { key: "backlog", label: "Backlog", icon: "\u{1F4CB}", cssClass: "status-backlog" },
      "Backlog": { key: "backlog", label: "Backlog", icon: "\u{1F4CB}", cssClass: "status-backlog" },
      "In Progress": { key: "inprogress", label: "En cours", icon: "\u23F3", cssClass: "status-inprogress" },
      "En cours": { key: "inprogress", label: "En cours", icon: "\u23F3", cssClass: "status-inprogress" },
      "In Review": { key: "review", label: "En revue", icon: "\u{1F440}", cssClass: "status-review" },
      "Ready for Test": { key: "ready", label: "Pr\xEAt \xE0 livrer", icon: "\u{1F680}", cssClass: "status-ready" },
      "Pr\xEAt \xE0 livrer": { key: "ready", label: "Pr\xEAt \xE0 livrer", icon: "\u{1F680}", cssClass: "status-ready" },
      "Done": { key: "done", label: "Termin\xE9", icon: "\u2713", cssClass: "status-done" },
      "Termin\xE9": { key: "done", label: "Termin\xE9", icon: "\u2713", cssClass: "status-done" },
      "Closed": { key: "done", label: "Termin\xE9", icon: "\u2713", cssClass: "status-done" },
      "Resolved": { key: "done", label: "Termin\xE9", icon: "\u2713", cssClass: "status-done" },
      "Livr\xE9": { key: "delivered", label: "Livr\xE9", icon: "\u{1F4E6}", cssClass: "status-delivered" },
      "Delivered": { key: "delivered", label: "Livr\xE9", icon: "\u{1F4E6}", cssClass: "status-delivered" }
    },
    // Statut par défaut
    defaultStatus: { key: "backlog", label: "Backlog", icon: "\u{1F4CB}", cssClass: "status-backlog" },
    // Ordre des statuts pour le tri
    statusOrder: {
      "backlog": 1,
      "inprogress": 2,
      "review": 3,
      "ready": 4,
      "delivered": 5,
      "done": 6
    },
    // Labels qui correspondent à des statuts (pour la détection depuis les labels)
    statusLabels: {
      "termin\xE9": "done",
      "done": "done",
      "livr\xE9": "delivered",
      "livre": "delivered",
      "pr\xEAt \xE0 livrer": "ready",
      "in progress": "inprogress",
      "en cours": "inprogress"
    },
    // Configuration de la timeline
    timeline: {
      dayWidth: 60,
      // pixels par jour
      taskHeight: 18,
      taskSpacing: 24,
      marginDays: 2,
      // marge en jours avant/après
      collapsedTaskCount: 6
    },
    // Configuration des fichiers
    file: {
      jsonExtension: ".json",
      xmlExtension: ".xml",
      defaultFilename: "jira-report-data"
    },
    // Liste des projets par défaut (sera mise à jour dynamiquement)
    defaultProjects: [],
    // Liste des personnes par défaut (sera mise à jour dynamiquement)
    defaultPeople: []
  };

  // js/utils/date.js
  function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    if (d.getFullYear() < 1970) return "";
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Europe/Paris"
    });
  }
  function formatDateShort(date) {
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit"
    });
  }
  function getDueClass(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime()) || d.getFullYear() < 1970) return "";
    const now = /* @__PURE__ */ new Date();
    const diffDays = Math.ceil((d - now) / (1e3 * 60 * 60 * 24));
    if (diffDays < 0) return "overdue";
    if (diffDays <= 3) return "soon";
    return "";
  }
  function normalizeToMidnight(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
  function isToday(date) {
    const today = /* @__PURE__ */ new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  }
  function parseJiraDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (!isNaN(d.getTime()) && d.getFullYear() >= 1970) {
      return d;
    }
    return null;
  }

  // js/parsers/jira-xml.js
  function parseJiraXml(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");
    const parseError = xmlDoc.querySelector("parsererror");
    if (parseError) {
      throw new Error("XML invalide: " + parseError.textContent.substring(0, 100));
    }
    const items = xmlDoc.querySelectorAll("item");
    const tickets = [];
    items.forEach((item) => {
      const ticket = parseItem(item);
      if (ticket && ticket.key) {
        tickets.push(ticket);
      }
    });
    return tickets;
  }
  function parseItem(item) {
    const getTextContent = (selector) => {
      const el = item.querySelector(selector);
      return el ? el.textContent.trim() : "";
    };
    const getAttribute = (selector, attr) => {
      const el = item.querySelector(selector);
      return el ? el.getAttribute(attr) || "" : "";
    };
    const labels = [];
    item.querySelectorAll("labels label").forEach((label) => {
      const text = label.textContent.trim();
      if (text) labels.push(text);
    });
    const components = [];
    item.querySelectorAll("component").forEach((comp) => {
      const text = comp.textContent.trim();
      if (text) {
        components.push(text);
      }
    });
    const fixVersions = [];
    item.querySelectorAll("fixVersion").forEach((v) => {
      const text = v.textContent.trim();
      if (text) fixVersions.push(text);
    });
    const createdDate = parseJiraDate(getTextContent("created"));
    const updatedDate = parseJiraDate(getTextContent("updated"));
    const dueDate = parseJiraDate(getTextContent("due"));
    const jiraStatus = getTextContent("status");
    const statusInfo = getStatusInfo(jiraStatus, labels);
    const jiraPriority = getTextContent("priority");
    const priorityInfo = getPriorityInfo(jiraPriority);
    return {
      // Identifiants
      key: getTextContent("key"),
      id: getAttribute("key", "id"),
      // Informations principales
      summary: getTextContent("summary"),
      description: getTextContent("description"),
      type: getTextContent("type"),
      // Statut
      status: jiraStatus,
      statusId: getAttribute("status", "id"),
      statusKey: statusInfo.key,
      statusLabel: statusInfo.label,
      statusIcon: statusInfo.icon,
      statusCssClass: statusInfo.cssClass,
      // Priorité
      priority: jiraPriority,
      priorityId: getAttribute("priority", "id"),
      priorityValue: priorityInfo.value,
      priorityText: priorityInfo.text,
      priorityCssClass: priorityInfo.class,
      // Personnes
      assignee: getTextContent("assignee") || getAttribute("assignee", "username"),
      reporter: getTextContent("reporter") || getAttribute("reporter", "username"),
      // Projet
      project: getAttribute("project", "key") || getTextContent("project"),
      projectName: getTextContent("project"),
      // Dates
      created: createdDate ? createdDate.toISOString() : null,
      updated: updatedDate ? updatedDate.toISOString() : null,
      dueDate: dueDate ? dueDate.toISOString() : null,
      // Résolution
      resolution: getTextContent("resolution"),
      // Labels et composants
      labels,
      components,
      fixVersions,
      // Liens
      link: getTextContent("link")
    };
  }
  function getStatusInfo(jiraStatus, labels) {
    if (jiraStatus) {
      const statusKey = Object.keys(Config.statusMap).find(
        (k) => k.toLowerCase() === jiraStatus.toLowerCase()
      );
      if (statusKey) {
        return Config.statusMap[statusKey];
      }
    }
    const labelsLower = labels.map((l) => l.toLowerCase());
    for (const [labelPattern, statusKey] of Object.entries(Config.statusLabels)) {
      if (labelsLower.includes(labelPattern)) {
        for (const statusInfo of Object.values(Config.statusMap)) {
          if (statusInfo.key === statusKey) {
            return statusInfo;
          }
        }
      }
    }
    if (jiraStatus) {
      const statusLower = jiraStatus.toLowerCase();
      if (statusLower === "done" || statusLower === "closed" || statusLower === "resolved") {
        return { key: "done", label: jiraStatus, icon: "\u2713", cssClass: "status-done" };
      }
      if (statusLower.includes("progress") || statusLower.includes("cours") || statusLower.includes("d\xE9velopp") || statusLower.includes("termin\xE9")) {
        return { key: "inprogress", label: jiraStatus, icon: "\u23F3", cssClass: "status-inprogress" };
      }
      if (statusLower.includes("review") || statusLower.includes("revue")) {
        return { key: "review", label: jiraStatus, icon: "\u{1F440}", cssClass: "status-review" };
      }
      if (statusLower.includes("livr") || statusLower.includes("deliver")) {
        return { key: "delivered", label: jiraStatus, icon: "\u{1F4E6}", cssClass: "status-delivered" };
      }
      if (statusLower.includes("pr\xEAt") || statusLower.includes("ready") || statusLower.includes("test")) {
        return { key: "ready", label: jiraStatus, icon: "\u{1F680}", cssClass: "status-ready" };
      }
      return { key: "backlog", label: jiraStatus, icon: "\u{1F4CB}", cssClass: "status-backlog" };
    }
    return Config.defaultStatus;
  }
  function getPriorityInfo(jiraPriority) {
    if (jiraPriority && Config.priorityMap[jiraPriority]) {
      return Config.priorityMap[jiraPriority];
    }
    return { value: 3, text: "Moyenne", class: "medium" };
  }
  function compareTickets(importedTickets, existingTasks) {
    const existingKeys = new Set(
      existingTasks.map((t) => (t.key || "").toUpperCase())
    );
    const results = {
      new: [],
      existing: [],
      total: importedTickets.length
    };
    importedTickets.forEach((ticket) => {
      const keyUpper = (ticket.key || "").toUpperCase();
      if (existingKeys.has(keyUpper)) {
        results.existing.push(ticket);
      } else {
        results.new.push(ticket);
      }
    });
    return results;
  }
  function mergeTickets(importedTickets, existingTasks, options = {}) {
    const {
      updateExisting = true,
      // Mettre à jour les tickets existants
      addNew = true
      // Ajouter les nouveaux tickets
    } = options;
    const existingMap = new Map(
      existingTasks.map((t) => [(t.key || "").toUpperCase(), t])
    );
    const result = [...existingTasks];
    const addedKeys = /* @__PURE__ */ new Set();
    importedTickets.forEach((ticket) => {
      const keyUpper = (ticket.key || "").toUpperCase();
      if (existingMap.has(keyUpper)) {
        if (updateExisting) {
          const index = result.findIndex((t) => (t.key || "").toUpperCase() === keyUpper);
          if (index !== -1) {
            result[index] = {
              ...ticket,
              // Préserver les données locales qui ne viennent pas de JIRA
              localNotes: result[index].localNotes
            };
          }
        }
      } else if (addNew && !addedKeys.has(keyUpper)) {
        result.push(ticket);
        addedKeys.add(keyUpper);
      }
    });
    return result;
  }

  // js/services/storage.js
  var StorageService = class {
    constructor() {
      this._autoSaveEnabled = false;
      this._autoSaveInterval = null;
      this._lastSaveTime = null;
      this._liveSaveEnabled = false;
      this._liveSaveTimeout = null;
      this._liveSaveDelay = 1500;
    }
    /**
     * Active le live save (sauvegarde automatique après chaque modification)
     */
    enableLiveSave() {
      if (this._liveSaveEnabled) return;
      this._liveSaveEnabled = true;
      State.subscribe("unsavedChanges", () => {
        if (State.hasUnsavedChanges && State.currentFileHandle && this._liveSaveEnabled) {
          this._scheduleLiveSave();
        }
      });
      console.log("Live save activ\xE9");
    }
    /**
     * Désactive le live save
     */
    disableLiveSave() {
      this._liveSaveEnabled = false;
      if (this._liveSaveTimeout) {
        clearTimeout(this._liveSaveTimeout);
        this._liveSaveTimeout = null;
      }
    }
    /**
     * Programme une sauvegarde live (debounced)
     */
    _scheduleLiveSave() {
      if (this._liveSaveTimeout) {
        clearTimeout(this._liveSaveTimeout);
      }
      this._liveSaveTimeout = setTimeout(async () => {
        if (State.hasUnsavedChanges && State.currentFileHandle) {
          try {
            const data = State.toJSON();
            await saveToHandle(State.currentFileHandle, data);
            State.setUnsavedChanges(false);
            this._lastSaveTime = /* @__PURE__ */ new Date();
            console.log("Live save effectu\xE9");
          } catch (err) {
            console.warn("Erreur live save:", err);
          }
        }
      }, this._liveSaveDelay);
    }
    /**
     * Retourne si le live save est actif
     */
    get isLiveSaveEnabled() {
      return this._liveSaveEnabled;
    }
    /**
     * Applique les règles de détection de projet aux tickets
     * @param {object[]} tickets - Tickets à traiter
     * @returns {object[]} Tickets avec projet détecté
     */
    _applyProjectRules(tickets) {
      return tickets.map((ticket) => {
        const detectedProject = UserConfig.detectProjectFromTitle(ticket.summary);
        if (detectedProject) {
          return { ...ticket, project: detectedProject };
        }
        return ticket;
      });
    }
    /**
     * Rafraîchit les tickets en réappliquant les règles de projet
     * @returns {object} Résultat du rafraîchissement
     */
    refreshProjectDetection() {
      const currentTasks = State.tasks;
      if (currentTasks.length === 0) {
        return { success: false, message: "Aucun ticket \xE0 rafra\xEEchir" };
      }
      const updatedTasks = this._applyProjectRules(currentTasks);
      State.setTasks(updatedTasks);
      State.markAsModified();
      return { success: true, message: `${updatedTasks.length} tickets mis \xE0 jour` };
    }
    /**
     * Vérifie si le File System Access API est supporté
     */
    get isFileSystemSupported() {
      return isFileSystemAccessSupported();
    }
    /**
     * Ouvre un fichier JSON et charge les données
     * @returns {Promise<void>}
     */
    async openProject() {
      try {
        const { handle, content, filename } = await openJsonFile();
        if (!content || !content.tasks) {
          throw new Error("Format de fichier invalide");
        }
        State.fromJSON(content);
        if (handle) {
          State.setCurrentFileHandle(handle);
          await saveFileHandle(handle);
        }
        return {
          success: true,
          message: `Fichier charg\xE9: ${filename || "projet.json"}`,
          taskCount: content.tasks.length
        };
      } catch (err) {
        if (err.name === "AbortError") {
          return { success: false, cancelled: true };
        }
        throw err;
      }
    }
    /**
     * Tente de recharger le dernier fichier ouvert
     * @returns {Promise<object>} Résultat du chargement
     */
    async tryLoadLastProject() {
      try {
        const result = await tryLoadLastFile();
        if (!result.success) {
          return { success: false };
        }
        if (!result.content || !result.content.tasks) {
          return { success: false, message: "Format de fichier invalide" };
        }
        State.fromJSON(result.content);
        if (result.handle) {
          State.setCurrentFileHandle(result.handle);
        }
        return {
          success: true,
          message: `Fichier recharg\xE9: ${result.filename || "projet.json"}`,
          taskCount: result.content.tasks.length
        };
      } catch (err) {
        console.warn("Erreur lors du rechargement automatique:", err);
        return { success: false };
      }
    }
    /**
     * Importe un fichier XML JIRA
     * @param {object} options - Options d'import
     * @returns {Promise<object>} Résultat de l'import
     */
    async importXml(options = {}) {
      const {
        mergeWithExisting = true,
        updateExisting = true
      } = options;
      try {
        const { content, filename } = await openXmlFile();
        let tickets = parseJiraXml(content);
        if (tickets.length === 0) {
          return {
            success: false,
            message: "Aucun ticket trouv\xE9 dans le fichier XML"
          };
        }
        tickets = this._applyProjectRules(tickets);
        let finalTasks;
        if (mergeWithExisting && State.tasks.length > 0) {
          finalTasks = mergeTickets(tickets, State.tasks, { updateExisting });
        } else {
          finalTasks = tickets;
        }
        State.setTasks(finalTasks);
        State.setUnsavedChanges(true);
        return {
          success: true,
          message: `${tickets.length} tickets import\xE9s depuis ${filename || "fichier.xml"}`,
          imported: tickets.length,
          total: finalTasks.length
        };
      } catch (err) {
        if (err.name === "AbortError") {
          return { success: false, cancelled: true };
        }
        throw err;
      }
    }
    /**
     * Importe du XML depuis une chaîne de caractères
     * @param {string} xmlString - Contenu XML
     * @param {object} options - Options d'import
     * @returns {object} Résultat de l'import
     */
    importXmlFromString(xmlString, options = {}) {
      const {
        mergeWithExisting = true,
        updateExisting = true
      } = options;
      let tickets = parseJiraXml(xmlString);
      if (tickets.length === 0) {
        return {
          success: false,
          message: "Aucun ticket trouv\xE9 dans le XML"
        };
      }
      tickets = this._applyProjectRules(tickets);
      let finalTasks;
      if (mergeWithExisting && State.tasks.length > 0) {
        finalTasks = mergeTickets(tickets, State.tasks, { updateExisting });
      } else {
        finalTasks = tickets;
      }
      State.setTasks(finalTasks);
      State.setUnsavedChanges(true);
      return {
        success: true,
        imported: tickets.length,
        total: finalTasks.length,
        tickets
      };
    }
    /**
     * Sauvegarde les données dans le fichier actuel (Ctrl+S)
     * @returns {Promise<object>} Résultat de la sauvegarde
     */
    async save() {
      const handle = State.currentFileHandle;
      if (handle && isFileSystemAccessSupported()) {
        try {
          const data = State.toJSON();
          await saveToHandle(handle, data);
          State.setUnsavedChanges(false);
          this._lastSaveTime = /* @__PURE__ */ new Date();
          return {
            success: true,
            message: "Fichier sauvegard\xE9"
          };
        } catch (err) {
          console.error("Erreur de sauvegarde:", err);
          return this.saveAs();
        }
      } else {
        return this.saveAs();
      }
    }
    /**
     * Sauvegarde les données dans un nouveau fichier (Ctrl+Shift+S)
     * @returns {Promise<object>} Résultat de la sauvegarde
     */
    async saveAs() {
      try {
        const data = State.toJSON();
        const filename = generateFilename("jira-report", "json");
        const handle = await saveAsJsonFile(data, filename);
        if (handle) {
          State.setCurrentFileHandle(handle);
          await saveFileHandle(handle);
        }
        State.setUnsavedChanges(false);
        this._lastSaveTime = /* @__PURE__ */ new Date();
        return {
          success: true,
          message: "Fichier sauvegard\xE9"
        };
      } catch (err) {
        if (err.name === "AbortError") {
          return { success: false, cancelled: true };
        }
        throw err;
      }
    }
    /**
     * Télécharge un backup JSON (sans File System Access API)
     * @returns {object} Résultat du téléchargement
     */
    downloadBackup() {
      const data = State.toJSON();
      const filename = generateFilename("jira-report-backup", "json");
      downloadJson(data, filename);
      return {
        success: true,
        message: `Backup t\xE9l\xE9charg\xE9: ${filename}`
      };
    }
    /**
     * Crée un nouveau projet vide
     */
    newProject() {
      State.reset();
      return {
        success: true,
        message: "Nouveau projet cr\xE9\xE9"
      };
    }
    /**
     * Active l'auto-save
     * @param {number} intervalMs - Intervalle en millisecondes
     */
    enableAutoSave(intervalMs = 6e4) {
      if (this._autoSaveInterval) {
        clearInterval(this._autoSaveInterval);
      }
      this._autoSaveEnabled = true;
      this._autoSaveInterval = setInterval(async () => {
        if (State.hasUnsavedChanges && State.currentFileHandle) {
          await this.save();
          console.log("Auto-save effectu\xE9");
        }
      }, intervalMs);
    }
    /**
     * Désactive l'auto-save
     */
    disableAutoSave() {
      this._autoSaveEnabled = false;
      if (this._autoSaveInterval) {
        clearInterval(this._autoSaveInterval);
        this._autoSaveInterval = null;
      }
    }
    /**
     * Vérifie s'il y a des modifications non sauvegardées
     * @returns {boolean}
     */
    hasUnsavedChanges() {
      return State.hasUnsavedChanges;
    }
    /**
     * Retourne la date de dernière sauvegarde
     * @returns {Date|null}
     */
    getLastSaveTime() {
      return this._lastSaveTime;
    }
    /**
     * Gère le drag and drop de fichiers
     * @param {DataTransfer} dataTransfer - Objet DataTransfer
     * @returns {Promise<object>} Résultat de l'import
     */
    async handleFileDrop(dataTransfer) {
      const files = dataTransfer.files;
      if (files.length === 0) {
        return { success: false, message: "Aucun fichier" };
      }
      const file = files[0];
      const content = await readFileAsText(file);
      if (file.name.endsWith(".xml") || file.type.includes("xml")) {
        return this.importXmlFromString(content);
      } else if (file.name.endsWith(".json") || file.type.includes("json")) {
        const data = JSON.parse(content);
        State.fromJSON(data);
        return {
          success: true,
          message: `Fichier charg\xE9: ${file.name}`,
          taskCount: data.tasks.length
        };
      } else {
        return { success: false, message: "Format de fichier non support\xE9" };
      }
    }
  };
  var Storage = new StorageService();

  // js/utils/dom.js
  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function escapeAttr(str) {
    return escapeHtml(str);
  }
  function $(selector, context = document) {
    return context.querySelector(selector);
  }
  function $$(selector, context = document) {
    return context.querySelectorAll(selector);
  }
  function delegate(parent, eventType, selector, handler) {
    parent.addEventListener(eventType, (e) => {
      const target = e.target.closest(selector);
      if (target && parent.contains(target)) {
        handler.call(target, e, target);
      }
    });
  }
  function addClass(el, ...classes) {
    if (el) {
      el.classList.add(...classes);
    }
  }
  function removeClass(el, ...classes) {
    if (el) {
      el.classList.remove(...classes);
    }
  }
  function setHtml(el, html) {
    if (el) {
      el.innerHTML = html;
    }
  }
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      const result = document.execCommand("copy");
      document.body.removeChild(textarea);
      return result;
    }
  }
  async function copyHtmlToClipboard(html, text) {
    try {
      const clipboardItem = new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([text], { type: "text/plain" })
      });
      await navigator.clipboard.write([clipboardItem]);
      return true;
    } catch (err) {
      return copyToClipboard(text);
    }
  }
  function debounce(fn, delay) {
    let timer = null;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // js/components/sidebar.js
  var SidebarComponent = class {
    constructor() {
      this._element = null;
      this._searchInput = null;
      this._unsubscribers = [];
    }
    /**
     * Initialise le composant
     * @param {string} selector - Sélecteur du conteneur
     */
    init(selector) {
      this._element = $(selector);
      if (!this._element) {
        console.error("Sidebar container not found:", selector);
        return;
      }
      this.render();
      this._attachDelegatedListeners();
      this._attachButtonListeners();
      this._subscribeToState();
    }
    /**
     * Rend le composant
     */
    render() {
      const projectCounts = State.getProjectCounts();
      const { counts: peopleCounts, noPersonCount } = State.getPeopleCounts();
      const tagCounts = State.getTagCounts();
      const totalTasks = State.tasks.length;
      const doneLabelsCount = tagCounts.get("done") || 0;
      setHtml(this._element, `
      <h2 class="sidebar-title">Filtres</h2>

      <!-- Reset -->
      <button id="btn-reset-filters" class="reset-filters-btn">R\xE9initialiser</button>

      <!-- Recherche -->
      <div class="filter-group search-filter-group">
        <h3>Recherche</h3>
        <div class="search-box">
          <span class="search-icon">\u{1F50D}</span>
          <input type="text" id="search-input" placeholder="Rechercher..." autocomplete="off">
          <button id="clear-search" class="clear-search-btn hidden">\u2715</button>
        </div>
        <div id="search-results-count" class="search-results-count hidden"></div>
      </div>

      <!-- Statut -->
      <div class="filter-group">
        <h3>Statut</h3>
        <div class="task-labels">
          <button class="filter-btn ${State.filters.showDone ? "active" : ""}" data-filter="show-done">
            Afficher termin\xE9es <span class="tag-count">\u2713</span>
          </button>
          ${doneLabelsCount > 0 ? `
            <button class="filter-btn ${State.filters.showLabelDone ? "active" : ""}" data-filter="label-done">
              Afficher label done <span class="tag-count">${doneLabelsCount}</span>
            </button>
          ` : ""}
        </div>
      </div>

      <!-- Projets -->
      <div class="filter-group" data-filter-type="projects">
        <h3>Projets</h3>
        <div class="task-labels">
          <button class="filter-btn ${State.filters.project === "all" ? "active" : ""}" data-filter="all">
            Tous <span class="tag-count">${totalTasks}</span>
          </button>
          ${this._renderProjectFilters(projectCounts)}
        </div>
      </div>

      <!-- Rapporteurs -->
      <div class="filter-group" data-filter-type="people">
        <h3>Rapporteurs</h3>
        <div class="task-labels">
          ${this._renderPeopleFilters(peopleCounts, noPersonCount)}
        </div>
      </div>

      <!-- Tags -->
      <div class="filter-group" data-filter-type="tags">
        <h3>Tags</h3>
        <div class="task-labels">
          ${this._renderTagFilters(tagCounts)}
        </div>
      </div>
    `);
    }
    /**
     * Génère le HTML des filtres de projets
     * N'affiche que les projets déclarés dans la config
     */
    _renderProjectFilters(projectCounts) {
      const declaredProjects = UserConfig.projectRules;
      if (declaredProjects.length === 0) {
        return '<span class="no-filters">Aucun projet d\xE9clar\xE9</span>';
      }
      return declaredProjects.sort((a, b) => a.name.localeCompare(b.name)).map((rule) => {
        const projectName = rule.name.toLowerCase();
        const count = projectCounts.get(projectName) || 0;
        return `
          <button class="filter-btn ${State.filters.project === projectName ? "active" : ""}"
                  data-filter="${projectName}">
            ${rule.name} <span class="tag-count">${count}</span>
          </button>
        `;
      }).join("");
    }
    /**
     * Génère le HTML des filtres de personnes
     */
    _renderPeopleFilters(peopleCounts, noPersonCount) {
      let html = Array.from(peopleCounts.entries()).filter(([, count]) => count > 0).sort((a, b) => a[0].localeCompare(b[0])).map(([person, count]) => `
        <button class="filter-btn ${State.filters.person === person ? "active" : ""}"
                data-filter="${person}">
          ${person} <span class="tag-count">${count}</span>
        </button>
      `).join("");
      if (noPersonCount > 0) {
        html += `
        <button class="filter-btn ${State.filters.person === "nopeople" ? "active" : ""}"
                data-filter="nopeople">
          Sans rapporteur <span class="tag-count">${noPersonCount}</span>
        </button>
      `;
      }
      return html;
    }
    /**
     * Génère le HTML des filtres de tags
     */
    _renderTagFilters(tagCounts) {
      return Array.from(tagCounts.entries()).filter(([tag]) => tag.toLowerCase() !== "done").sort((a, b) => a[0].localeCompare(b[0])).map(([tag, count]) => `
        <button class="filter-btn ${State.filters.tag === tag.toLowerCase() ? "active" : ""}"
                data-filter="${tag.toLowerCase()}">
          ${tag} <span class="tag-count">${count}</span>
        </button>
      `).join("");
    }
    /**
     * Attache les écouteurs délégués (une seule fois)
     * Ces listeners utilisent la délégation d'événements et ne doivent pas être dupliqués
     */
    _attachDelegatedListeners() {
      delegate(this._element, "click", ".filter-btn", (e, btn) => {
        this._handleFilterClick(btn);
      });
      delegate(this._element, "input", "#search-input", debounce((e) => {
        this._handleSearch(e.target.value);
      }, 300));
      delegate(this._element, "keydown", "#search-input", (e) => {
        if (e.key === "Escape") {
          this._clearSearch();
        }
      });
      delegate(this._element, "click", "#clear-search", () => this._clearSearch());
      delegate(this._element, "click", "#btn-reset-filters", () => {
        State.resetFilters();
        this.render();
      });
    }
    /**
     * Attache les écouteurs sur les boutons (après chaque render si nécessaire)
     */
    _attachButtonListeners() {
      this._searchInput = $("#search-input", this._element);
      if (State.filters.search && this._searchInput) {
        this._searchInput.value = State.filters.search;
        $("#clear-search", this._element)?.classList.remove("hidden");
      }
    }
    /**
     * Gère le clic sur un bouton de filtre
     */
    _handleFilterClick(btn) {
      const filterValue = btn.dataset.filter;
      const filterGroup = btn.closest(".filter-group");
      const groupTitle = filterGroup?.querySelector("h3")?.textContent.trim();
      switch (groupTitle) {
        case "Statut":
          this._handleStatusFilter(btn, filterValue);
          break;
        case "Projets":
          this._handleProjectFilter(btn, filterValue, filterGroup);
          break;
        case "Rapporteurs":
          this._handlePeopleFilter(btn, filterValue, filterGroup);
          break;
        case "Tags":
          this._handleTagFilter(btn, filterValue, filterGroup);
          break;
      }
    }
    /**
     * Gère le filtre de statut
     */
    _handleStatusFilter(btn, filterValue) {
      if (filterValue === "show-done") {
        const newValue = !State.filters.showDone;
        State.setFilter("showDone", newValue);
        btn.classList.toggle("active", newValue);
      } else if (filterValue === "label-done") {
        const newValue = !State.filters.showLabelDone;
        State.setFilter("showLabelDone", newValue);
        btn.classList.toggle("active", newValue);
      }
    }
    /**
     * Gère le filtre de projet
     */
    _handleProjectFilter(btn, filterValue, filterGroup) {
      $$(".filter-btn", filterGroup).forEach((b) => removeClass(b, "active"));
      addClass(btn, "active");
      State.setFilter("project", filterValue);
    }
    /**
     * Gère le filtre de personne
     */
    _handlePeopleFilter(btn, filterValue, filterGroup) {
      if (btn.classList.contains("active")) {
        removeClass(btn, "active");
        State.setFilter("person", null);
      } else {
        $$(".filter-btn", filterGroup).forEach((b) => removeClass(b, "active"));
        addClass(btn, "active");
        State.setFilter("person", filterValue);
      }
    }
    /**
     * Gère le filtre de tag
     */
    _handleTagFilter(btn, filterValue, filterGroup) {
      if (btn.classList.contains("active")) {
        removeClass(btn, "active");
        State.setFilter("tag", null);
      } else {
        $$(".filter-btn", filterGroup).forEach((b) => removeClass(b, "active"));
        addClass(btn, "active");
        State.setFilter("tag", filterValue);
      }
    }
    /**
     * Gère la recherche
     */
    _handleSearch(value) {
      const query = value.trim().toLowerCase();
      State.setFilter("search", query);
      const clearBtn = $("#clear-search", this._element);
      const resultsCount = $("#search-results-count", this._element);
      if (query) {
        clearBtn?.classList.remove("hidden");
        const count = State.getFilteredTasks().length;
        if (resultsCount) {
          resultsCount.textContent = `${count} r\xE9sultat${count > 1 ? "s" : ""} pour "${value}"`;
          resultsCount.classList.remove("hidden");
        }
      } else {
        clearBtn?.classList.add("hidden");
        resultsCount?.classList.add("hidden");
      }
    }
    /**
     * Efface la recherche
     */
    _clearSearch() {
      if (this._searchInput) {
        this._searchInput.value = "";
      }
      State.setFilter("search", "");
      $("#clear-search", this._element)?.classList.add("hidden");
      $("#search-results-count", this._element)?.classList.add("hidden");
    }
    /**
     * S'abonne aux changements d'état
     */
    _subscribeToState() {
      const unsubTasks = State.subscribe("tasks", () => {
        this.render();
        this._attachButtonListeners();
      });
      this._unsubscribers.push(unsubTasks);
      const unsubConfig = State.subscribe("userConfig", () => {
        this.render();
        this._attachButtonListeners();
      });
      this._unsubscribers.push(unsubConfig);
    }
    /**
     * Met à jour l'affichage du nombre de résultats
     */
    updateResultsCount() {
      const resultsCount = $("#search-results-count", this._element);
      if (resultsCount && State.filters.search) {
        const count = State.getFilteredTasks().length;
        resultsCount.textContent = `${count} r\xE9sultat${count > 1 ? "s" : ""} pour "${State.filters.search}"`;
      }
    }
    /**
     * Nettoie le composant
     */
    destroy() {
      this._unsubscribers.forEach((unsub) => unsub());
      this._unsubscribers = [];
    }
  };
  var Sidebar = new SidebarComponent();

  // js/components/timeline.js
  var TimelineComponent = class {
    constructor() {
      this._element = null;
      this._chartElement = null;
      this._isExpanded = false;
      this._unsubscribers = [];
    }
    /**
     * Initialise le composant
     * @param {string} selector - Sélecteur du conteneur
     */
    init(selector) {
      this._element = $(selector);
      if (!this._element) {
        console.error("Timeline container not found:", selector);
        return;
      }
      this._renderStructure();
      this.render();
      this._subscribeToState();
    }
    /**
     * Rend la structure de base
     */
    _renderStructure() {
      setHtml(this._element, `
      <div class="timeline-header">
        <h2 class="timeline-title">Timeline des \xE9ch\xE9ances</h2>
        <button class="timeline-toggle-btn" id="timeline-toggle">\u2195 Agrandir</button>
      </div>
      <div id="timeline-chart" class="timeline-chart"></div>
    `);
      this._chartElement = $("#timeline-chart", this._element);
      const toggleBtn = $("#timeline-toggle", this._element);
      if (toggleBtn) {
        toggleBtn.addEventListener("click", () => this._toggleExpand());
      }
    }
    /**
     * Rend le contenu de la timeline
     */
    render() {
      const tasks = this._getTasksWithDates();
      if (tasks.length === 0) {
        setHtml(this._chartElement, `
        <div class="timeline-empty">Aucune t\xE2che avec \xE9ch\xE9ance \xE0 afficher</div>
      `);
        return;
      }
      const { startDate, endDate, totalDays } = this._calculateDateRange(tasks);
      const chartWidth = totalDays * Config.timeline.dayWidth;
      let html = `<div class="timeline-grid" style="width: ${chartWidth}px;">`;
      html += this._renderDateMarkers(startDate, endDate, totalDays);
      html += this._renderTasks(tasks, startDate, endDate);
      html += "</div>";
      setHtml(this._chartElement, html);
      this._attachTooltips();
      this._updateHeight();
    }
    /**
     * Récupère les tâches filtrées avec des dates valides
     */
    _getTasksWithDates() {
      return State.getFilteredTasks().filter((task) => {
        if (!task.dueDate) return false;
        const d = new Date(task.dueDate);
        return !isNaN(d.getTime()) && d.getFullYear() >= 1970;
      }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    }
    /**
     * Calcule la plage de dates pour l'affichage
     */
    _calculateDateRange(tasks) {
      const dates = tasks.map((t) => normalizeToMidnight(new Date(t.dueDate)));
      const today = normalizeToMidnight(/* @__PURE__ */ new Date());
      const minDate = new Date(Math.min(...dates, today));
      const maxDate = new Date(Math.max(...dates, today));
      const margin = Config.timeline.marginDays;
      const startDate = new Date(minDate);
      startDate.setDate(startDate.getDate() - margin);
      const endDate = new Date(maxDate);
      endDate.setDate(endDate.getDate() + margin);
      const totalDays = Math.ceil((endDate - startDate) / (1e3 * 60 * 60 * 24));
      return { startDate, endDate, totalDays };
    }
    /**
     * Génère le HTML des marqueurs de dates
     */
    _renderDateMarkers(startDate, endDate, totalDays) {
      let html = '<div class="timeline-dates">';
      for (let i = 0; i <= totalDays; i++) {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1e3);
        const position = i / totalDays * 100;
        const todayClass = isToday(date) ? " today" : "";
        html += `
        <div class="timeline-date-marker${todayClass}" style="left: ${position}%;">
          ${formatDateShort(date)}
        </div>
        <div class="timeline-date-line${todayClass}" style="left: ${position}%;"></div>
      `;
      }
      html += "</div>";
      return html;
    }
    /**
     * Génère le HTML des tâches
     */
    _renderTasks(tasks, startDate, endDate) {
      const totalRange = endDate - startDate;
      let html = `<div class="timeline-tasks" style="min-height: ${tasks.length * Config.timeline.taskSpacing}px;">`;
      tasks.forEach((task, index) => {
        const taskDate = normalizeToMidnight(new Date(task.dueDate));
        const position = (taskDate - startDate) / totalRange * 100;
        const top = index * Config.timeline.taskSpacing;
        const dueClass = getDueClass(task.dueDate);
        const doneClass = task.statusKey === "done" ? "done" : "";
        const tooltipDate = formatDateShort(new Date(task.dueDate));
        const tooltipText = escapeAttr(`${task.summary} - ${tooltipDate}`);
        const truncatedTitle = task.summary.length > 50 ? task.summary.substring(0, 50) + "..." : task.summary;
        const url = task.link || "#";
        html += `
        <a href="${url}" target="_blank"
           class="timeline-task ${dueClass} ${doneClass}"
           style="left: ${position}%; top: ${top}px;"
           data-tooltip="${tooltipText}">
          ${escapeAttr(truncatedTitle)}
        </a>
      `;
      });
      html += "</div>";
      return html;
    }
    /**
     * Attache les événements de tooltip
     */
    _attachTooltips() {
      const tasks = this._chartElement.querySelectorAll(".timeline-task[data-tooltip]");
      tasks.forEach((task) => {
        task.addEventListener("mouseenter", function() {
          const tooltip = document.createElement("div");
          tooltip.className = "timeline-tooltip";
          tooltip.textContent = this.getAttribute("data-tooltip");
          document.body.appendChild(tooltip);
          const rect = this.getBoundingClientRect();
          const tooltipWidth = tooltip.offsetWidth;
          const tooltipHeight = tooltip.offsetHeight;
          const viewportWidth = window.innerWidth;
          let left = rect.left + rect.width / 2 - tooltipWidth / 2;
          if (left + tooltipWidth > viewportWidth - 10) {
            left = viewportWidth - tooltipWidth - 10;
          }
          if (left < 10) {
            left = 10;
          }
          tooltip.style.left = left + "px";
          tooltip.style.top = rect.top - tooltipHeight - 8 + "px";
          this._tooltip = tooltip;
        });
        task.addEventListener("mouseleave", function() {
          if (this._tooltip) {
            this._tooltip.remove();
            this._tooltip = null;
          }
        });
      });
    }
    /**
     * Bascule l'expansion de la timeline
     */
    _toggleExpand() {
      this._isExpanded = !this._isExpanded;
      const toggleBtn = $("#timeline-toggle", this._element);
      if (this._isExpanded) {
        this._chartElement.style.height = this._chartElement.scrollHeight + 15 + "px";
        if (toggleBtn) toggleBtn.textContent = "\u2195 R\xE9duire";
      } else {
        this._updateHeight();
        if (toggleBtn) toggleBtn.textContent = "\u2195 Agrandir";
      }
    }
    /**
     * Met à jour la hauteur de la timeline (mode collapsed)
     */
    _updateHeight() {
      if (this._isExpanded) return;
      const tasks = this._chartElement.querySelectorAll(".timeline-task");
      const maxTasks = Config.timeline.collapsedTaskCount;
      if (tasks.length >= maxTasks) {
        const task = tasks[maxTasks - 1];
        this._chartElement.style.height = task.offsetTop + task.offsetHeight + 4 + "px";
      } else if (tasks.length > 0) {
        const lastTask = tasks[tasks.length - 1];
        this._chartElement.style.height = lastTask.offsetTop + lastTask.offsetHeight + 4 + "px";
      } else {
        this._chartElement.style.height = "200px";
      }
    }
    /**
     * S'abonne aux changements d'état
     */
    _subscribeToState() {
      const unsubTasks = State.subscribe("tasks", () => this.render());
      const unsubFilters = State.subscribe("filters", () => this.render());
      this._unsubscribers.push(unsubTasks, unsubFilters);
    }
    /**
     * Nettoie le composant
     */
    destroy() {
      this._unsubscribers.forEach((unsub) => unsub());
      this._unsubscribers = [];
    }
  };
  var Timeline = new TimelineComponent();

  // js/components/task-table.js
  var TaskTableComponent = class {
    constructor() {
      this._element = null;
      this._unsubscribers = [];
      this._sortState = {};
    }
    /**
     * Initialise le composant
     * @param {string} containerSelector - Sélecteur du conteneur des tables
     */
    init(containerSelector) {
      this._element = $(containerSelector);
      if (!this._element) {
        console.error("Task table container not found:", containerSelector);
        return;
      }
      this.render();
      this._attachEventListeners();
      this._subscribeToState();
    }
    /**
     * Rend les tables selon le mode de vue
     */
    render() {
      if (State.viewMode === "project") {
        this._renderByProject();
      } else {
        this._renderByDate();
      }
    }
    /**
     * Rend les tâches groupées par projet
     */
    _renderByProject() {
      const tasksByProject = State.getTasksByProject();
      const projectNames = Object.keys(tasksByProject).sort();
      if (projectNames.length === 0) {
        setHtml(this._element, `
        <div class="empty-state">
          <p>Aucune t\xE2che \xE0 afficher</p>
          <p>Importez un fichier XML JIRA ou ouvrez un projet existant.</p>
        </div>
      `);
        return;
      }
      let html = "";
      projectNames.forEach((projectName) => {
        const tasks = tasksByProject[projectName];
        if (tasks.length === 0) return;
        html += `
        <h2 class="project-title">${projectName.toUpperCase()}</h2>
        ${this._renderTable(tasks, `table-${projectName}`)}
      `;
      });
      setHtml(this._element, html);
    }
    /**
     * Rend les tâches triées par date
     */
    _renderByDate() {
      const tasks = State.getTasksByDate();
      if (tasks.length === 0) {
        setHtml(this._element, `
        <div class="empty-state">
          <p>Aucune t\xE2che \xE0 afficher</p>
          <p>Importez un fichier XML JIRA ou ouvrez un projet existant.</p>
        </div>
      `);
        return;
      }
      setHtml(this._element, `
      <h2 class="project-title">T\xC2CHES TRI\xC9ES PAR DATE D'\xC9CH\xC9ANCE</h2>
      ${this._renderTable(tasks, "table-by-date", true)}
    `);
    }
    /**
     * Génère le HTML d'une table de tâches
     */
    _renderTable(tasks, tableId, sortedByDate = false) {
      const sortState = this._sortState[tableId];
      const dueSortClass = sortedByDate ? "sort-asc" : "";
      return `
      <table class="tasks-table" data-sortable="true" data-table-id="${tableId}">
        <thead>
          <tr>
            <th class="col-key" data-sort="key">Cl\xE9<span class="sort-indicator"></span></th>
            <th class="col-title" data-sort="title">Titre<span class="sort-indicator"></span></th>
            <th class="col-project" data-sort="project">Projet<span class="sort-indicator"></span></th>
            <th class="col-status" data-sort="status">Statut<span class="sort-indicator"></span></th>
            <th class="col-due ${dueSortClass}" data-sort="due">\xC9ch\xE9ance<span class="sort-indicator"></span></th>
            <th class="col-labels">Labels</th>
            <th class="col-priority" data-sort="priority">Priorit\xE9<span class="sort-indicator"></span></th>
            <th class="col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${tasks.map((task) => this._renderTaskRow(task)).join("")}
        </tbody>
      </table>
    `;
    }
    /**
     * Récupère les infos de statut depuis Config.statusMap (case-insensitive)
     * Si pas trouvé, retourne un objet avec le statut brut
     */
    _getStatusInfo(status) {
      if (!status) return Config.defaultStatus;
      const key = Object.keys(Config.statusMap).find((k) => k.toLowerCase() === status.toLowerCase());
      if (key) {
        return Config.statusMap[key];
      }
      const statusLower = status.toLowerCase();
      if (statusLower === "done" || statusLower === "closed" || statusLower === "resolved") {
        return { key: "done", label: status, icon: "\u2713", cssClass: "status-done" };
      }
      if (statusLower.includes("progress") || statusLower.includes("cours") || statusLower.includes("d\xE9velopp") || statusLower.includes("termin\xE9")) {
        return { key: "inprogress", label: status, icon: "\u23F3", cssClass: "status-inprogress" };
      }
      if (statusLower.includes("review") || statusLower.includes("revue")) {
        return { key: "review", label: status, icon: "\u{1F440}", cssClass: "status-review" };
      }
      if (statusLower.includes("livr") || statusLower.includes("deliver")) {
        return { key: "delivered", label: status, icon: "\u{1F4E6}", cssClass: "status-delivered" };
      }
      if (statusLower.includes("pr\xEAt") || statusLower.includes("ready") || statusLower.includes("test")) {
        return { key: "ready", label: status, icon: "\u{1F680}", cssClass: "status-ready" };
      }
      return { key: "backlog", label: status, icon: "\u{1F4CB}", cssClass: "status-backlog" };
    }
    /**
     * Génère le HTML d'une ligne de tâche
     */
    _renderTaskRow(task) {
      const statusInfo = this._getStatusInfo(task.status);
      const statusKey = statusInfo.key;
      const isManualDone = task.done === true;
      const isStatusDone = statusKey === "done";
      const hasLabelDone = (task.labels || []).some((l) => l.toLowerCase() === "done");
      const rowClass = isManualDone ? "task-manual-done" : isStatusDone ? "task-done" : hasLabelDone ? "task-label-done" : "";
      const dueDate = formatDate(task.dueDate);
      const dueClass = getDueClass(task.dueDate);
      const statusIcon = statusInfo.icon;
      const statusLabel = statusInfo.label;
      const statusCss = statusInfo.cssClass;
      const priorityText = task.priorityText || "-";
      const priorityCss = task.priorityCssClass || "";
      const labels = (task.labels || []).map((l) => this._formatLabel(l)).join("");
      const jiraUrl = task.link || null;
      const taskKey = task.key || "";
      return `
      <tr class="${rowClass}"
          data-key="${escapeAttr(taskKey)}"
          data-title="${escapeAttr(task.summary || "")}"
          data-due="${task.dueDate || ""}"
          data-priority="${task.priorityCssClass || ""}"
          data-person="${escapeAttr(task.reporter || "")}"
          data-project="${escapeAttr(task.project || "")}"
          data-status="${statusKey}">
        <td class="task-key">
          ${jiraUrl ? `<a href="${jiraUrl}" target="_blank" class="task-key-link">${escapeAttr(taskKey)}</a>` : escapeAttr(taskKey)}
        </td>
        <td class="task-title">
          ${escapeAttr(task.summary || "")}
          ${isManualDone ? '<span class="task-manual-done-badge">\u2713 Termin\xE9</span>' : ""}
          ${!isManualDone && isStatusDone ? '<span class="task-done-badge">\u2713 Termin\xE9</span>' : ""}
          ${!isManualDone && !isStatusDone && hasLabelDone ? '<span class="task-label-done-badge">\u2713 Termin\xE9</span>' : ""}
        </td>
        <td class="task-project">${escapeAttr(task.project || "")}</td>
        <td class="task-status">
          <span class="status-badge ${statusCss}">${statusIcon} ${statusLabel}</span>
        </td>
        <td class="task-due ${dueClass}">${dueDate}</td>
        <td><div class="task-labels">${labels}</div></td>
        <td class="priority ${priorityCss}">${priorityText}</td>
        <td class="task-actions">
          <button class="action-btn action-done ${task.done ? "is-done" : ""}" data-action="done" data-key="${escapeAttr(taskKey)}" title="${task.done ? "Marquer non termin\xE9" : "Marquer termin\xE9"}">${task.done ? "\u21A9" : "\u2713"}</button>
          <button class="action-btn action-edit" data-action="edit" data-key="${escapeAttr(taskKey)}" title="Modifier">\u270F\uFE0F</button>
          <button class="action-btn action-ban" data-action="ban" data-key="${escapeAttr(taskKey)}" title="Bloquer">\u{1F6AB}</button>
          <button class="action-btn action-delete" data-action="delete" data-key="${escapeAttr(taskKey)}" title="Supprimer">\u{1F5D1}\uFE0F</button>
        </td>
      </tr>
    `;
    }
    /**
     * Formate un label
     */
    _formatLabel(label) {
      const lowerLabel = label.toLowerCase();
      if (lowerLabel === "done") {
        return `<span class="label label-done" data-label="done">${escapeAttr(label)}</span>`;
      }
      return `<span class="label">${escapeAttr(label)}</span>`;
    }
    /**
     * Attache les écouteurs d'événements
     */
    _attachEventListeners() {
      delegate(this._element, "click", "th[data-sort]", (e, th) => {
        this._handleSort(th);
      });
      delegate(this._element, "dblclick", "tr[data-key]", (e, row) => {
        const taskKey = row.dataset.key;
        if (taskKey) {
          document.dispatchEvent(new CustomEvent("app:edit-task", {
            detail: { taskKey }
          }));
        }
      });
      delegate(this._element, "click", ".action-btn", (e, btn) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const key = btn.dataset.key;
        switch (action) {
          case "done":
            this._handleToggleDone(key);
            break;
          case "edit":
            document.dispatchEvent(new CustomEvent("app:edit-task", {
              detail: { taskKey: key }
            }));
            break;
          case "ban":
            this._handleBan(key);
            break;
          case "delete":
            this._handleDelete(key);
            break;
        }
      });
    }
    /**
     * Gère le marquage terminé/non terminé d'un ticket
     */
    _handleToggleDone(key) {
      const task = State.tasks.find((t) => t.key === key);
      if (task) {
        State.updateTask(key, { done: !task.done });
      }
    }
    /**
     * Gère le blocage d'un ticket
     */
    _handleBan(key) {
      if (confirm(`Bloquer le ticket ${key} ? Il sera masqu\xE9 de l'affichage.`)) {
        UserConfig.addToBlacklist(key);
      }
    }
    /**
     * Gère la suppression d'un ticket
     */
    _handleDelete(key) {
      if (confirm(`Supprimer d\xE9finitivement le ticket ${key} ?`)) {
        State.removeTask(key);
      }
    }
    /**
     * Gère le tri d'une colonne
     */
    _handleSort(th) {
      const table = th.closest("table");
      if (!table) return;
      const tableId = table.dataset.tableId;
      const sortKey = th.dataset.sort;
      const currentDir = th.classList.contains("sort-asc") ? "asc" : th.classList.contains("sort-desc") ? "desc" : null;
      const newDir = currentDir === "asc" ? "desc" : "asc";
      table.querySelectorAll("th[data-sort]").forEach((header) => {
        header.classList.remove("sort-asc", "sort-desc");
      });
      th.classList.add("sort-" + newDir);
      this._sortState[tableId] = { key: sortKey, dir: newDir };
      this._sortTable(table, sortKey, newDir);
    }
    /**
     * Trie les lignes d'une table
     */
    _sortTable(table, sortKey, direction) {
      const tbody = table.querySelector("tbody");
      if (!tbody) return;
      const rows = Array.from(tbody.querySelectorAll("tr"));
      rows.sort((a, b) => {
        let valA, valB;
        switch (sortKey) {
          case "key":
            valA = a.dataset.key || "";
            valB = b.dataset.key || "";
            break;
          case "title":
            valA = a.dataset.title || "";
            valB = b.dataset.title || "";
            break;
          case "due":
            valA = a.dataset.due || "9999-12-31";
            valB = b.dataset.due || "9999-12-31";
            break;
          case "priority":
            const priorityOrder = { "critical": 1, "high": 2, "medium": 3, "low": 4, "lowest": 5, "": 6 };
            valA = priorityOrder[a.dataset.priority] || 6;
            valB = priorityOrder[b.dataset.priority] || 6;
            break;
          case "person":
            valA = a.dataset.person || "zzz";
            valB = b.dataset.person || "zzz";
            break;
          case "status":
            valA = Config.statusOrder[a.dataset.status] || 0;
            valB = Config.statusOrder[b.dataset.status] || 0;
            break;
          case "project":
            valA = a.dataset.project || "";
            valB = b.dataset.project || "";
            break;
          default:
            valA = "";
            valB = "";
        }
        let result;
        if (sortKey === "priority" || sortKey === "status") {
          result = valA - valB;
        } else {
          result = String(valA).localeCompare(String(valB));
        }
        return direction === "desc" ? -result : result;
      });
      rows.forEach((row) => tbody.appendChild(row));
    }
    /**
     * S'abonne aux changements d'état
     */
    _subscribeToState() {
      const unsubTasks = State.subscribe("tasks", () => this.render());
      const unsubFilters = State.subscribe("filters", () => this.render());
      const unsubViewMode = State.subscribe("viewMode", () => this.render());
      const unsubConfig = State.subscribe("userConfig", () => this.render());
      this._unsubscribers.push(unsubTasks, unsubFilters, unsubViewMode, unsubConfig);
    }
    /**
     * Nettoie le composant
     */
    destroy() {
      this._unsubscribers.forEach((unsub) => unsub());
      this._unsubscribers = [];
    }
  };
  var TaskTable = new TaskTableComponent();

  // js/components/stats.js
  var StatsComponent = class {
    constructor() {
      this._element = null;
      this._unsubscribers = [];
    }
    /**
     * Initialise le composant
     * @param {string} selector - Sélecteur du conteneur
     */
    init(selector) {
      this._element = $(selector);
      if (!this._element) {
        console.error("Stats container not found:", selector);
        return;
      }
      this.render();
      this._attachEventListeners();
      this._subscribeToState();
    }
    /**
     * Rend la barre
     */
    render() {
      const stats = State.getStats();
      const viewMode = State.viewMode;
      setHtml(this._element, `
      <div class="ribbon-group">
        <span class="ribbon-group-title">Statistiques</span>
        <div class="ribbon-group-content">
          <span class="stats-info"><strong>${stats.totalTasks}</strong> t\xE2ches</span>
          <span class="stats-info"><strong>${stats.totalProjects}</strong> projets</span>
        </div>
      </div>

      <span class="stats-sep"></span>

      <div class="ribbon-group">
        <span class="ribbon-group-title">Fichier</span>
        <div class="ribbon-group-content">
          <button id="btn-open" class="stats-btn" title="Ouvrir (Ctrl+O)">
            <span class="btn-icon">\u{1F4C2}</span><span class="btn-label">Ouvrir</span>
          </button>
          <button id="btn-save" class="stats-btn stats-btn-primary" title="Sauvegarder (Ctrl+S)">
            <span class="btn-icon">\u{1F4BE}</span><span class="btn-label">Sauver</span>
          </button>
          <button id="btn-import-xml" class="stats-btn" title="Import XML (Ctrl+I)">
            <span class="btn-icon">\u{1F4E5}</span><span class="btn-label">Import</span>
          </button>
          <button id="btn-backup" class="stats-btn" title="T\xE9l\xE9charger backup">
            <span class="btn-icon">\u2B07\uFE0F</span><span class="btn-label">Backup</span>
          </button>
          <button id="btn-clear" class="stats-btn stats-btn-danger" title="Effacer tous les tickets">
            <span class="btn-icon">\u{1F5D1}\uFE0F</span><span class="btn-label">Clear</span>
          </button>
        </div>
      </div>

      <span class="stats-sep"></span>

      <div class="ribbon-group">
        <span class="ribbon-group-title">Affichage</span>
        <div class="ribbon-group-content">
          <button id="view-by-project" class="stats-btn stats-btn-toggle ${viewMode === "project" ? "active" : ""}" title="Vue par projet">
            <span class="btn-icon">\u{1F4C1}</span><span class="btn-label">Projet</span>
          </button>
          <button id="view-by-date" class="stats-btn stats-btn-toggle ${viewMode === "date" ? "active" : ""}" title="Vue par date">
            <span class="btn-icon">\u{1F4C5}</span><span class="btn-label">Date</span>
          </button>
        </div>
      </div>

      <span class="stats-sep"></span>

      <div class="ribbon-group">
        <span class="ribbon-group-title">Rapport</span>
        <div class="ribbon-group-content">
          <button id="btn-report-text" class="stats-btn" title="Rapport texte">
            <span class="btn-icon">\u{1F4DD}</span><span class="btn-label">Texte</span>
          </button>
          <button id="btn-report-html" class="stats-btn" title="Rapport HTML">
            <span class="btn-icon">\u{1F310}</span><span class="btn-label">HTML</span>
          </button>
        </div>
      </div>

      <span class="stats-spacer"></span>

      <button id="btn-config" class="stats-btn" title="Configuration (Ctrl+,)">
        <span class="btn-icon">\u2699\uFE0F</span><span class="btn-label">Config</span>
      </button>
    `);
    }
    /**
     * Attache les écouteurs d'événements
     */
    _attachEventListeners() {
      delegate(this._element, "click", "#btn-open", () => {
        document.dispatchEvent(new CustomEvent("app:open"));
      });
      delegate(this._element, "click", "#btn-save", () => {
        document.dispatchEvent(new CustomEvent("app:save"));
      });
      delegate(this._element, "click", "#btn-import-xml", () => {
        document.dispatchEvent(new CustomEvent("app:import-xml"));
      });
      delegate(this._element, "click", "#btn-backup", () => {
        document.dispatchEvent(new CustomEvent("app:backup"));
      });
      delegate(this._element, "click", "#btn-clear", () => {
        document.dispatchEvent(new CustomEvent("app:clear"));
      });
      delegate(this._element, "click", "#btn-report-text", () => {
        document.dispatchEvent(new CustomEvent("app:report-text"));
      });
      delegate(this._element, "click", "#btn-report-html", () => {
        document.dispatchEvent(new CustomEvent("app:report-html"));
      });
      delegate(this._element, "click", "#btn-config", () => {
        document.dispatchEvent(new CustomEvent("app:config"));
      });
      delegate(this._element, "click", "#view-by-project", () => {
        State.setViewMode("project");
        this._updateViewModeButtons();
      });
      delegate(this._element, "click", "#view-by-date", () => {
        State.setViewMode("date");
        this._updateViewModeButtons();
      });
    }
    /**
     * Met à jour les boutons de vue
     */
    _updateViewModeButtons() {
      const projectBtn = $("#view-by-project", this._element);
      const dateBtn = $("#view-by-date", this._element);
      const viewMode = State.viewMode;
      projectBtn?.classList.toggle("active", viewMode === "project");
      dateBtn?.classList.toggle("active", viewMode === "date");
    }
    /**
     * S'abonne aux changements d'état
     */
    _subscribeToState() {
      const unsubTasks = State.subscribe("tasks", () => this.render());
      const unsubFilters = State.subscribe("filters", () => this.render());
      this._unsubscribers.push(unsubTasks, unsubFilters);
    }
    /**
     * Nettoie le composant
     */
    destroy() {
      this._unsubscribers.forEach((unsub) => unsub());
      this._unsubscribers = [];
    }
  };
  var Stats = new StatsComponent();

  // js/components/modals/import.js
  var ImportModalComponent = class {
    constructor() {
      this._element = null;
      this._isOpen = false;
    }
    /**
     * Initialise le composant
     * @param {string} selector - Sélecteur du conteneur modal
     */
    init(selector) {
      this._element = $(selector);
      if (!this._element) {
        console.error("Import modal container not found:", selector);
        return;
      }
      this._render();
      this._attachEventListeners();
    }
    /**
     * Rend la structure de la modal
     */
    _render() {
      setHtml(this._element, `
      <div class="modal-content modal-content-large modal-import">
        <div class="modal-header">
          <h2>Import JIRA XML</h2>
          <button id="close-import-modal" class="close-modal-btn">\u2715</button>
        </div>
        <div class="modal-body">
          <div class="jira-import-instructions">
            <p>Glissez-d\xE9posez un fichier XML ou collez le contenu export\xE9 depuis JIRA.</p>
            <p class="jira-import-hint">Export depuis JIRA : Filtres \u2192 Exporter \u2192 XML</p>
          </div>

          <div class="jira-input-row">
            <div id="import-dropzone" class="jira-dropzone">
              <div class="jira-dropzone-content">
                <span class="jira-dropzone-icon">\u{1F4C4}</span>
                <label class="jira-file-btn">
                  \u{1F4C1} Parcourir
                  <input type="file" id="import-file-input" accept=".xml,text/xml,application/xml" class="hidden">
                </label>
              </div>
            </div>

            <textarea id="import-xml-input" class="jira-xml-input"
                      placeholder="...ou collez le XML JIRA ici"></textarea>
          </div>

          <div class="jira-import-actions">
            <button id="btn-analyze-xml" class="analyze-jira-btn">\u{1F50D} Analyser</button>
            <span id="import-status" class="jira-analyze-status"></span>
            <div id="import-stats" class="jira-import-stats hidden"></div>
          </div>

          <div id="import-results" class="jira-import-results hidden"></div>
        </div>
        <div id="import-actions-final" class="modal-footer import-actions-final hidden">
          <div class="import-actions-row">
            <button id="btn-import-add" class="action-btn action-btn-primary">
              \u2795 Ajouter les nouveaux
            </button>
            <button id="btn-import-update" class="action-btn action-btn-import">
              \u{1F504} Mettre \xE0 jour les existants
            </button>
            <button id="btn-import-replace" class="action-btn action-btn-secondary">
              \u26A0\uFE0F Tout remplacer
            </button>
          </div>
          <div id="import-update-options" class="import-update-options hidden">
            <div class="update-fields-section">
              <span class="update-options-label">Champs \xE0 mettre \xE0 jour :</span>
              <div class="update-options-checkboxes">
                <label><input type="checkbox" id="update-summary" checked> Titre</label>
                <label><input type="checkbox" id="update-status" checked> Statut</label>
                <label><input type="checkbox" id="update-priority" checked> Priorit\xE9</label>
                <label><input type="checkbox" id="update-duedate" checked> \xC9ch\xE9ance</label>
                <label><input type="checkbox" id="update-labels"> Labels</label>
                <label><input type="checkbox" id="update-project"> Projet</label>
                <label><input type="checkbox" id="update-assignee"> Assign\xE9</label>
              </div>
            </div>
            <div class="update-tickets-section">
              <div class="update-tickets-header">
                <span class="update-options-label">Tickets \xE0 mettre \xE0 jour :</span>
                <label class="select-all-label"><input type="checkbox" id="update-select-all" checked> Tout s\xE9lectionner</label>
              </div>
              <div id="update-tickets-list" class="update-tickets-list"></div>
            </div>
            <button id="btn-confirm-update" class="action-btn action-btn-primary">
              \u2713 Confirmer la mise \xE0 jour
            </button>
          </div>
        </div>
      </div>
    `);
    }
    /**
     * Attache les écouteurs d'événements
     */
    _attachEventListeners() {
      const closeBtn = $("#close-import-modal", this._element);
      closeBtn?.addEventListener("click", () => this.close());
      this._element.addEventListener("click", (e) => {
        if (e.target === this._element) {
          this.close();
        }
      });
      const dropzone = $("#import-dropzone", this._element);
      if (dropzone) {
        dropzone.addEventListener("dragover", (e) => {
          e.preventDefault();
          e.stopPropagation();
          addClass(dropzone, "dragover");
        });
        dropzone.addEventListener("dragleave", (e) => {
          e.preventDefault();
          e.stopPropagation();
          removeClass(dropzone, "dragover");
        });
        dropzone.addEventListener("drop", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          removeClass(dropzone, "dragover");
          await this._handleFileDrop(e.dataTransfer.files);
        });
      }
      const fileInput = $("#import-file-input", this._element);
      fileInput?.addEventListener("change", async (e) => {
        if (e.target.files.length > 0) {
          await this._handleFileDrop(e.target.files);
        }
        e.target.value = "";
      });
      const analyzeBtn = $("#btn-analyze-xml", this._element);
      analyzeBtn?.addEventListener("click", () => this._analyze());
      const addBtn = $("#btn-import-add", this._element);
      addBtn?.addEventListener("click", () => this._importAdd());
      const updateBtn = $("#btn-import-update", this._element);
      updateBtn?.addEventListener("click", () => this._showUpdateOptions());
      const confirmUpdateBtn = $("#btn-confirm-update", this._element);
      confirmUpdateBtn?.addEventListener("click", () => this._importUpdate());
      const replaceBtn = $("#btn-import-replace", this._element);
      replaceBtn?.addEventListener("click", () => this._importReplace());
    }
    /**
     * Affiche les options de mise à jour
     */
    _showUpdateOptions() {
      const optionsEl = $("#import-update-options", this._element);
      if (optionsEl) {
        const isHidden = optionsEl.classList.contains("hidden");
        optionsEl.classList.toggle("hidden");
        if (isHidden) {
          this._renderUpdateTicketsList();
        }
      }
    }
    /**
     * Rend la liste des tickets à mettre à jour
     */
    _renderUpdateTicketsList() {
      const listEl = $("#update-tickets-list", this._element);
      if (!listEl || !this._parsedTickets) return;
      const existingTickets = this._parsedTickets.filter(
        (ticket) => State.tasks.some((t) => t.key.toUpperCase() === ticket.key.toUpperCase())
      );
      if (existingTickets.length === 0) {
        setHtml(listEl, '<span class="no-tickets">Aucun ticket existant \xE0 mettre \xE0 jour</span>');
        return;
      }
      const html = existingTickets.map((ticket) => `
      <label class="update-ticket-item">
        <input type="checkbox" class="update-ticket-checkbox" data-key="${escapeAttr(ticket.key)}" checked>
        <span class="update-ticket-key">${escapeAttr(ticket.key)}</span>
        <span class="update-ticket-summary">${escapeAttr(ticket.summary || "")}</span>
      </label>
    `).join("");
      setHtml(listEl, html);
      const selectAllEl = $("#update-select-all", this._element);
      if (selectAllEl) {
        selectAllEl.checked = true;
        selectAllEl.onchange = () => {
          const checkboxes = $$(".update-ticket-checkbox", this._element);
          checkboxes.forEach((cb) => cb.checked = selectAllEl.checked);
        };
      }
    }
    /**
     * Gère le drop de fichier
     */
    async _handleFileDrop(files) {
      if (files.length === 0) return;
      const file = files[0];
      if (!isXmlFile(file)) {
        this._setStatus("\u274C Le fichier doit \xEAtre au format XML", "error");
        return;
      }
      try {
        const content = await readFileAsText(file);
        const xmlInput = $("#import-xml-input", this._element);
        if (xmlInput) {
          xmlInput.value = content;
        }
        this._analyze();
      } catch (err) {
        this._setStatus("\u274C " + err.message, "error");
      }
    }
    /**
     * Analyse le XML
     */
    _analyze() {
      const xmlInput = $("#import-xml-input", this._element);
      const xmlContent = xmlInput?.value.trim();
      if (!xmlContent) {
        this._setStatus("\u26A0\uFE0F Veuillez coller le contenu XML", "error");
        return;
      }
      try {
        this._setStatus("\u23F3 Analyse en cours...", "");
        const tickets = parseJiraXml(xmlContent);
        if (tickets.length === 0) {
          this._setStatus("\u26A0\uFE0F Aucun ticket trouv\xE9 dans le XML", "error");
          return;
        }
        this._parsedTickets = tickets;
        const comparison = compareTickets(tickets, State.tasks);
        this._displayResults(comparison);
        this._setStatus(`\u2713 ${tickets.length} tickets analys\xE9s`, "success");
      } catch (err) {
        this._setStatus("\u274C " + err.message, "error");
        this._hideResults();
      }
    }
    /**
     * Affiche les résultats de l'analyse
     */
    _displayResults(results) {
      const statsEl = $("#import-stats", this._element);
      const resultsEl = $("#import-results", this._element);
      const actionsEl = $("#import-actions-final", this._element);
      if (statsEl) {
        setHtml(statsEl, `
        <span class="jira-stat-inline jira-stat-total">
          <strong>${results.total}</strong> tickets
        </span>
        <span class="jira-stat-inline jira-stat-new">
          <strong>${results.new.length}</strong> nouveaux
        </span>
        <span class="jira-stat-inline jira-stat-existing">
          <strong>${results.existing.length}</strong> existants
        </span>
      `);
        removeClass(statsEl, "hidden");
      }
      if (!resultsEl) return;
      let html = "";
      if (results.new.length > 0) {
        html += `
        <div class="jira-results-section">
          <h3 class="jira-section-title jira-section-new">\u{1F195} Tickets \xE0 ajouter (${results.new.length})</h3>
          ${this._renderTicketsTable(results.new)}
        </div>
      `;
      }
      if (results.existing.length > 0) {
        html += `
        <div class="jira-results-section">
          <h3 class="jira-section-title jira-section-existing">\u2713 Tickets d\xE9j\xE0 pr\xE9sents (${results.existing.length})</h3>
          <details class="jira-existing-details">
            <summary>Afficher les ${results.existing.length} tickets existants</summary>
            ${this._renderTicketsTable(results.existing, true)}
          </details>
        </div>
      `;
      }
      setHtml(resultsEl, html);
      removeClass(resultsEl, "hidden");
      if (actionsEl) {
        removeClass(actionsEl, "hidden");
      }
    }
    /**
     * Génère le HTML d'une table de tickets
     */
    _renderTicketsTable(tickets, isExisting = false) {
      return `
      <table class="jira-results-table">
        <thead>
          <tr>
            <th>Cl\xE9</th>
            <th>Projet</th>
            <th>R\xE9sum\xE9</th>
            <th>Statut</th>
            <th>Priorit\xE9</th>
            <th>\xC9ch\xE9ance</th>
          </tr>
        </thead>
        <tbody>
          ${tickets.map((t) => `
            <tr class="${isExisting ? "jira-row-existing" : ""}">
              <td>
                <a href="${t.link || "#"}" target="_blank">${t.key}</a>
              </td>
              <td>${escapeAttr(t.project || "-")}</td>
              <td>${escapeAttr(t.summary || "")}</td>
              <td><span class="jira-status">${t.status || "-"}</span></td>
              <td>${t.priority || "-"}</td>
              <td>${t.dueDate ? formatDate(t.dueDate) : "-"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
    }
    /**
     * Cache les résultats
     */
    _hideResults() {
      const statsEl = $("#import-stats", this._element);
      const resultsEl = $("#import-results", this._element);
      const actionsEl = $("#import-actions-final", this._element);
      if (statsEl) addClass(statsEl, "hidden");
      if (resultsEl) addClass(resultsEl, "hidden");
      if (actionsEl) addClass(actionsEl, "hidden");
    }
    /**
     * Import mode: Ajouter les nouveaux
     */
    _importAdd() {
      if (!this._parsedTickets || this._parsedTickets.length === 0) {
        this._setStatus("\u26A0\uFE0F Aucun ticket \xE0 importer", "error");
        return;
      }
      const result = Storage.importXmlFromString(
        $("#import-xml-input", this._element)?.value || "",
        { mergeWithExisting: true, updateExisting: false }
      );
      if (result.success) {
        this._setStatus(`\u2713 ${result.imported} tickets import\xE9s`, "success");
        setTimeout(() => this.close(), 1500);
      } else {
        this._setStatus("\u274C " + (result.message || "Erreur"), "error");
      }
    }
    /**
     * Import mode: Mettre à jour les existants
     */
    _importUpdate() {
      if (!this._parsedTickets || this._parsedTickets.length === 0) {
        this._setStatus("\u26A0\uFE0F Aucun ticket \xE0 mettre \xE0 jour", "error");
        return;
      }
      const selectedKeys = /* @__PURE__ */ new Set();
      $$(".update-ticket-checkbox:checked", this._element).forEach((cb) => {
        selectedKeys.add(cb.dataset.key.toUpperCase());
      });
      if (selectedKeys.size === 0) {
        this._setStatus("\u26A0\uFE0F Aucun ticket s\xE9lectionn\xE9", "error");
        return;
      }
      const fieldsToUpdate = {
        summary: $("#update-summary", this._element)?.checked || false,
        status: $("#update-status", this._element)?.checked || false,
        priority: $("#update-priority", this._element)?.checked || false,
        dueDate: $("#update-duedate", this._element)?.checked || false,
        labels: $("#update-labels", this._element)?.checked || false,
        project: $("#update-project", this._element)?.checked || false,
        assignee: $("#update-assignee", this._element)?.checked || false
      };
      let updatedCount = 0;
      this._parsedTickets.forEach((importedTicket) => {
        const ticketKeyUpper = importedTicket.key.toUpperCase();
        if (!selectedKeys.has(ticketKeyUpper)) return;
        const existingTask = State.tasks.find(
          (t) => t.key.toUpperCase() === ticketKeyUpper
        );
        if (existingTask) {
          const updates = {};
          if (fieldsToUpdate.summary && importedTicket.summary) {
            updates.summary = importedTicket.summary;
          }
          if (fieldsToUpdate.status && importedTicket.status) {
            updates.status = importedTicket.status;
            updates.statusKey = importedTicket.statusKey;
            updates.statusLabel = importedTicket.statusLabel;
            updates.statusIcon = importedTicket.statusIcon;
            updates.statusCssClass = importedTicket.statusCssClass;
          }
          if (fieldsToUpdate.priority && importedTicket.priority) {
            updates.priority = importedTicket.priority;
            updates.priorityValue = importedTicket.priorityValue;
            updates.priorityText = importedTicket.priorityText;
            updates.priorityCssClass = importedTicket.priorityCssClass;
          }
          if (fieldsToUpdate.dueDate) {
            updates.dueDate = importedTicket.dueDate;
          }
          if (fieldsToUpdate.labels && importedTicket.labels) {
            updates.labels = importedTicket.labels;
          }
          if (fieldsToUpdate.project && importedTicket.project) {
            updates.project = importedTicket.project;
          }
          if (fieldsToUpdate.assignee) {
            updates.assignee = importedTicket.assignee;
          }
          if (Object.keys(updates).length > 0) {
            State.updateTask(existingTask.key, updates);
            updatedCount++;
          }
        }
      });
      this._setStatus(`\u2713 ${updatedCount} tickets mis \xE0 jour`, "success");
      setTimeout(() => this.close(), 1500);
    }
    /**
     * Import mode: Remplacer tout
     */
    _importReplace() {
      if (!this._parsedTickets || this._parsedTickets.length === 0) {
        this._setStatus("\u26A0\uFE0F Aucun ticket \xE0 importer", "error");
        return;
      }
      const result = Storage.importXmlFromString(
        $("#import-xml-input", this._element)?.value || "",
        { mergeWithExisting: false }
      );
      if (result.success) {
        this._setStatus(`\u2713 ${result.imported} tickets import\xE9s (remplacement)`, "success");
        setTimeout(() => this.close(), 1500);
      } else {
        this._setStatus("\u274C " + (result.message || "Erreur"), "error");
      }
    }
    /**
     * Définit le message de statut
     */
    _setStatus(message, type) {
      const statusEl = $("#import-status", this._element);
      if (statusEl) {
        statusEl.textContent = message;
        statusEl.className = "jira-analyze-status";
        if (type === "error") {
          addClass(statusEl, "jira-status-error");
        } else if (type === "success") {
          addClass(statusEl, "jira-status-success");
        }
      }
    }
    /**
     * Ouvre la modal
     */
    open() {
      if (this._element) {
        addClass(this._element, "show");
        this._isOpen = true;
        const xmlInput = $("#import-xml-input", this._element);
        if (xmlInput) xmlInput.value = "";
        this._hideResults();
        this._setStatus("", "");
        this._parsedTickets = null;
      }
    }
    /**
     * Ferme la modal
     */
    close() {
      if (this._element) {
        removeClass(this._element, "show");
        this._isOpen = false;
      }
    }
    /**
     * Toggle la modal
     */
    toggle() {
      if (this._isOpen) {
        this.close();
      } else {
        this.open();
      }
    }
    /**
     * Ouvre la modal avec un fichier et lance l'analyse
     * @param {File} file - Fichier XML à analyser
     */
    async openWithFile(file) {
      this.open();
      if (file) {
        await this._handleFileDrop([file]);
      }
    }
  };
  var ImportModal = new ImportModalComponent();

  // js/components/modals/report.js
  var ReportModalComponent = class {
    constructor() {
      this._element = null;
      this._isOpen = false;
      this._currentMode = "text";
    }
    /**
     * Initialise le composant
     * @param {string} selector - Sélecteur du conteneur modal
     */
    init(selector) {
      this._element = $(selector);
      if (!this._element) {
        console.error("Report modal container not found:", selector);
        return;
      }
      this._render();
      this._attachEventListeners();
    }
    /**
     * Rend la structure de la modal
     */
    _render() {
      setHtml(this._element, `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Rapport des t\xE2ches filtr\xE9es</h2>
          <button id="close-report-modal" class="close-modal-btn">\u2715</button>
        </div>

        <div class="modal-columns-options">
          <span class="columns-options-label">Colonnes :</span>
          <label class="column-checkbox">
            <input type="checkbox" id="report-col-echeance" checked> \xC9ch\xE9ance
          </label>
          <label class="column-checkbox">
            <input type="checkbox" id="report-col-statut" checked> Statut
          </label>
          <label class="column-checkbox">
            <input type="checkbox" id="report-col-personne" checked> Rapporteur
          </label>
          <label class="column-checkbox">
            <input type="checkbox" id="report-col-projet" checked> Projet
          </label>
          <label class="column-checkbox">
            <input type="checkbox" id="report-col-jira" checked> JIRA
          </label>
        </div>

        <div class="modal-body">
          <textarea id="report-text-content" readonly></textarea>
          <div id="report-html-content"></div>
        </div>

        <div class="modal-footer">
          <button id="btn-copy-report" class="copy-report-btn">\u{1F4CB} Copier dans le presse-papier</button>
          <span id="copy-status" class="copy-status"></span>
        </div>
      </div>
    `);
    }
    /**
     * Attache les écouteurs d'événements
     */
    _attachEventListeners() {
      const closeBtn = $("#close-report-modal", this._element);
      closeBtn?.addEventListener("click", () => this.close());
      this._element.addEventListener("click", (e) => {
        if (e.target === this._element) {
          this.close();
        }
      });
      ["echeance", "statut", "personne", "projet", "jira"].forEach((col) => {
        const checkbox = $(`#report-col-${col}`, this._element);
        checkbox?.addEventListener("change", () => this._refreshReport());
      });
      const copyBtn = $("#btn-copy-report", this._element);
      copyBtn?.addEventListener("click", () => this._copyToClipboard());
    }
    /**
     * Ouvre la modal en mode texte
     */
    openText() {
      this._currentMode = "text";
      this._openModal();
      const textArea = $("#report-text-content", this._element);
      const htmlDiv = $("#report-html-content", this._element);
      if (textArea) {
        textArea.style.display = "block";
        textArea.value = this._generateTextReport();
      }
      if (htmlDiv) {
        htmlDiv.style.display = "none";
      }
    }
    /**
     * Ouvre la modal en mode HTML
     */
    openHtml() {
      this._currentMode = "html";
      this._openModal();
      const textArea = $("#report-text-content", this._element);
      const htmlDiv = $("#report-html-content", this._element);
      if (textArea) {
        textArea.style.display = "none";
      }
      if (htmlDiv) {
        htmlDiv.style.display = "block";
        htmlDiv.innerHTML = this._generateHtmlReport();
      }
    }
    /**
     * Ouvre la modal
     */
    _openModal() {
      if (this._element) {
        addClass(this._element, "show");
        this._isOpen = true;
      }
    }
    /**
     * Ferme la modal
     */
    close() {
      if (this._element) {
        removeClass(this._element, "show");
        this._isOpen = false;
      }
    }
    /**
     * Rafraîchit le rapport selon le mode actuel
     */
    _refreshReport() {
      if (this._currentMode === "text") {
        const textArea = $("#report-text-content", this._element);
        if (textArea) {
          textArea.value = this._generateTextReport();
        }
      } else {
        const htmlDiv = $("#report-html-content", this._element);
        if (htmlDiv) {
          htmlDiv.innerHTML = this._generateHtmlReport();
        }
      }
    }
    /**
     * Récupère les options de colonnes
     */
    _getColumnOptions() {
      return {
        echeance: $("#report-col-echeance", this._element)?.checked ?? true,
        statut: $("#report-col-statut", this._element)?.checked ?? true,
        personne: $("#report-col-personne", this._element)?.checked ?? true,
        projet: $("#report-col-projet", this._element)?.checked ?? true,
        jira: $("#report-col-jira", this._element)?.checked ?? true
      };
    }
    /**
     * Génère le rapport texte
     */
    _generateTextReport() {
      const options = this._getColumnOptions();
      const tasks = State.getFilteredTasks();
      const COL_ECHEANCE = 12;
      const COL_STATUT = 15;
      const COL_PERSONNE = 15;
      const COL_PROJET = 15;
      const COL_JIRA = 14;
      const COL_TITRE = 80;
      let totalWidth = COL_TITRE;
      if (options.echeance) totalWidth += COL_ECHEANCE + 3;
      if (options.statut) totalWidth += COL_STATUT + 3;
      if (options.personne) totalWidth += COL_PERSONNE + 3;
      if (options.projet) totalWidth += COL_PROJET + 3;
      if (options.jira) totalWidth += COL_JIRA + 3;
      let report = "RAPPORT DES T\xC2CHES - " + (/* @__PURE__ */ new Date()).toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }) + "\n";
      report += "=".repeat(totalWidth) + "\n\n";
      let header = "";
      if (options.echeance) header += "\xC9ch\xE9ance".padEnd(COL_ECHEANCE) + " | ";
      if (options.statut) header += "Statut".padEnd(COL_STATUT) + " | ";
      if (options.personne) header += "Rapporteur".padEnd(COL_PERSONNE) + " | ";
      if (options.projet) header += "Projet".padEnd(COL_PROJET) + " | ";
      if (options.jira) header += "JIRA".padEnd(COL_JIRA) + " | ";
      header += "Titre";
      report += header + "\n";
      report += "-".repeat(totalWidth) + "\n";
      const doneTasks = tasks.filter((t) => t.statusKey === "done" || (t.labels || []).some((l) => l.toLowerCase() === "done"));
      const activeWithDate = tasks.filter(
        (t) => t.statusKey !== "done" && !(t.labels || []).some((l) => l.toLowerCase() === "done") && t.dueDate
      );
      const activeWithoutDate = tasks.filter(
        (t) => t.statusKey !== "done" && !(t.labels || []).some((l) => l.toLowerCase() === "done") && !t.dueDate
      );
      const sortByDate = (arr) => [...arr].sort((a, b) => {
        const dateA = a.dueDate ? new Date(a.dueDate) : /* @__PURE__ */ new Date("9999-12-31");
        const dateB = b.dueDate ? new Date(b.dueDate) : /* @__PURE__ */ new Date("9999-12-31");
        return dateA - dateB;
      });
      const sortedActive = sortByDate(activeWithDate);
      const sortedDone = sortByDate(doneTasks);
      const allTasks = [...sortedActive, ...activeWithoutDate, ...sortedDone];
      allTasks.forEach((task) => {
        let row = "";
        if (options.echeance) row += (formatDate(task.dueDate) || "-").padEnd(COL_ECHEANCE) + " | ";
        if (options.statut) row += ((task.statusIcon || "") + " " + (task.statusLabel || "Backlog")).padEnd(COL_STATUT) + " | ";
        if (options.personne) row += (task.reporter || "-").padEnd(COL_PERSONNE) + " | ";
        if (options.projet) row += (task.project || "-").padEnd(COL_PROJET) + " | ";
        if (options.jira) row += (task.key || "-").padEnd(COL_JIRA) + " | ";
        row += task.summary || "";
        report += row + "\n";
      });
      report += "=".repeat(totalWidth) + "\n";
      report += `Total: ${tasks.length} t\xE2che${tasks.length > 1 ? "s" : ""}
`;
      return report;
    }
    /**
     * Génère le rapport HTML
     */
    _generateHtmlReport() {
      const options = this._getColumnOptions();
      const tasks = State.getFilteredTasks();
      const doneTasks = tasks.filter((t) => t.statusKey === "done" || (t.labels || []).some((l) => l.toLowerCase() === "done"));
      const activeWithDate = tasks.filter(
        (t) => t.statusKey !== "done" && !(t.labels || []).some((l) => l.toLowerCase() === "done") && t.dueDate
      );
      const activeWithoutDate = tasks.filter(
        (t) => t.statusKey !== "done" && !(t.labels || []).some((l) => l.toLowerCase() === "done") && !t.dueDate
      );
      const sortByDate = (arr) => [...arr].sort((a, b) => {
        const dateA = a.dueDate ? new Date(a.dueDate) : /* @__PURE__ */ new Date("9999-12-31");
        const dateB = b.dueDate ? new Date(b.dueDate) : /* @__PURE__ */ new Date("9999-12-31");
        return dateA - dateB;
      });
      const allTasks = [...sortByDate(activeWithDate), ...activeWithoutDate, ...sortByDate(doneTasks)];
      let html = `
      <table class="report-table" data-sortable="true">
        <thead>
          <tr>
            ${options.echeance ? '<th data-sort="due">\xC9ch\xE9ance<span class="sort-indicator"></span></th>' : ""}
            ${options.statut ? '<th data-sort="status">Statut<span class="sort-indicator"></span></th>' : ""}
            ${options.personne ? '<th data-sort="person">Rapporteur<span class="sort-indicator"></span></th>' : ""}
            ${options.projet ? '<th data-sort="project">Projet<span class="sort-indicator"></span></th>' : ""}
            ${options.jira ? '<th data-sort="jira">JIRA<span class="sort-indicator"></span></th>' : ""}
            <th data-sort="title">Titre<span class="sort-indicator"></span></th>
          </tr>
        </thead>
        <tbody>
    `;
      allTasks.forEach((task, index) => {
        const isDone = task.statusKey === "done" || (task.labels || []).some((l) => l.toLowerCase() === "done");
        const rowClass = isDone ? "row-done" : index % 2 === 0 ? "row-even" : "row-odd";
        const statusCss = task.statusCssClass || "status-backlog";
        const titleClass = isDone ? "title-done" : "";
        const jiraUrl = task.link || null;
        const titleHtml = jiraUrl ? `<a href="${jiraUrl}" target="_blank" class="title-link ${titleClass}">${escapeAttr(task.summary || "")}</a>` : isDone ? `<span class="${titleClass}">${escapeAttr(task.summary || "")}</span>` : escapeAttr(task.summary || "");
        html += `
        <tr class="${rowClass}"
            data-title="${escapeAttr(task.summary || "")}"
            data-due="${task.dueDate || ""}"
            data-status="${task.statusKey || "backlog"}"
            data-person="${escapeAttr(task.reporter || "")}"
            data-project="${escapeAttr(task.project || "")}"
            data-jira="${task.key || ""}">
          ${options.echeance ? `<td>${formatDate(task.dueDate) || "-"}</td>` : ""}
          ${options.statut ? `<td class="cell-status"><span class="status-badge ${statusCss}">${task.statusIcon || ""} ${task.statusLabel || "Backlog"}</span></td>` : ""}
          ${options.personne ? `<td>${task.reporter || "-"}</td>` : ""}
          ${options.projet ? `<td>${task.project || "-"}</td>` : ""}
          ${options.jira ? `<td>${task.key || "-"}</td>` : ""}
          <td>${titleHtml}</td>
        </tr>
      `;
      });
      html += `
        </tbody>
      </table>
      <p class="report-total">
        <strong>Total: ${tasks.length} t\xE2che${tasks.length > 1 ? "s" : ""}</strong>
      </p>
    `;
      return html;
    }
    /**
     * Copie le rapport dans le presse-papier
     */
    async _copyToClipboard() {
      const statusEl = $("#copy-status", this._element);
      try {
        if (this._currentMode === "text") {
          const textArea = $("#report-text-content", this._element);
          await copyToClipboard(textArea?.value || "");
        } else {
          const htmlDiv = $("#report-html-content", this._element);
          await copyHtmlToClipboard(htmlDiv?.innerHTML || "", htmlDiv?.innerText || "");
        }
        if (statusEl) {
          statusEl.textContent = "\u2713 Copi\xE9 !";
          setTimeout(() => {
            statusEl.textContent = "";
          }, 2e3);
        }
      } catch (err) {
        if (statusEl) {
          statusEl.textContent = "\u274C Erreur de copie";
          setTimeout(() => {
            statusEl.textContent = "";
          }, 2e3);
        }
      }
    }
  };
  var ReportModal = new ReportModalComponent();

  // js/components/modals/config.js
  var ConfigModalComponent = class {
    constructor() {
      this._element = null;
      this._isOpen = false;
      this._activeTab = "tags";
    }
    /**
     * Initialise le composant
     * @param {string} selector - Sélecteur du conteneur modal
     */
    init(selector) {
      this._element = $(selector);
      if (!this._element) {
        console.error("Config modal container not found:", selector);
        return;
      }
      this._render();
      this._attachEventListeners();
      UserConfig.subscribe(() => this._refreshContent());
    }
    /**
     * Rend la structure de la modal
     */
    _render() {
      setHtml(this._element, `
      <div class="modal-content modal-content-large">
        <div class="modal-header">
          <h2>\u2699\uFE0F Configuration</h2>
          <button id="close-config-modal" class="close-modal-btn">\u2715</button>
        </div>

        <div class="config-tabs">
          <button class="config-tab active" data-tab="tags">\u{1F3F7}\uFE0F Tags</button>
          <button class="config-tab" data-tab="projects">\u{1F4C1} Projets</button>
          <button class="config-tab" data-tab="blacklist">\u{1F6AB} Blacklist</button>
        </div>

        <div class="modal-body">
          <!-- Onglet Tags -->
          <div id="tab-tags" class="config-tab-content active">
            <div class="config-section">
              <h3>Tags personnalis\xE9s</h3>
              <p class="config-hint">Ajoutez des tags qui appara\xEEtront dans les filtres m\xEAme s'ils ne sont pas dans les tickets.</p>

              <div class="config-add-form">
                <input type="text" id="new-tag-input" placeholder="Nom du tag..." class="config-input">
                <button id="btn-add-tag" class="config-add-btn">+ Ajouter</button>
              </div>

              <div id="tag-suggestions" class="config-suggestions"></div>

              <div id="custom-tags-list" class="config-items-list"></div>
            </div>
          </div>

          <!-- Onglet Projets -->
          <div id="tab-projects" class="config-tab-content">
            <div class="config-section">
              <h3>R\xE8gles de d\xE9tection de projet</h3>
              <p class="config-hint">D\xE9finissez des mots-cl\xE9s pour d\xE9tecter automatiquement le projet d'un ticket depuis son titre.</p>

              <div class="config-add-form">
                <input type="text" id="new-project-name" placeholder="Nom du projet..." class="config-input" style="width: 150px;">
                <input type="text" id="new-project-pattern" placeholder="Mot-cl\xE9 (dans le titre)..." class="config-input">
                <button id="btn-add-project-rule" class="config-add-btn">+ Ajouter</button>
              </div>

              <div id="project-suggestions" class="config-suggestions"></div>

              <div id="project-rules-list" class="config-items-list"></div>
            </div>
          </div>

          <!-- Onglet Blacklist -->
          <div id="tab-blacklist" class="config-tab-content">
            <div class="config-section">
              <h3>Tickets ignor\xE9s</h3>
              <p class="config-hint">Les tickets dans cette liste seront exclus de l'affichage.</p>

              <div class="config-add-form">
                <input type="text" id="new-blacklist-key" placeholder="Cl\xE9 JIRA (ex: PROJ-123)..." class="config-input">
                <button id="btn-add-blacklist" class="config-add-btn">+ Ajouter</button>
              </div>

              <div id="blacklist-items" class="config-items-list"></div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <div class="config-footer-left">
            <button id="btn-refresh-detection" class="config-refresh-btn">\u{1F504} Appliquer aux tickets</button>
            <span id="refresh-status" class="config-refresh-status"></span>
          </div>
          <div class="config-footer-right">
            <button id="btn-import-config" class="config-io-btn">\u{1F4E5} Importer</button>
            <button id="btn-export-config" class="config-io-btn">\u{1F4E4} Exporter</button>
          </div>
        </div>
      </div>
    `);
      this._refreshContent();
    }
    /**
     * Rafraîchit le contenu des onglets
     */
    _refreshContent() {
      this._renderTagSuggestions();
      this._renderTagsList();
      this._renderProjectSuggestions();
      this._renderProjectRules();
      this._renderBlacklist();
    }
    /**
     * Rend la liste des tags personnalisés
     */
    _renderTagsList() {
      const container = $("#custom-tags-list", this._element);
      if (!container) return;
      const tags = UserConfig.customTags;
      if (tags.length === 0) {
        setHtml(container, '<p class="config-empty">Aucun tag personnalis\xE9</p>');
        return;
      }
      setHtml(container, tags.map((tag) => `
      <div class="config-item">
        <span class="config-item-label">\u{1F3F7}\uFE0F ${escapeAttr(tag)}</span>
        <button class="config-item-remove" data-action="remove-tag" data-value="${escapeAttr(tag)}">\u2715</button>
      </div>
    `).join(""));
    }
    /**
     * Extrait les suggestions de tags depuis les tickets
     */
    _extractTagSuggestions() {
      const suggestions = /* @__PURE__ */ new Map();
      const existingTags = new Set(UserConfig.customTags.map((t) => t.toLowerCase()));
      const existingLabels = /* @__PURE__ */ new Set();
      State.tasks.forEach((task) => {
        if (task.labels) {
          task.labels.forEach((l) => existingLabels.add(l.toLowerCase()));
        }
      });
      const statuses = /* @__PURE__ */ new Map();
      State.tasks.forEach((task) => {
        if (task.status) {
          const status = task.status;
          statuses.set(status, (statuses.get(status) || 0) + 1);
        }
      });
      statuses.forEach((count, status) => {
        const lower = status.toLowerCase();
        if (!existingTags.has(lower) && !existingLabels.has(lower)) {
          suggestions.set(status, { count, source: "status" });
        }
      });
      const projects = /* @__PURE__ */ new Map();
      State.tasks.forEach((task) => {
        if (task.project) {
          const project = task.project;
          projects.set(project, (projects.get(project) || 0) + 1);
        }
      });
      projects.forEach((count, project) => {
        const lower = project.toLowerCase();
        if (!existingTags.has(lower) && !existingLabels.has(lower)) {
          suggestions.set(project, { count, source: "project" });
        }
      });
      const components = /* @__PURE__ */ new Map();
      State.tasks.forEach((task) => {
        if (task.components && Array.isArray(task.components)) {
          task.components.forEach((comp) => {
            components.set(comp, (components.get(comp) || 0) + 1);
          });
        }
      });
      components.forEach((count, comp) => {
        const lower = comp.toLowerCase();
        if (!existingTags.has(lower) && !existingLabels.has(lower) && !suggestions.has(comp)) {
          suggestions.set(comp, { count, source: "component" });
        }
      });
      const types = /* @__PURE__ */ new Map();
      State.tasks.forEach((task) => {
        if (task.type) {
          types.set(task.type, (types.get(task.type) || 0) + 1);
        }
      });
      types.forEach((count, type) => {
        const lower = type.toLowerCase();
        if (!existingTags.has(lower) && !existingLabels.has(lower) && !suggestions.has(type)) {
          suggestions.set(type, { count, source: "type" });
        }
      });
      const priorities = /* @__PURE__ */ new Map();
      State.tasks.forEach((task) => {
        if (task.priority) {
          priorities.set(task.priority, (priorities.get(task.priority) || 0) + 1);
        }
      });
      priorities.forEach((count, priority) => {
        const lower = priority.toLowerCase();
        if (!existingTags.has(lower) && !existingLabels.has(lower) && !suggestions.has(priority)) {
          suggestions.set(priority, { count, source: "priority" });
        }
      });
      return Array.from(suggestions.entries()).sort((a, b) => b[1].count - a[1].count).slice(0, 20);
    }
    /**
     * Rend les suggestions de tags
     */
    _renderTagSuggestions() {
      const container = $("#tag-suggestions", this._element);
      if (!container) return;
      const suggestions = this._extractTagSuggestions();
      if (suggestions.length === 0) {
        setHtml(container, "");
        return;
      }
      const sourceIcons = {
        status: "\u{1F4CA}",
        project: "\u{1F4C1}",
        component: "\u{1F9E9}",
        type: "\u{1F4CB}",
        priority: "\u26A1"
      };
      setHtml(container, `
      <div class="config-suggestions-box">
        <span class="config-suggestions-hint">\u{1F4A1} Suggestions (clic = ajouter) :</span>
        <div class="config-suggestions-list">
          ${suggestions.map(([name, { count, source }]) => `
            <button class="config-suggestion config-tag-suggestion" data-tag-suggestion="${escapeAttr(name)}" title="${source}">
              ${sourceIcons[source] || "\u{1F3F7}\uFE0F"} ${escapeAttr(name)} <span class="suggestion-count">${count}</span>
            </button>
          `).join("")}
        </div>
      </div>
    `);
    }
    /**
     * Extrait les suggestions de noms de projets depuis les titres des tickets
     */
    _extractProjectSuggestions() {
      const suggestions = /* @__PURE__ */ new Map();
      const existingProjects = new Set(UserConfig.projectRules.map((r) => r.name.toLowerCase()));
      const existingPatterns = /* @__PURE__ */ new Set();
      UserConfig.projectRules.forEach((r) => r.patterns.forEach((p) => existingPatterns.add(p.toLowerCase())));
      State.tasks.forEach((task) => {
        const title = task.summary || "";
        const bracketMatches = title.match(/\[([^\]]+)\]/g);
        if (bracketMatches) {
          bracketMatches.forEach((match) => {
            const name = match.slice(1, -1).trim();
            if (name && !existingProjects.has(name.toLowerCase()) && !existingPatterns.has(name.toLowerCase())) {
              suggestions.set(name, (suggestions.get(name) || 0) + 1);
            }
          });
        }
        const acronymMatches = title.match(/\b[A-Z]{2,}(?:\d+)?\b/g);
        if (acronymMatches) {
          acronymMatches.forEach((name) => {
            const ignore = ["API", "URL", "HTTP", "HTTPS", "JSON", "XML", "HTML", "CSS", "SQL", "PHP", "TODO", "FIXME", "BUG", "WIP"];
            if (!ignore.includes(name) && !existingProjects.has(name.toLowerCase()) && !existingPatterns.has(name.toLowerCase())) {
              suggestions.set(name, (suggestions.get(name) || 0) + 1);
            }
          });
        }
      });
      return Array.from(suggestions.entries()).filter(([, count]) => count >= 1).sort((a, b) => b[1] - a[1]).slice(0, 15);
    }
    /**
     * Rend les suggestions de projets
     */
    _renderProjectSuggestions() {
      const container = $("#project-suggestions", this._element);
      if (!container) return;
      const suggestions = this._extractProjectSuggestions();
      if (suggestions.length === 0) {
        setHtml(container, "");
        return;
      }
      setHtml(container, `
      <div class="config-suggestions-box">
        <span class="config-suggestions-hint">\u{1F4A1} Suggestions depuis les titres (clic = ajouter) :</span>
        <div class="config-suggestions-list">
          ${suggestions.map(([name, count]) => `
            <button class="config-suggestion" data-suggestion="${escapeAttr(name)}">
              ${escapeAttr(name)} <span class="suggestion-count">${count}</span>
            </button>
          `).join("")}
        </div>
      </div>
    `);
    }
    /**
     * Rend la liste des règles de projet
     */
    _renderProjectRules() {
      const container = $("#project-rules-list", this._element);
      if (!container) return;
      const rules = UserConfig.projectRules;
      if (rules.length === 0) {
        setHtml(container, '<p class="config-empty">Aucune r\xE8gle de projet</p>');
        return;
      }
      setHtml(container, rules.map((rule) => `
      <div class="config-item config-item-project">
        <div class="config-project-header">
          <span class="config-item-label">\u{1F4C1}</span>
          <input type="text" class="config-project-name-input" value="${escapeAttr(rule.name)}" data-original="${escapeAttr(rule.name)}">
          <button class="config-item-remove" data-action="remove-project" data-value="${escapeAttr(rule.name)}">\u2715</button>
        </div>
        <div class="config-project-patterns">
          ${rule.patterns.map((p) => `
            <span class="config-pattern">
              ${escapeAttr(p)}
              <button class="config-pattern-remove" data-action="remove-pattern" data-project="${escapeAttr(rule.name)}" data-pattern="${escapeAttr(p)}">\u2715</button>
            </span>
          `).join("")}
          <div class="config-add-pattern-inline">
            <input type="text" placeholder="+ pattern" class="config-input-small" data-project="${escapeAttr(rule.name)}">
          </div>
        </div>
      </div>
    `).join(""));
    }
    /**
     * Rend la liste noire
     */
    _renderBlacklist() {
      const container = $("#blacklist-items", this._element);
      if (!container) return;
      const blacklist = UserConfig.blacklist;
      if (blacklist.length === 0) {
        setHtml(container, '<p class="config-empty">Aucun ticket dans la blacklist</p>');
        return;
      }
      setHtml(container, blacklist.map((key) => `
      <div class="config-item">
        <span class="config-item-label">\u{1F6AB} ${escapeAttr(key)}</span>
        <button class="config-item-remove" data-action="remove-blacklist" data-value="${escapeAttr(key)}">\u2715</button>
      </div>
    `).join(""));
    }
    /**
     * Attache les écouteurs d'événements
     */
    _attachEventListeners() {
      const closeBtn = $("#close-config-modal", this._element);
      closeBtn?.addEventListener("click", () => this.close());
      this._element.addEventListener("click", (e) => {
        if (e.target === this._element) {
          this.close();
        }
      });
      this._element.addEventListener("click", (e) => {
        const tab = e.target.closest(".config-tab");
        if (tab) {
          this._switchTab(tab.dataset.tab);
        }
      });
      $("#btn-add-tag", this._element)?.addEventListener("click", () => this._addTag());
      $("#new-tag-input", this._element)?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") this._addTag();
      });
      $("#btn-add-project-rule", this._element)?.addEventListener("click", () => this._addProjectRule());
      $("#new-project-pattern", this._element)?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") this._addProjectRule();
      });
      $("#btn-add-blacklist", this._element)?.addEventListener("click", () => this._addToBlacklist());
      $("#new-blacklist-key", this._element)?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") this._addToBlacklist();
      });
      this._element.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;
        const action = btn.dataset.action;
        const value = btn.dataset.value;
        switch (action) {
          case "remove-tag":
            UserConfig.removeCustomTag(value);
            break;
          case "remove-project":
            UserConfig.removeProjectRule(value);
            break;
          case "remove-pattern":
            UserConfig.removePatternFromProject(btn.dataset.project, btn.dataset.pattern);
            break;
          case "remove-blacklist":
            UserConfig.removeFromBlacklist(value);
            break;
        }
      });
      this._element.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && e.target.classList.contains("config-input-small")) {
          const projectName = e.target.dataset.project;
          const pattern = e.target.value.trim();
          if (pattern && projectName) {
            UserConfig.addPatternToProject(projectName, pattern);
            e.target.value = "";
          }
        }
        if (e.key === "Enter" && e.target.classList.contains("config-project-name-input")) {
          e.target.blur();
        }
      });
      this._element.addEventListener("blur", (e) => {
        if (e.target.classList.contains("config-project-name-input")) {
          const originalName = e.target.dataset.original;
          const newName = e.target.value.trim();
          if (newName && newName !== originalName) {
            UserConfig.renameProject(originalName, newName);
          } else if (!newName) {
            e.target.value = originalName;
          }
        }
      }, true);
      this._element.addEventListener("click", (e) => {
        const suggestion = e.target.closest(".config-suggestion");
        if (!suggestion) return;
        const tagName = suggestion.dataset.tagSuggestion;
        if (tagName) {
          UserConfig.addCustomTag(tagName);
          return;
        }
        const projectName = suggestion.dataset.suggestion;
        if (projectName) {
          UserConfig.addProjectRule(projectName, [projectName.toLowerCase()]);
        }
      });
      $("#btn-refresh-detection", this._element)?.addEventListener("click", () => this._refreshDetection());
      $("#btn-export-config", this._element)?.addEventListener("click", () => this._exportConfig());
      $("#btn-import-config", this._element)?.addEventListener("click", () => this._importConfig());
    }
    /**
     * Change d'onglet
     */
    _switchTab(tabName) {
      this._activeTab = tabName;
      $$(".config-tab", this._element).forEach((tab) => {
        tab.classList.toggle("active", tab.dataset.tab === tabName);
      });
      $$(".config-tab-content", this._element).forEach((content) => {
        content.classList.toggle("active", content.id === `tab-${tabName}`);
      });
    }
    /**
     * Ajoute un tag
     */
    _addTag() {
      const input = $("#new-tag-input", this._element);
      if (input && input.value.trim()) {
        UserConfig.addCustomTag(input.value.trim());
        input.value = "";
      }
    }
    /**
     * Ajoute une règle de projet
     */
    _addProjectRule() {
      const nameInput = $("#new-project-name", this._element);
      const patternInput = $("#new-project-pattern", this._element);
      if (nameInput && patternInput && nameInput.value.trim()) {
        const patterns = patternInput.value.trim() ? [patternInput.value.trim()] : [];
        UserConfig.addProjectRule(nameInput.value.trim(), patterns);
        nameInput.value = "";
        patternInput.value = "";
      }
    }
    /**
     * Ajoute à la blacklist
     */
    _addToBlacklist() {
      const input = $("#new-blacklist-key", this._element);
      if (input && input.value.trim()) {
        UserConfig.addToBlacklist(input.value.trim());
        input.value = "";
      }
    }
    /**
     * Rafraîchit la détection de projet sur tous les tickets
     */
    _refreshDetection() {
      const statusEl = $("#refresh-status", this._element);
      const result = Storage.refreshProjectDetection();
      if (statusEl) {
        statusEl.textContent = result.success ? `\u2713 ${result.message}` : `\u26A0\uFE0F ${result.message}`;
        statusEl.className = "config-refresh-status " + (result.success ? "success" : "error");
        setTimeout(() => {
          statusEl.textContent = "";
        }, 3e3);
      }
      this._renderProjectSuggestions();
    }
    /**
     * Exporte la configuration
     */
    _exportConfig() {
      const config = UserConfig.exportConfig();
      const blob = new Blob([config], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "jira-report-config.json";
      a.click();
      URL.revokeObjectURL(url);
    }
    /**
     * Importe la configuration
     */
    _importConfig() {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,application/json";
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
          const text = await file.text();
          const result = UserConfig.importConfig(text);
          if (!result.success) {
            alert("Erreur lors de l'import: " + result.error);
          }
        }
      };
      input.click();
    }
    /**
     * Réinitialise la configuration
     */
    _resetConfig() {
      if (confirm("Voulez-vous vraiment r\xE9initialiser toute la configuration ?")) {
        UserConfig.reset();
      }
    }
    /**
     * Ouvre la modal
     */
    open() {
      if (this._element) {
        addClass(this._element, "show");
        this._isOpen = true;
        this._refreshContent();
      }
    }
    /**
     * Ferme la modal
     */
    close() {
      if (this._element) {
        removeClass(this._element, "show");
        this._isOpen = false;
      }
    }
  };
  var ConfigModal = new ConfigModalComponent();

  // js/components/modals/edit-task.js
  var EditTaskModalComponent = class {
    constructor() {
      this._element = null;
      this._isOpen = false;
      this._currentTaskKey = null;
    }
    /**
     * Initialise le composant
     * @param {string} selector - Sélecteur du conteneur modal
     */
    init(selector) {
      this._element = $(selector);
      if (!this._element) {
        console.error("Edit task modal container not found:", selector);
        return;
      }
      this._render();
      this._attachEventListeners();
    }
    /**
     * Rend la structure de la modal
     */
    _render() {
      setHtml(this._element, `
      <div class="modal-content modal-content-medium">
        <div class="modal-header">
          <h2 id="edit-task-title">Edition du ticket</h2>
          <button id="close-edit-task-modal" class="close-modal-btn">&times;</button>
        </div>

        <div class="modal-body">
          <!-- Lien JIRA -->
          <div class="edit-section">
            <label>Ticket JIRA</label>
            <a id="edit-task-jira-link" href="#" target="_blank" class="jira-link"></a>
          </div>

          <!-- Titre -->
          <div class="edit-section">
            <label for="edit-task-summary">Titre</label>
            <input type="text" id="edit-task-summary" class="edit-input" placeholder="Titre du ticket...">
          </div>

          <!-- Projet et Statut sur la m\xEAme ligne -->
          <div class="edit-section edit-section-row">
            <div class="edit-field">
              <label for="edit-task-project">Projet</label>
              <input type="text" id="edit-task-project" class="edit-input" list="project-list" placeholder="Projet...">
              <datalist id="project-list"></datalist>
            </div>
            <div class="edit-field">
              <label for="edit-task-status">Statut</label>
              <select id="edit-task-status" class="edit-input"></select>
            </div>
          </div>

          <!-- Date d'\xE9ch\xE9ance -->
          <div class="edit-section">
            <label for="edit-task-duedate">Date d'\xE9ch\xE9ance</label>
            <input type="date" id="edit-task-duedate" class="edit-input">
            <div class="date-quick-buttons">
              <button type="button" class="date-quick-btn" data-date="today">Aujourd'hui</button>
              <button type="button" class="date-quick-btn" data-date="tomorrow">Demain</button>
              <button type="button" class="date-quick-btn" data-date="+3">J+3</button>
              <button type="button" class="date-quick-btn" data-date="+7">J+7</button>
              <button type="button" class="date-quick-btn" data-date="next-monday">Lundi</button>
              <button type="button" class="date-quick-btn" data-date="end-month">Fin mois</button>
              <button type="button" class="date-quick-btn date-quick-btn-clear" data-date="clear">\u2715</button>
            </div>
          </div>

          <!-- Labels -->
          <div class="edit-section">
            <label>Labels</label>
            <div id="edit-task-labels" class="edit-labels-container"></div>
            <div class="edit-add-label">
              <input type="text" id="edit-new-label" placeholder="Nouveau label..." class="edit-input edit-input-small">
              <button id="btn-add-label" class="edit-add-btn">+ Ajouter</button>
            </div>
            <div class="edit-suggested-labels">
              <span class="suggested-label-hint">Labels sugg\xE9r\xE9s:</span>
              <div id="edit-suggested-labels-list"></div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button id="btn-save-task" class="save-task-btn">Enregistrer</button>
          <button id="btn-cancel-task" class="cancel-task-btn">Annuler</button>
        </div>
      </div>
    `);
    }
    /**
     * Attache les écouteurs d'événements
     */
    _attachEventListeners() {
      const closeBtn = $("#close-edit-task-modal", this._element);
      closeBtn?.addEventListener("click", () => this.close());
      const cancelBtn = $("#btn-cancel-task", this._element);
      cancelBtn?.addEventListener("click", () => this.close());
      this._element.addEventListener("click", (e) => {
        if (e.target === this._element) {
          this.close();
        }
      });
      const saveBtn = $("#btn-save-task", this._element);
      saveBtn?.addEventListener("click", () => this._saveTask());
      const addLabelBtn = $("#btn-add-label", this._element);
      addLabelBtn?.addEventListener("click", () => this._addLabel());
      const newLabelInput = $("#edit-new-label", this._element);
      newLabelInput?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") this._addLabel();
      });
      this._element.addEventListener("click", (e) => {
        const removeBtn = e.target.closest(".label-remove-btn");
        if (removeBtn) {
          const label = removeBtn.dataset.label;
          this._removeLabel(label);
        }
        const suggestedLabel = e.target.closest(".suggested-label");
        if (suggestedLabel) {
          const label = suggestedLabel.dataset.label;
          this._addLabelValue(label);
        }
        const dateBtn = e.target.closest(".date-quick-btn");
        if (dateBtn) {
          this._handleQuickDate(dateBtn.dataset.date);
        }
      });
    }
    /**
     * Gère les boutons de date rapide
     */
    _handleQuickDate(dateType) {
      const dueDateInput = $("#edit-task-duedate", this._element);
      if (!dueDateInput) return;
      const today = /* @__PURE__ */ new Date();
      today.setHours(0, 0, 0, 0);
      let targetDate = null;
      switch (dateType) {
        case "today":
          targetDate = today;
          break;
        case "tomorrow":
          targetDate = new Date(today);
          targetDate.setDate(targetDate.getDate() + 1);
          break;
        case "+3":
          targetDate = new Date(today);
          targetDate.setDate(targetDate.getDate() + 3);
          break;
        case "+7":
          targetDate = new Date(today);
          targetDate.setDate(targetDate.getDate() + 7);
          break;
        case "next-monday":
          targetDate = new Date(today);
          const dayOfWeek = targetDate.getDay();
          const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
          targetDate.setDate(targetDate.getDate() + daysUntilMonday);
          break;
        case "end-month":
          targetDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          break;
        case "clear":
          dueDateInput.value = "";
          return;
      }
      if (targetDate) {
        dueDateInput.value = targetDate.toISOString().split("T")[0];
      }
    }
    /**
     * Ouvre la modal pour un ticket
     * @param {string} taskKey - Clé du ticket
     */
    open(taskKey) {
      this._currentTaskKey = taskKey;
      const task = State.tasks.find((t) => t.key === taskKey);
      if (!task) {
        console.error("Task not found:", taskKey);
        return;
      }
      $("#edit-task-title", this._element).textContent = `Edition: ${task.key}`;
      const jiraLink = $("#edit-task-jira-link", this._element);
      jiraLink.href = task.link || "#";
      jiraLink.textContent = `${task.key} - ${task.summary}`;
      $("#edit-task-summary", this._element).value = task.summary || "";
      const projectInput = $("#edit-task-project", this._element);
      projectInput.value = task.project || "";
      this._populateProjectList();
      this._populateStatusSelect(task.status);
      const dueDateInput = $("#edit-task-duedate", this._element);
      if (task.dueDate) {
        const date = new Date(task.dueDate);
        dueDateInput.value = date.toISOString().split("T")[0];
      } else {
        dueDateInput.value = "";
      }
      this._renderLabels(task.labels || []);
      this._renderSuggestedLabels(task.labels || []);
      addClass(this._element, "show");
      this._isOpen = true;
    }
    /**
     * Ferme la modal
     */
    close() {
      removeClass(this._element, "show");
      this._isOpen = false;
      this._currentTaskKey = null;
    }
    /**
     * Remplit la liste des projets disponibles
     */
    _populateProjectList() {
      const datalist = $("#project-list", this._element);
      const projects = State.projects;
      setHtml(datalist, projects.map((p) => `<option value="${escapeAttr(p)}">`).join(""));
    }
    /**
     * Remplit le select des statuts
     */
    _populateStatusSelect(currentStatus) {
      const select = $("#edit-task-status", this._element);
      const currentStatusLower = (currentStatus || "").toLowerCase();
      const statusesFromTasks = /* @__PURE__ */ new Set();
      State.tasks.forEach((task) => {
        if (task.status) {
          statusesFromTasks.add(task.status);
        }
      });
      const allStatuses = /* @__PURE__ */ new Set([...statusesFromTasks, ...Object.keys(Config.statusMap)]);
      const getStatusInfo2 = (status) => {
        const key = Object.keys(Config.statusMap).find((k) => k.toLowerCase() === status.toLowerCase());
        return key ? Config.statusMap[key] : null;
      };
      const sortedStatuses = Array.from(allStatuses).sort((a, b) => {
        const infoA = getStatusInfo2(a);
        const infoB = getStatusInfo2(b);
        const orderA = infoA?.key ? Config.statusOrder[infoA.key] || 99 : 99;
        const orderB = infoB?.key ? Config.statusOrder[infoB.key] || 99 : 99;
        return orderA - orderB;
      });
      let html = "";
      sortedStatuses.forEach((status) => {
        const selected = status.toLowerCase() === currentStatusLower ? "selected" : "";
        const statusInfo = getStatusInfo2(status);
        const icon = statusInfo?.icon || "\u{1F4CB}";
        html += `<option value="${escapeAttr(status)}" ${selected}>${icon} ${escapeAttr(status)}</option>`;
      });
      setHtml(select, html);
    }
    /**
     * Rend la liste des labels
     */
    _renderLabels(labels) {
      const container = $("#edit-task-labels", this._element);
      if (labels.length === 0) {
        setHtml(container, '<span class="no-labels">Aucun label</span>');
        return;
      }
      setHtml(container, labels.map((label) => `
      <span class="edit-label ${label.toLowerCase() === "done" ? "label-done" : ""}">
        ${escapeAttr(label)}
        <button class="label-remove-btn" data-label="${escapeAttr(label)}">&times;</button>
      </span>
    `).join(""));
    }
    /**
     * Rend les labels suggérés
     */
    _renderSuggestedLabels(currentLabels) {
      const container = $("#edit-suggested-labels-list", this._element);
      const allTags = /* @__PURE__ */ new Set();
      State.tags.forEach((count, tag) => {
        allTags.add(tag);
      });
      UserConfig.customTags.forEach((tag) => {
        allTags.add(tag);
      });
      allTags.add("done");
      const suggestions = Array.from(allTags).filter((tag) => !currentLabels.some((l) => l.toLowerCase() === tag.toLowerCase())).sort();
      if (suggestions.length === 0) {
        setHtml(container, '<span class="no-suggestions">Aucune suggestion</span>');
        return;
      }
      setHtml(container, suggestions.map((tag) => `
      <button class="suggested-label" data-label="${escapeAttr(tag)}">${escapeAttr(tag)}</button>
    `).join(""));
    }
    /**
     * Ajoute un label
     */
    _addLabel() {
      const input = $("#edit-new-label", this._element);
      const label = input.value.trim();
      if (label) {
        this._addLabelValue(label);
        input.value = "";
      }
    }
    /**
     * Ajoute une valeur de label
     */
    _addLabelValue(label) {
      if (!this._currentTaskKey) return;
      const currentLabels = this._getCurrentLabelsFromDom();
      if (!currentLabels.some((l) => l.toLowerCase() === label.toLowerCase())) {
        const newLabels = [...currentLabels, label];
        this._renderLabels(newLabels);
        this._renderSuggestedLabels(newLabels);
      }
    }
    /**
     * Supprime un label
     */
    _removeLabel(label) {
      if (!this._currentTaskKey) return;
      const currentLabels = this._getCurrentLabelsFromDom();
      const newLabels = currentLabels.filter((l) => l !== label);
      this._renderLabels(newLabels);
      this._renderSuggestedLabels(newLabels);
    }
    /**
     * Récupère les labels actuels depuis le DOM
     */
    _getCurrentLabelsFromDom() {
      const labelElements = $$(".edit-label .label-remove-btn", this._element);
      return Array.from(labelElements).map((el) => el.dataset.label);
    }
    /**
     * Sauvegarde les modifications
     */
    _saveTask() {
      if (!this._currentTaskKey) return;
      const summary = $("#edit-task-summary", this._element).value.trim();
      const project = $("#edit-task-project", this._element).value.trim();
      const status = $("#edit-task-status", this._element).value;
      const statusMapKey = Object.keys(Config.statusMap).find(
        (k) => k.toLowerCase() === status.toLowerCase()
      );
      const statusInfo = statusMapKey ? Config.statusMap[statusMapKey] : Config.defaultStatus;
      const labels = this._getCurrentLabelsFromDom();
      const dueDateInput = $("#edit-task-duedate", this._element);
      const dueDate = dueDateInput.value || null;
      State.updateTask(this._currentTaskKey, {
        summary,
        project,
        status,
        statusKey: statusInfo.key,
        statusLabel: statusInfo.label,
        statusIcon: statusInfo.icon,
        statusCssClass: statusInfo.cssClass,
        labels,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null
      });
      this.close();
    }
    /**
     * Vérifie si la modal est ouverte
     */
    get isOpen() {
      return this._isOpen;
    }
  };
  var EditTaskModal = new EditTaskModalComponent();

  // js/app.js
  var JiraReportApp = class {
    constructor() {
      this._initialized = false;
    }
    /**
     * Initialise l'application
     */
    async init() {
      if (this._initialized) return;
      console.log("Jira Report App - Initialisation...");
      Stats.init("#stats");
      Sidebar.init("#filters");
      Timeline.init("#timeline-container");
      TaskTable.init("#projects-container");
      ImportModal.init("#import-modal");
      ReportModal.init("#report-modal");
      ConfigModal.init("#config-modal");
      EditTaskModal.init("#edit-task-modal");
      this._attachKeyboardShortcuts();
      this._attachCustomEvents();
      this._attachGlobalDragDrop();
      this._attachBeforeUnload();
      this._updateFileSystemIndicator();
      State.subscribe("unsavedChanges", () => this._updateUnsavedIndicator());
      await this._tryAutoLoadLastFile();
      Storage.enableLiveSave();
      this._initialized = true;
      console.log("Jira Report App - Initialis\xE9");
    }
    /**
     * Tente de recharger automatiquement le dernier fichier
     */
    async _tryAutoLoadLastFile() {
      try {
        const result = await Storage.tryLoadLastProject();
        if (result.success) {
          this._showNotification(result.message, "success");
        }
      } catch (err) {
        console.warn("Auto-load failed:", err);
      }
    }
    /**
     * Attache les raccourcis clavier
     */
    _attachKeyboardShortcuts() {
      document.addEventListener("keydown", async (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "s") {
          e.preventDefault();
          await this._handleSave();
        }
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "S") {
          e.preventDefault();
          await this._handleSaveAs();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === "o") {
          e.preventDefault();
          await this._handleOpen();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === "i") {
          e.preventDefault();
          ImportModal.open();
        }
        if (e.key === "Escape") {
          ImportModal.close();
          ReportModal.close();
          ConfigModal.close();
          EditTaskModal.close();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === ",") {
          e.preventDefault();
          ConfigModal.open();
        }
      });
    }
    /**
     * Attache les événements personnalisés (émis par les composants)
     */
    _attachCustomEvents() {
      document.addEventListener("app:open", () => this._handleOpen());
      document.addEventListener("app:save", () => this._handleSave());
      document.addEventListener("app:import-xml", () => ImportModal.open());
      document.addEventListener("app:backup", () => this._handleBackup());
      document.addEventListener("app:clear", () => this._handleClear());
      document.addEventListener("app:report-text", () => ReportModal.openText());
      document.addEventListener("app:report-html", () => ReportModal.openHtml());
      document.addEventListener("app:config", () => ConfigModal.open());
      document.addEventListener("app:edit-task", (e) => {
        if (e.detail && e.detail.taskKey) {
          EditTaskModal.open(e.detail.taskKey);
        }
      });
    }
    /**
     * Attache l'événement beforeunload pour avertir des modifications non sauvegardées
     */
    _attachBeforeUnload() {
      window.addEventListener("beforeunload", (e) => {
        if (State.hasUnsavedChanges) {
          e.preventDefault();
          e.returnValue = "Vous avez des modifications non sauvegard\xE9es. \xCAtes-vous s\xFBr de vouloir quitter ?";
          return e.returnValue;
        }
      });
    }
    /**
     * Attache le drag & drop global pour les fichiers XML
     */
    _attachGlobalDragDrop() {
      document.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      document.addEventListener("dragenter", (e) => {
        e.preventDefault();
        e.stopPropagation();
        document.body.classList.add("drag-over");
      });
      document.addEventListener("dragleave", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.relatedTarget === null || !document.body.contains(e.relatedTarget)) {
          document.body.classList.remove("drag-over");
        }
      });
      document.addEventListener("drop", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        document.body.classList.remove("drag-over");
        const files = e.dataTransfer?.files;
        if (!files || files.length === 0) return;
        const file = files[0];
        const fileName = file.name.toLowerCase();
        if (fileName.endsWith(".xml") || file.type.includes("xml")) {
          await ImportModal.openWithFile(file);
        } else if (fileName.endsWith(".json") || file.type.includes("json")) {
          try {
            const content = await file.text();
            const data = JSON.parse(content);
            State.fromJSON(data);
            this._showNotification(`Fichier charg\xE9: ${file.name}`, "success");
          } catch (err) {
            this._showNotification("Erreur: " + err.message, "error");
          }
        } else {
          this._showNotification("Format non support\xE9. Utilisez XML ou JSON.", "error");
        }
      });
    }
    /**
     * Gère l'ouverture d'un fichier
     */
    async _handleOpen() {
      try {
        const result = await Storage.openProject();
        if (result.success) {
          this._showNotification(result.message, "success");
        } else if (!result.cancelled) {
          this._showNotification("Erreur lors de l'ouverture", "error");
        }
      } catch (err) {
        console.error("Erreur ouverture:", err);
        this._showNotification("Erreur: " + err.message, "error");
      }
    }
    /**
     * Gère la sauvegarde (Ctrl+S)
     */
    async _handleSave() {
      try {
        const result = await Storage.save();
        if (result.success) {
          this._showNotification("Sauvegard\xE9", "success");
        } else if (!result.cancelled) {
          this._showNotification("Erreur de sauvegarde", "error");
        }
      } catch (err) {
        console.error("Erreur sauvegarde:", err);
        this._showNotification("Erreur: " + err.message, "error");
      }
    }
    /**
     * Gère la sauvegarde sous (Ctrl+Shift+S)
     */
    async _handleSaveAs() {
      try {
        const result = await Storage.saveAs();
        if (result.success) {
          this._showNotification("Fichier cr\xE9\xE9", "success");
        } else if (!result.cancelled) {
          this._showNotification("Erreur de sauvegarde", "error");
        }
      } catch (err) {
        console.error("Erreur sauvegarde:", err);
        this._showNotification("Erreur: " + err.message, "error");
      }
    }
    /**
     * Gère le backup (téléchargement simple)
     */
    _handleBackup() {
      const result = Storage.downloadBackup();
      if (result.success) {
        this._showNotification(result.message, "success");
      }
    }
    /**
     * Gère l'effacement de tous les tickets
     */
    _handleClear() {
      const taskCount = State.tasks.length;
      if (taskCount === 0) {
        this._showNotification("Aucun ticket \xE0 effacer", "info");
        return;
      }
      if (confirm(`Effacer tous les ${taskCount} tickets ? Cette action est irr\xE9versible.`)) {
        State.reset();
        this._showNotification("Tous les tickets ont \xE9t\xE9 effac\xE9s", "success");
      }
    }
    /**
     * Met à jour l'indicateur de support File System API
     */
    _updateFileSystemIndicator() {
      const indicator = $("#fs-support-indicator");
      if (indicator) {
        if (isFileSystemAccessSupported()) {
          indicator.textContent = "\u2713 File System Access API support\xE9";
          indicator.classList.add("supported");
        } else {
          indicator.textContent = "\u26A0\uFE0F File System Access API non support\xE9 - Mode t\xE9l\xE9chargement";
          indicator.classList.add("unsupported");
        }
      }
    }
    /**
     * Met à jour l'indicateur de modifications non sauvegardées
     */
    _updateUnsavedIndicator() {
      const titleEl = document.querySelector("title");
      const baseTitle = "Jira Report";
      if (State.hasUnsavedChanges) {
        document.title = "\u25CF " + baseTitle;
        document.body.classList.add("has-unsaved-changes");
      } else {
        document.title = baseTitle;
        document.body.classList.remove("has-unsaved-changes");
      }
    }
    /**
     * Affiche une notification
     */
    _showNotification(message, type = "info") {
      const notification = document.createElement("div");
      notification.className = `notification notification-${type}`;
      notification.textContent = message;
      let container = $("#notification-container");
      if (!container) {
        container = document.createElement("div");
        container.id = "notification-container";
        document.body.appendChild(container);
      }
      container.appendChild(notification);
      setTimeout(() => notification.classList.add("show"), 10);
      setTimeout(() => {
        notification.classList.remove("show");
        setTimeout(() => notification.remove(), 300);
      }, 3e3);
    }
  };
  var App = new JiraReportApp();
  document.addEventListener("DOMContentLoaded", () => {
    App.init();
  });
})();
