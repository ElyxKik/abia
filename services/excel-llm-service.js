/**
 * Service pour traiter les fichiers Excel avec des modèles LLM
 * Ce service permet d'extraire des données de fichiers Excel et de les formater
 * pour les envoyer à des modèles LLM comme DeepSeek ou GPT-4.
 */

const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const axios = require('axios');
const pythonExcelService = require('./python-excel-service');

// Chemin vers le fichier de configuration global
const CONFIG_FILE_PATH = path.join(__dirname, '..', 'config', 'config.json');

class ExcelLLMService {
  constructor() {
    this.config = {
      maxRows: 100,
      maxCols: 20,
      apiEndpoints: {
        deepseek: 'https://api.deepseek.com/v1/chat/completions',
        openai: 'https://api.openai.com/v1/chat/completions'
      },
      defaultProvider: 'deepseek',
      defaultModel: 'deepseek-chat',
      apiKeys: {}
    };
    this.loadGlobalConfig();
  }

  loadGlobalConfig() {
    try {
      if (fs.existsSync(CONFIG_FILE_PATH)) {
        const rawConfig = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
        const globalConfig = JSON.parse(rawConfig);
        
        if (globalConfig.llm) {
          if (globalConfig.llm.provider) {
            this.config.defaultProvider = globalConfig.llm.provider;
            if (globalConfig.llm.apiKey) {
              this.config.apiKeys[globalConfig.llm.provider] = globalConfig.llm.apiKey;
            }
          }
          if (globalConfig.llm.model) {
            this.config.defaultModel = globalConfig.llm.model;
          }
          if (globalConfig.llm.temperature) {
            this.config.temperature = globalConfig.llm.temperature;
          }
          if (globalConfig.llm.maxTokens) {
            this.config.maxTokens = globalConfig.llm.maxTokens;
          }
        }
        console.log('Configuration globale chargée depuis config/config.json');
      } else {
        console.warn(`Le fichier de configuration global ${CONFIG_FILE_PATH} n'a pas été trouvé.`);
      }
    } catch (error) {
      console.error(`Erreur lors du chargement de la configuration globale depuis ${CONFIG_FILE_PATH}:`, error);
    }
  }

  async extractExcelData(filePath, options = {}) {
    console.log(`Extraction des données du fichier Excel: ${filePath} en utilisant Python exclusivement.`);
    
    const opts = {
      maxRows: options.maxRows || this.config.maxRows,
      maxCols: options.maxCols || this.config.maxCols,
      sheetIndex: options.sheetIndex || 0,
      includeHeaders: options.includeHeaders !== false,
      formatType: options.formatType || 'json'
    };
    
    try {
      console.log('Tentative d\'utilisation du service Python pour le traitement du fichier Excel');
      return await this._extractWithPython(filePath, opts);
    } catch (pythonError) {
      console.error(`Échec de l'extraction avec Python: ${pythonError.message}`);
      console.error('Stack trace de l\'erreur Python:', pythonError.stack);
      throw new Error(`Le traitement du fichier Excel avec Python a échoué: ${pythonError.message}`);
    }
  }
  
