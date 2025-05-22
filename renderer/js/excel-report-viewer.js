// @ts-nocheck

/**
 * Excel Report Viewer
 * Module pour afficher les rapports structurés générés à partir de fichiers Excel
 */

class ExcelReportViewer {
  constructor() {
    this.currentReport = null;
    this.chartInstances = [];
  }
  
  /**
   * Normalise les sections pour accepter à la fois les tableaux et les objets
   * @param {Object|Array} sections - Sections du rapport (objet ou tableau)
   * @returns {Array} Tableau normalisé de sections
   */
  _normalizeSections(sections) {
    if (!sections) return [];
    
    // Si sections est déjà un tableau
    if (Array.isArray(sections)) {
      return sections.map(section => ({
        title: section.title || 'Section sans titre',
        content: section.content || {}
      }));
    }
    
    // Si sections est un objet
    if (typeof sections === 'object' && sections !== null) {
      return Object.entries(sections).map(([title, content]) => ({
        title,
        content
      }));
    }
    
    // Format non reconnu
    console.warn('Format de sections non reconnu:', sections);
    return [];
  }

  /**
   * Initialise le visualiseur de rapport
   */
  initialize() {
    // Ajouter les écouteurs d'événements pour les boutons d'action
    document.addEventListener('click', (event) => {
      if (event.target.matches('.copy-report-btn')) {
        this.copyReportToClipboard();
      } else if (event.target.matches('.download-report-btn')) {
        this.downloadReportAsJSON();
      } else if (event.target.matches('.expand-report-btn')) {
        this.expandReport();
      }
    });
    
    console.log('ExcelReportViewer initialisé');
  }
  
  /**
   * Affiche un rapport structuré dans un conteneur
   * 
   * @param {Object} report - Rapport structuré
   * @param {HTMLElement} container - Conteneur où afficher le rapport
   */
  displayReport(report, container) {
    if (!report) {
      console.error('Aucun rapport à afficher');
      return;
    }
    
    if (report.type === 'error') {
      this._showErrorMessage(report.content || 'Erreur inconnue', container);
      return;
    }
    
    // Stocker le rapport courant
    this.currentReport = report;
    
    // Nettoyer le conteneur
    container.innerHTML = '';
    
    // Créer l'élément du rapport
    const reportElement = document.createElement('div');
    reportElement.className = 'excel-report bg-white rounded-lg shadow-lg p-6 relative overflow-auto';
    
    // Ajouter l'en-tête du rapport
    reportElement.innerHTML = this._createReportHeader(report);
    
    // Ajouter le contenu du rapport
    reportElement.innerHTML += this._createReportContent(report.report);
    
    // Ajouter les boutons d'action
    reportElement.innerHTML += this._createActionButtons();
    
    // Ajouter le rapport au conteneur
    container.appendChild(reportElement);
    
    // Initialiser les graphiques si des données numériques sont présentes
    this._initializeCharts(report.report);
    
    // Définir un timeout pour s'assurer que tout est bien rendu
    setTimeout(() => {
      // Vérifier si le contenu est trop grand pour le conteneur
      const reportHeight = reportElement.offsetHeight;
      const containerHeight = container.offsetHeight;
      
      if (reportHeight > containerHeight * 1.5) {
        // Ajouter un bouton pour afficher le rapport complet dans une fenêtre modale
        const expandButton = document.createElement('button');
        expandButton.className = 'expand-report-btn px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded text-sm flex items-center absolute bottom-2 right-2';
        expandButton.innerHTML = `
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"></path>
          </svg>
          Voir rapport complet
        `;
        reportElement.appendChild(expandButton);
      }
    }, 500);
  }
  
  /**
   * Crée l'en-tête du rapport
   * 
   * @param {Object} report - Rapport structuré
   * @returns {string} HTML de l'en-tête
   */
  _createReportHeader(report) {
    const reportData = report.report || {};
    const fichierInfo = reportData.fichier || {};
    
    return `
      <div class="report-header mb-6">
        <h2 class="text-2xl font-bold text-gray-800 mb-2">${reportData.titre || 'Rapport Excel'}</h2>
        <div class="file-info text-sm text-gray-600 flex flex-wrap gap-x-4">
          <div class="file-name">
            <span class="font-medium">Fichier:</span> ${fichierInfo.nom || 'Non spécifié'}
          </div>
          ${fichierInfo.feuille ? `<div class="sheet-name">
            <span class="font-medium">Feuille:</span> ${fichierInfo.feuille}
          </div>` : ''}
          ${fichierInfo.dimensions ? `<div class="dimensions">
            <span class="font-medium">Dimensions:</span> ${fichierInfo.dimensions}
          </div>` : ''}
        </div>
        ${reportData.resume ? `<div class="summary mt-3 p-3 bg-blue-50 text-blue-800 rounded">
          <h3 class="font-medium mb-1">Résumé</h3>
          <p>${reportData.resume}</p>
        </div>` : ''}
      </div>
    `;
  }
  
