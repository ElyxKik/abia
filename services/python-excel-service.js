/**
 * Service pour le prétraitement des fichiers Excel avec Python
 * Utilise pandas et d'autres bibliothèques Python pour extraire et analyser
 * les données Excel avant de les envoyer à l'API DeepSeek
 */

const path = require('path');
const { PythonShell } = require('python-shell');

class PythonExcelService {
  constructor() {
    this.initialized = false;
    this.pythonPath = process.env.PYTHON_PATH || 'python3';
    this.scriptPath = path.join(__dirname, '../python/excel_processor.py');
  }

  /**
   * Initialise le service
   */
  initialize() {
    try {
      // Vérifier que le script Python existe
      const fs = require('fs');
      if (!fs.existsSync(this.scriptPath)) {
        throw new Error(`Le script Python n'existe pas: ${this.scriptPath}`);
      }
      
      this.initialized = true;
      console.log('Service Python Excel initialisé avec succès');
      return true;
    } catch (error) {
      console.error(`Erreur lors de l'initialisation du service Python Excel: ${error.message}`);
      return false;
    }
  }

  /**
   * Traite un fichier Excel avec Python et extrait les données
   * @param {string} filePath - Chemin vers le fichier Excel
   * @param {Object} options - Options de traitement
   * @param {string} options.format - Format de sortie ('json', 'markdown', 'csv', 'text')
   * @param {number} options.maxRows - Nombre maximum de lignes à extraire
   * @param {number} options.maxCols - Nombre maximum de colonnes à extraire
   * @param {number} options.sheetIndex - Index de la feuille à traiter (0 = première feuille)
   * @param {boolean} options.structuredReport - Si true, génère un rapport structuré au format JSON
   * @param {string} options.instructions - Instructions spécifiques pour l'analyse (utilisé avec structuredReport)
   * @returns {Promise<Object>} - Données extraites et métadonnées
   */
  async processExcelFile(filePath, options = {}) {
    console.log(`processExcelFile - Début - Fichier: ${filePath}`);
    console.log(`processExcelFile - Options: ${JSON.stringify(options)}`);
    
    try {
      if (!this.initialized) {
        console.log(`processExcelFile - Initialisation du service`);
        await this.initialize();
      }
  
      const { 
        format: formatType = 'json', 
        maxRows = 100, 
        maxCols = 20, 
        sheetIndex = 0,
        structuredReport = false,
        instructions = '',
        llm_analysis // Ajout de llm_analysis à la déstructuration
      } = options;
  
      return new Promise((resolve, reject) => {
        try {
          // Vérifier que le fichier existe et est accessible
          const fs = require('fs');
          if (!fs.existsSync(filePath)) {
            console.error(`processExcelFile - Le fichier ${filePath} n'existe pas`);
            reject(new Error(`Le fichier ${filePath} n'existe pas`));
            return;
          }
          
          console.log(`processExcelFile - Fichier existant et accessible: ${filePath}`);
          
          // Vérifier le format du fichier
          const path = require('path');
          const fileExtension = path.extname(filePath).toLowerCase();
          console.log(`processExcelFile - Format du fichier: ${fileExtension}`);
          
          if (!['.xlsx', '.xls', '.csv'].includes(fileExtension)) {
            console.error(`processExcelFile - Format de fichier non supporté: ${fileExtension}`);
            reject(new Error(`Format de fichier non supporté: ${fileExtension}`));
            return;
          }
          
          // Construire les arguments pour le script Python selon l'ordre attendu dans la fonction main() :
          // 1) file_path, 2) format_type, 3) max_rows, 4) max_cols, 5) sheet_index
          const args = [filePath, formatType, maxRows, maxCols, sheetIndex];
          
          // Ajouter l'option de rapport structuré si demandé
          if (structuredReport) {
            args.push('--structured-report');
            if (instructions) {
              args.push(instructions);
            }
          }
          
          // Ajouter l'analyse LLM si disponible
          if (options.llm_analysis) {
            args.push('--llm-analysis');
            
            // Créer un fichier temporaire pour stocker l'analyse LLM (pour éviter les problèmes de longueur d'argument)
            const tempDir = path.join(os.tmpdir(), 'abia4');
            if (!fs.existsSync(tempDir)) {
              fs.mkdirSync(tempDir, { recursive: true });
            }
            
            const llmAnalysisFile = path.join(tempDir, `llm_analysis_${Date.now()}.json`);
            fs.writeFileSync(llmAnalysisFile, options.llm_analysis);
            
            // Passer le chemin du fichier temporaire au lieu du contenu entier
            args.push(llmAnalysisFile);
            
            console.log(`Analyse LLM sauvegardée dans le fichier temporaire: ${llmAnalysisFile}`);
          }
          
          const pythonOptions = {
            mode: 'json',
            pythonPath: this.pythonPath,
            args: args
          };
    
          console.log(`processExcelFile - Lancement du script Python: ${this.scriptPath}`);
          console.log(`processExcelFile - Chemin Python utilisé: ${this.pythonPath}`);
          console.log(`processExcelFile - Arguments: ${JSON.stringify(pythonOptions.args)}`);
          
          // Déterminer le timeout en fonction du type d'opération
          let timeout;
          // Utiliser options.llm_analysis pour vérifier sa présence
          if (structuredReport || options.llm_analysis) { 
            // Timeout plus long pour les opérations complexes comme les rapports structurés
            timeout = 30000; // 30 secondes pour les opérations impliquant une analyse structurée
            console.log(`Timeout de ${timeout/1000}s configuré pour le traitement du rapport structuré`);
          } else {
            // Timeout standard pour les opérations simples
            timeout = 10000; // 10 secondes pour les opérations standard
          }
          let timeoutId;
          let isProcessCompleted = false;
          let isResolved = false;
          
          const pythonProcess = PythonShell.run(this.scriptPath, pythonOptions);
          
          // Créer une promesse avec timeout
          const timeoutPromise = new Promise((_, timeoutReject) => {
            timeoutId = setTimeout(() => {
              if (!isResolved && !isProcessCompleted) {
                console.error(`Délai d'attente dépassé (${timeout/1000}s) pour le traitement Python - Abandon du processus`);
                timeoutReject(new Error(`Délai d'attente dépassé (${timeout/1000}s) pour le traitement Python. Le service ne répond pas, veuillez réessayer.`));
              }
            }, timeout);
          });
          
          // Exécuter la promesse Python avec timeout
          Promise.race([pythonProcess, timeoutPromise])
            .then(results => {
              clearTimeout(timeoutId);
              isResolved = true;
              isProcessCompleted = true;
              console.log('processExcelFile - Résultat du script Python reçu');
              
              if (!results || results.length === 0) {
                console.error('processExcelFile - Aucun résultat retourné par le script Python');
                reject(new Error('Aucun résultat retourné par le script Python'));
                return;
              }
    
              console.log(`processExcelFile - Résultat du script Python: ${JSON.stringify(results[0]).substring(0, 200)}...`);
              
              const result = results[0];
              if (result.error) {
                console.error(`processExcelFile - Erreur retournée par le script Python: ${result.error}`);
                reject(new Error(result.error));
                return;
              }
    
              console.log(`processExcelFile - Fichier Excel traité avec succès: ${filePath}`);
              resolve(result);
            })
            .catch(error => {
              clearTimeout(timeoutId);
              isResolved = true;
              isProcessCompleted = true;
              console.error(`processExcelFile - Erreur lors du traitement du fichier Excel avec Python: ${error.message}`);
              console.error('processExcelFile - Stack trace:', error.stack);
              reject(new Error(`Le traitement a été interrompu: ${error.message}`));
            });
        } catch (error) {
          console.error(`processExcelFile - Erreur globale: ${error.message}`);
          console.error('processExcelFile - Stack trace:', error.stack);
          reject(error);
        }
      });
    } catch (error) {
      console.error(`processExcelFile - Erreur de niveau supérieur: ${error.message}`);
      console.error('processExcelFile - Stack trace:', error.stack);
      throw error;
    }
  }