  _extractDataWithXlsxPopulate(workbook, filePath, options) {
    console.log('Extraction des données avec xlsx-populate');
    
    const sheets = workbook.sheets();
    
    const sheetIndex = Math.min(options.sheetIndex, sheets.length - 1);
    const worksheet = sheets[sheetIndex];
    
    if (!worksheet) {
      throw new Error('Aucune feuille de calcul trouvée dans le fichier Excel');
    }
    
    console.log(`Feuille sélectionnée: ${worksheet.name()}`);
    
    const data = [];
    const headers = [];
    
    const usedRange = worksheet.usedRange();
    if (!usedRange) {
      throw new Error('Aucune donnée trouvée dans la feuille de calcul');
    }
    
    const rowCount = Math.min(usedRange.endRow(), options.maxRows + 1);
    const colCount = Math.min(usedRange.endColumn(), options.maxCols);
    
    console.log(`Extraction des données: ${rowCount} lignes x ${colCount} colonnes`);
    
    if (options.includeHeaders) {
      for (let col = 1; col <= colCount; col++) {
        const value = worksheet.cell(1, col).value();
        headers.push(value ? value.toString() : `Colonne ${col}`);
      }
    }
    
    const startRow = options.includeHeaders ? 2 : 1;
    const maxDataRows = options.includeHeaders ? options.maxRows : options.maxRows + 1;
    
    for (let row = startRow; row <= Math.min(rowCount, startRow + maxDataRows - 1); row++) {
      const rowData = {};
      const rowArray = [];
      
      for (let col = 1; col <= colCount; col++) {
        const value = worksheet.cell(row, col).value();
        
        if (options.formatType === 'json' && options.includeHeaders) {
          rowData[headers[col - 1]] = value;
        } else {
          rowArray.push(value);
        }
      }
      
      if (options.formatType === 'json' && options.includeHeaders) {
        data.push(rowData);
      } else {
        data.push(rowArray);
      }
    }
    
    let formattedData;
    if (options.formatType === 'json') {
      formattedData = options.includeHeaders ? data : { headers, data };
    } else if (options.formatType === 'markdown') {
      formattedData = this._formatAsMarkdownTable(headers, data, options.includeHeaders);
    } else if (options.formatType === 'csv') {
      formattedData = this._formatAsCSV(headers, data, options.includeHeaders);
    } else {
      formattedData = data;
    }
    
    const result = {
      fileName: path.basename(filePath),
      sheetName: worksheet.name(),
      rowCount: rowCount - (options.includeHeaders ? 1 : 0),
      columnCount: colCount,
      format: options.formatType,
      data: formattedData
    };
    
    console.log(`Extraction réussie: ${result.rowCount} lignes x ${result.columnCount} colonnes`);
    return result;
  }
  
  async _extractWithPython(filePath, options) {
    console.log('_extractWithPython - Début - Fichier:', filePath);
    console.log('_extractWithPython - Format du fichier:', path.extname(filePath).toLowerCase());
    console.log('_extractWithPython - Options:', JSON.stringify(options));
    
    try {
      if (!pythonExcelService.initialized) {
        console.log('_extractWithPython - Initialisation du service Python');
        await pythonExcelService.initialize();
      }
      
      console.log('_extractWithPython - Service Python initialisé');
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`Le fichier ${filePath} n'existe pas`);
      }
      console.log('_extractWithPython - Fichier existe');
      
      const pythonOptions = {
        format: options.formatType,
        maxRows: options.maxRows,
        maxCols: options.maxCols,
        sheetIndex: options.sheetIndex
      };
      
      console.log('_extractWithPython - Appel du service Python avec options:', JSON.stringify(pythonOptions));
      