  /**
   * Crée le contenu du rapport
   * 
   * @param {Object} report - Rapport structuré
   * @returns {string} HTML du contenu
   */
  _createReportContent(report) {
    let html = '<div class="report-content">';

    // Normaliser les sections pour accepter à la fois les tableaux et les objets
    const normalizedSections = this._normalizeSections(report.sections);
    
    // Construire le HTML des sections
    if (normalizedSections.length > 0) {
      html += '<div class="report-sections grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">';
      
      normalizedSections.forEach((section, index) => {
        html += this._createSectionCard(section.title, section.content, index);
      });
      
      html += '</div>';
    }

    // Recommandations
    if (report.recommandations && report.recommandations.length > 0) {
      html += `
        <div class="report-recommendations mb-4">
          <h3 class="text-lg font-semibold mb-2 text-gray-800">Recommandations</h3>
          <ul class="list-disc pl-5 space-y-1 text-gray-700">
            ${report.recommandations.map(rec => `<li>${rec}</li>`).join('')}
          </ul>
        </div>
      `;
    }
    
    // Exemples de calculs
    if (report.calculs_exemple && Object.keys(report.calculs_exemple).length > 0) {
      html += `
        <div class="report-calculations">
          <h3 class="text-lg font-semibold mb-2 text-gray-800">Exemples de calculs</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${Object.entries(report.calculs_exemple).map(([calc, result]) => `
              <div class="calc-example p-3 bg-gray-50 rounded">
                <div class="font-medium">${calc}</div>
                <div class="text-gray-700">${result}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
    
    html += '</div>';
    return html;
  }
  
  /**
   * Crée une carte pour une section du rapport
   * 
   * @param {string} sectionName - Nom de la section
   * @param {Object} sectionData - Données de la section
   * @param {number} index - Index de la section
   * @returns {string} HTML de la carte
   */
  _createSectionCard(sectionName, sectionData, index) {
    const sectionId = `section-${sectionName.toLowerCase().replace(/\\s+/g, '-')}-${index}`;
    const hasNumericData = this._hasNumericData(sectionData);
    
    return `
      <div class="section-card bg-white rounded shadow p-4 relative">
        <h3 class="text-lg font-semibold mb-2 text-gray-800">${sectionName}</h3>
        <div class="section-content" id="${sectionId}-content">
          ${this._formatSectionContent(sectionData)}
        </div>
        ${hasNumericData ? `
          <div class="section-chart mt-3 h-48" id="${sectionId}-chart"></div>
        ` : ''}
      </div>
    `;
  }
  
  /**
   * Vérifie si une section contient des données numériques
   * 
   * @param {Object} sectionData - Données de la section
   * @returns {boolean} Vrai si des données numériques sont présentes
   */
  _hasNumericData(sectionData) {
    // Vérifier si au moins une propriété contient un tableau avec des nombres
    return Object.values(sectionData).some(value => {
      if (Array.isArray(value) && value.length > 3) {
        return value.some(item => typeof item === 'number' || (typeof item === 'string' && !isNaN(parseFloat(item))));
      }
      return false;
    });
  }
  
  /**
   * Formate le contenu d'une section
   * 
   * @param {Object} sectionData - Données de la section
   * @returns {string} HTML formaté
   */
  _formatSectionContent(sectionData) {
    if (!sectionData || Object.keys(sectionData).length === 0) {
      return '<p class="text-gray-500 italic">Aucune donnée disponible</p>';
    }
    
    let html = '<div class="grid grid-cols-1 gap-y-2">';
    
    // Afficher chaque élément de la section
    Object.entries(sectionData).forEach(([key, value]) => {
      html += `<div class="section-item">`;
      
      // Formater en fonction du type de valeur
      if (Array.isArray(value)) {
        if (value.length > 10) {
          // Pour les grands tableaux, afficher un résumé
          html += `<div class="font-medium">${key}:</div>`;
          html += `<div class="text-sm text-gray-700">
            ${value.slice(0, 5).join(', ')}...
            <span class="text-blue-600 cursor-pointer hover:underline" onclick="window.excelReportViewer.toggleArray('${key}-full')">
              (${value.length} éléments)
            </span>
          </div>`;
          html += `<div id="${key}-full" class="hidden text-sm text-gray-700">${value.join(', ')}</div>`;
        } else {
          // Pour les petits tableaux, afficher tous les éléments
          html += `<div class="font-medium">${key}:</div>`;
          html += `<div class="text-sm text-gray-700">${value.join(', ')}</div>`;
        }
      } else if (typeof value === 'object' && value !== null) {
        // Pour les objets, afficher les paires clé-valeur
        html += `<div class="font-medium">${key}:</div>`;
        html += `<div class="text-sm text-gray-700">
          ${Object.entries(value).map(([k, v]) => `${k}: ${v}`).join(', ')}
        </div>`;
      } else {
        // Pour les valeurs simples
        html += `<div class="font-medium">${key}:</div>`;
        html += `<div class="text-sm text-gray-700">${value}</div>`;
      }
      
      html += `</div>`;
    });
    
    html += '</div>';
    return html;
  }
  
  /**
   * Crée les boutons d'action pour le rapport
   * 
   * @returns {string} HTML des boutons
   */
  _createActionButtons() {
    return `
      <div class="report-actions mt-6 flex space-x-2">
        <button class="copy-report-btn px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-sm flex items-center">
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
          </svg>
          Copier
        </button>
        <button class="download-report-btn px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded text-sm flex items-center">
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
          </svg>
          Télécharger
        </button>
      </div>
    `;
  }
  
  /**
   * Initialise les graphiques pour les sections avec des données numériques
   * 
   * @param {Object} report - Rapport structuré
   */
  _initializeCharts(report) {
    if (!report) return;
    
    // Vérifier que Chart.js est chargé
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js n\'est pas chargé, impossible de créer des graphiques');
      return;
    }
    