  /**
   * Crée un prompt formaté pour l'API DeepSeek à partir d'un fichier Excel
   * @param {string} filePath - Chemin vers le fichier Excel
   * @param {string} instructions - Instructions pour l'analyse
   * @param {Object} options - Options de traitement
   * @returns {Promise<string>} - Prompt formaté pour DeepSeek
   */
  async createDeepSeekPrompt(filePath, instructions, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const {
      format = 'json', 
      maxRows = 100, 
      maxCols = 20, 
      sheetIndex = 0,
      includeAnalysis = true,
      maxDataLength = 8000
    } = options;

    return new Promise((resolve, reject) => {
      const pythonOptions = {
        mode: 'json',
        pythonPath: this.pythonPath,
        args: [filePath, format, maxRows, maxCols, sheetIndex, instructions, '--prompt']
      };

      console.log(`Création d'un prompt DeepSeek pour le fichier Excel: ${filePath}`);

      PythonShell.run(this.scriptPath, pythonOptions)
        .then(results => {
          if (!results || results.length === 0) {
            reject(new Error('Aucun résultat retourné par le script Python'));
            return;
          }

          const result = results[0];
          if (typeof result === 'string') {
            console.log(`Prompt DeepSeek créé avec succès pour: ${filePath}`);
            resolve(result);
          } else if (result.error) {
            reject(new Error(result.error));
          } else {
            reject(new Error('Format de résultat inattendu du script Python'));
          }
        })
        .catch(error => {
          console.error(`Erreur lors de la création du prompt DeepSeek: ${error.message}`);
          reject(error);
        });
    });
  }
}

// Exporter une instance unique du service
const pythonExcelService = new PythonExcelService();
module.exports = pythonExcelService;
