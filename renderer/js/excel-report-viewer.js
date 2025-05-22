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
   * Initialise le visualiseur de rapport
   */
  initialize() {
    // Ajouter les écouteurs d'événements pour les boutons d'action
    document.addEventListener('click', (event) => {
      if (event.target.matches('.copy-report-btn')) {
        this.copyReportToClipboard();
      } else if (event.target.matches('.download-report-btn')) {
        this.downloadReportAsJson();
      } else if (event.target.matches('.toggle-section-btn')) {
        this.toggleSection(event.target.dataset.section);
      } else if (event.target.matches('.show-chart-btn')) {
        this.showChart(event.target.dataset.section);
      }
    });
  }

  /**
   * Affiche un rapport structuré dans l'interface
   * @param {Object} report - Le rapport structuré au format JSON
   * @param {string} containerId - L'ID du conteneur où afficher le rapport
   */
  displayReport(report, containerId = 'chat-content') {
    if (!report) {
      console.error('Erreur lors de l\'affichage du rapport: Rapport non disponible');
      return;
    }
    
    // Gérer les rapports partiels ou tronqués
    try {
      if (typeof report === 'string') {
        // Essayer de parser le rapport s'il est sous forme de chaîne
        try {
          report = JSON.parse(report);
        } catch (e) {
          // Si ce n'est pas du JSON valide, c'est probablement du texte brut
          this._displayTextualReport(report, containerId);
          return;
        }
      }
      
      if (report.type === 'error') {
        console.error('Erreur lors de l\'affichage du rapport:', report.content || 'Erreur inconnue');
        
        // Afficher un message d'erreur convivial dans le conteneur
        const container = document.getElementById(containerId);
        if (container) {
          const errorElement = document.createElement('div');
          errorElement.className = 'bg-red-50 border-l-4 border-red-400 p-4 my-4';
          errorElement.innerHTML = `
            <div class="flex items-center">
              <svg class="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <h3 class="text-red-800 font-medium">Erreur lors de la génération du rapport</h3>
            </div>
            <p class="text-red-700 mt-2">${report.content || 'Impossible de générer le rapport structuré. Veuillez vérifier le format du fichier Excel.'}</p>
          `;
          container.appendChild(errorElement);
        }
        return;
      }
      
      // Si le rapport est incomplet ou a été tronqué (certains champs nécessaires manquent)
      if (!report.report || typeof report.report !== 'object') {
        this._displayTextualReport(report.content || JSON.stringify(report, null, 2), containerId);
        return;
      }
    } catch (error) {
      console.error('Erreur lors du traitement du rapport:', error);
      this._displayTextualReport(JSON.stringify(report, null, 2), containerId);
      return;
    }

    this.currentReport = report.report;
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Conteneur ${containerId} non trouvé`);
      return;
    }

    // Créer l'élément de rapport
    const reportElement = document.createElement('div');
    reportElement.className = 'excel-report bg-white rounded-lg shadow-md p-4 my-4 max-w-full';
    reportElement.id = 'excel-report-' + Date.now();

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
        
        expandButton.addEventListener('click', () => {
          this._showFullReportModal(report.report);
        });
        
        reportElement.style.position = 'relative';
        reportElement.appendChild(expandButton);
      }
    }, 300);
  }

  /**
   * Crée l'en-tête du rapport
   * @param {Object} report - Le rapport complet
   * @returns {string} - HTML de l'en-tête
   */
  _createReportHeader(report) {
    const fileInfo = report.report.fichier;
    return `
      <div class="report-header border-b border-gray-200 pb-3 mb-4">
        <h2 class="text-xl font-bold flex items-center">
          <svg class="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          Rapport d'analyse: ${fileInfo.nom}
        </h2>
        <div class="text-sm text-gray-600 mt-1">
          <span class="inline-block mr-4">
            <span class="font-medium">Feuille:</span> ${fileInfo.feuille}
          </span>
          <span class="inline-block">
            <span class="font-medium">Dimensions:</span> ${fileInfo.dimensions}
          </span>
        </div>
      </div>
    `;
  }

  /**
   * Crée le contenu principal du rapport
   * @param {Object} report - Le rapport structuré
   * @returns {string} - HTML du contenu
   */
  _createReportContent(report) {
    let html = '<div class="report-content">';

    // Sections du rapport
    if (report.sections && Object.keys(report.sections).length > 0) {
      html += '<div class="report-sections grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">';
      
      // Créer une carte pour chaque section
      Object.entries(report.sections).forEach(([sectionName, sectionData], index) => {
        html += this._createSectionCard(sectionName, sectionData, index);
      });
      
      html += '</div>';
    }

    // Recommandations
    if (report.recommandations && report.recommandations.length > 0) {
      html += `
        <div class="report-recommendations bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <h3 class="font-semibold text-yellow-800 flex items-center">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            Recommandations
          </h3>
          <ul class="list-disc ml-5 mt-2 text-sm text-gray-700">
            ${report.recommandations.map(rec => `<li>${rec}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    // Exemples de calculs
    if (report.calculs_exemple && Object.keys(report.calculs_exemple).length > 0) {
      html += `
        <div class="report-calculations bg-blue-50 border-l-4 border-blue-400 p-4">
          <h3 class="font-semibold text-blue-800 flex items-center">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
            </svg>
            Exemples de calculs
          </h3>
          <ul class="mt-2 text-sm text-gray-700">
            ${Object.entries(report.calculs_exemple).map(([calc, value]) => 
              `<li class="mb-1"><span class="font-medium">${calc}:</span> ${value}</li>`
            ).join('')}
          </ul>
        </div>
      `;
    }

    html += '</div>';
    return html;
  }

  /**
   * Crée une carte pour une section du rapport
   * @param {string} sectionName - Nom de la section
   * @param {Object} sectionData - Données de la section
   * @param {number} index - Index de la section
   * @returns {string} - HTML de la carte
   */
  _createSectionCard(sectionName, sectionData, index) {
    const sectionId = `section-${sectionName.toLowerCase().replace(/\s+/g, '-')}-${index}`;
    const hasNumericData = this._hasNumericData(sectionData);
    
    return `
      <div class="section-card bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div class="section-header bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <h3 class="font-semibold text-gray-800">${sectionName}</h3>
          <div class="flex space-x-1">
            ${hasNumericData ? 
              `<button class="show-chart-btn text-blue-600 hover:text-blue-800 p-1" data-section="${sectionId}">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
              </button>` : ''
            }
            <button class="toggle-section-btn text-gray-600 hover:text-gray-800 p-1" data-section="${sectionId}">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
          </div>
        </div>
        <div class="section-content p-4" id="${sectionId}">
          ${this._formatSectionData(sectionData)}
        </div>
        <div class="chart-container p-4 border-t border-gray-200 hidden" id="${sectionId}-chart"></div>
      </div>
    `;
  }

  /**
   * Formate les données d'une section pour l'affichage
   * @param {Object|Array} data - Données de la section
   * @returns {string} - HTML formaté
   */
  _formatSectionData(data) {
    if (Array.isArray(data)) {
      return `
        <ul class="list-disc ml-5 text-sm text-gray-700">
          ${data.map(item => `<li>${item}</li>`).join('')}
        </ul>
      `;
    } else if (typeof data === 'object') {
      return `
        <table class="min-w-full text-sm">
          <tbody>
            ${Object.entries(data).map(([key, value]) => `
              <tr>
                <td class="py-1 pr-4 font-medium text-gray-700">${key}</td>
                <td class="py-1">${this._formatValue(value)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      return `<p class="text-sm text-gray-700">${data}</p>`;
    }
  }

  /**
   * Formate une valeur pour l'affichage
   * @param {any} value - Valeur à formater
   * @returns {string} - Valeur formatée
   */
  _formatValue(value) {
    if (value === null || value === undefined) {
      return '<span class="text-gray-400">Non disponible</span>';
    } else if (typeof value === 'object') {
      return this._formatSectionData(value);
    } else if (typeof value === 'number') {
      return value.toLocaleString('fr-FR');
    } else {
      return value.toString();
    }
  }

  /**
   * Crée les boutons d'action pour le rapport
   * @returns {string} - HTML des boutons
   */
  _createActionButtons() {
    return `
      <div class="report-actions flex justify-end mt-4 space-x-2">
        <button class="copy-report-btn px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm flex items-center">
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
          </svg>
          Copier
        </button>
        <button class="download-report-btn px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-sm flex items-center">
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
          </svg>
          Télécharger
        </button>
      </div>
    `;
  }

  /**
   * Vérifie si une section contient des données numériques pour les graphiques
   * @param {Object} sectionData - Données de la section
   * @returns {boolean} - True si des données numériques sont présentes
   */
  _hasNumericData(sectionData) {
    if (typeof sectionData !== 'object' || sectionData === null) {
      return false;
    }

    // Vérifier les valeurs numériques dans l'objet
    for (const key in sectionData) {
      const value = sectionData[key];
      
      if (typeof value === 'number') {
        return true;
      } else if (typeof value === 'object' && value !== null) {
        // Vérifier les sous-objets
        if (this._hasNumericData(value)) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Initialise les graphiques pour les sections avec des données numériques
   * @param {Object} report - Le rapport structuré
   */
  _initializeCharts(report) {
    // Vérifier si Chart.js est disponible
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js n\'est pas disponible. Les graphiques ne seront pas affichés.');
      return;
    }
    
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
        if (report && report.sections) {
          Object.entries(report.sections).forEach(([sectionName, sectionData], index) => {
            try {
              const sectionId = `section-${sectionName.toLowerCase().replace(/\s+/g, '-')}-${index}`;
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
                    
                    this.chartInstances.push(chartInstance);
                  } catch (chartError) {
                    console.error(`Erreur lors de la création du graphique pour ${sectionName}:`, chartError);
                  }
                }
              }
            } catch (sectionError) {
              console.warn(`Erreur lors du traitement de la section ${sectionName}:`, sectionError);
            }
          });
        }
      } catch (error) {
        console.error('Erreur lors de l\'initialisation des graphiques:', error);
      }
    }, 100); // Court délai pour permettre au DOM de se mettre à jour
  }

  /**
   * Extrait les données numériques pour les graphiques
   * @param {Object} data - Données de la section
   * @returns {Object} - Données formatées pour Chart.js
   */
  _extractChartData(data) {
    const labels = [];
    const values = [];

    if (typeof data === 'object' && data !== null) {
      for (const key in data) {
        const value = data[key];
        
        if (typeof value === 'number') {
          labels.push(key);
          values.push(value);
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // Pour les objets imbriqués comme les statistiques
          for (const subKey in value) {
            const subValue = value[subKey];
            if (typeof subValue === 'number') {
              labels.push(`${key} - ${subKey}`);
              values.push(subValue);
            }
          }
        }
      }
    }

    return { labels, values };
  }

  /**
   * Bascule l'affichage d'une section
   * @param {string} sectionId - ID de la section
   */
  toggleSection(sectionId) {
    const sectionContent = document.getElementById(sectionId);
    if (sectionContent) {
      sectionContent.classList.toggle('hidden');
      
      // Basculer l'icône du bouton
      const button = document.querySelector(`.toggle-section-btn[data-section="${sectionId}"]`);
      if (button) {
        const svg = button.querySelector('svg');
        if (svg) {
          if (sectionContent.classList.contains('hidden')) {
            svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>';
          } else {
            svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>';
          }
        }
      }
    }
  }

  /**
   * Affiche ou masque le graphique d'une section
   * @param {string} sectionId - ID de la section
   */
  showChart(sectionId) {
    const chartContainer = document.getElementById(`${sectionId}-chart`);
    if (chartContainer) {
      chartContainer.classList.toggle('hidden');
      
      // Redimensionner le graphique si nécessaire
      const chartIndex = this.chartInstances.findIndex(chart => 
        chart.canvas.parentElement.id === `${sectionId}-chart`
      );
      
      if (chartIndex !== -1 && !chartContainer.classList.contains('hidden')) {
        this.chartInstances[chartIndex].resize();
      }
    }
  }

  /**
   * Copie le rapport au format JSON dans le presse-papiers
   */
  copyReportToClipboard() {
    if (!this.currentReport) {
      console.error('Aucun rapport à copier');
      return;
    }

    try {
      const reportText = JSON.stringify(this.currentReport, null, 2);
      navigator.clipboard.writeText(reportText)
        .then(() => {
          // Afficher un message de confirmation
          this._showToast('Rapport copié dans le presse-papiers');
        })
        .catch(err => {
          console.error('Erreur lors de la copie dans le presse-papiers:', err);
        });
    } catch (error) {
      console.error('Erreur lors de la copie du rapport:', error);
    }
  }

  /**
   * Télécharge le rapport au format JSON
   */
  downloadReportAsJson() {
    if (!this.currentReport) {
      console.error('Aucun rapport à télécharger');
      return;
    }

    try {
      const reportText = JSON.stringify(this.currentReport, null, 2);
      const blob = new Blob([reportText], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport-excel-${this.currentReport.fichier.nom.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      
      // Nettoyer
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error('Erreur lors du téléchargement du rapport:', error);
    }
  }

  /**
   * Affiche un message toast
   * @param {string} message - Message à afficher
   */
  _showToast(message) {
    // Créer l'élément toast
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded shadow-lg z-50 animate-fade-in';
    toast.textContent = message;
    
    // Ajouter au document
    document.body.appendChild(toast);
    
    // Supprimer après 3 secondes
    setTimeout(() => {
      toast.classList.add('animate-fade-out');
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  }
  
  /**
   * Affiche un rapport textuel non structuré
   * @param {string} content - Le contenu textuel du rapport
   * @param {string} containerId - L'ID du conteneur où afficher le rapport
   * @param {HTMLElement} [targetElement] - Élément cible optionnel pour l'affichage direct sans créer un nouveau conteneur
   * @private
   */
  _displayTextualReport(content, containerId, targetElement) {
    // Utiliser soit l'élément cible fourni directement, soit rechercher le conteneur par ID
    let container;
    
    if (targetElement) {
      container = targetElement;
    } else if (containerId) {
      container = document.getElementById(containerId);
      if (!container) {
        console.error(`Conteneur ${containerId} non trouvé`);
        return;
      }
    } else {
      console.error('Aucun conteneur valide fourni pour afficher le rapport textuel');
      return;
    }
    
    // Créer l'élément de rapport textuel
    const reportElement = document.createElement('div');
    reportElement.className = 'excel-report bg-white rounded-lg shadow-md p-4 my-4 max-w-full overflow-auto';
    
    // Ajouter l'en-tête du rapport textuel
    reportElement.innerHTML = `
      <div class="report-header border-b border-gray-200 pb-3 mb-4">
        <h2 class="text-xl font-bold flex items-center">
          <svg class="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          Rapport d'analyse Excel
        </h2>
      </div>
    `;
    
    // Détecter et rendre le contenu Markdown
    try {
      // Vérifier si le contenu est probablement au format markdown
      if (content.includes('#') || content.includes('*') || content.includes('|') ||
          content.includes('```') || content.includes('- ') || content.includes('1. ')) {
        
        // Créer un élément pour le markdown rendu
        const contentElement = document.createElement('div');
        contentElement.className = 'markdown-content overflow-auto max-h-[600px] text-gray-700 p-4';
        
        // Rendre le markdown en HTML sécurisé
        contentElement.innerHTML = this._renderMarkdown(content);
        
        // Ajouter un style global pour le markdown une seule fois si nécessaire
        if (!document.getElementById('markdown-styles')) {
          const style = document.createElement('style');
          style.id = 'markdown-styles';
          style.textContent = `
            .markdown-content { font-family: 'Inter', sans-serif; line-height: 1.6; }
            .markdown-content h1, .markdown-content h2, .markdown-content h3, 
            .markdown-content h4, .markdown-content h5, .markdown-content h6 { 
              margin-top: 1.5em; margin-bottom: 0.75em; font-weight: 600; color: #111827; }
            .markdown-content h1 { font-size: 2em; }
            .markdown-content h2 { font-size: 1.75em; }
            .markdown-content h3 { font-size: 1.5em; }
            .markdown-content h4 { font-size: 1.25em; }
            .markdown-content h5 { font-size: 1.125em; }
            .markdown-content h6 { font-size: 1em; }
            .markdown-content p { margin-bottom: 1em; }
            .markdown-content ul, .markdown-content ol { margin-bottom: 1em; padding-left: 2em; }
            .markdown-content li { margin-bottom: 0.5em; }
            .markdown-content hr { border: 0; border-top: 1px solid #e5e7eb; margin: 2em 0; }
            .markdown-content table { border-collapse: collapse; width: 100%; margin-bottom: 1.5em; }
            .markdown-content th, .markdown-content td { border: 1px solid #e2e8f0; padding: 0.75rem; text-align: left; }
            .markdown-content th { background-color: #f8fafc; font-weight: 600; }
            .markdown-content tr:nth-child(even) { background-color: #f9fafb; }
            .markdown-content pre, .markdown-content code { background-color: #f1f5f9; padding: 0.2rem 0.4rem; border-radius: 0.25rem; font-family: 'JetBrains Mono', monospace; }
            .markdown-content pre { padding: 1rem; overflow-x: auto; margin-bottom: 1em; }
            .markdown-content pre code { background-color: transparent; padding: 0; }
            .markdown-content blockquote { border-left: 4px solid #e2e8f0; padding-left: 1rem; color: #4b5563; margin: 1.5em 0; }
            .markdown-content img { max-width: 100%; height: auto; display: block; margin: 1.5em 0; }
            .markdown-content a { color: #2563eb; text-decoration: underline; }
            .markdown-content a:hover { text-decoration: none; }
          `;
          document.head.appendChild(style);
        }
        
        // Ajouter le contenu rendu
        reportElement.appendChild(contentElement);
      } else {
        // Afficher comme texte brut avec formatage de base
        this._displayAsRawText(content, reportElement);
      }
    } catch (error) {
      console.error('Erreur lors du formatage du contenu:', error);
      // Fallback en texte brut
      this._displayAsRawText(content, reportElement);
    }
    
    // Ajouter un bouton pour copier le contenu
    const copyButton = document.createElement('button');
    copyButton.className = 'mt-3 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm flex items-center';
    copyButton.innerHTML = `
      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
      </svg>
      Copier le contenu
    `;
    
    copyButton.addEventListener('click', () => {
      navigator.clipboard.writeText(content)
        .then(() => this._showToast('Contenu copié dans le presse-papiers'))
        .catch(err => console.error('Erreur lors de la copie:', err));
    });
    
    reportElement.appendChild(copyButton);
    container.appendChild(reportElement);
  }
  
  /**
   * Affiche du contenu comme texte brut
   * @param {string} content - Le contenu textuel
   * @param {HTMLElement} container - L'élément conteneur
   * @private
   */
  _displayAsRawText(content, container) {
    const contentElement = document.createElement('pre');
    contentElement.className = 'text-sm text-gray-700 whitespace-pre-wrap overflow-auto max-h-[600px] p-2 bg-gray-50 rounded';
    contentElement.textContent = content;
    
    container.appendChild(contentElement);
  }
  
  /**
   * Rend du contenu Markdown en HTML
   * @param {string} markdownContent - Le contenu au format Markdown
   * @returns {string} - Le HTML généré depuis le Markdown
   * @private
   */
  _renderMarkdown(markdownContent) {
    // Vérifier si marked est disponible
    if (typeof marked === 'undefined') {
      console.warn('La bibliothèque marked n\'est pas disponible. Impossible de rendre le markdown.');
      return markdownContent;
    }
    
    try {
      // Configuration de marked avec options optimisées pour Excel
      const renderer = new marked.Renderer();
      
      // Améliorer le rendu des tableaux pour les données Excel
      renderer.table = function(header, body) {
        return '<table class="excel-markdown-table">' + 
               '<thead>' + header + '</thead>' + 
               '<tbody>' + body + '</tbody>' + 
               '</table>';
      };
      
      // Améliorer le rendu des titres avec des ancres
      renderer.heading = function(text, level) {
        const escapedText = text.toLowerCase().replace(/[^\w]+/g, '-');
        return `<h${level} id="${escapedText}" class="excel-markdown-heading excel-markdown-heading-${level}">
                  <a class="anchor" href="#${escapedText}">
                    <span class="header-link"></span>
                  </a>
                  ${text}
                </h${level}>`;
      };
      
      // Améliorer le rendu des listes
      renderer.list = function(body, ordered, start) {
        const type = ordered ? 'ol' : 'ul';
        const startAttr = ordered && start !== 1 ? ` start="${start}"` : '';
        return `<${type}${startAttr} class="excel-markdown-list">${body}</${type}>`;
      };
      
      // Améliorer le rendu des éléments de liste
      renderer.listitem = function(text) {
        return `<li class="excel-markdown-list-item">${text}</li>`;
      };
      
      // Améliorer le rendu des blocs de code
      renderer.code = function(code, language) {
        return `<pre class="excel-markdown-code"><code class="language-${language || 'plaintext'}">${code}</code></pre>`;
      };
      
      // Améliorer le rendu des paragraphes
      renderer.paragraph = function(text) {
        return `<p class="excel-markdown-paragraph">${text}</p>`;
      };
      
      // Configuration des options
      const markedOptions = {
        renderer: renderer,
        gfm: true,             // GitHub Flavored Markdown
        breaks: true,         // Convertir les retours à la ligne en <br>
        headerIds: true,      // Générer des IDs pour les titres
        mangle: false,        // Désactiver le mangle pour les IDs d'en-tête
        pedantic: false,      // Ne pas suivre les spécifications pedantic
        sanitize: false,      // Ne pas assainir le contenu
        smartLists: true,     // Utiliser des listes intelligentes
        smartypants: true,    // Utiliser des guillemets intelligents
      };
      
      // Détecter les séparateurs triples et les remplacer par des HR appropriés
      // Parfois les --- ne sont pas correctement interprétés comme des HR
      const preprocessedContent = markdownContent
        .replace(/\n-{3,}\n/g, '\n\n---\n\n') // Assurer que les --- sont sur leurs propres lignes
        .replace(/\n\s*\n-{3,}\s*\n\s*\n/g, '\n\n---\n\n') // Nettoyer les espaces autour des ---
        .replace(/\*\*\*/g, '<hr class="excel-markdown-hr">'); // Remplacer *** par des HR aussi
      
      // Ajouter un CSS spécifique pour l'affichage du Markdown
      const markdownStyles = `
        <style>
          .excel-markdown-heading { margin-top: 1.5em; margin-bottom: 0.75em; font-weight: 600; color: #111827; }
          .excel-markdown-heading-1 { font-size: 1.75em; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.3em; }
          .excel-markdown-heading-2 { font-size: 1.5em; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.3em; }
          .excel-markdown-heading-3 { font-size: 1.25em; }
          .excel-markdown-heading-4 { font-size: 1.125em; }
          .excel-markdown-heading .anchor { visibility: hidden; float: left; margin-left: -1.2em; padding-right: 0.2em; }
          .excel-markdown-heading:hover .anchor { visibility: visible; }
          .excel-markdown-paragraph { margin-bottom: 1em; line-height: 1.6; }
          .excel-markdown-list { margin-bottom: 1em; padding-left: 2em; }
          .excel-markdown-list-item { margin-bottom: 0.5em; }
          .excel-markdown-hr { height: 0.25em; background-color: #e5e7eb; border: none; margin: 2em 0; }
          .excel-markdown-table { border-collapse: collapse; width: 100%; margin-bottom: 1.5em; }
          .excel-markdown-table th, .excel-markdown-table td { border: 1px solid #e2e8f0; padding: 0.75rem; text-align: left; }
          .excel-markdown-table th { background-color: #f8fafc; font-weight: 600; }
          .excel-markdown-table tr:nth-child(even) { background-color: #f9fafb; }
          .excel-markdown-blockquote { border-left: 4px solid #e2e8f0; padding-left: 1rem; color: #4b5563; margin: 1.5em 0; }
          .excel-markdown-code { background-color: #f1f5f9; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; margin: 1em 0; }
          .excel-markdown-link { color: #2563eb; text-decoration: none; }
          .excel-markdown-link:hover { text-decoration: underline; }
          .excel-markdown-image { max-width: 100%; height: auto; display: block; margin: 1em auto; }
        </style>
      `;
      
      // Rendre le markdown en HTML
      return markdownStyles + marked.parse(preprocessedContent, markedOptions);
    } catch (error) {
      console.error('Erreur lors du rendu du markdown:', error);
      return `<div class="p-3 bg-red-50 text-red-700 rounded">
        <p>Erreur lors du rendu du markdown</p>
        <pre class="mt-2 text-sm bg-red-100 p-2 overflow-auto">${markdownContent}</pre>
      </div>`;
    }
  }

  /**
   * Affiche le rapport complet dans une fenêtre modale
   * @param {Object} report - Le rapport structuré
   * @private
   */
  _showFullReportModal(report) {
    // Créer l'élément modal
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'bg-white rounded-lg shadow-xl w-11/12 max-w-4xl h-5/6 flex flex-col';
    
    // En-tête de la modal
    const modalHeader = document.createElement('div');
    modalHeader.className = 'px-6 py-4 border-b border-gray-200 flex justify-between items-center';
    modalHeader.innerHTML = `
      <h2 class="text-xl font-bold">Rapport d'analyse complet: ${report.fichier?.nom || 'Excel'}</h2>
      <button class="close-modal-btn text-gray-500 hover:text-gray-700">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    `;
    
    // Corps de la modal avec défilement
    const modalBody = document.createElement('div');
    modalBody.className = 'flex-1 p-6 overflow-auto';
    
    // Reproduire le contenu du rapport
    if (typeof report === 'string') {
      // Si c'est une chaîne (markdown), utiliser la fonction d'affichage textuel
      this._displayTextualReport(report, null, modalBody);
    } else if (report && report.content && typeof report.content === 'string') {
      // Si c'est un objet avec une propriété content qui est une chaîne
      this._displayTextualReport(report.content, null, modalBody);
    } else {
      // Sinon, c'est un rapport structuré
      modalBody.innerHTML = this._createReportContent(report);
    }
    
    // Pied de page de la modal
    const modalFooter = document.createElement('div');
    modalFooter.className = 'px-6 py-4 border-t border-gray-200 flex justify-end space-x-2';
    modalFooter.innerHTML = `
      <button class="copy-modal-report-btn px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm">
        Copier le rapport
      </button>
      <button class="close-modal-btn px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md text-sm">
        Fermer
      </button>
    `;
    
    // Assembler la modal
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modalContent.appendChild(modalFooter);
    modalOverlay.appendChild(modalContent);
    
    // Ajouter au document
    document.body.appendChild(modalOverlay);
    document.body.style.overflow = 'hidden'; // Empêcher le défilement du fond
    
    // Initialiser les graphiques dans la modal
    this._initializeCharts(report);
    
    // Écouteurs d'événements
    const closeModal = () => {
      document.body.removeChild(modalOverlay);
      document.body.style.overflow = ''; // Rétablir le défilement
    };
    
    // Fermer avec le bouton
    modalOverlay.querySelectorAll('.close-modal-btn').forEach(btn => {
      btn.addEventListener('click', closeModal);
    });
    
    // Fermer en cliquant en dehors
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
    
    // Bouton de copie
    modalOverlay.querySelector('.copy-modal-report-btn').addEventListener('click', () => {
      navigator.clipboard.writeText(JSON.stringify(report, null, 2))
        .then(() => this._showToast('Rapport copié dans le presse-papiers'))
        .catch(err => console.error('Erreur lors de la copie:', err));
    });
  }

  /**
   * Génère le HTML pour la fenêtre de visualisation du rapport
   * @param {Object} report - Le rapport structuré
   * @param {string} fileName - Nom du fichier Excel
   * @returns {string} Le HTML de la fenêtre
   * @private
   */
  _generateReportViewerHTML(report, fileName) {
    // Convertir le rapport en JSON string pour l'insérer dans le script
    const reportJson = JSON.stringify(report).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
    // @ts-ignore - Suppress TypeScript linting errors for HTML template string
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport Excel - ${fileName}</title>
  
  <!-- Tailwind CSS -->
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  
  <!-- Font Awesome -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
  
  <!-- Chart.js -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js"></script>
  
  <!-- html2pdf.js -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
  
  <style>
    /* Styles de base */
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f9fafb;
      padding: 0;
      margin: 0;
    }
    
    /* En-tête fixe */
    header {
      position: sticky;
      top: 0;
      background-color: white;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      z-index: 10;
    }
    
    /* Conteneur principal */
    .report-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    
    /* Section */
    .report-section {
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      margin-bottom: 20px;
      overflow: hidden;
    }
    
    /* En-tête de section */
    .section-header {
      padding: 15px 20px;
      background-color: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
    }
    
    /* Contenu de section */
    .section-content {
      padding: 20px;
    }
    
    /* Graphique */
    .chart-container {
      height: 300px;
      margin-top: 20px;
    }
    
    /* Tableau */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    
    th, td {
      border: 1px solid #e2e8f0;
      padding: 10px;
      text-align: left;
    }
    
    th {
      background-color: #f8fafc;
      font-weight: 600;
    }
    
    tr:nth-child(even) {
      background-color: #f9fafb;
    }
    
    /* Styles d'animation */
    .section-content {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease-out;
    }
    
    .section-content.open {
      max-height: 2000px;
    }
    
    /* Boutons */
    .btn {
      display: inline-block;
      padding: 8px 16px;
      font-size: 14px;
      font-weight: 500;
      text-align: center;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .btn-primary {
      background-color: #3b82f6;
      color: white;
    }
    
    .btn-primary:hover {
      background-color: #2563eb;
    }
    
    .btn-secondary {
      background-color: #64748b;
      color: white;
    }
    
    .btn-secondary:hover {
      background-color: #475569;
    }
    
    .btn-success {
      background-color: #10b981;
      color: white;
    }
    
    .btn-success:hover {
      background-color: #059669;
    }
    
    /* Toast */
    .toast {
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 10px 20px;
      background-color: #10b981;
      color: white;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      opacity: 0;
      transition: opacity 0.3s;
      z-index: 100;
    }
    
    .toast.visible {
      opacity: 1;
    }
  </style>
</head>
<body>
  <header class="py-4 px-6">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold text-gray-800">Rapport Excel - ${fileName}</h1>
      <div class="flex space-x-2">
        <button id="download-pdf" class="btn btn-primary">
          <i class="fas fa-file-pdf mr-2"></i> Exporter en PDF
        </button>
        <button id="download-json" class="btn btn-secondary">
          <i class="fas fa-file-code mr-2"></i> Exporter en JSON
        </button>
        <button id="print-report" class="btn btn-secondary">
          <i class="fas fa-print mr-2"></i> Imprimer
        </button>
      </div>
    </div>
  </header>
  
  <div id="report-container" class="report-container"></div>
  
  <div id="toast" class="toast"></div>
  
  <script>
    // Données du rapport (JSON sécurisé)
    const report = JSON.parse('${reportJson}');
    
    // Références aux éléments DOM
    const reportContainer = document.getElementById('report-container');
    const downloadPdfBtn = document.getElementById('download-pdf');
    const downloadJsonBtn = document.getElementById('download-json');
    const printReportBtn = document.getElementById('print-report');
    const toast = document.getElementById('toast');
    
    // Garder une référence aux instances de graphiques
    const chartInstances = [];
    
    // Fonction pour afficher le rapport
    function displayReport() {
      // Vérifier que le rapport est valide
      if (!report || !report.report) {
        reportContainer.innerHTML = '<div class="p-4 bg-red-100 text-red-700 rounded">Erreur: Rapport invalide</div>';
        return;
      }
      
      // Créer l'en-tête du rapport
      const headerHtml = '<div class="report-section mb-6">'
        + '<div class="section-content open p-6">'
        + '<h2 class="text-xl font-bold mb-4">' + (report.report.title || 'Analyse de données Excel') + '</h2>'
        + '<p class="text-gray-700">'
        + '<strong>Fichier:</strong> ' + (report.fileName || '') + '<br>'
        + '<strong>Feuille:</strong> ' + (report.sheetName || '') + '<br>'
        + '<strong>Généré le:</strong> ' + new Date().toLocaleString()
        + '</p>'
        + '</div>'
        + '</div>';
      
      // Créer le contenu des sections
      let sectionsHtml = '';
      const sections = report.report.sections || {};
      
      // Parcourir les sections
      Object.entries(sections).forEach(([sectionName, sectionData], index) => {
        const sectionId = 'section-' + index;
        const chartId = 'chart-' + index;
        
        // Déterminer si la section peut avoir un graphique
        const hasNumericData = checkForNumericData(sectionData);
        
        let sectionHtml = '<div class="report-section" id="' + sectionId + '-container">';
        sectionHtml += '<div class="section-header" onclick="toggleSection(\'' + sectionId + '\')">';
        sectionHtml += '<span>' + sectionName + '</span>';
        sectionHtml += '<span class="toggle-icon"><i class="fas fa-chevron-down"></i></span>';
        sectionHtml += '</div>';
        sectionHtml += '<div class="section-content" id="' + sectionId + '">';
        sectionHtml += formatSectionData(sectionData);
        
        if (hasNumericData) {
          sectionHtml += '<div class="flex justify-end mt-2">';
          sectionHtml += '<button class="btn btn-secondary btn-sm" onclick="toggleChart(\'' + chartId + '\', \'' + sectionId + '\')">'
          sectionHtml += '<i class="fas fa-chart-bar mr-1"></i> Afficher/Masquer le graphique';
          sectionHtml += '</button>';
          sectionHtml += '</div>';
          sectionHtml += '<div class="chart-container hidden" id="' + chartId + '-container">';
          sectionHtml += '<canvas id="' + chartId + '"></canvas>';
          sectionHtml += '</div>';
        }
        
        sectionHtml += '</div></div>';
        
        sectionsHtml += sectionHtml;
      });
      
      // Ajouter le contenu à la page
      reportContainer.innerHTML = headerHtml + sectionsHtml;
      
      // Initialiser les graphiques après que le DOM soit mis à jour
      setTimeout(() => {
        initializeCharts(sections);
        
        // Ouvrir la première section par défaut
        const firstSection = document.querySelector('.section-content');
        if (firstSection) {
          firstSection.classList.add('open');
        }
      }, 100);
    }
    
    // Fonction pour formater les données d'une section
    function formatSectionData(data) {
      if (Array.isArray(data)) {
        // Formater comme une liste
        let result = '<ul class="list-disc pl-5 space-y-1">';
        data.forEach(item => {
          result += '<li>' + formatValue(item) + '</li>';
        });
        result += '</ul>';
        return result;
      } else if (typeof data === 'object' && data !== null) {
        // Formater comme un tableau
        let result = '<table><tbody>';
        Object.entries(data).forEach(([key, value]) => {
          result += '<tr><th class="w-1/3">' + key + '</th><td>' + formatValue(value) + '</td></tr>';
        });
        result += '</tbody></table>';
        return result;
      } else {
        // Formater comme du texte simple
        return '<p>' + formatValue(data) + '</p>';
      }
    }
    
    // Fonction pour formater une valeur
    function formatValue(value) {
      if (value === null || value === undefined) {
        return '<span class="text-gray-400">Non disponible</span>';
      } else if (Array.isArray(value)) {
        let result = '<ul class="list-disc pl-5 space-y-1">';
        value.forEach(item => {
          result += '<li>' + formatValue(item) + '</li>';
        });
        result += '</ul>';
        return result;
      } else if (typeof value === 'object') {
        let result = '<table class="w-full"><tbody>';
        Object.entries(value).forEach(([key, val]) => {
          result += '<tr><th class="w-1/3">' + key + '</th><td>' + formatValue(val) + '</td></tr>';
        });
        result += '</tbody></table>';
        return result;
      } else if (typeof value === 'number') {
        // Formater les nombres avec 2 décimales si nécessaire
        return Number.isInteger(value) ? value.toString() : value.toFixed(2);
      } else {
        return value.toString();
      }
    }
    
    // Fonction pour vérifier si une section contient des données numériques
    function checkForNumericData(data) {
      if (Array.isArray(data)) {
        return data.some(item => typeof item === 'number' || 
          (typeof item === 'object' && item !== null && Object.values(item).some(val => typeof val === 'number')));
      } else if (typeof data === 'object' && data !== null) {
        return Object.values(data).some(value => 
          typeof value === 'number' || 
          (Array.isArray(value) && value.some(item => typeof item === 'number')) ||
          (typeof value === 'object' && value !== null && Object.values(value).some(val => typeof val === 'number')));
      }
      return false;
    }
    
    // Fonction pour initialiser les graphiques
    function initializeCharts(sections) {
      Object.entries(sections).forEach(([sectionName, sectionData], index) => {
        const chartId = 'chart-' + index;
        const chartCanvas = document.getElementById(chartId);
        
        if (chartCanvas && checkForNumericData(sectionData)) {
          const chartData = extractChartData(sectionData);
          
          if (chartData.labels.length > 0 && chartData.datasets.length > 0) {
            const chart = new Chart(chartCanvas, {
              type: 'bar',
              data: {
                labels: chartData.labels,
                datasets: chartData.datasets
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  title: {
                    display: true,
                    text: sectionName,
                    font: {
                      size: 16,
                      weight: 'bold'
                    }
                  },
                  legend: {
                    position: 'top'
                  }
                }
              }
            });
            
            chartInstances.push(chart);
          }
        }
      });
    }
    
    // Fonction pour extraire les données pour les graphiques
    function extractChartData(data) {
      const result = {
        labels: [],
        datasets: []
      };
      
      if (Array.isArray(data)) {
        // Si c'est un tableau d'objets avec des propriétés communes
        if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
          const firstItem = data[0];
          const numericProps = Object.keys(firstItem).filter(key => typeof firstItem[key] === 'number');
          
          if (numericProps.length > 0) {
            // Utiliser une propriété non numérique comme label si disponible
            const labelProp = Object.keys(firstItem).find(key => typeof firstItem[key] === 'string');
            
            if (labelProp) {
              result.labels = data.map(item => item[labelProp]);
              
              numericProps.forEach((prop, i) => {
                const color = getChartColor(i);
                result.datasets.push({
                  label: prop,
                  data: data.map(item => item[prop]),
                  backgroundColor: color.bg,
                  borderColor: color.border,
                  borderWidth: 1
                });
              });
            }
          }
        } else if (data.length > 0 && typeof data[0] === 'number') {
          // Si c'est un tableau de nombres
          result.labels = data.map((_, i) => 'Item ' + (i + 1));
          const color = getChartColor(0);
          result.datasets.push({
            label: 'Valeur',
            data: data,
            backgroundColor: color.bg,
            borderColor: color.border,
            borderWidth: 1
          });
        }
      } else if (typeof data === 'object' && data !== null) {
        // Si c'est un objet avec des valeurs numériques
        const entries = Object.entries(data);
        const numericEntries = entries.filter(([_, value]) => typeof value === 'number');
        
        if (numericEntries.length > 0) {
          result.labels = numericEntries.map(([key, _]) => key);
          const color = getChartColor(0);
          result.datasets.push({
            label: 'Valeur',
            data: numericEntries.map(([_, value]) => value),
            backgroundColor: color.bg,
            borderColor: color.border,
            borderWidth: 1
          });
        }
      }
      
      return result;
    }
    
    // Fonction pour obtenir des couleurs pour les graphiques
    function getChartColor(index) {
      const colors = [
        { bg: 'rgba(75, 192, 192, 0.2)', border: 'rgba(75, 192, 192, 1)' },
        { bg: 'rgba(54, 162, 235, 0.2)', border: 'rgba(54, 162, 235, 1)' },
        { bg: 'rgba(255, 99, 132, 0.2)', border: 'rgba(255, 99, 132, 1)' },
        { bg: 'rgba(255, 206, 86, 0.2)', border: 'rgba(255, 206, 86, 1)' },
        { bg: 'rgba(153, 102, 255, 0.2)', border: 'rgba(153, 102, 255, 1)' },
        { bg: 'rgba(255, 159, 64, 0.2)', border: 'rgba(255, 159, 64, 1)' }
      ];
      return colors[index % colors.length];
    }
    
    // Fonction pour basculer l'affichage d'une section
    function toggleSection(sectionId) {
      const section = document.getElementById(sectionId);
      if (section) {
        section.classList.toggle('open');
        
        // Mettre à jour l'icône
        const container = document.getElementById(sectionId + '-container');
        const icon = container.querySelector('.toggle-icon i');
        if (section.classList.contains('open')) {
          icon.className = 'fas fa-chevron-up';
        } else {
          icon.className = 'fas fa-chevron-down';
        }
      }
    }
    
    // Fonction pour basculer l'affichage d'un graphique
    function toggleChart(chartId, sectionId) {
      const chartContainer = document.getElementById(chartId + '-container');
      if (chartContainer) {
        chartContainer.classList.toggle('hidden');
        
        // Mettre à jour les graphiques si nécessaire
        if (!chartContainer.classList.contains('hidden')) {
          chartInstances.forEach(chart => {
            if (chart.canvas.id === chartId) {
              chart.update();
            }
          });
        }
      }
    }
    
    // Fonction pour exporter le rapport en PDF
    downloadPdfBtn.addEventListener('click', function() {
      // Afficher un message de chargement
      showToast('Génération du PDF en cours...', 'info');
      
      // Cloner le conteneur pour éviter de modifier l'original
      const element = reportContainer.cloneNode(true);
      
      // Options pour html2pdf
      const options = {
        margin: 10,
        filename: 'rapport-excel-' + (report.fileName || 'export') + '.pdf',
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, logging: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      // Générer le PDF
      html2pdf().from(element).set(options).save()
        .then(() => {
          showToast('PDF généré avec succès!', 'success');
        })
        .catch(error => {
          console.error('Erreur lors de la génération du PDF:', error);
          showToast('Erreur lors de la génération du PDF', 'error');
        });
    });
    
    // Fonction pour exporter le rapport en JSON
    downloadJsonBtn.addEventListener('click', function() {
      const jsonString = JSON.stringify(report, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = 'rapport-excel-' + (report.fileName || 'export') + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showToast('Rapport exporté en JSON avec succès!', 'success');
    });
    
    // Fonction pour imprimer le rapport
    printReportBtn.addEventListener('click', function() {
      window.print();
    });
    
    // Fonction pour afficher un message toast
    function showToast(message, type) {
      toast.textContent = message;
      toast.className = 'toast visible';
      
      // Ajouter la classe de couleur en fonction du type
      if (type === 'error') {
        toast.style.backgroundColor = '#ef4444';
      } else if (type === 'info') {
        toast.style.backgroundColor = '#3b82f6';
      } else {
        toast.style.backgroundColor = '#10b981';
      }
      
      // Masquer le toast après 3 secondes
      setTimeout(() => {
        toast.classList.remove('visible');
      }, 3000);
    }
    
    // Afficher le rapport au chargement
    window.onload = displayReport;
  </script>
</body>
</html>`;
  }

  /**
   * Crée et affiche une fenêtre de visualisation pour le rapport
   * @param {Object} report - Le rapport structuré
   * @param {string} fileName - Nom du fichier Excel
   */
  showReportViewerWindow(report, fileName) {
    // Créer une nouvelle fenêtre
    const reportWindow = window.open('', '_blank', 'width=1200,height=800');
    
    // Générer le HTML et l'écrire dans la fenêtre
    const html = this._generateReportViewerHTML(report, fileName);
    reportWindow.document.write(html);
    
    // Fermer le document pour terminer le chargement
    reportWindow.document.close();
  }

  /**
   * Génère le HTML pour la fenêtre de visualisation du rapport
   * @param {Object} report - Le rapport structuré
   * @param {string} fileName - Nom du fichier Excel
   * @returns {string} Le HTML de la fenêtre
   * @private
   */
}

// Exporter la classe pour qu'elle soit disponible dans d'autres modules
export default ExcelReportViewer;
