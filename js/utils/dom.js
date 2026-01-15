/**
 * Utilitaires pour la manipulation du DOM
 */

/**
 * Échappe les caractères HTML spéciaux
 * @param {string} str - Chaîne à échapper
 * @returns {string} Chaîne échappée
 */
export function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Échappe les attributs HTML
 * @param {string} str - Chaîne à échapper
 * @returns {string} Chaîne échappée pour attribut
 */
export function escapeAttr(str) {
  return escapeHtml(str);
}

/**
 * Crée un élément DOM avec des attributs
 * @param {string} tag - Nom de la balise
 * @param {object} attrs - Attributs de l'élément
 * @param {string|Node|Node[]} children - Contenu ou enfants
 * @returns {HTMLElement}
 */
export function createElement(tag, attrs = {}, children = null) {
  const el = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'className') {
      el.className = value;
    } else if (key === 'dataset') {
      Object.assign(el.dataset, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      el.setAttribute(key, value);
    }
  }

  if (children !== null) {
    if (typeof children === 'string') {
      el.innerHTML = children;
    } else if (children instanceof Node) {
      el.appendChild(children);
    } else if (Array.isArray(children)) {
      children.forEach(child => {
        if (child instanceof Node) {
          el.appendChild(child);
        } else if (typeof child === 'string') {
          el.appendChild(document.createTextNode(child));
        }
      });
    }
  }

  return el;
}

/**
 * Raccourci pour querySelector
 * @param {string} selector - Sélecteur CSS
 * @param {Element} context - Contexte de recherche
 * @returns {Element|null}
 */
export function $(selector, context = document) {
  return context.querySelector(selector);
}

/**
 * Raccourci pour querySelectorAll
 * @param {string} selector - Sélecteur CSS
 * @param {Element} context - Contexte de recherche
 * @returns {NodeList}
 */
export function $$(selector, context = document) {
  return context.querySelectorAll(selector);
}

/**
 * Ajoute un écouteur d'événement avec délégation
 * @param {Element} parent - Élément parent
 * @param {string} eventType - Type d'événement
 * @param {string} selector - Sélecteur des éléments cibles
 * @param {function} handler - Gestionnaire d'événement
 */
export function delegate(parent, eventType, selector, handler) {
  parent.addEventListener(eventType, (e) => {
    const target = e.target.closest(selector);
    if (target && parent.contains(target)) {
      handler.call(target, e, target);
    }
  });
}

/**
 * Montre un élément
 * @param {Element} el - Élément à montrer
 */
export function show(el) {
  if (el) {
    el.classList.remove('hidden');
    el.style.display = '';
  }
}

/**
 * Cache un élément
 * @param {Element} el - Élément à cacher
 */
export function hide(el) {
  if (el) {
    el.classList.add('hidden');
  }
}

/**
 * Bascule la visibilité d'un élément
 * @param {Element} el - Élément
 * @param {boolean} force - Forcer l'état
 */
export function toggle(el, force) {
  if (el) {
    el.classList.toggle('hidden', force === undefined ? undefined : !force);
  }
}

/**
 * Ajoute une classe CSS
 * @param {Element} el - Élément
 * @param {...string} classes - Classes à ajouter
 */
export function addClass(el, ...classes) {
  if (el) {
    el.classList.add(...classes);
  }
}

/**
 * Retire une classe CSS
 * @param {Element} el - Élément
 * @param {...string} classes - Classes à retirer
 */
export function removeClass(el, ...classes) {
  if (el) {
    el.classList.remove(...classes);
  }
}

/**
 * Vide le contenu d'un élément
 * @param {Element} el - Élément à vider
 */
export function empty(el) {
  if (el) {
    el.innerHTML = '';
  }
}

/**
 * Remplace le contenu d'un élément
 * @param {Element} el - Élément
 * @param {string} html - Nouveau contenu HTML
 */
export function setHtml(el, html) {
  if (el) {
    el.innerHTML = html;
  }
}

/**
 * Ajoute du contenu HTML à un élément
 * @param {Element} el - Élément
 * @param {string} html - Contenu HTML à ajouter
 */
export function appendHtml(el, html) {
  if (el) {
    el.insertAdjacentHTML('beforeend', html);
  }
}

/**
 * Crée un tooltip dynamique
 * @param {Element} target - Élément cible
 * @param {string} text - Texte du tooltip
 * @returns {HTMLElement} Élément tooltip
 */
export function createTooltip(target, text) {
  const tooltip = createElement('div', { className: 'tooltip' }, text);
  document.body.appendChild(tooltip);

  const rect = target.getBoundingClientRect();
  const tooltipWidth = tooltip.offsetWidth;
  const tooltipHeight = tooltip.offsetHeight;

  let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
  let top = rect.top - tooltipHeight - 8;

  // Ajustements pour ne pas dépasser l'écran
  const viewportWidth = window.innerWidth;
  if (left + tooltipWidth > viewportWidth - 10) {
    left = viewportWidth - tooltipWidth - 10;
  }
  if (left < 10) {
    left = 10;
  }

  tooltip.style.left = left + 'px';
  tooltip.style.top = top + 'px';

  return tooltip;
}

/**
 * Copie du texte dans le presse-papier
 * @param {string} text - Texte à copier
 * @returns {Promise<boolean>} Succès de la copie
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const result = document.execCommand('copy');
    document.body.removeChild(textarea);
    return result;
  }
}

/**
 * Copie du HTML riche dans le presse-papier
 * @param {string} html - HTML à copier
 * @param {string} text - Texte alternatif
 * @returns {Promise<boolean>} Succès de la copie
 */
export async function copyHtmlToClipboard(html, text) {
  try {
    const clipboardItem = new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([text], { type: 'text/plain' })
    });
    await navigator.clipboard.write([clipboardItem]);
    return true;
  } catch (err) {
    // Fallback: copier le HTML comme texte
    return copyToClipboard(text);
  }
}

/**
 * Debounce une fonction
 * @param {function} fn - Fonction à debouncer
 * @param {number} delay - Délai en ms
 * @returns {function} Fonction debouncée
 */
export function debounce(fn, delay) {
  let timer = null;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Throttle une fonction
 * @param {function} fn - Fonction à throttler
 * @param {number} limit - Limite en ms
 * @returns {function} Fonction throttlée
 */
export function throttle(fn, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
