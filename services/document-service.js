const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const XlsxPopulate = require('xlsx-populate');
const ExcelJS = require('exceljs');
const docx = require('docx');
const { spawn } = require('child_process');
const { PythonShell } = require('python-shell');

// Importer le service Excel-LLM une seule fois au niveau du module
let excelLLMService = null;
try {
  excelLLMService = require('./excel-llm-service');
  console.log('Service Excel-LLM chargé avec succès');
} catch (error) {
  console.error('Erreur lors du chargement du service Excel-LLM:', error);
}

// Gestion sécurisée de l'import d'Electron
let electronApp = null;
try {
  const electron = require('electron');
  electronApp = electron.app || (electron.remote && electron.remote.app);
} catch (error) {
  console.warn('Electron n\'est pas disponible dans le service de document');
}

class DocumentService {
  constructor() {
    this.supportedFormats = {
      excel: ['.xlsx', '.xls', '.csv'],
      word: ['.docx', '.doc'],
      pdf: ['.pdf'],
      text: ['.txt', '.md']
    };
    this.initialized = false;
  }
  
  /**
   * Initialise le service de document
   * @returns {boolean} - True si l'initialisation a réussi
   */
  initialize() {
    try {
      console.log('Initialisation du service de document...');
      
      // Vérifier les chemins des scripts Python
      let pythonScriptsPath;
      
      if (electronApp) {
        const appPath = electronApp.getAppPath();
        pythonScriptsPath = path.join(appPath, 'python');
      } else {
        // Fallback pour les environnements non-Electron
        pythonScriptsPath = path.join(process.cwd(), 'python');
      }
      
      // Vérifier que le répertoire des scripts Python existe
      if (!fs.existsSync(pythonScriptsPath)) {
        console.warn(`Le répertoire des scripts Python n'existe pas: ${pythonScriptsPath}`);
        fs.mkdirSync(pythonScriptsPath, { recursive: true });
      }
      
      // Créer les scripts Python s'ils n'existent pas
      this._createPythonPDFExtractor();
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du service de document:', error);
      return false;
    }
  }

  /**
   * Crée un script Python pour extraire le texte des PDF
   */
  _createPythonPDFExtractor() {
    // Déterminer les chemins en fonction de si l'application est packagée ou non
    const isPacked = electronApp && electronApp.isPackaged;
    const pythonPath = isPacked ? path.join(process.resourcesPath, 'python-runtime') : path.join(__dirname, '../python-runtime');
    const scriptDir = isPacked 
      ? path.join(process.resourcesPath, 'python')
      : path.join(__dirname, '../python');
    
    const pdfExtractorPath = path.join(scriptDir, 'pdf_extractor.py');
    
    // Vérifier si le script existe déjà
    if (fs.existsSync(pdfExtractorPath)) {
      return;
    }
    
    // Contenu du script Python pour extraire le texte des PDF
    const pythonScript = `
import sys
import os
from pdfminer.high_level import extract_text

def extract_text_from_pdf(pdf_path, output_path=None):
    """
    Extract text from a PDF file using pdfminer
    """
    try:
        text = extract_text(pdf_path)
        
        if output_path:
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(text)
            return output_path
        else:
            return text
    except Exception as e:
        print(f"Error extracting text from PDF: {e}", file=sys.stderr)
        return None

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python pdf_extractor.py [pdf_path] [output_path (optional)]", file=sys.stderr)
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None
    
    result = extract_text_from_pdf(pdf_path, output_path)
    if not output_path:
        print(result)
    `;
    
    // Créer le répertoire s'il n'existe pas
    if (!fs.existsSync(scriptDir)) {
      fs.mkdirSync(scriptDir, { recursive: true });
    }
    
    // Écrire le script
    fs.writeFileSync(pdfExtractorPath, pythonScript);
    console.log(`Script Python d'extraction PDF créé: ${pdfExtractorPath}`);
  }
  
  /**
   * Détermine le type de document à partir de son extension
   * @param {string} filePath - Chemin du fichier
   * @returns {string|null} - Type de document ou null si non supporté
   */
  getDocumentType(filePath) {
    const extension = path.extname(filePath).toLowerCase();
    
    for (const [type, extensions] of Object.entries(this.supportedFormats)) {
      if (extensions.includes(extension)) {
        return type;
      }
    }
    
    return null;
  }
  