      try {
        const result = await pythonExcelService.processExcelFile(filePath, pythonOptions);
        
        console.log('_extractWithPython - Résultat de processExcelFile reçu');
        
        if (result.error) {
          console.error('_extractWithPython - Erreur retournée par Python:', result.error);
          throw new Error(`Erreur lors de l'extraction avec Python: ${result.error}`);
        }
        
        console.log('_extractWithPython - Extraction avec Python réussie');
        return result;
      } catch (pythonProcessError) {
        console.error('_extractWithPython - Erreur lors de l\'appel à processExcelFile:', pythonProcessError);
        throw new Error(`Erreur lors du traitement Python: ${pythonProcessError.message}`);
      }
    } catch (error) {
      console.error('_extractWithPython - Erreur globale:', error);
      throw error;
    }
  }
  
  _formatCellValue(cell) {
    if (!cell || cell.value === undefined || cell.value === null) {
      return null;
    }
    
    if (cell.type === ExcelJS.ValueType.Number) {
      return cell.value;
    } else if (cell.type === ExcelJS.ValueType.Boolean) {
      return cell.value;
    } else if (cell.type === ExcelJS.ValueType.Date) {
      return cell.value.toISOString().split('T')[0];
    } else if (cell.type === ExcelJS.ValueType.Formula) {
      return cell.result !== undefined ? cell.result : cell.value;
    } else {
      return cell.value !== null ? cell.value.toString() : null;
    }
  }
  
  _formatAsMarkdownTable(headers, data, includeHeaders) {
    let markdown = '';
    
    if (includeHeaders) {
      markdown += '| ' + headers.join(' | ') + ' |\n';
      markdown += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
    }
    
    for (const row of data) {
      if (Array.isArray(row)) {
        markdown += '| ' + row.map(cell => cell === null ? '' : String(cell)).join(' | ') + ' |\n';
      } else {
        markdown += '| ' + headers.map(header => {
          const cell = row[header];
          return cell === null ? '' : String(cell);
        }).join(' | ') + ' |\n';
      }
    }
    
    return markdown;
  }
  
  _formatAsCSV(headers, data, includeHeaders) {
    let csv = '';
    
    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    
    if (includeHeaders) {
      csv += headers.map(escapeCSV).join(',') + '\n';
    }
    
    for (const row of data) {
      if (Array.isArray(row)) {
        csv += row.map(cell => escapeCSV(cell)).join(',') + '\n';
      } else {
        csv += headers.map(header => escapeCSV(row[header])).join(',') + '\n';
      }
    }
    
    return csv;
  }
  
  async sendToLLM(excelData, instructions, options = {}) {
    const provider = options.provider || this.config.defaultProvider;
    const model = options.model || this.config.defaultModel;
    
    let apiKey = options.apiKey;
    if (!apiKey && this.config.apiKeys && this.config.apiKeys[provider]) {
      apiKey = this.config.apiKeys[provider];
    }
    if (!apiKey) {
      apiKey = process.env[provider === 'openai' ? 'OPENAI_API_KEY' : 'DEEPSEEK_API_KEY'];
    }

    const opts = {
      provider: provider,
      model: model,
      apiKey: apiKey,
      maxTokens: options.maxTokens || this.config.maxTokens || 1000,
      temperature: options.temperature || this.config.temperature || 0.7
    };
    
    if (!opts.apiKey) {
      throw new Error(`Clé API non fournie pour le fournisseur ${opts.provider}. Vérifiez config/config.json ou les variables d'environnement.`);
    }
    
    console.log(`Envoi des données Excel à ${opts.provider} (modèle: ${opts.model}, temp: ${opts.temperature}, maxTokens: ${opts.maxTokens})`);
    
    try {
      const dataStr = typeof excelData.data === 'string' 
        ? excelData.data 
        : JSON.stringify(excelData.data, null, 2);
      
      const truncatedData = dataStr.length > 10000 
        ? dataStr.substring(0, 10000) + '...[données tronquées pour respecter la limite de contexte]' 
        : dataStr;
      
      const prompt = `
Voici des données extraites d'un fichier Excel:
Nom du fichier: ${excelData.fileName}
Nom de la feuille: ${excelData.sheetName}
Nombre de lignes: ${excelData.rowCount}
Nombre de colonnes: ${excelData.columnCount}
Format: ${excelData.format}

DONNÉES:
${truncatedData}

INSTRUCTIONS:
${instructions}

Analyse ces données Excel selon les instructions ci-dessus.
`;
      
      let apiEndpoint, headers, payload;
      
      if (opts.provider === 'deepseek') {
        apiEndpoint = this.config.apiEndpoints.deepseek;
        headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${opts.apiKey}`
        };
        payload = {
          model: opts.model,
          messages: [
            { role: 'user', content: prompt }
          ],
          max_tokens: opts.maxTokens,
          temperature: opts.temperature
        };
      } else {
        apiEndpoint = this.config.apiEndpoints.openai;
        headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${opts.apiKey}`
        };
        payload = {
          model: opts.model,
          messages: [
            { role: 'user', content: prompt }
          ],
          max_tokens: opts.maxTokens,
          temperature: opts.temperature
        };
      }
      
      console.log(`Envoi de la requête à ${apiEndpoint}`);
      const response = await axios.post(apiEndpoint, payload, { headers });
      
      let result;
      if (opts.provider === 'deepseek') {
        result = {
          type: 'success',
          content: response.data.choices[0].message.content,
          rawResponse: response.data
        };
      } else {
        result = {
          type: 'success',
          content: response.data.choices[0].message.content,
          rawResponse: response.data
        };
      }
      
      console.log(`Réponse reçue de ${opts.provider}`);
      return result;
    } catch (error) {
      console.error(`Erreur lors de l'envoi des données à ${opts.provider}:`, error);
      
      return {
        type: 'error',
        content: `Erreur lors de l'analyse des données Excel: ${error.message || error}`,
        error: error
      };
    }
  }
  
  /**
   * Génère un rapport structuré au format JSON à partir d'un fichier Excel
   * @param {string} filePath - Chemin vers le fichier Excel
   * @param {string} instructions - Instructions spécifiques pour l'analyse
   * @param {Object} options - Options de traitement
   * @returns {Promise<Object>} - Rapport structuré au format JSON
   */
  async generateStructuredReport(filePath, instructions = "", options = {}) {
    // Ajouter un timeout de sécurité pour éviter les blocages
    const reportTimeout = setTimeout(() => {
      console.error(`Timeout de sécurité atteint pour la génération du rapport: ${filePath}`);
      // Ce timeout ne fait rien directement, mais permet de voir dans les logs si le processus reste bloqué
    }, 20000); // 20 secondes
    
    try {
      console.log(`Génération d'un rapport structuré pour le fichier Excel: ${filePath}`);
      
      const extractOptions = {
        maxRows: options.maxRows || this.config.maxRows,
        maxCols: options.maxCols || this.config.maxCols,
        sheetIndex: options.sheetIndex || 0,
        includeHeaders: options.includeHeaders !== false,
        formatType: 'json', // Toujours utiliser JSON pour les rapports structurés
        structuredReport: true,
        instructions: instructions
      };
      
      // Utiliser le service Python pour générer le rapport structuré
      if (!pythonExcelService.initialized) {
        await pythonExcelService.initialize();
      }
      
      const result = await pythonExcelService.processExcelFile(filePath, extractOptions);
      
      if (result.error) {
        throw new Error(`Erreur lors de la génération du rapport structuré: ${result.error}`);
      }
      
      if (!result.structured_report) {
        throw new Error("Le rapport structuré n'a pas été généré correctement");
      }
      
      // Nettoyer le timeout
      clearTimeout(reportTimeout);
      
      return {
        type: 'success',
        fileName: result.fileName,
        sheetName: result.sheetName,
        report: result.structured_report
      };
    } catch (error) {
      console.error('Erreur lors de la génération du rapport structuré:', error);
      // Nettoyer le timeout même en cas d'erreur
      clearTimeout(reportTimeout);
      
      return {
        type: 'error',
        content: `Erreur lors de la génération du rapport structuré: ${error.message || error}`,
        error: error
      };
    }
  }
  
  async processExcelWithLLM(filePath, instructions, options = {}) {
    try {
      console.log(`Traitement du fichier Excel avec LLM: ${filePath}`);
      console.log(`Instructions: ${instructions}`);
      
      const extractOptions = {
        maxRows: options.maxRows || this.config.maxRows,
        maxCols: options.maxCols || this.config.maxCols,
        sheetIndex: options.sheetIndex || 0,
        includeHeaders: options.includeHeaders !== false,
        formatType: options.formatType || 'markdown'
      };
      
      const excelData = await this.extractExcelData(filePath, extractOptions);
      
      const llmOptions = {
        provider: options.provider || this.config.defaultProvider,
        model: options.model || this.config.defaultModel,
        apiKey: options.apiKey,
        maxTokens: options.maxTokens || this.config.maxTokens || 1000,
        temperature: options.temperature || this.config.temperature || 0.7
      };
      
      const result = await this.sendToLLM(excelData, instructions, llmOptions);
      return result;
    } catch (error) {
      console.error('Erreur lors du traitement du fichier Excel avec LLM:', error);
      return {
        type: 'error',
        content: `Erreur lors du traitement du fichier Excel: ${error.message || error}`,
        error: error
      };
    }
  }
}

module.exports = new ExcelLLMService();
