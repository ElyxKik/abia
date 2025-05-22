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
    this.initialized = false; // Initialiser la propriété à false
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
          console.log('Configuration LLM trouvée dans config.json');
          
          // Extraire le fournisseur LLM (deepseek, openai, etc.)
          if (globalConfig.llm.provider) {
            this.config.defaultProvider = globalConfig.llm.provider;
            console.log(`Fournisseur LLM configuré: ${this.config.defaultProvider}`);
            
            // Stocker la clé API
            if (globalConfig.llm.apiKey) {
              this.config.apiKeys[globalConfig.llm.provider] = globalConfig.llm.apiKey;
              console.log(`Clé API ${this.config.defaultProvider} configurée avec succès`);
            } else {
              console.warn(`Aucune clé API n'est configurée pour ${this.config.defaultProvider}`);
            }
          }
          
          // Extraire les autres paramètres de configuration
          if (globalConfig.llm.model) {
            this.config.defaultModel = globalConfig.llm.model;
            console.log(`Modèle LLM configuré: ${this.config.defaultModel}`);
          }
          
          if (globalConfig.llm.temperature) {
            this.config.temperature = globalConfig.llm.temperature;
            console.log(`Température LLM configurée: ${this.config.temperature}`);
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
    
    // Indiquer que le service est initialisé
    this.initialized = true;
    console.log('Service Excel LLM initialisé avec succès');
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
      
      // Respecter les noms des options attendus par pythonExcelService.processExcelFile
      const pythonOptions = {
        // Nommer les propriétés exactement comme attendu dans le service Python
        formatType: options.formatType, // 'formatType' au lieu de 'format'
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
  /**
   * Traite les données Excel avec un modèle LLM pour générer une analyse intelligente
   * @param {Object} data - Données Excel extraites 
   * @param {string} instructions - Instructions pour l'analyse
   * @param {Object} options - Options de traitement
   * @returns {Promise<Object>} - Réponse du modèle LLM
   */
  /**
   * Génère une analyse basique des données Excel sans utiliser un LLM
   * Cette fonction est utilisée comme fallback quand la clé API n'est pas disponible
   * @param {Object} data - Données Excel extraites
   * @param {string} instructions - Instructions pour l'analyse
   * @returns {Object} - Analyse basique structurée
   */
  generateBasicAnalysisWithoutLLM(data, instructions) {
    console.log('Génération d\'une analyse sans LLM...');
    
    try {
      // Créer une structure de base pour l'analyse
      let analysis = {
        content: JSON.stringify({
          titre: `Analyse du fichier: ${data.fileName || 'Excel'}`,
          resume: `Analyse automatique générée pour ${data.rowCount || 0} lignes et ${data.columnCount || 0} colonnes de données.`,
          sections: [
            {
              titre: "Aperçu des données",
              contenu: `Le fichier contient ${data.rowCount || 0} lignes et ${data.columnCount || 0} colonnes.`
            }
          ],
          recommandations: [
            "Activez le service LLM pour une analyse plus détaillée."
          ]
        }, null, 2)
      };
      
      // Ajouter des sections spécifiques si des données sont disponibles
      if (data.format === 'json' && Array.isArray(data.data) && data.data.length > 0) {
        const sampleObj = data.data[0];
        const keys = Object.keys(sampleObj);
        
        // Ajouter une section pour la structure des données
        const structureSection = {
          titre: "Structure des données",
          contenu: `Les données contiennent les colonnes suivantes: ${keys.join(', ')}.`
        };
        
        // Essayer d'identifier des colonnes numériques pour des statistiques basiques
        const numericColumns = [];
        keys.forEach(key => {
          if (typeof sampleObj[key] === 'number') {
            numericColumns.push(key);
          }
        });
        
        if (numericColumns.length > 0) {
          // Calculer des statistiques basiques pour les colonnes numériques
          const statsSection = {
            titre: "Statistiques de base",
            contenu: "Analyse des colonnes numériques:\n"
          };
          
          numericColumns.forEach(col => {
            let sum = 0;
            let min = Number.MAX_VALUE;
            let max = Number.MIN_VALUE;
            let count = 0;
            
            data.data.forEach(row => {
              if (typeof row[col] === 'number') {
                sum += row[col];
                min = Math.min(min, row[col]);
                max = Math.max(max, row[col]);
                count++;
              }
            });
            
            const avg = count > 0 ? sum / count : 0;
            statsSection.contenu += `\n- ${col}: Min=${min}, Max=${max}, Moyenne=${avg.toFixed(2)}`;
          });
          
          // Ajouter les sections au JSON
          const analysisObj = JSON.parse(analysis.content);
          analysisObj.sections.push(structureSection);
          analysisObj.sections.push(statsSection);
          analysis.content = JSON.stringify(analysisObj, null, 2);
        }
      }
      
      return analysis;
    } catch (error) {
      console.error('Erreur lors de la génération de l\'analyse sans LLM:', error);
      return {
        content: JSON.stringify({
          titre: "Analyse basique (mode de secours)",
          sections: [
            {
              titre: "Informations sur le fichier",
              contenu: `Fichier: ${data.fileName}, Feuille: ${data.sheetName || 'Non spécifiée'}`
            }
          ]
        })
      };
    }
  }
  
  async processWithLLM(data, instructions, options = {}) {
    console.log('Traitement des données Excel avec LLM...');
    
    try {
      // Vérifier que nous avons une clé API pour le fournisseur par défaut
      const provider = options.provider || this.config.defaultProvider;
      const apiKey = this.config.apiKeys[provider];
      
      // Vérifier si nous sommes en mode sans LLM ou si la clé API n'est pas configurée
      if (!apiKey || options.noLLM) {
        console.log(`Mode sans LLM activé (clé API ${provider} non disponible ou mode sans LLM forcé)`);
        
        // Retourner une analyse simple sans LLM
        return this.generateBasicAnalysisWithoutLLM(data, instructions);
      }
      
      // Préparer les données pour le LLM
      const model = options.model || this.config.defaultModel;
      const temperature = options.temperature || this.config.temperature || 0.7;
      const maxTokens = options.maxTokens || this.config.maxTokens || 4000;
      
      // Créer un prompt structuré à partir des données Excel
      const prompt = this.formatPromptForLLM(data, instructions);
      
      // Structure de la requête pour l'API DeepSeek ou OpenAI
      const requestBody = {
        model: model,
        messages: [
          {
            role: "system",
            content: "Tu es un assistant d'analyse de données Excel spécialisé dans la création de rapports structurés. Analyse les données fournies et génère un rapport complet avec des sections claires, des insights pertinents et des recommandations."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: temperature,
        max_tokens: maxTokens
      };
      
      // Sélectionner l'URL de l'API en fonction du fournisseur
      const apiUrl = this.config.apiEndpoints[provider];
      if (!apiUrl) {
        throw new Error(`URL d'API non configurée pour le fournisseur: ${provider}`);
      }
      
      console.log(`Envoi de la requête à l'API ${provider}...`);
      
      // Appel à l'API
      const response = await axios.post(apiUrl, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      // Traiter la réponse
      if (response.data && response.data.choices && response.data.choices.length > 0) {
        const content = response.data.choices[0].message.content;
        console.log('Réponse LLM reçue avec succès');
        return { content };
      } else {
        throw new Error('Format de réponse LLM invalide ou vide');
      }
    } catch (error) {
      console.error('Erreur lors du traitement LLM:', error);
      
      // Si l'erreur est liée à l'API, essayer de formater un message d'erreur plus informatif
      if (error.response) {
        const statusCode = error.response.status;
        const errorData = error.response.data;
        
        console.error(`Erreur API (${statusCode}):`, errorData);
        
        return {
          error: `Erreur de l'API LLM (${statusCode}): ${errorData.error || JSON.stringify(errorData)}`
        };
      }
      
      // Erreur générique
      return {
        error: `Erreur lors de l'analyse LLM: ${error.message}`
      };
    }
  }
  
  /**
   * Formate un prompt pour le LLM à partir des données Excel
   * @param {Object} data - Données Excel extraites
   * @param {string} instructions - Instructions pour l'analyse
   * @returns {string} - Prompt formaté pour le LLM
   */
  formatPromptForLLM(data, instructions) {
    let prompt = `## Instructions
${instructions || "Analyse ces données Excel et génère un rapport structuré détaillé."}

## Informations sur le fichier
`;
    
    // Ajouter les métadonnées du fichier
    prompt += `Nom du fichier: ${data.fileName || 'Non spécifié'}
`;
    prompt += `Feuille: ${data.sheetName || 'Par défaut'}
`;
    prompt += `Dimensions: ${data.rowCount || 0} lignes x ${data.columnCount || 0} colonnes\n\n`;
    
    // Ajouter un échantillon des données
    prompt += "## Échantillon de données\n";
    
    if (data.format === 'json' && Array.isArray(data.data)) {
      // Limiter le nombre de lignes pour éviter d'excéder la taille maximale du prompt
      const sampleData = data.data.slice(0, Math.min(data.data.length, 20));
      prompt += JSON.stringify(sampleData, null, 2);
    } else if (data.format === 'markdown' && typeof data.data === 'string') {
      // Pour les données au format markdown, limiter la taille
      prompt += data.data.substring(0, 2000) + (data.data.length > 2000 ? '...' : '');
    } else {
      prompt += "Données non disponibles au format requis.";
    }
    
    // Ajouter des instructions spécifiques pour la structure du rapport
    prompt += `

## Format de réponse attendu
Génère un rapport structuré au format JSON avec la structure suivante :

{
  "titre": "Titre du rapport",
  "resume": "Résumé général des données",
  "sections": [
    {
      "titre": "Titre de la section 1",
      "contenu": "Contenu détaillé de la section 1"
    },
    {
      "titre": "Titre de la section 2",
      "contenu": "Contenu détaillé de la section 2"
    }
  ],
  "recommandations": [
    "Recommandation 1",
    "Recommandation 2"
  ]
}

Assure-toi d'inclure au moins 3-5 sections pertinentes et 2-4 recommandations basées sur l'analyse des données.`;
    
    return prompt;
  }
  
  async generateStructuredReport(filePath, instructions = "", options = {}) {
    // Ajouter un timeout de sécurité pour éviter les blocages
    const reportTimeout = setTimeout(() => {
      console.error(`Timeout de sécurité atteint pour la génération du rapport: ${filePath}`);
      // Ce timeout ne fait rien directement, mais permet de voir dans les logs si le processus reste bloqué
    }, 60000); // 60 secondes (augmenté pour tenir compte du temps d'appel LLM)
    
    try {
      console.log(`Génération d'un rapport structuré pour le fichier Excel avec LLM: ${filePath}`);
      
      // Initialiser les services nécessaires
      if (!pythonExcelService.initialized) {
        await pythonExcelService.initialize();
      }
      
      // Étape 1: Extraire les données brutes du fichier Excel avec Python
      console.log('Phase 1: Extraction des données Excel avec Python');
      const extractOptions = {
        maxRows: options.maxRows || this.config.maxRows,
        maxCols: options.maxCols || this.config.maxCols,
        sheetIndex: options.sheetIndex || 0,
        includeHeaders: options.includeHeaders !== false,
        formatType: 'json'
      };
      
      const rawData = await pythonExcelService.processExcelFile(filePath, extractOptions);
      
      if (rawData.error) {
        throw new Error(`Erreur lors de l'extraction des données Excel: ${rawData.error}`);
      }
      
      console.log(`Données extraites: ${rawData.fileName}, ${rawData.rowCount} lignes, ${rawData.columnCount} colonnes`);
      
      // Étape 2: Préparer des instructions spécifiques pour le LLM
      const llmInstructions = instructions || 
        "Analyse ce fichier Excel et crée un rapport structuré complet avec les sections suivantes : " +
        "1. Résumé des données principales " +
        "2. Analyse des tendances et patterns identifiés " +
        "3. Points clés à retenir " +
        "4. Recommandations basées sur les données " +
        "Assure-toi d'inclure des statistiques pertinentes et une analyse approfondie.";
      
      // Étape 3: Envoyer les données au LLM pour analyse et structuration
      console.log('Phase 2: Analyse des données avec DeepSeek LLM');
      const llmResponse = await this.processWithLLM(rawData, llmInstructions, options);
      
      if (!llmResponse || llmResponse.error) {
        throw new Error(`Erreur lors de l'analyse LLM: ${llmResponse?.error || 'Réponse LLM vide'}`);
      }
      
      // Étape 4: Générer un rapport structuré basé sur l'analyse LLM
      console.log('Phase 3: Génération du rapport structuré final');
      
      // Extraire le contenu de la réponse LLM
      const llmContent = llmResponse.content || llmResponse;
      
      // Générer le rapport structuré final avec Python
      // Préparer les options avec le bon format de nom de variable
      const pythonOptions = {
        ...extractOptions,
        structuredReport: true,
        instructions: llmInstructions,
        // Utiliser llm_analysis pour être cohérent avec le script Python
        llm_analysis: llmContent
      };
      
      console.log('Envoi des données au script Python avec analyse LLM');
      const result = await pythonExcelService.processExcelFile(filePath, pythonOptions);
      
      if (result.error) {
        throw new Error(`Erreur lors de la génération du rapport structuré: ${result.error}`);
      }
      
      // Vérifier si le rapport structuré est présent
      if (!result.structured_report) {
        // Fallback: créer un rapport structuré à partir de l'analyse LLM
        console.log('Construction d\'un rapport structuré à partir de l\'analyse LLM');
        
        // Créer une structure de rapport par défaut
        const llmStructuredReport = {
          titre: `Rapport d'analyse: ${path.basename(filePath)}`,
          fichier: {
            nom: path.basename(filePath),
            feuille: result.sheetName || '',
            dimensions: `${result.rowCount || 0} lignes × ${result.columnCount || 0} colonnes`
          },
          resume: "Analyse complète des données Excel",
          sections: [],
          recommandations: []
        };
        
        // Tenter d'extraire des sections depuis la réponse LLM
        try {
          // Détecter si la réponse contient du JSON
          if (typeof llmContent === 'string' && llmContent.includes('{') && llmContent.includes('}')) {
            const jsonMatch = llmContent.match(/\{[\s\S]*\}/m);
            if (jsonMatch) {
              const extractedJson = JSON.parse(jsonMatch[0]);
              if (extractedJson.sections || extractedJson.recommendations) {
                Object.assign(llmStructuredReport, extractedJson);
              }
            }
          }
          
          // Si aucun JSON n'a été détecté, diviser le texte en sections
          if (llmStructuredReport.sections.length === 0 && typeof llmContent === 'string') {
            // Détecter les sections par les titres (numérotés ou non)
            const sectionRegex = /\n\s*(\d+\.\s*|#+\s*|\*\*\s*)?([A-Z][^\n]+)\s*[:\n]/g;
            let match;
            let lastIndex = 0;
            const sections = [];
            
            while ((match = sectionRegex.exec(llmContent)) !== null) {
              const sectionTitle = match[2].trim();
              const startIndex = match.index + match[0].length;
              
              // Ajouter la section précédente
              if (sections.length > 0) {
                const prevSection = sections[sections.length - 1];
                prevSection.contenu = llmContent.substring(lastIndex, match.index).trim();
              }
              
              // Ajouter la nouvelle section
              sections.push({
                titre: sectionTitle,
                contenu: ''
              });
              
              lastIndex = startIndex;
            }
            
            // Ajouter le contenu de la dernière section
            if (sections.length > 0) {
              const lastSection = sections[sections.length - 1];
              lastSection.contenu = llmContent.substring(lastIndex).trim();
            }
            
            // Si aucune section n'a été trouvée, créer une section unique
            if (sections.length === 0) {
              sections.push({
                titre: "Analyse des données",
                contenu: llmContent
              });
            }
            
            llmStructuredReport.sections = sections;
          }
        } catch (parseError) {
          console.error('Erreur lors du parsing de la réponse LLM:', parseError);
          // Créer une section de secours avec le contenu brut
          llmStructuredReport.sections = [{
            titre: "Analyse des données",
            contenu: typeof llmContent === 'string' ? llmContent : JSON.stringify(llmContent, null, 2)
          }];
        }
        
        // Utiliser ce rapport comme fallback
        result.structured_report = llmStructuredReport;
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
    console.log(`Traitement du fichier Excel avec LLM: ${filePath}`);
    console.log(`Instructions: ${instructions}`);
    console.log(`Options: ${JSON.stringify(options)}`);
    
    try {
      // Utiliser 'json' comme format par défaut pour éviter les problèmes de conversion en int
      const extractOptions = {
        // Respecter l'ordre des paramètres attendus par le script Python
        formatType: 'json', // Toujours utiliser JSON pour l'extraction initiale
        maxRows: options.maxRows || this.config.maxRows,
        maxCols: options.maxCols || this.config.maxCols,
        sheetIndex: options.sheetIndex || 0,
        includeHeaders: options.includeHeaders !== false
      };
      
      console.log(`Extraction des données Excel avec options: ${JSON.stringify(extractOptions)}`);
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