  /**
   * Analyse un fichier Excel et extrait des informations structurées
   * @param {string} filePath - Chemin du fichier Excel
   * @returns {Promise<Object>} - Données structurées du fichier Excel
   */
  /**
   * Vérifie si un fichier Excel est valide
   * @param {string} filePath - Chemin du fichier Excel
   * @returns {boolean} - True si le fichier est valide
   */
  _validateExcelFile(filePath) {
    try {
      // Vérifier que le fichier existe et est accessible
      const stats = fs.statSync(filePath);
      if (!stats.isFile() || stats.size === 0) {
        console.error(`Le fichier ${filePath} n'est pas valide ou est vide`);
        return false;
      }
      
      // Vérifier l'extension du fichier
      const ext = path.extname(filePath).toLowerCase();
      if (!this.supportedFormats.excel.includes(ext)) {
        console.error(`Le format ${ext} n'est pas supporté`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error(`Erreur lors de la validation du fichier Excel: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Analyse un fichier Excel en utilisant ExcelJS (méthode alternative)
   * @param {string} filePath - Chemin du fichier Excel
   * @returns {Promise<Object>} - Analyse structurée du fichier Excel
   */
  async _analyzeExcelWithExcelJS(filePath) {
    console.log(`Tentative d'analyse avec ExcelJS: ${filePath}`);
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    const analysis = {
      filename: path.basename(filePath),
      sheetCount: workbook.worksheets.length,
      sheets: {},
      summary: {
        textColumns: {},
        numericColumns: {},
        dateColumns: {}
      }
    };
    
    // Analyser chaque feuille
    for (const worksheet of workbook.worksheets) {
      const sheetName = worksheet.name;
      const rowCount = worksheet.rowCount || 0;
      const columnCount = worksheet.columnCount || 0;
      
      const sheetAnalysis = {
        name: sheetName,
        rowCount,
        columnCount,
        columns: {}
      };
      
      // S'il n'y a pas de données, passer à la feuille suivante
      if (rowCount === 0 || columnCount === 0) {
        analysis.sheets[sheetName] = sheetAnalysis;
        continue;
      }
      
      // Extraire les en-têtes (première ligne)
      const headers = [];
      const headerRow = worksheet.getRow(1);
      
      for (let col = 1; col <= columnCount; col++) {
        const cell = headerRow.getCell(col);
        const headerValue = cell.value;
        headers.push(headerValue ? headerValue.toString() : `Column ${col}`);
      }
      
      // Analyser chaque colonne
      for (let col = 1; col <= columnCount; col++) {
        const header = headers[col - 1];
        const columnData = [];
        
        // Extraire les données de la colonne (en ignorant l'en-tête)
        for (let row = 2; row <= rowCount; row++) {
          const cell = worksheet.getRow(row).getCell(col);
          columnData.push(cell.value);
        }
        
        // Déterminer le type de données de la colonne
        const types = this._determineColumnTypes(columnData);
        
        sheetAnalysis.columns[header] = {
          index: col,
          dataType: types.primaryType,
          valueCount: columnData.filter(val => val !== null && val !== undefined).length,
          nullCount: columnData.filter(val => val === null || val === undefined).length,
          uniqueValueCount: new Set(columnData.filter(val => val !== null && val !== undefined).map(v => v.toString())).size
        };
        
        // Ajouter des statistiques pour les colonnes numériques
        if (types.primaryType === 'numeric') {
          const numericValues = columnData.filter(val => typeof val === 'number');
          
          if (numericValues.length > 0) {
            sheetAnalysis.columns[header].min = Math.min(...numericValues);
            sheetAnalysis.columns[header].max = Math.max(...numericValues);
            sheetAnalysis.columns[header].sum = numericValues.reduce((a, b) => a + b, 0);
            sheetAnalysis.columns[header].average = sheetAnalysis.columns[header].sum / numericValues.length;
          }
          
          analysis.summary.numericColumns[header] = sheetName;
        } else if (types.primaryType === 'text') {
          analysis.summary.textColumns[header] = sheetName;
        } else if (types.primaryType === 'date') {
          analysis.summary.dateColumns[header] = sheetName;
        }
      }
      
      analysis.sheets[sheetName] = sheetAnalysis;
    }
    
    return analysis;
  }
  
  /**
   * Analyse un fichier Excel en utilisant plusieurs bibliothèques
   * @param {string} filePath - Chemin du fichier Excel
   * @returns {Promise<Object>} - Données structurées du fichier Excel
   */
  async analyzeExcelFile(filePath) {
    // Valider le fichier avant de l'analyser
    if (!this._validateExcelFile(filePath)) {
      throw new Error(`Le fichier ${filePath} n'est pas un fichier Excel valide.`);
    }
    
    try {
      // Essayer d'abord avec xlsx-populate
      try {
        console.log(`Tentative d'analyse avec XlsxPopulate: ${filePath}`);
        const workbook = await XlsxPopulate.fromFileAsync(filePath);
        const sheets = workbook.sheets();
        
        const analysis = {
          filename: path.basename(filePath),
          sheetCount: sheets.length,
          sheets: {},
          summary: {
            textColumns: {},
            numericColumns: {},
            dateColumns: {}
          }
        };
        
        // Analyser chaque feuille
        for (const sheet of sheets) {
          const sheetName = sheet.name();
          const usedRange = sheet.usedRange();
          const rowCount = usedRange ? usedRange.endRow() : 0;
          const columnCount = usedRange ? usedRange.endColumn() : 0;
          
          const sheetAnalysis = {
            name: sheetName,
            rowCount,
            columnCount,
            columns: {}
          };
          
          // S'il n'y a pas de données, passer à la feuille suivante
          if (rowCount === 0 || columnCount === 0) {
            analysis.sheets[sheetName] = sheetAnalysis;
            continue;
          }
          
          // Extraire les en-têtes (première ligne)
          const headers = [];
          for (let col = 1; col <= columnCount; col++) {
            const headerValue = sheet.cell(1, col).value();
            headers.push(headerValue ? headerValue.toString() : `Column ${col}`);
          }
          
          // Analyser chaque colonne
          for (let col = 1; col <= columnCount; col++) {
            const header = headers[col - 1];
            const columnData = [];
            
            // Extraire les données de la colonne (en ignorant l'en-tête)
            for (let row = 2; row <= rowCount; row++) {
              columnData.push(sheet.cell(row, col).value());
            }
            
            // Déterminer le type de données de la colonne
            const types = this._determineColumnTypes(columnData);
            
            sheetAnalysis.columns[header] = {
              index: col,
              dataType: types.primaryType,
              valueCount: columnData.filter(val => val !== null && val !== undefined).length,
              nullCount: columnData.filter(val => val === null || val === undefined).length,
              uniqueValueCount: new Set(columnData.filter(val => val !== null && val !== undefined)).size
            };
            
            // Ajouter des statistiques pour les colonnes numériques
            if (types.primaryType === 'numeric') {
              const numericValues = columnData.filter(val => typeof val === 'number');
              
              if (numericValues.length > 0) {
                sheetAnalysis.columns[header].min = Math.min(...numericValues);
                sheetAnalysis.columns[header].max = Math.max(...numericValues);
                sheetAnalysis.columns[header].sum = numericValues.reduce((a, b) => a + b, 0);
                sheetAnalysis.columns[header].average = sheetAnalysis.columns[header].sum / numericValues.length;
              }
              
              analysis.summary.numericColumns[header] = sheetName;
            } else if (types.primaryType === 'text') {
              analysis.summary.textColumns[header] = sheetName;
            } else if (types.primaryType === 'date') {
              analysis.summary.dateColumns[header] = sheetName;
            }
          }
          
          analysis.sheets[sheetName] = sheetAnalysis;
        }
        
        return analysis;
      } catch (xlsxError) {
        // Si xlsx-populate échoue, essayer avec ExcelJS
        console.error(`Erreur avec xlsx-populate: ${xlsxError.message}`);
        console.log('Tentative de fallback vers ExcelJS...');
        try {
          // Essayer d'abord avec ExcelJS
          return await this._analyzeExcelWithExcelJS(filePath);
        } catch (excelJSError) {
          console.error(`Erreur avec ExcelJS: ${excelJSError.message}`);
          
          // Vérifier si l'erreur est liée à la structure ZIP ou au format du fichier
          if (excelJSError.message.includes('central directory') || 
              excelJSError.message.includes('zip') || 
              excelJSError.message.includes('invalid') || 
              excelJSError.message.includes('corrupt')) {
            
            // Essayer d'utiliser notre service Python comme solution de secours
            try {
              console.log('Tentative de récupération du fichier Excel avec le service Python...');
              const excelLLMService = require('./excel-llm-service');
              
              // Vérifier si le service est disponible
              if (excelLLMService && typeof excelLLMService.extractExcelData === 'function') {
                const options = {
                  maxRows: 100,
                  maxCols: 20,
                  formatType: 'json',
                  includeHeaders: true
                };
                
                const result = await excelLLMService.extractExcelData(filePath, options);
                
                if (result.error) {
                  throw new Error(result.error);
                }
                
                console.log('Récupération réussie avec le service Python');
                return {
                  fileName: result.fileName,
                  sheetName: result.sheetName || 'Feuille1',
                  rowCount: result.rowCount || 0,
                  columnCount: result.columnCount || 0,
                  data: result.data || []
                };
              } else {
                throw new Error('Service de récupération non disponible');
              }
            } catch (pythonError) {
              console.error('Erreur lors de la tentative de récupération avec Python:', pythonError);
              throw new Error('Format de fichier Excel non reconnu ou corrompu. Essayez de le réenregistrer au format .xlsx ou .csv, ou de vérifier que le fichier n\'est pas endommagé.');
            }
          } else {
            throw new Error(`Erreur lors de l'analyse Excel avec ExcelJS: ${excelJSError.message}`);
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors de l\'analyse du fichier Excel:', error);
      throw error;
    }
  }
  
  /**
   * Extrait le texte d'un fichier PDF
   * @param {string} filePath - Chemin du fichier PDF
   * @returns {Promise<string>} - Texte extrait du PDF
   */
  async extractTextFromPDF(filePath) {
    try {
      // Vérifier si le fichier existe
      if (!fs.existsSync(filePath)) {
        throw new Error(`Le fichier n'existe pas: ${filePath}`);
      }
      
      // Utiliser Python pour extraire le texte (plus performant et précis que les solutions JS)
      const pythonScriptPath = path.join(__dirname, '../python/pdf_extractor.py');
      
      // Vérifier si le script Python existe
      if (!fs.existsSync(pythonScriptPath)) {
        this._createPythonPDFExtractor();
      }
      
      // Extraire le texte avec Python
      return new Promise((resolve, reject) => {
        let extractedText = '';
        
        const pyshell = new PythonShell(pythonScriptPath, {
          args: [filePath],
          pythonPath: 'python3',
          mode: 'text'
        });
        
        pyshell.on('message', (message) => {
          extractedText += message;
        });
        
        pyshell.on('error', (error) => {
          reject(error);
        });
        
        pyshell.end((err) => {
          if (err) {
            reject(err);
          } else {
            resolve(extractedText);
          }
        });
      });
    } catch (error) {
      console.error('Erreur lors de l\'extraction du texte du PDF:', error);
      
      // Fallback: utiliser pdf-lib (moins performant)
      try {
        const pdfBytes = fs.readFileSync(filePath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pageCount = pdfDoc.getPageCount();
        
        return `Ce PDF contient ${pageCount} pages. Utilisez un outil d'extraction plus avancé pour voir le contenu.`;
      } catch (fallbackError) {
        throw error; // Renvoyer l'erreur d'origine
      }
    }
  }
  
  /**
   * Détermine les types de données dans une colonne
   * @param {Array} columnData - Données d'une colonne
   * @returns {Object} - Types de données détectés et leurs fréquences
   * @private
   */
  _determineColumnTypes(columnData) {
    // Filtrer les valeurs null et undefined
    const values = columnData.filter(val => val !== null && val !== undefined);
    
    if (values.length === 0) {
      return { primaryType: 'unknown', typeFrequency: {} };
    }
    
    const typeFrequency = {
      numeric: 0,
      text: 0,
      date: 0,
      boolean: 0,
      unknown: 0
    };
    
    for (const value of values) {
      const type = typeof value;
      
      if (type === 'number') {
        typeFrequency.numeric++;
      } else if (type === 'string') {
        // Vérifier si c'est une date
        if (!isNaN(Date.parse(value))) {
          typeFrequency.date++;
        } else {
          typeFrequency.text++;
        }
      } else if (type === 'boolean') {
        typeFrequency.boolean++;
      } else if (value instanceof Date) {
        typeFrequency.date++;
      } else {
        typeFrequency.unknown++;
      }
    }
    
    // Déterminer le type principal
    let primaryType = 'unknown';
    let maxFrequency = 0;
    
    for (const [type, frequency] of Object.entries(typeFrequency)) {
      if (frequency > maxFrequency) {
        maxFrequency = frequency;
        primaryType = type;
      }
    }
    
    return { primaryType, typeFrequency };
  }
  
  /**
   * Extrait le texte d'un fichier Word
   * @param {string} filePath - Chemin du fichier Word
   * @returns {Promise<string>} - Texte extrait du document Word
   */
  async extractTextFromDOCX(filePath) {
    try {
      // Lire le fichier et extraire le texte
      const buffer = fs.readFileSync(filePath);
      
      // Une extraction simple pour l'instant (à améliorer)
      return "Contenu du document Word extrait (fonctionnalité limitée pour l'instant)";
    } catch (error) {
      console.error('Erreur lors de l\'extraction du texte du document Word:', error);
      throw error;
    }
  }
  
  /**
   * Lit un fichier texte
   * @param {string} filePath - Chemin du fichier texte
   * @returns {Promise<string>} - Contenu du fichier texte
   */
  async readTextFile(filePath) {
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      console.error('Erreur lors de la lecture du fichier texte:', error);
      throw error;
    }
  }
  
  /**
   * Traite un fichier Excel avec un modèle LLM
   * @param {string} filePath - Chemin du fichier Excel
   * @param {string} instructions - Instructions pour le modèle LLM
   * @param {Object} options - Options pour l'extraction et l'API LLM
   * @returns {Promise<Object>} - Réponse du modèle LLM
   */
  async processExcelWithLLM(filePath, instructions, options = {}) {
    console.log(`Traitement du fichier Excel avec LLM: ${filePath}`);
    console.log(`Instructions: ${instructions}`);
    
    // Valider le fichier avant de l'analyser
    if (!this._validateExcelFile(filePath)) {
      throw new Error(`Le fichier ${filePath} n'est pas un fichier Excel valide.`);
    }
    
    try {
      // Vérifier que le service Excel-LLM est disponible
      if (!excelLLMService) {
        throw new Error('Le service Excel-LLM n\'est pas disponible');
      }
      
      // Désactiver le traitement Python par défaut pour l'instant
      const pythonOptions = { ...options, usePython: true };
      
      // Utiliser le service Excel-LLM pour traiter le fichier
      const result = await excelLLMService.processExcelWithLLM(filePath, instructions, pythonOptions);
      return result;
    } catch (error) {
      console.error('Erreur lors du traitement du fichier Excel avec LLM:', error);
      throw error;
    }
  }
  
  /**
   * Extrait les données d'un fichier Excel pour les envoyer à un LLM
   * @param {string} filePath - Chemin du fichier Excel
   * @param {Object} options - Options d'extraction
   * @returns {Promise<Object>} - Données formatées pour le LLM
   */
  async extractExcelDataForLLM(filePath, options = {}) {
    console.log(`Extraction des données Excel pour LLM: ${filePath}`);
    
    // Valider le fichier avant de l'analyser
    if (!this._validateExcelFile(filePath)) {
      throw new Error(`Le fichier ${filePath} n'est pas un fichier Excel valide.`);
    }
    
    try {
      // Vérifier que le service Excel-LLM est disponible
      if (!excelLLMService) {
        throw new Error('Le service Excel-LLM n\'est pas disponible');
      }
      
      // Désactiver le traitement Python par défaut pour l'instant
      const pythonOptions = { ...options, usePython: true };
      
      // Utiliser le service Excel-LLM pour extraire les données
      const result = await excelLLMService.extractExcelData(filePath, pythonOptions);
      return result;
    } catch (error) {
      console.error('Erreur lors de l\'extraction des données Excel pour LLM:', error);
      throw error;
    }
  }
}


// Créer et exporter une instance du service
const documentService = new DocumentService();
module.exports = documentService;
