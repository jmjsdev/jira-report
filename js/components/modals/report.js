/**
 * Composant Modal Report - Génération de rapports
 */

import { State } from '../../state.js';
import { Config } from '../../config.js';
import { UserConfig } from '../../services/user-config.js';
import { $, setHtml, addClass, removeClass, escapeAttr, copyToClipboard, copyHtmlToClipboard } from '../../utils/dom.js';
import { formatDate } from '../../utils/date.js';
import { Templates } from '../../utils/templates.js';
import { icon } from '../../utils/icons.js';

class ReportModalComponent {
  constructor() {
    this._element = null;
    this._isOpen = false;
    this._currentMode = 'text'; // 'text' ou 'html'
    this._template = null;
  }

  /**
   * Initialise le composant
   * @param {string} selector - Sélecteur du conteneur modal
   */
  async init(selector) {
    this._element = $(selector);
    if (!this._element) {
      console.error('Report modal container not found:', selector);
      return;
    }

    // Charger le template
    this._template = await Templates.load('modals/report');

    this._render();
    this._attachEventListeners();
  }

  /**
   * Rend la structure de la modal
   */
  _render() {
    if (!this._template) return;
    setHtml(this._element, this._template);
  }

  /**
   * Attache les écouteurs d'événements
   */
  _attachEventListeners() {
    // Fermer la modal
    const closeBtn = $('#close-report-modal', this._element);
    closeBtn?.addEventListener('click', () => this.close());

    // Clic en dehors
    this._element.addEventListener('click', (e) => {
      if (e.target === this._element) {
        this.close();
      }
    });

    // Checkboxes de colonnes
    ['echeance', 'statut', 'personne', 'projet', 'jira'].forEach(col => {
      const checkbox = $(`#report-col-${col}`, this._element);
      checkbox?.addEventListener('change', () => this._refreshReport());
    });

    // Bouton copier
    const copyBtn = $('#btn-copy-report', this._element);
    copyBtn?.addEventListener('click', () => this._copyToClipboard());
  }

  /**
   * Ouvre la modal en mode texte
   */
  openText() {
    this._currentMode = 'text';
    this._openModal();

    const textArea = $('#report-text-content', this._element);
    const htmlDiv = $('#report-html-content', this._element);

    if (textArea) {
      textArea.style.display = 'block';
      textArea.value = this._generateTextReport();
    }
    if (htmlDiv) {
      htmlDiv.style.display = 'none';
    }
  }

  /**
   * Ouvre la modal en mode HTML
   */
  openHtml() {
    this._currentMode = 'html';
    this._openModal();

    const textArea = $('#report-text-content', this._element);
    const htmlDiv = $('#report-html-content', this._element);

    if (textArea) {
      textArea.style.display = 'none';
    }
    if (htmlDiv) {
      htmlDiv.style.display = 'block';
      htmlDiv.innerHTML = this._generateHtmlReport();
    }
  }

  /**
   * Ouvre la modal
   */
  _openModal() {
    if (this._element) {
      addClass(this._element, 'show');
      this._isOpen = true;
    }
  }

  /**
   * Ferme la modal
   */
  close() {
    if (this._element) {
      removeClass(this._element, 'show');
      this._isOpen = false;
    }
  }

  /**
   * Rafraîchit le rapport selon le mode actuel
   */
  _refreshReport() {
    if (this._currentMode === 'text') {
      const textArea = $('#report-text-content', this._element);
      if (textArea) {
        textArea.value = this._generateTextReport();
      }
    } else {
      const htmlDiv = $('#report-html-content', this._element);
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
      echeance: $('#report-col-echeance', this._element)?.checked ?? true,
      statut: $('#report-col-statut', this._element)?.checked ?? true,
      personne: $('#report-col-personne', this._element)?.checked ?? true,
      projet: $('#report-col-projet', this._element)?.checked ?? true,
      jira: $('#report-col-jira', this._element)?.checked ?? true
    };
  }

