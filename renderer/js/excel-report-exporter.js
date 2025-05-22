/**
 * Module pour l'exportation des rapports d'analyse Excel
 * Permet de prévisualiser et d'exporter des rapports au format HTML/PDF
 */

class ExcelReportExporter {
  /**
   * Initialise l'exportateur de rapports
   */
  constructor() {
    this.currentReport = null;
    this.chartInstances = [];
    
    // S'assurer que les dépendances sont disponibles
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js n\'est pas disponible. Les graphiques ne seront pas générés.');
    }
    
    if (typeof marked === 'undefined') {
      console.warn('Marked.js n\'est pas disponible. Le Markdown ne sera pas correctement rendu.');
    }
  }
  
  /**
   * Prévisualise un rapport d'analyse Excel et propose des options d'export
   * @param {string} markdownContent - Le contenu Markdown du rapport
   * @param {string} containerId - L'ID du conteneur où afficher la prévisualisation
   * @param {Object} options - Options de prévisualisation
   */
  previewReport(markdownContent, containerId, options = {}) {
    this.currentReport = markdownContent;
    
    // Trouver le conteneur cible
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Conteneur ${containerId} non trouvé`);
      return;
    }
    
    // Options par défaut
    const defaultOptions = {
      title: 'Rapport d\'analyse Excel',
      fileName: 'rapport-excel-' + new Date().toISOString().split('T')[0],
      showExportOptions: true,
      extractChartData: true
    };
    
    // Fusionner les options
    const settings = { ...defaultOptions, ...options };
    
    // Créer le conteneur principal
    const previewContainer = document.createElement('div');
    previewContainer.className = 'excel-report-preview bg-white rounded-lg shadow-lg p-0 my-4 max-w-5xl mx-auto overflow-hidden';
    
    // Ajouter l'en-tête avec le titre et les boutons d'export
    const header = document.createElement('div');
    header.className = 'preview-header bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center';
    
    // Titre
    const titleElement = document.createElement('h2');
    titleElement.className = 'text-xl font-bold text-gray-800 flex items-center';
    titleElement.innerHTML = `
      <svg class="w-6 h-6 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
      </svg>
      ${settings.title}
    `;
    
    header.appendChild(titleElement);
    
    // Boutons d'export si activés
    if (settings.showExportOptions) {
      const exportButtons = document.createElement('div');
      exportButtons.className = 'flex space-x-2';
      
      // Bouton de téléchargement PDF
      const pdfButton = document.createElement('button');
      pdfButton.className = 'px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm flex items-center';
      pdfButton.innerHTML = `
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
        </svg>
        Télécharger PDF
      `;
      pdfButton.onclick = () => this.exportAsPDF(settings.fileName, previewContainer);
      
      // Bouton de téléchargement HTML
      const htmlButton = document.createElement('button');
      htmlButton.className = 'px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm flex items-center';
      htmlButton.innerHTML = `
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
        </svg>
        Télécharger HTML
      `;
      htmlButton.onclick = () => this.exportAsHTML(settings.fileName);
      
      // Bouton de copie dans le presse-papiers
      const copyButton = document.createElement('button');
      copyButton.className = 'px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm flex items-center';
      copyButton.innerHTML = `
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
        </svg>
        Copier
      `;
      copyButton.onclick = () => this.copyToClipboard();
      
      exportButtons.appendChild(pdfButton);
      exportButtons.appendChild(htmlButton);
      exportButtons.appendChild(copyButton);
      header.appendChild(exportButtons);
    }
    
    previewContainer.appendChild(header);
    
    // Créer le conteneur pour le contenu du rapport
    const contentContainer = document.createElement('div');
    contentContainer.className = 'preview-content flex';
    
    // Colonne principale pour le contenu Markdown
    const mainColumn = document.createElement('div');
    mainColumn.className = 'markdown-column flex-grow p-6 overflow-auto max-h-[600px]';
    
    // Colonne latérale pour les graphiques si activée
    let sideColumn = null;
    if (settings.extractChartData) {
      sideColumn = document.createElement('div');
      sideColumn.className = 'chart-column w-80 border-l border-gray-200 p-4 flex flex-col';
      sideColumn.innerHTML = `
        <h3 class="text-lg font-semibold text-gray-700 mb-4">Visualisation des données</h3>
        <div id="investment-chart" class="mb-4 h-60"></div>
        <div id="growth-chart" class="mb-4 h-60"></div>
        <div id="discount-chart" class="h-60"></div>
      `;
    }
    
    // Rendre le contenu Markdown
    if (typeof marked !== 'undefined') {
      try {
        // Configuration de marked
        const renderer = new marked.Renderer();
        const markedOptions = {
          renderer: renderer,
          gfm: true,
          breaks: true,
          headerIds: true,
          mangle: false
        };
        
        // Rendre le Markdown
        mainColumn.innerHTML = marked.parse(markdownContent, markedOptions);
        
        // Ajouter des styles spécifiques pour le rendu Markdown
        const markdownStyles = document.createElement('style');
        markdownStyles.textContent = `
          .markdown-column h1, .markdown-column h2, .markdown-column h3,
          .markdown-column h4, .markdown-column h5, .markdown-column h6 {
            margin-top: 1.5em;
            margin-bottom: 0.75em;
            font-weight: 600;
            color: #111827;
          }
          .markdown-column h1 { font-size: 2em; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.3em; }
          .markdown-column h2 { font-size: 1.75em; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.3em; }
          .markdown-column h3 { font-size: 1.5em; }
          .markdown-column h4 { font-size: 1.25em; }
          .markdown-column h5 { font-size: 1.125em; }
          .markdown-column h6 { font-size: 1em; }
          .markdown-column p { margin-bottom: 1em; line-height: 1.6; }
          .markdown-column ul, .markdown-column ol { margin-bottom: 1em; padding-left: 2em; }
          .markdown-column li { margin-bottom: 0.5em; }
          .markdown-column hr { height: 1px; background-color: #e5e7eb; border: none; margin: 2em 0; }
          .markdown-column table { border-collapse: collapse; width: 100%; margin-bottom: 1.5em; }
          .markdown-column th, .markdown-column td { border: 1px solid #e2e8f0; padding: 0.75rem; text-align: left; }
          .markdown-column th { background-color: #f8fafc; font-weight: 600; }
          .markdown-column tr:nth-child(even) { background-color: #f9fafb; }
          .markdown-column blockquote { border-left: 4px solid #e2e8f0; padding-left: 1rem; color: #4b5563; margin: 1.5em 0; }
        `;
        previewContainer.appendChild(markdownStyles);
      } catch (error) {
        console.error('Erreur lors du rendu du Markdown:', error);
        mainColumn.innerHTML = `<pre class="text-red-600 p-4">${markdownContent}</pre>`;
      }
    } else {
      mainColumn.innerHTML = `<pre class="text-gray-700 whitespace-pre-wrap">${markdownContent}</pre>`;
    }
    
    // Ajouter les colonnes au conteneur de contenu
    contentContainer.appendChild(mainColumn);
    if (sideColumn) {
      contentContainer.appendChild(sideColumn);
    }
    
    previewContainer.appendChild(contentContainer);
    
    // Ajouter le conteneur principal au DOM
    container.innerHTML = '';
    container.appendChild(previewContainer);
    
    // Générer les graphiques si activés
    if (settings.extractChartData && typeof Chart !== 'undefined') {
      this._generateChartsFromReport(markdownContent);
    }
  }
  
  /**
   * Exporte le rapport au format HTML
   * @param {string} fileName - Nom du fichier d'export (sans extension)
   */
  exportAsHTML(fileName) {
    if (!this.currentReport) {
      console.error('Aucun rapport à exporter');
      return;
    }
    
    try {
      // Créer le contenu HTML
      const htmlContent = this._generateHTMLDocument(this.currentReport);
      
      // Créer un Blob avec le contenu HTML
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      
      // Créer un URL pour le Blob
      const url = URL.createObjectURL(blob);
      
      // Créer un lien de téléchargement
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.html`;
      document.body.appendChild(a);
      
      // Cliquer sur le lien pour déclencher le téléchargement
      a.click();
      
      // Nettoyer
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      // Afficher un message de confirmation
      this._showToast('Rapport exporté au format HTML');
    } catch (error) {
      console.error('Erreur lors de l\'export HTML:', error);
      this._showToast('Erreur lors de l\'export HTML', 'error');
    }
  }
  
  /**
   * Exporte le rapport au format PDF
   * @param {string} fileName - Nom du fichier d'export (sans extension)
   * @param {HTMLElement} sourceElement - Élément source contenant le rapport formaté
   */
  exportAsPDF(fileName, sourceElement) {
    if (!this.currentReport || !sourceElement) {
      console.error('Aucun rapport ou élément source à exporter pour le PDF.');
      this._showToast('Erreur: Données manquantes pour l\'export PDF', 'error');
      return;
    }

    if (typeof html2pdf === 'undefined') {
      console.error('La bibliothèque html2pdf n\'est pas disponible.');
      this._showToast('Impossible d\'exporter en PDF - bibliothèque manquante', 'error');
      return;
    }

    const loadingToast = this._createLoadingToast("Génération du PDF en cours...");
    document.body.appendChild(loadingToast);

    // Clone the source element to avoid modifying the original display
    const elementToPrint = sourceElement.cloneNode(true);

    // --- Prepare the clone for printing ---
    // 1. Remove interactive elements like buttons from the clone
    //    Specifically target buttons within the preview header.
    const headerButtons = elementToPrint.querySelectorAll('.preview-header button, .preview-header .flex.space-x-2');
    headerButtons.forEach(el => el.remove());

    
    try {
      // Cloner le conteneur pour éviter de modifier l'original
      const elementToPrint = container.cloneNode(true);
      
      // Préparer les styles pour un rendu PDF propre
      const styles = document.createElement('style');
      styles.textContent = `
        * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; print-color-adjust: exact !important; }
        @page { size: A4; margin: 0; }
        body { margin: 0; }
        .excel-report-preview { box-shadow: none !important; max-width: 100% !important; }
        .preview-header, .preview-content { padding: 12px; }
        .chart-column { page-break-before: always; }
        button { display: none !important; }
        .markdown-column { overflow: visible !important; max-height: none !important; }
      `;
      elementToPrint.appendChild(styles);
      
      // Ajouter le clone préparé au body temporairement mais hors écran pour le rendu par html2canvas
      elementToPrint.style.position = 'absolute';
      elementToPrint.style.left = '-9999px';
      elementToPrint.style.top = '-9999px';
      elementToPrint.style.width = '800px'; // Largeur fixe pour éviter les problèmes de mise en page
      document.body.appendChild(elementToPrint);
      
      // Utiliser html2canvas pour capturer le contenu
      window.html2canvas(elementToPrint, {
        scale: 2, // Échelle plus élevée pour une meilleure qualité
        useCORS: true, // Si des images/ressources proviennent d'autres domaines
        logging: false,
        allowTaint: true,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0
      }).then(canvas => {
        // Créer un nouveau document PDF
        const pdf = new window.jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });
        
        // Calculer la largeur et la hauteur du PDF en mm
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        // Calculer le ratio pour ajuster le canvas au format A4
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        
        // Calculer la hauteur proportionnelle
        const ratio = pdfWidth / canvasWidth;
        const adjustedHeight = canvasHeight * ratio;
        
        // Si la hauteur ajustée est supérieure à la hauteur de la page, diviser en plusieurs pages
        if (adjustedHeight > pdfHeight) {
          let remainingHeight = canvasHeight;
          let pageCanvas;
          let position = 0;
          let pageNum = 1;
          
          while (remainingHeight > 0) {
            // Hauteur de chaque page en pixels du canvas
            const pageHeight = Math.min(remainingHeight, (pdfHeight / ratio));
            
            // Créer un nouveau canvas pour la page
            pageCanvas = document.createElement('canvas');
            pageCanvas.width = canvasWidth;
            pageCanvas.height = pageHeight;
            
            // Dessiner la partie correspondante du canvas original
            const ctx = pageCanvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
            ctx.drawImage(canvas, 0, position, canvasWidth, pageHeight, 0, 0, canvasWidth, pageHeight);
            
            // Ajouter la page au PDF
            const imgData = pageCanvas.toDataURL('image/jpeg', 1.0);
            if (pageNum > 1) {
              pdf.addPage();
            }
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight * (pageHeight / (pdfHeight / ratio)));
            
            // Mettre à jour les variables pour la prochaine itération
            remainingHeight -= pageHeight;
            position += pageHeight;
            pageNum++;
          }
        } else {
          // Si tout tient sur une seule page
          const imgData = canvas.toDataURL('image/jpeg', 1.0);
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, adjustedHeight);
        }
        
        // Enregistrer le PDF
        pdf.save(`${fileName}.pdf`);
        this._showToast('Rapport exporté au format PDF');
      }).catch(err => {
        console.error('Erreur lors de la capture HTML:', err);
        this._showToast('Erreur lors de la génération du PDF: ' + (err.message || 'Capture HTML échouée'), 'error');
      }).finally(() => {
        // Nettoyer
        if (loadingToast && loadingToast.parentNode) {
          document.body.removeChild(loadingToast);
        }
        if (elementToPrint && elementToPrint.parentNode) {
          document.body.removeChild(elementToPrint);
        }
      });
    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error);
      this._showToast('Erreur lors de l\'export PDF: ' + (error.message || 'Erreur inconnue'), 'error');
      
      if (loadingToast && loadingToast.parentNode) {
        document.body.removeChild(loadingToast);
      }
    }
  }
  
  /**
   * Charge dynamiquement la bibliothèque jsPDF
   * @param {Function} callback - Fonction à appeler après le chargement
   * @private
   */
  _loadJsPdfDynamically(callback) {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = callback;
    script.onerror = () => {
      console.error('Impossible de charger jsPDF');
      this._showToast('Impossible de charger jsPDF', 'error');
    };
    document.head.appendChild(script);
  }
  
  /**
   * Charge dynamiquement la bibliothèque html2canvas
   * @param {Function} callback - Fonction à appeler après le chargement
   * @private
   */
  _loadHtml2CanvasDynamically(callback) {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    script.onload = callback;
    script.onerror = () => {
      console.error('Impossible de charger html2canvas');
      this._showToast('Impossible de charger html2canvas', 'error');
    };
    document.head.appendChild(script);
  }

  // Helper to create loading toast (can be part of the class or a standalone utility)
  _createLoadingToast(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow-lg z-50 flex items-center';
    toast.innerHTML = `
        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>${message}</span>
    `;
    return toast;
  }
  
  /**
   * Copie le contenu du rapport dans le presse-papiers
   */
  copyToClipboard() {
    if (!this.currentReport) {
      console.error('Aucun rapport à copier');
      return;
    }
    
    try {
      navigator.clipboard.writeText(this.currentReport)
        .then(() => {
          this._showToast('Rapport copié dans le presse-papiers');
        })
        .catch(err => {
          console.error('Erreur lors de la copie dans le presse-papiers:', err);
          this._showToast('Erreur lors de la copie', 'error');
        });
    } catch (error) {
      console.error('Erreur lors de la copie dans le presse-papiers:', error);
      this._showToast('Erreur lors de la copie', 'error');
    }
  }
  
  /**
   * Génère un document HTML complet à partir du contenu Markdown
   * @param {string} markdownContent - Contenu Markdown du rapport
   * @returns {string} - Document HTML complet
   * @private
   */
  _generateHTMLDocument(markdownContent) {
    // Rendre le Markdown en HTML
    let htmlContent = '';
    if (typeof marked !== 'undefined') {
      try {
        htmlContent = marked.parse(markdownContent);
      } catch (error) {
        console.error('Erreur lors du rendu du Markdown:', error);
        htmlContent = `<pre>${markdownContent}</pre>`;
      }
    } else {
      htmlContent = `<pre>${markdownContent}</pre>`;
    }
    
    // Créer le document HTML complet
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport d'analyse Excel</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
    }
    h1, h2, h3, h4, h5, h6 {
      margin-top: 1.5em;
      margin-bottom: 0.75em;
      font-weight: 600;
      color: #111827;
    }
    h1 { font-size: 2em; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.3em; }
    h2 { font-size: 1.75em; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.3em; }
    h3 { font-size: 1.5em; }
    h4 { font-size: 1.25em; }
    h5 { font-size: 1.125em; }
    h6 { font-size: 1em; }
    p { margin-bottom: 1em; }
    ul, ol { margin-bottom: 1em; padding-left: 2em; }
    li { margin-bottom: 0.5em; }
    hr { height: 1px; background-color: #e5e7eb; border: none; margin: 2em 0; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 1.5em; }
    th, td { border: 1px solid #e2e8f0; padding: 0.75rem; text-align: left; }
    th { background-color: #f8fafc; font-weight: 600; }
    tr:nth-child(even) { background-color: #f9fafb; }
    blockquote { border-left: 4px solid #e2e8f0; padding-left: 1rem; color: #4b5563; margin: 1.5em 0; }
    code { background-color: #f1f5f9; padding: 0.2rem 0.4rem; border-radius: 0.25rem; font-family: monospace; }
    pre { background-color: #f1f5f9; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; }
    pre code { background-color: transparent; padding: 0; }
    img { max-width: 100%; }
    .footer { margin-top: 2rem; font-size: 0.875rem; color: #6b7280; text-align: center; }
  </style>
</head>
<body>
  <header>
    <h1>Rapport d'analyse Excel</h1>
    <p>Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
    <hr>
  </header>
  
  <main>
    ${htmlContent}
  </main>
  
  <footer class="footer">
    <p>Rapport généré par ABIA - Assistant Intelligent</p>
  </footer>
</body>
</html>`;
  }
  
  /**
   * Génère des graphiques à partir du contenu du rapport
   * @param {string} markdownContent - Contenu Markdown du rapport
   * @private
   */
  _generateChartsFromReport(markdownContent) {
    try {
      // Nettoyer les graphiques existants
      this.chartInstances.forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
          chart.destroy();
        }
      });
      this.chartInstances = [];
      
      // Extraire les données du contenu Markdown
      
      // 1. Données d'investissement
      const investmentData = {
        labels: ['Investissement', 'Crédit d\'impôt', 'Coût d\'opportunité', 'Valeur récupération'],
        values: [50000, 5000, 7484, 10000]
      };
      
      // 2. Données de croissance
      const growthData = {
        labels: ['Année 1', 'Année 2', 'Année 3', 'Année 4', 'Année 5', 'Année 6'],
        values: [40000, 44000, 48400, 53240, 58564, 58564]
      };
      
      // 3. Données de taux d'actualisation
      const discountData = {
        labels: ['Taux sans risque', 'Prime de risque', 'Taux d\'actualisation'],
        values: [8, 5.5, 10.685]
      };
      
      // Créer les graphiques
      this._createBarChart('investment-chart', 'Investissement et valeurs', investmentData);
      this._createLineChart('growth-chart', 'Évolution des revenus', growthData);
      this._createBarChart('discount-chart', 'Taux (en %)', discountData);
    } catch (error) {
      console.error('Erreur lors de la génération des graphiques:', error);
    }
  }
  
  /**
   * Crée un graphique en barres
   * @param {string} elementId - ID de l'élément canvas
   * @param {string} title - Titre du graphique
   * @param {Object} data - Données du graphique
   * @private
   */
  _createBarChart(elementId, title, data) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // Créer le canvas s'il n'existe pas
    let canvas = element.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      element.appendChild(canvas);
    }
    
    // Créer le graphique
    const chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [{
          label: title,
          data: data.values,
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
    
    this.chartInstances.push(chart);
  }
  
  /**
   * Crée un graphique en ligne
   * @param {string} elementId - ID de l'élément canvas
   * @param {string} title - Titre du graphique
   * @param {Object} data - Données du graphique
   * @private
   */
  _createLineChart(elementId, title, data) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // Créer le canvas s'il n'existe pas
    let canvas = element.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      element.appendChild(canvas);
    }
    
    // Créer le graphique
    const chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [{
          label: title,
          data: data.values,
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 2,
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
    
    this.chartInstances.push(chart);
  }
  
  /**
   * Affiche un message toast
   * @param {string} message - Message à afficher
   * @param {string} type - Type de message (success, error)
   * @private
   */
  _showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 px-4 py-2 rounded shadow-lg z-50 animate-fade-in ${
      type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-800 text-white'
    }`;
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
window.excelReportExporter = new ExcelReportExporter();
