/**
 * Module pour l'affichage du contenu Markdown
 * Utilise marked.js pour convertir le Markdown en HTML
 */

class MarkdownViewer {
  /**
   * Initialise le visualiseur Markdown
   */
  constructor() {
    // S'assurer que marked.js est disponible
    if (typeof marked === 'undefined') {
      console.error('La bibliothèque marked.js n\'est pas disponible. Le Markdown ne sera pas correctement affiché.');
    }
  }

  /**
   * Affiche du contenu Markdown dans un conteneur
   * @param {string} markdown - Le contenu Markdown à afficher
   * @param {string|HTMLElement} container - Le conteneur où afficher le Markdown (ID ou élément DOM)
   * @param {Object} options - Options d'affichage
   */
  render(markdown, container, options = {}) {
    // Vérifier que le contenu Markdown est valide
    if (!markdown || typeof markdown !== 'string') {
      console.error('Contenu Markdown invalide', markdown);
      return;
    }

    // Obtenir le conteneur
    let targetContainer;
    if (typeof container === 'string') {
      targetContainer = document.getElementById(container);
    } else if (container instanceof HTMLElement) {
      targetContainer = container;
    }

    if (!targetContainer) {
      console.error('Conteneur non trouvé', container);
      return;
    }

    // Options par défaut
    const defaultOptions = {
      title: 'Rapport d\'analyse Excel',
      showHeader: true,
      headerIcon: '<svg class="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>',
      maxHeight: '600px'
    };

    // Fusionner les options
    const settings = { ...defaultOptions, ...options };

    // Créer le conteneur pour le contenu Markdown
    const markdownContainer = document.createElement('div');
    markdownContainer.className = 'markdown-container bg-white rounded-lg shadow-md p-4 my-4';

    // Ajouter un en-tête si nécessaire
    if (settings.showHeader) {
      const header = document.createElement('div');
      header.className = 'markdown-header border-b border-gray-200 pb-3 mb-4';
      header.innerHTML = `
        <h2 class="text-xl font-bold flex items-center">
          ${settings.headerIcon}
          ${settings.title}
        </h2>
      `;
      markdownContainer.appendChild(header);
    }

    // Créer le conteneur pour le contenu
    const contentElement = document.createElement('div');
    contentElement.className = 'markdown-content overflow-auto';
    if (settings.maxHeight) {
      contentElement.style.maxHeight = settings.maxHeight;
    }

    try {
      // Rendre le Markdown en HTML
      if (typeof marked !== 'undefined') {
        // Configuration de marked
        const renderer = new marked.Renderer();
        
        // Personnaliser le rendu des tableaux
        renderer.table = function(header, body) {
          return '<table class="excel-markdown-table">' + 
                 '<thead>' + header + '</thead>' + 
                 '<tbody>' + body + '</tbody>' + 
                 '</table>';
        };
        
        // Configuration
        const markedOptions = {
          renderer: renderer,
          gfm: true,
          breaks: true,
          headerIds: true,
          mangle: false,
          pedantic: false,
          sanitize: false,
          smartLists: true,
          smartypants: true
        };
        
        // Rendre le Markdown
        contentElement.innerHTML = marked.parse(markdown, markedOptions);
      } else {
        // Fallback si marked n'est pas disponible
        contentElement.innerHTML = `<pre>${markdown}</pre>`;
      }
    } catch (error) {
      console.error('Erreur lors du rendu du Markdown', error);
      contentElement.innerHTML = `<div class="p-3 bg-red-50 text-red-700 rounded">
        <p>Erreur lors du rendu du Markdown</p>
        <pre class="mt-2 text-sm bg-red-100 p-2">${markdown}</pre>
      </div>`;
    }

    // Ajouter le contenu au conteneur
    markdownContainer.appendChild(contentElement);

    // Ajouter un bouton pour copier le contenu
    const footer = document.createElement('div');
    footer.className = 'markdown-footer mt-3 flex justify-end';
    footer.innerHTML = `
      <button class="copy-markdown-btn px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm flex items-center">
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
        </svg>
        Copier
      </button>
    `;
    markdownContainer.appendChild(footer);

    // Ajouter l'écouteur d'événement pour le bouton de copie
    const copyButton = footer.querySelector('.copy-markdown-btn');
    if (copyButton) {
      copyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(markdown)
          .then(() => {
            // Afficher un message de confirmation
            this._showToast('Contenu copié dans le presse-papiers');
          })
          .catch(err => {
            console.error('Erreur lors de la copie dans le presse-papiers:', err);
          });
      });
    }

    // Ajouter le conteneur au DOM
    targetContainer.appendChild(markdownContainer);
  }

  /**
   * Affiche un message toast
   * @param {string} message - Message à afficher
   * @private
   */
  _showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded shadow-lg z-50 animate-fade-in';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('animate-fade-out');
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  }
}

// Créer et exporter l'instance
window.markdownViewer = new MarkdownViewer();