  /**
   * Génère le rapport texte
   */
  _generateTextReport() {
    const options = this._getColumnOptions();
    const tasks = State.getFilteredTasks();

    // Largeurs des colonnes
    const COL_ECHEANCE = 12;
    const COL_STATUT = 15;
    const COL_PERSONNE = 15;
    const COL_PROJET = 15;
    const COL_JIRA = 14;
    const COL_TITRE = 80;

    // Calculer la largeur totale
    let totalWidth = COL_TITRE;
    if (options.echeance) totalWidth += COL_ECHEANCE + 3;
    if (options.statut) totalWidth += COL_STATUT + 3;
    if (options.personne) totalWidth += COL_PERSONNE + 3;
    if (options.projet) totalWidth += COL_PROJET + 3;
    if (options.jira) totalWidth += COL_JIRA + 3;

    // En-tête
    let report = 'RAPPORT DES TÂCHES - ' + new Date().toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) + '\n';
    report += '='.repeat(totalWidth) + '\n\n';

    // Colonnes header
    let header = '';
    if (options.echeance) header += 'Échéance'.padEnd(COL_ECHEANCE) + ' | ';
    if (options.statut) header += 'Statut'.padEnd(COL_STATUT) + ' | ';
    if (options.personne) header += 'Rapporteur'.padEnd(COL_PERSONNE) + ' | ';
    if (options.projet) header += 'Projet'.padEnd(COL_PROJET) + ' | ';
    if (options.jira) header += 'JIRA'.padEnd(COL_JIRA) + ' | ';
    header += 'Titre';
    report += header + '\n';
    report += '-'.repeat(totalWidth) + '\n';

    // Séparer les tâches
    const doneTasks = tasks.filter(t => t.statusKey === 'done' || (t.labels || []).some(l => l.toLowerCase() === 'done'));
    const activeWithDate = tasks.filter(t =>
      t.statusKey !== 'done' &&
      !(t.labels || []).some(l => l.toLowerCase() === 'done') &&
      t.dueDate
    );
    const activeWithoutDate = tasks.filter(t =>
      t.statusKey !== 'done' &&
      !(t.labels || []).some(l => l.toLowerCase() === 'done') &&
      !t.dueDate
    );

    // Trier par date
    const sortByDate = (arr) => [...arr].sort((a, b) => {
      const dateA = a.dueDate ? new Date(a.dueDate) : new Date('9999-12-31');
      const dateB = b.dueDate ? new Date(b.dueDate) : new Date('9999-12-31');
      return dateA - dateB;
    });

    const sortedActive = sortByDate(activeWithDate);
    const sortedDone = sortByDate(doneTasks);

    // Concaténer
    const allTasks = [...sortedActive, ...activeWithoutDate, ...sortedDone];

    // Générer les lignes
    allTasks.forEach(task => {
      let row = '';
      if (options.echeance) row += (formatDate(task.dueDate) || '-').padEnd(COL_ECHEANCE) + ' | ';
      if (options.statut) row += (task.statusLabel || 'Backlog').padEnd(COL_STATUT) + ' | ';
      if (options.personne) row += (task.reporter || '-').padEnd(COL_PERSONNE) + ' | ';
      if (options.projet) row += (task.project || '-').padEnd(COL_PROJET) + ' | ';
      if (options.jira) row += (task.key || '-').padEnd(COL_JIRA) + ' | ';
      row += task.summary || '';
      report += row + '\n';
    });

    report += '='.repeat(totalWidth) + '\n';
    report += `Total: ${tasks.length} tâche${tasks.length > 1 ? 's' : ''}\n`;