    // Normaliser les sections pour accepter à la fois les tableaux et les objets
    const normalizedSections = this._normalizeSections(report.sections);
    
    // Nettoyer les graphiques existants de manière sécurisée
    if (this.chartInstances && this.chartInstances.length > 0) {
      this.chartInstances.forEach(chart => {
        try {
          if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
          }
        } catch (chartError) {
          console.warn('Erreur lors de la destruction d\'un graphique:', chartError);
        }
      });
    }
    this.chartInstances = [];
    
    // Définir un timeout pour éviter que l'initialisation des graphiques ne bloque l'interface
    setTimeout(() => {
      try {
        // Parcourir les sections pour préparer les données des graphiques
        normalizedSections.forEach((section, index) => {
          try {
            const sectionName = section.title;
            const sectionData = section.content;
            
            const sectionId = `section-${sectionName.toLowerCase().replace(/\\s+/g, '-')}-${index}`;
            const chartContainer = document.getElementById(`${sectionId}-chart`);
            
            if (chartContainer && this._hasNumericData(sectionData)) {
              // Préparer le canvas pour le graphique
              chartContainer.innerHTML = '<canvas></canvas>';
              const canvas = chartContainer.querySelector('canvas');
              
              // Extraire les données numériques
              const chartData = this._extractChartData(sectionData);
              
              if (chartData.labels.length > 0) {
                try {
                  // Créer le graphique
                  const chartInstance = new Chart(canvas, {
                    type: 'bar',
                    data: {
                      labels: chartData.labels,
                      datasets: [{
                        label: sectionName,
                        data: chartData.values,
                        backgroundColor: 'rgba(59, 130, 246, 0.5)',
                        borderColor: 'rgba(59, 130, 246, 1)',
                        borderWidth: 1
                      }]
                    },
                    options: {
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true
                        }
                      }
                    }
                  });
                  
                  // Stocker l'instance du graphique
                  this.chartInstances.push(chartInstance);
                } catch (e) {
                  console.error(`Erreur lors de la création du graphique pour ${sectionName}:`, e);
                }
              }
            }
          } catch (error) {
            console.error(`Erreur lors de la création du graphique pour la section ${index}:`, error);
          }
        });
      } catch (error) {
        console.error('Erreur lors de l\'initialisation des graphiques:', error);
      }
    }, 200);
  }
  
  /**
   * Extrait les données numériques d'une section
   * 
   * @param {Object} sectionData - Données de la section
   * @returns {Object} Données pour le graphique
   */
  _extractChartData(sectionData) {
    const result = {
      labels: [],
      values: []
    };
    
    // Trouver la première propriété qui contient un tableau de nombres
    for (const [key, value] of Object.entries(sectionData)) {
      if (Array.isArray(value) && value.length > 3) {
        const numericValues = value.filter(item => 
          typeof item === 'number' || (typeof item === 'string' && !isNaN(parseFloat(item)))
        ).map(item => typeof item === 'string' ? parseFloat(item) : item);
        
        if (numericValues.length > 3) {
          // Utiliser le nom de la propriété pour les étiquettes
          result.labels = numericValues.map((_, i) => `${key} ${i+1}`);
          result.values = numericValues;
          break;
        }
      }
    }
    
    return result;
  }
  
  /**
   * Affiche un message d'erreur
   * 
   * @param {string} message - Message d'erreur
   * @param {HTMLElement} container - Conteneur où afficher l'erreur
   */
  _showErrorMessage(message, container) {
    container.innerHTML = `
      <div class="error-message bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
        <p class="font-bold">Erreur</p>
        <p>${message}</p>
      </div>
    `;
  }
  
  /**
   * Copie le rapport au format JSON dans le presse-papier
   */
  copyReportToClipboard() {
    if (!this.currentReport) {
      alert('Aucun rapport à copier');
      return;
    }
    
    try {
      const jsonStr = JSON.stringify(this.currentReport, null, 2);
      
      // Créer un élément textarea temporaire
      const textarea = document.createElement('textarea');
      textarea.value = jsonStr;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      
      // Sélectionner et copier
      textarea.select();
      document.execCommand('copy');
      
      // Nettoyer
      document.body.removeChild(textarea);
      
      // Notification
      alert('Rapport copié dans le presse-papier');
    } catch (error) {
      console.error('Erreur lors de la copie du rapport:', error);
      alert('Erreur lors de la copie du rapport');
    }
  }
  
  /**
   * Télécharge le rapport au format JSON
   */
  downloadReportAsJSON() {
    if (!this.currentReport) {
      alert('Aucun rapport à télécharger');
      return;
    }
    
    try {
      const jsonStr = JSON.stringify(this.currentReport, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Créer un lien temporaire
      const a = document.createElement('a');
      a.href = url;
      a.download = 'rapport-excel.json';
      document.body.appendChild(a);
      
      // Cliquer sur le lien
      a.click();
      
      // Nettoyer
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur lors du téléchargement du rapport:', error);
      alert('Erreur lors du téléchargement du rapport');
    }
  }
  
  /**
   * Affiche ou masque un tableau complet
   * 
   * @param {string} id - ID de l'élément à afficher/masquer
   */
  toggleArray(id) {
    const element = document.getElementById(id);
    if (element) {
      element.classList.toggle('hidden');
    }
  }
  
  /**
   * Affiche le rapport complet dans une fenêtre modale
   */
  expandReport() {
    if (!this.currentReport) {
      alert('Aucun rapport à afficher');
      return;
    }
    
    // Créer l'élément modal
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modalOverlay.innerHTML = `
      <div class="modal-content bg-white rounded-lg shadow-xl w-11/12 max-w-6xl max-h-[90vh] overflow-auto">
        <div class="modal-header flex justify-between items-center p-4 border-b">
          <h2 class="text-xl font-bold">Rapport Excel Complet</h2>
          <button class="close-modal-btn text-gray-600 hover:text-gray-900">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div class="modal-body p-6">
          ${this._createReportHeader(this.currentReport)}
          ${this._createReportContent(this.currentReport.report)}
        </div>
        <div class="modal-footer p-4 border-t flex justify-end space-x-2">
          <button class="close-modal-btn px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded">Fermer</button>
        </div>
      </div>
    `;
    
    // Ajouter au document
    document.body.appendChild(modalOverlay);
    document.body.style.overflow = 'hidden';
    
    // Fermer avec Escape
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };
    document.addEventListener('keydown', escapeHandler);
    
    // Fonction pour fermer le modal
    const closeModal = () => {
      document.body.removeChild(modalOverlay);
      document.body.style.overflow = '';
      document.removeEventListener('keydown', escapeHandler);
    };
    
    // Fermer avec le bouton ou en cliquant en dehors
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        closeModal();
      }
    });
    
    // Fermer avec les boutons
    modalOverlay.querySelectorAll('.close-modal-btn').forEach(btn => {
      btn.addEventListener('click', closeModal);
    });
    
    // Initialiser les graphiques dans le modal
    setTimeout(() => {
      this._initializeCharts(this.currentReport.report);
    }, 200);
  }
}

// Créer une instance et l'exposer globalement
window.excelReportViewer = new ExcelReportViewer();

// Initialiser le visualiseur au chargement du document
document.addEventListener('DOMContentLoaded', () => {
  window.excelReportViewer.initialize();
});
