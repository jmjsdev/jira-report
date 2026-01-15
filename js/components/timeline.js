/**
 * Composant Timeline - Visualisation Gantt des échéances
 */

import { State } from '../state.js';
import { Config } from '../config.js';
import { UserConfig } from '../services/user-config.js';
import { $, setHtml, escapeAttr } from '../utils/dom.js';
import { formatDateShort, normalizeToMidnight, isToday, getDueClass } from '../utils/date.js';

class TimelineComponent {
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
      console.error('Timeline container not found:', selector);
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
        <h2 class="timeline-title">Timeline des échéances</h2>
        <button class="timeline-toggle-btn" id="timeline-toggle">↕ Agrandir</button>
      </div>
      <div id="timeline-chart" class="timeline-chart"></div>
    `);

    this._chartElement = $('#timeline-chart', this._element);

    // Toggle expand/collapse
    const toggleBtn = $('#timeline-toggle', this._element);
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this._toggleExpand());
    }
  }

  /**
   * Rend le contenu de la timeline
   */
  render() {
    const tasks = this._getTasksWithDates();

    if (tasks.length === 0) {
      setHtml(this._chartElement, `
        <div class="timeline-empty">Aucune tâche avec échéance à afficher</div>
      `);
      return;
    }

    // Calculer la plage de dates
    const { startDate, endDate, totalDays } = this._calculateDateRange(tasks);
    const chartWidth = totalDays * Config.timeline.dayWidth;

    // Générer le HTML
    let html = `<div class="timeline-grid" style="width: ${chartWidth}px;">`;

    // Marqueurs de dates
    html += this._renderDateMarkers(startDate, endDate, totalDays);

    // Tâches
    html += this._renderTasks(tasks, startDate, endDate);

    html += '</div>';

    setHtml(this._chartElement, html);

    // Ajouter les tooltips
    this._attachTooltips();

    // Mettre à jour la hauteur
    this._updateHeight();
  }

  /**
   * Récupère les tâches filtrées avec des dates valides
   */
  _getTasksWithDates() {
    return State.getFilteredTasks()
      .filter(task => {
        if (!task.dueDate) return false;
        const d = new Date(task.dueDate);
        return !isNaN(d.getTime()) && d.getFullYear() >= 1970;
      })
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  }

  /**
   * Calcule la plage de dates pour l'affichage
   */
  _calculateDateRange(tasks) {
    const dates = tasks.map(t => normalizeToMidnight(new Date(t.dueDate)));
    const today = normalizeToMidnight(new Date());

    const minDate = new Date(Math.min(...dates, today));
    const maxDate = new Date(Math.max(...dates, today));

    // Ajouter des marges
    const margin = Config.timeline.marginDays;
    const startDate = new Date(minDate);
    startDate.setDate(startDate.getDate() - margin);

    const endDate = new Date(maxDate);
    endDate.setDate(endDate.getDate() + margin);

    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    return { startDate, endDate, totalDays };
  }

  /**
   * Génère le HTML des marqueurs de dates
   */
  _renderDateMarkers(startDate, endDate, totalDays) {
    let html = '<div class="timeline-dates">';

    for (let i = 0; i <= totalDays; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const position = (i / totalDays) * 100;
      const todayClass = isToday(date) ? ' today' : '';

      html += `
        <div class="timeline-date-marker${todayClass}" style="left: ${position}%;">
          ${formatDateShort(date)}
        </div>
        <div class="timeline-date-line${todayClass}" style="left: ${position}%;"></div>
      `;
    }

    html += '</div>';
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
      const position = ((taskDate - startDate) / totalRange) * 100;
      const top = index * Config.timeline.taskSpacing;

      const dueClass = getDueClass(task.dueDate);
      const doneClass = task.statusKey === 'done' ? 'done' : '';

      const tooltipDate = formatDateShort(new Date(task.dueDate));
      const tooltipText = escapeAttr(`${task.summary} - ${tooltipDate}`);
      const truncatedTitle = task.summary.length > 50
        ? task.summary.substring(0, 50) + '...'
        : task.summary;

      const url = task.link || '#';

      html += `
        <a href="${url}" target="_blank"
           class="timeline-task ${dueClass} ${doneClass}"
           style="left: ${position}%; top: ${top}px;"
           data-tooltip="${tooltipText}">
          ${escapeAttr(truncatedTitle)}
        </a>
      `;
    });

    html += '</div>';
    return html;
  }

  /**
   * Attache les événements de tooltip
   */
  _attachTooltips() {
    const tasks = this._chartElement.querySelectorAll('.timeline-task[data-tooltip]');

    tasks.forEach(task => {
      task.addEventListener('mouseenter', function() {
        const tooltip = document.createElement('div');
        tooltip.className = 'timeline-tooltip';
        tooltip.textContent = this.getAttribute('data-tooltip');
        document.body.appendChild(tooltip);

        const rect = this.getBoundingClientRect();
        const tooltipWidth = tooltip.offsetWidth;
        const tooltipHeight = tooltip.offsetHeight;
        const viewportWidth = window.innerWidth;

        let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);

        // Ajustements pour rester dans le viewport
        if (left + tooltipWidth > viewportWidth - 10) {
          left = viewportWidth - tooltipWidth - 10;
        }
        if (left < 10) {
          left = 10;
        }

        tooltip.style.left = left + 'px';
        tooltip.style.top = (rect.top - tooltipHeight - 8) + 'px';

        this._tooltip = tooltip;
      });

      task.addEventListener('mouseleave', function() {
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
    const toggleBtn = $('#timeline-toggle', this._element);

    if (this._isExpanded) {
      this._chartElement.style.height = (this._chartElement.scrollHeight + 15) + 'px';
      if (toggleBtn) toggleBtn.textContent = '↕ Réduire';
    } else {
      this._updateHeight();
      if (toggleBtn) toggleBtn.textContent = '↕ Agrandir';
    }
  }

  /**
   * Met à jour la hauteur de la timeline (mode collapsed)
   */
  _updateHeight() {
    if (this._isExpanded) return;

    const tasks = this._chartElement.querySelectorAll('.timeline-task');
    const maxTasks = Config.timeline.collapsedTaskCount;

    if (tasks.length >= maxTasks) {
      const task = tasks[maxTasks - 1];
      this._chartElement.style.height = (task.offsetTop + task.offsetHeight + 4) + 'px';
    } else if (tasks.length > 0) {
      const lastTask = tasks[tasks.length - 1];
      this._chartElement.style.height = (lastTask.offsetTop + lastTask.offsetHeight + 4) + 'px';
    } else {
      this._chartElement.style.height = '200px';
    }
  }

  /**
   * S'abonne aux changements d'état
   */
  _subscribeToState() {
    const unsubTasks = State.subscribe('tasks', () => this.render());
    const unsubFilters = State.subscribe('filters', () => this.render());

    this._unsubscribers.push(unsubTasks, unsubFilters);
  }

  /**
   * Nettoie le composant
   */
  destroy() {
    this._unsubscribers.forEach(unsub => unsub());
    this._unsubscribers = [];
  }
}

export const Timeline = new TimelineComponent();