    return report;
  }

  /**
   * Génère le rapport HTML
   */
  _generateHtmlReport() {
    const options = this._getColumnOptions();
    const tasks = State.getFilteredTasks();

    // Séparer et trier les tâches
    const doneTasks = tasks.filter(t => t.statusKey === 'done' || (t.labels || []).some(l => l.toLowerCase() === 'done'));
    const activeWithDate = tasks.filter(t =>
      t.statusKey !== 'done' &&
      !(t.labels || []).some(l => l.toLowerCase() === 'done') &&
      t.dueDate
    );
    const activeWithoutDate = tasks.filter(t =>
      t.statusKey !== 'done' &&
      !(t.labels || []).some(l => l.toLowerCase() === 'done') &&
      !t.dueDate
    );

    const sortByDate = (arr) => [...arr].sort((a, b) => {
      const dateA = a.dueDate ? new Date(a.dueDate) : new Date('9999-12-31');
      const dateB = b.dueDate ? new Date(b.dueDate) : new Date('9999-12-31');
      return dateA - dateB;
    });

    const allTasks = [...sortByDate(activeWithDate), ...activeWithoutDate, ...sortByDate(doneTasks)];

    // Générer le HTML
    let html = `
      <table class="report-table" data-sortable="true">
        <thead>
          <tr>
            ${options.echeance ? '<th data-sort="due">Échéance<span class="sort-indicator"></span></th>' : ''}
            ${options.statut ? '<th data-sort="status">Statut<span class="sort-indicator"></span></th>' : ''}
            ${options.personne ? '<th data-sort="person">Rapporteur<span class="sort-indicator"></span></th>' : ''}
            ${options.projet ? '<th data-sort="project">Projet<span class="sort-indicator"></span></th>' : ''}
            ${options.jira ? '<th data-sort="jira">JIRA<span class="sort-indicator"></span></th>' : ''}
            <th data-sort="title">Titre<span class="sort-indicator"></span></th>
          </tr>
        </thead>
        <tbody>
    `;

    allTasks.forEach((task, index) => {
      const isDone = task.statusKey === 'done' || (task.labels || []).some(l => l.toLowerCase() === 'done');
      const rowClass = isDone ? 'row-done' : (index % 2 === 0 ? 'row-even' : 'row-odd');
      const statusCss = task.statusCssClass || 'status-backlog';
      const titleClass = isDone ? 'title-done' : '';

      const jiraUrl = task.link || null;
      const titleHtml = jiraUrl
        ? `<a href="${jiraUrl}" target="_blank" class="title-link ${titleClass}">${escapeAttr(task.summary || '')}</a>`
        : (isDone ? `<span class="${titleClass}">${escapeAttr(task.summary || '')}</span>` : escapeAttr(task.summary || ''));

      html += `
        <tr class="${rowClass}"
            data-title="${escapeAttr(task.summary || '')}"
            data-due="${task.dueDate || ''}"
            data-status="${task.statusKey || 'backlog'}"
            data-person="${escapeAttr(task.reporter || '')}"
            data-project="${escapeAttr(task.project || '')}"
            data-jira="${task.key || ''}">
          ${options.echeance ? `<td>${formatDate(task.dueDate) || '-'}</td>` : ''}
          ${options.statut ? `<td class="cell-status"><span class="status-badge ${statusCss}">${icon(task.statusIconName || 'list')} ${task.statusLabel || 'Backlog'}</span></td>` : ''}
          ${options.personne ? `<td>${task.reporter || '-'}</td>` : ''}
          ${options.projet ? `<td>${task.project || '-'}</td>` : ''}
          ${options.jira ? `<td>${task.key || '-'}</td>` : ''}
          <td>${titleHtml}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
      <p class="report-total">
        <strong>Total: ${tasks.length} tâche${tasks.length > 1 ? 's' : ''}</strong>
      </p>
    `;

    return html;
  }

  /**
   * Copie le rapport dans le presse-papier
   */
  async _copyToClipboard() {
    const statusEl = $('#copy-status', this._element);

    try {
      if (this._currentMode === 'text') {
        const textArea = $('#report-text-content', this._element);
        await copyToClipboard(textArea?.value || '');
      } else {
        const htmlDiv = $('#report-html-content', this._element);
        await copyHtmlToClipboard(htmlDiv?.innerHTML || '', htmlDiv?.innerText || '');
      }

      if (statusEl) {
        statusEl.innerHTML = icon('check') + ' Copié !';
        setTimeout(() => { statusEl.innerHTML = ''; }, 2000);
      }
    } catch (err) {
      if (statusEl) {
        statusEl.innerHTML = icon('xCircle') + ' Erreur de copie';
        setTimeout(() => { statusEl.innerHTML = ''; }, 2000);
      }
    }
  }
}

export const ReportModal = new ReportModalComponent();
