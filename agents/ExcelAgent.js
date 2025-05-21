const DocumentService = require('../services/document-service');
const path = require('path');
const fs = require('fs');

class ExcelAgent {
  constructor() {
    this.documentService = new DocumentService();
    this.initialized = false;
  }
  
  /**
   * Initialise l'agent Excel
   * @returns {boolean} - True si l'initialisation a réussi
   */
  initialize() {
    try {
      console.log('Initialisation de l\'agent Excel...');
      if (this.documentService && typeof this.documentService.initialize === 'function') {
        this.documentService.initialize();
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
    
    // Informations générales
    summary += `## Informations générales\n\n`;
    summary += `- Nombre de feuilles: ${analysis.summary.sheetCount}\n`;
    summary += `- Nombre total de lignes: ${analysis.summary.totalRows}\n`;
    summary += `- Nombre total de colonnes: ${analysis.summary.totalColumns}\n\n`;
    
    // Résumé par feuille
    summary += `## Résumé par feuille\n\n`;
    
    for (const [sheetName, sheetData] of Object.entries(analysis.sheets)) {
      summary += `### Feuille: ${sheetName}\n\n`;
      summary += `- Nombre de lignes: ${sheetData.rowCount}\n`;
      summary += `- Nombre de colonnes: ${sheetData.columnCount}\n\n`;
      
      if (Object.keys(sheetData.columns).length > 0) {
        summary += `#### Colonnes principales:\n\n`;
        
        for (const [columnName, columnData] of Object.entries(sheetData.columns)) {
          summary += `- **${columnName}** (${columnData.dataType}): `;
          
          if (columnData.dataType === 'numeric' && 'average' in columnData) {
            summary += `Min: ${columnData.min.toFixed(2)}, Max: ${columnData.max.toFixed(2)}, Moyenne: ${columnData.average.toFixed(2)}`;
          } else {
            summary += `${columnData.nonNullCount} valeurs non nulles, ${columnData.uniqueCount} valeurs uniques`;
          }
          
          summary += `\n`;
        }
        
        summary += `\n`;
      }
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
}

module.exports = ExcelAgent;
