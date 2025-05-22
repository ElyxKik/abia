const documentService = require('../services/document-service');
const path = require('path');
const fs = require('fs');
const excelLlmService = require('../services/excel-llm-service');
const pythonExcelService = require('../services/python-excel-service');
const os = require('os');
const { app } = require('electron');

class ExcelAgent {
  constructor() {
    this.documentService = documentService;
    this.initialized = false;
  }
  
  /**
   * Initialise l'agent Excel
   * @returns {boolean} - True si l'initialisation a réussi
   */
  initialize() {
    try {
      console.log('Initialisation de l\'agent Excel...');
      
      // Initialiser le service de document
      if (this.documentService && typeof this.documentService.initialize === 'function') {
        this.documentService.initialize();
      }
      
      // Initialiser le service Python Excel si nécessaire
      if (!pythonExcelService.initialized && typeof pythonExcelService.initialize === 'function') {
        console.log('Initialisation du service Python Excel...');
        const pythonInitialized = pythonExcelService.initialize();
        if (!pythonInitialized) {
          console.warn('Attention: Initialisation du service Python Excel a échoué');
        }
      }
      
      // Initialiser le service Excel LLM si nécessaire
      if (typeof excelLlmService.initialize === 'function') {
        console.log('Initialisation du service Excel LLM...');
        excelLlmService.initialize();
      }
      
      this.initialized = true;
      console.log('Agent Excel initialisé avec succès');
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de l\'agent Excel:', error);
      return false;
    }
  }
  
  /**
   * Vérifie si l'agent Excel est prêt à être utilisé
   * @returns {boolean} - True si tous les services nécessaires sont disponibles
   */
  isReady() {
    try {
      // S'assurer que l'agent est initialisé
      if (!this.initialized) {
        console.log("L'agent Excel n'est pas initialisé");
        return false;
      }
      
      // Vérifier si le service Python Excel est disponible
      if (!pythonExcelService || !pythonExcelService.initialized) {
        console.log("Le service Python Excel n'est pas disponible");
        return false;
      }
      
      // Vérifier si le service Excel LLM est disponible
      if (!excelLlmService || !excelLlmService.initialized) {
        console.log("Le service Excel LLM n'est pas disponible");
        return false;
      }
      
      // Vérifier si les méthodes nécessaires sont disponibles
      if (typeof pythonExcelService.processExcelFile !== 'function') {
        console.log("La méthode processExcelFile n'est pas disponible dans le service Python Excel");
        return false;
      }
      
      // Vérifier si les méthodes nécessaires sont disponibles dans le service Excel LLM
      if (typeof excelLlmService.generateStructuredReport !== 'function') {
        console.log("La méthode generateStructuredReport n'est pas disponible dans le service Excel LLM");
        return false;
      }
      
      // Tout est prêt
      return true;
    } catch (error) {
      console.error("Erreur lors de la vérification de l'état de l'agent Excel:", error);
      return false;
    }
  }

  /**
   * Analyse un fichier Excel et extrait des informations clés
   * @param {string} filePath - Chemin du fichier Excel
   * @returns {Promise<Object>} - Résultat de l'analyse
   */
  async analyzeExcelFile(filePath) {
    try {
      // Vérifier si le fichier existe
      if (!fs.existsSync(filePath)) {
        throw new Error(`Le fichier ${filePath} n'existe pas.`);
      }

      // Vérifier si c'est un fichier Excel
      if (!this.documentService.supportedFormats.excel.includes(path.extname(filePath).toLowerCase())) {
        throw new Error(`Le fichier ${filePath} n'est pas un fichier Excel valide.`);
      }

      // Analyser le fichier Excel
      const analysis = await this.documentService.analyzeExcelFile(filePath);
      return analysis;
    } catch (error) {
      console.error('Erreur lors de l\'analyse du fichier Excel:', error);
      throw error;
    }
  }

  /**
   * Génère un résumé textuel de l'analyse d'un fichier Excel
   * @param {Object} analysis - Analyse du fichier Excel
   * @returns {string} - Résumé textuel
   */
  generateSummary(analysis) {
    let summary = `# Résumé de l'analyse du fichier Excel\n\n`;
    
    // Vérifier que l'analyse est valide
    if (!analysis) {
      return "Impossible de générer un résumé : analyse non disponible.";
    }
    
    // Adapter l'analyse à la structure Python/JSON
    try {
      // Informations générales (adaptation au format retour Python)
      summary += `## Informations générales\n\n`;
      
      // Gérer à la fois le format Python et le format JavaScript précédent
      if (analysis.fileName) {
        // Format Python
        summary += `- Fichier: ${analysis.fileName || 'Non disponible'}\n`;
        summary += `- Feuille: ${analysis.sheetName || 'Non disponible'}\n`;
        
        if (analysis.rowCount && analysis.columnCount) {
          summary += `- Dimensions: ${analysis.rowCount} lignes x ${analysis.columnCount} colonnes\n`;
        }
        
        // Vérifier s'il y a des données sheet_count de Python
        if (analysis.sheet_count) {
          summary += `- Nombre de feuilles: ${analysis.sheet_count}\n`;
        } else if (analysis.sheet_names && Array.isArray(analysis.sheet_names)) {
          summary += `- Nombre de feuilles: ${analysis.sheet_names.length}\n`;
          summary += `- Noms des feuilles: ${analysis.sheet_names.join(', ')}\n`;
        }
      } else if (analysis.summary) {
        // Format JavaScript précédent
        summary += `- Nombre de feuilles: ${analysis.summary.sheetCount || 'Non disponible'}\n`;
        summary += `- Nombre total de lignes: ${analysis.summary.totalRows || 'Non disponible'}\n`;
        summary += `- Nombre total de colonnes: ${analysis.summary.totalColumns || 'Non disponible'}\n`;
      }
      
      summary += `\n`;
      
      // Traiter les données au format Python
      if (analysis.data && typeof analysis.data === 'object') {
        summary += `## Aperçu des données\n\n`;
        
        if (Array.isArray(analysis.data)) {
          // Afficher un échantillon des données (max 5 lignes)
          const sampleSize = Math.min(5, analysis.data.length);
          for (let i = 0; i < sampleSize; i++) {
            const row = analysis.data[i];
            summary += `### Ligne ${i + 1}\n`;
            
            if (typeof row === 'object') {
              Object.entries(row).forEach(([key, value]) => {
                summary += `- ${key}: ${value !== null ? value : 'N/A'}\n`;
              });
            } else {
              summary += `${JSON.stringify(row)}\n`;
            }
            
            summary += `\n`;
          }
          
          if (analysis.data.length > sampleSize) {
            summary += `... et ${analysis.data.length - sampleSize} lignes supplémentaires.\n\n`;
          }
        } else {
          // Si les données sont sous un autre format
          summary += `Données disponibles au format non tabellaire.\n\n`;
        }
      }
      
      // Vérifier si on a l'ancien format JavaScript avec des sheets
      if (analysis.sheets && typeof analysis.sheets === 'object') {
        summary += `## Détail par feuille\n\n`;
        
        for (const [sheetName, sheetData] of Object.entries(analysis.sheets)) {
          if (!sheetData) continue;
          
          summary += `### Feuille: ${sheetName}\n\n`;
          summary += `- Nombre de lignes: ${sheetData.rowCount || 'Non disponible'}\n`;
          summary += `- Nombre de colonnes: ${sheetData.columnCount || 'Non disponible'}\n\n`;
          
          if (sheetData.columns && Object.keys(sheetData.columns).length > 0) {
            summary += `#### Colonnes principales:\n\n`;
            
            for (const [colName, colData] of Object.entries(sheetData.columns)) {
              if (!colData) continue;
              
              summary += `- **${colName}**: `;
              
              if (colData.dataType) {
                summary += `(${colData.dataType}) `;
              }
              
              if (colData.dataType === 'numeric' && colData.average !== undefined) {
                const min = typeof colData.min === 'number' ? colData.min.toFixed(2) : 'N/A';
                const max = typeof colData.max === 'number' ? colData.max.toFixed(2) : 'N/A';
                const avg = typeof colData.average === 'number' ? colData.average.toFixed(2) : 'N/A';
                
                summary += `Min: ${min}, Max: ${max}, Moyenne: ${avg}`;
              } else if (colData.nonNullCount !== undefined) {
                summary += `${colData.nonNullCount} valeurs non nulles`;
                
                if (colData.uniqueCount !== undefined) {
                  summary += `, ${colData.uniqueCount} valeurs uniques`;
                }
              } else {
                summary += `Informations non disponibles`;
              }
              
              summary += `\n`;
            }
            
            summary += `\n`;
          }
        }
      }
      
    } catch (error) {
      console.error('Erreur lors de la génération du résumé:', error);
      summary += `\n\nUne erreur est survenue lors de la génération du résumé: ${error.message}\n`;
      summary += `Données reçues: ${JSON.stringify(analysis, null, 2).substring(0, 200)}...\n`;
    }
    
    return summary;
  }

  /**
   * Extrait des données spécifiques d'un fichier Excel selon des critères
   * @param {string} filePath - Chemin du fichier Excel
   * @param {Object} options - Options d'extraction
   * @returns {Promise<Object>} - Données extraites
   */
  async extractData(filePath, options) {
    try {
      const { sheetName, columns, filter, sort } = options;
      
      // Lire le fichier Excel
      const excelData = await this.documentService.readExcel(filePath);
      
      // Vérifier si la feuille existe
      if (!excelData.sheets[sheetName]) {
        throw new Error(`La feuille "${sheetName}" n'existe pas dans le fichier.`);
      }
      
      const sheetData = excelData.sheets[sheetName];
      
      // Vérifier si la feuille a des données
      if (!sheetData || sheetData.length <= 1) {
        return { data: [] };
      }
      
      // Extraire les en-têtes
      const headers = sheetData[0];
      
      // Trouver les indices des colonnes à extraire
      const columnIndices = columns 
        ? columns.map(col => headers.indexOf(col)).filter(idx => idx !== -1)
        : headers.map((_, idx) => idx);
      
      // Extraire les données
      let data = sheetData.slice(1).map(row => {
        const rowData = {};
        columnIndices.forEach(idx => {
          rowData[headers[idx]] = row[idx];
        });
        return rowData;
      });
      
      // Appliquer le filtre si spécifié
      if (filter && filter.column && filter.value !== undefined) {
        const filterColumn = filter.column;
        const filterValue = filter.value;
        const filterOperator = filter.operator || '=';
        
        data = data.filter(row => {
          const cellValue = row[filterColumn];
          
          switch (filterOperator) {
            case '=': return cellValue === filterValue;
            case '!=': return cellValue !== filterValue;
            case '>': return cellValue > filterValue;
            case '>=': return cellValue >= filterValue;
            case '<': return cellValue < filterValue;
            case '<=': return cellValue <= filterValue;
            case 'contains': return String(cellValue).includes(String(filterValue));
            default: return true;
          }
        });
      }
      
      // Trier les données si spécifié
      if (sort && sort.column) {
        const sortColumn = sort.column;
        const sortDirection = sort.direction || 'asc';
        
        data.sort((a, b) => {
          let valueA = a[sortColumn];
          let valueB = b[sortColumn];
          
          // Convertir en nombre si possible
          if (!isNaN(valueA)) valueA = Number(valueA);
          if (!isNaN(valueB)) valueB = Number(valueB);
          
          if (sortDirection === 'asc') {
            return valueA > valueB ? 1 : -1;
          } else {
            return valueA < valueB ? 1 : -1;
          }
        });
      }
      
      return { 
        headers: columnIndices.map(idx => headers[idx]),
        data 
      };
    } catch (error) {
      console.error('Erreur lors de l\'extraction des données:', error);
      throw error;
    }
  }

  /**
   * Génère un nouveau fichier Excel à partir de données
   * @param {Object} data - Données pour le fichier Excel
   * @param {string} outputPath - Chemin de sortie pour le fichier
   * @returns {Promise<string>} - Chemin du fichier généré
   */
  async generateExcelFile(data, outputPath) {
    try {
      const { sheets, author } = data;
      
      // Créer le fichier Excel
      const excelBuffer = await this.documentService.createExcelWorkbook({
        sheets,
        author: author || 'ABIA Excel Agent'
      });
      
      // Écrire le fichier
      fs.writeFileSync(outputPath, excelBuffer);
      
      return outputPath;
    } catch (error) {
      console.error('Erreur lors de la génération du fichier Excel:', error);
      throw error;
    }
  }

  /**
   * Traite une requête en langage naturel concernant un fichier Excel
   * @param {string} query - Requête en langage naturel
   * @param {string} filePath - Chemin du fichier Excel
   * @returns {Promise<Object>} - Résultat du traitement
   */
  async processNaturalLanguageQuery(query, filePath) {
    try {
      // Analyser la requête pour déterminer l'action à effectuer
      const lowercaseQuery = query.toLowerCase();
      
      // Analyse générale du fichier
      if (lowercaseQuery.includes('analyse') || lowercaseQuery.includes('résumé') || 
          lowercaseQuery.includes('aperçu') || lowercaseQuery.includes('statistiques')) {
        const analysis = await this.analyzeExcelFile(filePath);
        const summary = this.generateSummary(analysis);
        return { type: 'summary', content: summary, data: analysis };
      }
      
      // Extraction de données spécifiques
      if (lowercaseQuery.includes('extraire') || lowercaseQuery.includes('filtre') || 
          lowercaseQuery.includes('trier') || lowercaseQuery.includes('montre')) {
        // Lire le fichier pour obtenir les informations sur les feuilles et colonnes
        const excelData = await this.documentService.readExcel(filePath);
        
        // Déterminer la feuille à utiliser (par défaut, la première)
        let sheetName = Object.keys(excelData.sheets)[0];
        
        // Chercher si une feuille spécifique est mentionnée
        for (const sheet of Object.keys(excelData.sheets)) {
          if (lowercaseQuery.includes(sheet.toLowerCase())) {
            sheetName = sheet;
            break;
          }
        }
        
        // Options d'extraction par défaut
        const options = {
          sheetName,
          columns: null, // Toutes les colonnes
          filter: null,
          sort: null
        };
        
        // Extraire les données
        const extractedData = await this.extractData(filePath, options);
        
        return { 
          type: 'extraction', 
          content: `Données extraites de la feuille "${sheetName}"`, 
          data: extractedData 
        };
      }
      
      // Par défaut, faire une analyse générale
      const analysis = await this.analyzeExcelFile(filePath);
      const summary = this.generateSummary(analysis);
      return { type: 'summary', content: summary, data: analysis };
    } catch (error) {
      console.error('Erreur lors du traitement de la requête:', error);
      throw error;
    }
  }
  
  /**
   * Génère un rapport structuré à partir d'un fichier Excel
   * @param {string} filePath - Chemin du fichier Excel
   * @param {string} instructions - Instructions pour l'analyse
   * @returns {Promise<Object>} - Rapport structuré
   */
  async generateStructuredReport(filePath, instructions = '') {
    try {
      // S'assurer que les services nécessaires sont initialisés
      if (!this.initialized) {
        console.log('L\'agent Excel n\'est pas initialisé, tentative d\'initialisation...');
        this.initialize();
      }
      
      // Vérifier si le service Python Excel est disponible
      if (!pythonExcelService.initialized) {
        console.log('Service Python Excel non initialisé, tentative d\'initialisation...');
        const pythonInitialized = pythonExcelService.initialize();
        if (!pythonInitialized) {
          throw new Error('Le service Python Excel n\'est pas disponible');
        }
      }
      
      // Vérifier si le service Excel LLM est disponible
      if (!excelLlmService) {
        throw new Error('Le service Excel LLM n\'est pas disponible');
      }
      
      // Vérifier si le fichier existe
      if (!fs.existsSync(filePath)) {
        throw new Error(`Le fichier ${filePath} n'existe pas.`);
      }

      // Générer le rapport structuré via Python
      console.log(`Génération du rapport structuré pour ${filePath} avec les instructions: ${instructions}`);
      
      // Utiliser processExcelFile avec l'option structuredReport à true
      const options = {
        format: 'json',
        maxRows: 200,
        maxCols: 20,
        sheetIndex: 0,
        structuredReport: true,
        instructions: instructions
      };
      
      const result = await pythonExcelService.processExcelFile(filePath, options);
      
      // Vérifier si le résultat contient un rapport structuré
      if (!result || result.error) {
        throw new Error(`Erreur lors de la génération du rapport structuré: ${result?.error || 'Résultat vide'}`);
      }
      
      console.log('Résultat Python:', JSON.stringify(result, null, 2).substring(0, 500) + '...');
      
      // Extraire le rapport structuré généré par Python
      let structuredReport = null;
      
      if (result.structured_report) {
        // Si le rapport est dans la propriété structured_report (format correct)
        structuredReport = result.structured_report;
        console.log('Rapport structuré trouvé dans structured_report');
      } else if (result.sections || result.summary) {
        // Si le rapport est déjà structuré dans le résultat principal
        structuredReport = result;
        console.log('Rapport structuré trouvé directement dans le résultat');
      } else {
        // Fallback - créer un rapport minimal
        console.log('Aucun rapport structuré trouvé, création d\'un rapport minimal');
        structuredReport = {
          "titre": `Analyse de ${path.basename(filePath)}`,
          "fichier": {
            "nom": path.basename(filePath),
            "feuille": result.sheetName || "",
            "dimensions": `${result.rowCount || 0} lignes × ${result.columnCount || 0} colonnes`
          },
          "sections": [
            {
              "titre": "Aperçu des données",
              "contenu": typeof result.data === 'string' 
                ? result.data.substring(0, 1000) + '...' 
                : JSON.stringify(result.data, null, 2).substring(0, 1000) + '...'
            }
          ]
        };
      }
      
      // Convertir au format attendu par l'interface
      const report = {
        title: structuredReport.titre || `Rapport d'analyse: ${path.basename(filePath)}`,
        fileName: structuredReport.fichier?.nom || path.basename(filePath),
        generatedAt: new Date().toISOString(),
        summary: structuredReport.resume || structuredReport.summary || "Analyse complète du fichier Excel",
        sections: structuredReport.sections?.map(s => ({
          title: s.titre || s.title || 'Section',
          content: s.contenu || s.content || ''
        })) || [],
        charts: structuredReport.graphiques || structuredReport.charts || [],
        recommendations: structuredReport.recommandations || structuredReport.recommendations || []
      };
      
      if (!report) {
        throw new Error('Erreur lors de la génération du rapport structuré: rapport vide');
      }
      
      // Préparer le chemin pour le rapport HTML
      const tempDir = os.tmpdir();
      const tempReportFile = path.join(tempDir, `excel-report-${Date.now()}.html`);
      
      // Créer un rapport HTML simple pour les données
      const htmlContent = this._generateReportHtml(report, path.basename(filePath));
      fs.writeFileSync(tempReportFile, htmlContent, 'utf8');
      
      return {
        report: report,
        reportFilePath: tempReportFile
      };
    } catch (error) {
      console.error('Erreur lors de la génération du rapport structuré:', error);
      throw error;
    }
  }

  /**
   * Traite un fichier Excel et retourne une réponse avec actions
   * @param {string} filePath - Chemin du fichier Excel
   * @param {string} instructions - Instructions pour l'analyse
   * @returns {Promise<Object>} - Réponse formatée avec actions
   */
  async processExcelWithActions(filePath, instructions) {
    // Préparer l'objet de réponse initial
    const response = {
      type: 'success',
      text: '',
      actions: []
    };
    
    try {
      console.log(`Traitement du fichier Excel avec actions: ${filePath}`);
      console.log(`Instructions: ${instructions}`);
      
      // Vérifier que l'agent est prêt
      if (!this.isReady()) {
        throw new Error("L'agent Excel n'est pas prêt. Le service Excel LLM n'est peut-être pas disponible.");
      }
      
      // Générer le rapport structuré
      console.log('processExcelWithActions - Appel de generateStructuredReport');
      const reportData = await this.generateStructuredReport(filePath, instructions);
      
      // Déboguer les données reçues
      if (!reportData || !reportData.report) {
        console.error('processExcelWithActions - Données de rapport invalides:', reportData);
        throw new Error('Les données du rapport sont invalides ou incomplètes');
      }
      
      // Normaliser les données du rapport pour garantir un format compatible avec le visualiseur
      // En tenant compte du fait que l'application utilise Python exclusivement pour le traitement Excel
      
      // Format normalisé du rapport
      const reportStandardized = {
        title: "Rapport d'analyse Excel",
        fileName: path.basename(filePath),
        generatedAt: new Date().toISOString(),
        summary: "Analyse détaillée du fichier Excel avec extraction des points clés",
        sections: [],
        charts: [],
        recommendations: []
      };
      
      // Extraire les données structurées du rapport
      try {
        // Vérifier d'abord si le rapport est déjà au format attendu
        if (reportData.report && typeof reportData.report === 'object') {
          const pythonReport = reportData.report;
          
          // Transférer les données au format standardisé
          if (pythonReport.title || pythonReport.titre) {
            reportStandardized.title = pythonReport.title || pythonReport.titre;
          }
          
          if (pythonReport.summary || pythonReport.resume) {
            reportStandardized.summary = pythonReport.summary || pythonReport.resume;
          }
          
          // Traiter les sections - peuvent être en anglais ou en français
          if (pythonReport.sections && Array.isArray(pythonReport.sections)) {
            reportStandardized.sections = pythonReport.sections.map(s => ({
              title: s.title || s.titre || 'Section sans titre',
              content: s.content || s.contenu || JSON.stringify(s)
            }));
          } else if (pythonReport.sections && typeof pythonReport.sections === 'object') {
            // Si sections est un objet (dict en Python), le convertir en tableau
            reportStandardized.sections = Object.entries(pythonReport.sections).map(([key, value]) => ({
              title: key,
              content: typeof value === 'string' ? value : JSON.stringify(value, null, 2)
            }));
          }
          
          // Traiter les recommandations
          if (pythonReport.recommendations || pythonReport.recommandations) {
            const recs = pythonReport.recommendations || pythonReport.recommandations;
            if (Array.isArray(recs)) {
              reportStandardized.recommendations = recs.map(r => 
                typeof r === 'string' ? r : (r.text || r.texte || JSON.stringify(r))
              );
            }
          }
          
          console.log('Rapport normalisé à partir des données Python');
        } else if (reportData.structured_report) {
          // Format alternatif - données dans structured_report
          const structReport = reportData.structured_report;
          
          // Même procédure de normalisation
          if (structReport.title || structReport.titre) {
            reportStandardized.title = structReport.title || structReport.titre;
          }
          
          // Et ainsi de suite pour les autres propriétés...
          console.log('Rapport normalisé à partir de structured_report');
        } else {
          // Dernière tentative - créer un rapport minimal à partir des données brutes
          reportStandardized.sections.push({
            title: 'Résumé des données',
            content: typeof reportData.data === 'string' 
              ? reportData.data.substring(0, 1000) + '...' 
              : JSON.stringify(reportData.data || reportData, null, 2).substring(0, 1000) + '...'
          });
          console.log('Création d\'un rapport minimal à partir des données brutes');
        }
      } catch (formatError) {
        console.error('Erreur lors de la normalisation du rapport:', formatError);
        reportStandardized.sections.push({
          title: 'Erreur de formatage',
          content: `Une erreur est survenue lors du formatage du rapport: ${formatError.message}`
        });
      }
      
      // Utiliser le format normalisé pour la suite
      const report = reportStandardized;
      
      console.log('processExcelWithActions - Rapport normalisé avec succès:', 
                 `title: ${report.title}, sections: ${report.sections.length}`);
      console.log('processExcelWithActions - Structure finale du rapport:', JSON.stringify(Object.keys(report)));
      console.log('processExcelWithActions - Exemples de sections:', report.sections.slice(0, 2).map(s => s.title).join(', '));
      
      // Créer un répertoire temporaire pour les rapports si nécessaire
      const appPath = app.getAppPath();
      const reportsDir = path.join(appPath, 'temp', 'reports');
      
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      // Générer un identifiant unique pour le rapport
      const reportId = Date.now();
      const reportFileName = `excel-report-${reportId}.html`;
      const reportPath = path.join(reportsDir, reportFileName);
      
      // Récupérer le modèle HTML et remplacer les valeurs
      const templatePath = path.join(appPath, 'renderer', 'excel-report.html');
      let templateContent = fs.readFileSync(templatePath, 'utf8');
      
      // Insérer un script pour charger les données du rapport
      const reportScript = `
      <script>
        // Données du rapport
        window.reportData = ${JSON.stringify(report)};
        
        // Charger les données du rapport quand la page est prête
        document.addEventListener('DOMContentLoaded', function() {
          if (window.excelReportViewer) {
            window.excelReportViewer.initialize();
            window.excelReportViewer.loadReportData(window.reportData);
          } else {
            console.error("Le visualiseur de rapport n'est pas disponible");
          }
        });
      </script>
      `;
      
      // Insérer le script juste avant la balise </body>
      templateContent = templateContent.replace('</body>', `${reportScript}</body>`);
      
      // Écrire le fichier HTML du rapport
      fs.writeFileSync(reportPath, templateContent, 'utf8');
      
      // Créer un tableau d'actions contextuelles
      const reportActions = [
        {
          id: 'view_report',
          text: 'Voir le rapport complet',
          icon: 'file-alt',
          type: 'open_url',
          data: {
            url: `file://${reportPath}`
          }
        },
        {
          id: 'view_report_in_app',
          text: 'Visualiser le rapport',
          icon: 'chart-line',
          type: 'view_report',
          data: {
            report: report
          }
        },
        {
          id: 'view_report_inline',
          text: 'Afficher dans le chat',
          icon: 'chart-bar',
          type: 'view_report',
          data: {
            report: report
          }
        },
        {
          id: 'download_report',
          text: 'Télécharger le rapport',
          icon: 'download',
          type: 'download',
          data: {
            path: reportPath,
            defaultName: `rapport-excel-${reportId}.json`
          }
        }
      ];
      
      // Assigner les actions à l'objet réponse
      response.actions = reportActions;
      response.text = `Rapport structuré généré avec succès à partir du fichier Excel **${path.basename(filePath)}**. Le rapport contient ${report.sections.length} sections avec une analyse détaillée.`;
      
      return response;
    } catch (error) {
      console.error('Erreur lors du traitement du fichier Excel avec actions:', error);
      
      // Modifier la réponse en cas d'erreur - Ne pas créer un nouvel objet
      response.type = 'error';
      response.error = `Erreur lors de la génération du rapport structuré: ${error.message}\n\nSi ce problème persiste, essayez de redémarrer l'application ou vérifiez que le fichier Excel n'est pas corrompu.`;
      response.text = '\u274c Erreur lors de la génération du rapport. Veuillez réessayer';
      
      // Ne pas inclure d'actions dans une réponse d'erreur
      response.actions = [];
      
      return response;
    }
  }
  /**
   * Génère un HTML pour le rapport Excel
   * @private
   * @param {Object} report - Données du rapport
   * @param {string} fileName - Nom du fichier
   * @returns {string} - Contenu HTML
   */
  _generateReportHtml(report, fileName) {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport Excel - ${fileName}</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body class="bg-gray-100 p-4">
  <div class="container mx-auto bg-white rounded-lg shadow-lg p-6 max-w-5xl">
    <div class="flex justify-between items-center mb-6 border-b pb-4">
      <h1 class="text-2xl font-bold text-gray-800">Rapport d'analyse: ${fileName}</h1>
      <button id="export-pdf" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center">
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
        </svg>
        Exporter en PDF
      </button>
    </div>
    
    <div class="mb-6">
      <div class="bg-blue-50 p-4 rounded-lg">
        <h2 class="text-lg font-semibold text-blue-800 mb-2">Informations du fichier</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p class="text-sm text-gray-600">Nom du fichier</p>
            <p class="font-medium">${report.fichier?.nom || fileName}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Feuille</p>
            <p class="font-medium">${report.fichier?.feuille || 'Principale'}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Dimensions</p>
            <p class="font-medium">${report.fichier?.dimensions || 'Non disponible'}</p>
          </div>
        </div>
      </div>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      ${this._generateSectionsHtml(report.sections)}
    </div>
    
    <div class="mb-6">
      <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <h2 class="text-lg font-semibold text-yellow-800 mb-2">Recommandations</h2>
        <ul class="list-disc pl-5 text-gray-700">
          ${(report.recommandations || []).map(rec => `<li>${rec}</li>`).join('')}
        </ul>
      </div>
    </div>
    
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <h2 class="text-lg font-semibold text-gray-800 mb-3">Graphique des données</h2>
        <div class="bg-white p-4 rounded-lg shadow h-64">
          <canvas id="dataChart"></canvas>
        </div>
      </div>
      <div>
        <h2 class="text-lg font-semibold text-gray-800 mb-3">Distribution</h2>
        <div class="bg-white p-4 rounded-lg shadow h-64">
          <canvas id="distributionChart"></canvas>
        </div>
      </div>
    </div>
  </div>
  
  <script>
    // Initialiser les graphiques si des données sont disponibles
    document.addEventListener('DOMContentLoaded', function() {
      // Données pour les graphiques (extraites du rapport)
      const reportData = ${JSON.stringify(report)};
      initCharts(reportData);
      
      // Gestionnaire pour l'export PDF
      document.getElementById('export-pdf').addEventListener('click', function() {
        window.print();
      });
    });
    
    function initCharts(reportData) {
      // Extraire des données pour les graphiques à partir des sections
      let labels = [];
      let values = [];
      let colors = [];
      
      // Utiliser les statistiques si disponibles
      if (reportData.sections && reportData.sections.Statistiques) {
        const stats = reportData.sections.Statistiques;
        labels = Object.keys(stats);
        values = labels.map(label => stats[label].Moyenne || 0);
        colors = labels.map(() => getRandomColor());
        
        // Graphique principal
        const ctx = document.getElementById('dataChart').getContext('2d');
        new Chart(ctx, {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [{
              label: 'Moyenne',
              data: values,
              backgroundColor: colors,
              borderColor: colors.map(c => c.replace('0.6', '1')),
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
        
        // Graphique de distribution
        const ctxDist = document.getElementById('distributionChart').getContext('2d');
        new Chart(ctxDist, {
          type: 'pie',
          data: {
            labels: labels,
            datasets: [{
              data: values,
              backgroundColor: colors,
              borderColor: '#fff',
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'right',
              }
            }
          }
        });
      }
    }
    
    function getRandomColor() {
      const colors = [
        'rgba(54, 162, 235, 0.6)',
        'rgba(255, 99, 132, 0.6)',
        'rgba(255, 206, 86, 0.6)',
        'rgba(75, 192, 192, 0.6)',
        'rgba(153, 102, 255, 0.6)',
        'rgba(255, 159, 64, 0.6)'
      ];
      return colors[Math.floor(Math.random() * colors.length)];
    }
  </script>
</body>
</html>`;
  }
  
  /**
   * Génère le HTML pour les sections du rapport
   * @private
   * @param {Object} sections - Sections du rapport
   * @returns {string} - HTML des sections
   */
  _generateSectionsHtml(sections) {
    if (!sections || Object.keys(sections).length === 0) {
      return '<div class="col-span-2"><p class="text-gray-500 italic">Aucune section disponible</p></div>';
    }
    
    return Object.entries(sections).map(([sectionName, sectionData]) => {
      // Déterminer le style de la carte en fonction du type de section
      let cardStyle = 'bg-white';
      let iconClass = 'fas fa-table';
      
      if (sectionName === 'Statistiques') {
        cardStyle = 'bg-blue-50';
        iconClass = 'fas fa-chart-bar';
      } else if (sectionName === 'Finances') {
        cardStyle = 'bg-green-50';
        iconClass = 'fas fa-dollar-sign';
      } else if (sectionName === 'Périodes') {
        cardStyle = 'bg-purple-50';
        iconClass = 'fas fa-calendar';
      } else if (sectionName === 'Produits') {
        cardStyle = 'bg-yellow-50';
        iconClass = 'fas fa-box';
      }
      
      // Créer le contenu HTML pour la section
      let sectionHtml = `
        <div class="${cardStyle} p-4 rounded-lg shadow">
          <h3 class="font-semibold text-gray-800 mb-3 flex items-center">
            <i class="${iconClass} mr-2"></i>
            ${sectionName}
          </h3>
          <div class="overflow-auto">
      `;
      
      // Générer la représentation des données selon le format
      if (typeof sectionData === 'object') {
        if (sectionName === 'Statistiques') {
          // Format tableau pour les statistiques
          sectionHtml += '<table class="min-w-full divide-y divide-gray-200">';
          sectionHtml += '<thead class="bg-gray-50"><tr>';
          sectionHtml += '<th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Colonne</th>';
          sectionHtml += Object.keys(Object.values(sectionData)[0] || {}).map(stat => 
            `<th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">${stat}</th>`
          ).join('');
          sectionHtml += '</tr></thead><tbody>';
          
          Object.entries(sectionData).forEach(([colName, stats], index) => {
            sectionHtml += `<tr class="${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}"><td class="px-3 py-2 text-sm font-medium text-gray-900">${colName}</td>`;
            Object.values(stats).forEach(value => {
              sectionHtml += `<td class="px-3 py-2 text-sm text-gray-500">${value}</td>`;
            });
            sectionHtml += '</tr>';
          });
          
          sectionHtml += '</tbody></table>';
        } else {
          // Format liste pour les autres sections
          sectionHtml += '<dl class="divide-y divide-gray-200">';
          
          Object.entries(sectionData).forEach(([key, value]) => {
            sectionHtml += `
              <div class="py-2 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt class="text-sm font-medium text-gray-500">${key}</dt>
                <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  ${Array.isArray(value) 
                    ? value.map(v => `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mr-2 mb-1">${v}</span>`).join('') 
                    : value}
                </dd>
              </div>
            `;
          });
          
          sectionHtml += '</dl>';
        }
      } else {
        sectionHtml += `<p class="text-gray-500">${sectionData}</p>`;
      }
      
      sectionHtml += '</div></div>';
      return sectionHtml;
    }).join('');
  }
}

module.exports = ExcelAgent;
