const DocumentService = require('../services/document-service');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { PythonShell } = require('python-shell');
const electron = require('electron');
const app = electron.app || (electron.remote && electron.remote.app);

class DocumentAgent {
  constructor() {
    this.documentService = new DocumentService();
    this.initialized = false;
  }
  
  /**
   * Initialise l'agent Document
   * @returns {boolean} - True si l'initialisation a réussi
   */
  initialize() {
    try {
      console.log('Initialisation de l\'agent Document...');
      if (this.documentService && typeof this.documentService.initialize === 'function') {
        this.documentService.initialize();
      }
      this.initialized = true;
      console.log('Agent Document initialisé avec succès');
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de l\'agent Document:', error);
      return false;
    }
  }

  /**
   * Analyse un document et extrait son contenu et ses métadonnées
   * @param {string} filePath - Chemin du fichier à analyser
   * @returns {Promise<Object>} - Résultat de l'analyse
   */
  async analyzeDocument(filePath) {
    try {
      // Vérifier si le fichier existe
      if (!fs.existsSync(filePath)) {
        throw new Error(`Le fichier ${filePath} n'existe pas.`);
      }

      // Déterminer le type de document
      const documentType = this.documentService.getDocumentType(filePath);
      
      if (!documentType) {
        throw new Error(`Le format du fichier ${filePath} n'est pas supporté.`);
      }

      let result = {
        type: documentType,
        metadata: {},
        content: null,
        summary: null
      };

      // Analyser le document selon son type
      switch (documentType) {
        case 'excel':
          // Utiliser la méthode analyzeExcelFile qui existe dans DocumentService
          const excelAnalysis = await this.documentService.analyzeExcelFile(filePath);
          result.metadata = {
            fileName: path.basename(filePath),
            sheetCount: excelAnalysis.sheetCount || 0,
            lastModified: fs.statSync(filePath).mtime
          };
          result.content = excelAnalysis.sheets || {};
          break;
          
        case 'word':
          // Utiliser la méthode extractTextFromDOCX qui existe dans DocumentService
          const wordText = await this.documentService.extractTextFromDOCX(filePath);
          result.metadata = {
            fileName: path.basename(filePath),
            fileSize: fs.statSync(filePath).size,
            lastModified: fs.statSync(filePath).mtime
          };
          result.content = wordText;
          result.tables = []; // Par défaut, pas de tables extraites
          break;
          
        case 'pdf':
          // Extraire le texte du PDF
          result.content = await this.documentService.extractTextFromPDF(filePath);
          
          // Initialiser les métadonnées par défaut
          result.metadata = {
            pageCount: 'Inconnu',
            author: 'Inconnu',
            creationDate: 'Inconnu'
          };
          break;
          
        case 'text':
          const textContent = fs.readFileSync(filePath, 'utf8');
          result.content = textContent;
          result.metadata = {
            fileName: path.basename(filePath),
            fileSize: fs.statSync(filePath).size,
            lineCount: textContent.split('\n').length
          };
          break;
      }

      // Générer un résumé du document
      result.summary = await this.generateSummary(result);

      return result;
    } catch (error) {
      console.error('Erreur lors de l\'analyse du document:', error);
      throw error;
    }
  }

  /**
   * Génère un résumé du document
   * @param {Object} documentData - Données du document
   * @returns {Promise<string>} - Résumé du document
   */
  async generateSummary(documentData) {
    try {
      // Si nous avons du contenu textuel, utiliser un script Python pour le résumé
      if (documentData.content && typeof documentData.content === 'string') {
        return await this._generateTextSummaryWithPython(documentData.content);
      }
      
      // Pour les fichiers Excel, générer un résumé basique
      if (documentData.type === 'excel' && documentData.content) {
        let summary = `Le fichier Excel "${documentData.metadata.fileName}" contient ${documentData.metadata.sheetCount} feuille(s).\n\n`;
        
        for (const [sheetName, sheetData] of Object.entries(documentData.content)) {
          if (Array.isArray(sheetData) && sheetData.length > 0) {
            summary += `- Feuille "${sheetName}": ${sheetData.length} ligne(s)\n`;
            
            if (sheetData[0] && Array.isArray(sheetData[0])) {
              summary += `  Colonnes: ${sheetData[0].join(', ')}\n`;
            }
          }
        }
        
        return summary;
      }
      
      return "Impossible de générer un résumé pour ce document.";
    } catch (error) {
      console.error('Erreur lors de la génération du résumé:', error);
      return "Erreur lors de la génération du résumé.";
    }
  }

  /**
   * Génère un résumé de texte en utilisant un script Python
   * @param {string} text - Texte à résumer
   * @returns {Promise<string>} - Résumé du texte
   */
  _generateTextSummaryWithPython(text) {
    return new Promise((resolve, reject) => {
      // Déterminer les chemins en fonction de si l'application est packagée ou non
      const isPacked = app && app.isPackaged;
      const pythonScript = isPacked
        ? path.join(process.resourcesPath, 'python', 'text_summarizer.py')
        : path.join(__dirname, '../python/text_summarizer.py');
      
      // Obtenir le chemin de l'exécutable Python embarqué si l'application est packagée
      const pythonPath = isPacked
        ? path.join(process.resourcesPath, 'python-runtime', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')
        : null;
      
      // Vérifier si le script Python existe
      if (!fs.existsSync(pythonScript)) {
        // Créer le script Python s'il n'existe pas
        this._createPythonTextSummarizer();
      }
      
      // Écrire le texte dans un fichier temporaire
      const tempDir = isPacked 
        ? path.join(app.getPath('temp'), 'abia')
        : path.join(__dirname, '../python');
        
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempFilePath = path.join(tempDir, `temp_text_${Date.now()}.txt`);
      fs.writeFileSync(tempFilePath, text);
      
      // Options pour PythonShell
      const options = {
        mode: 'text',
        args: [tempFilePath]
      };
      
      // Utiliser le Python embarqué si disponible
      if (pythonPath && fs.existsSync(pythonPath)) {
        options.pythonPath = pythonPath;
      }
      
      // Exécuter le script Python
      PythonShell.run(pythonScript, options, (err, results) => {
        // Supprimer le fichier temporaire
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
        
        if (err) {
          console.error(`Erreur lors de la génération du résumé: ${err.message}`);
          resolve("Impossible de générer un résumé automatique. Veuillez consulter le document complet.");
        } else {
          resolve(results ? results.join('\n') : '');
        }
      });
    });
  }

  /**
   * Crée un script Python pour résumer des textes
   */
  _createPythonTextSummarizer() {
    // Déterminer les chemins en fonction de si l'application est packagée ou non
    const isPacked = app && app.isPackaged;
    const scriptDir = isPacked
      ? path.join(process.resourcesPath, 'python')
      : path.join(__dirname, '../python');
    
    // Créer le répertoire s'il n'existe pas
    if (!fs.existsSync(scriptDir)) {
      fs.mkdirSync(scriptDir, { recursive: true });
    }
    
    const scriptPath = path.join(scriptDir, 'text_summarizer.py');
    
    const scriptContent = `
import sys
import os
import re
import heapq
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import sent_tokenize, word_tokenize

# Télécharger les ressources NLTK nécessaires
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt', quiet=True)

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords', quiet=True)

def summarize_text(text, num_sentences=5):
    """Generate a summary of the given text."""
    # Nettoyer le texte
    clean_text = re.sub(r'\\s+', ' ', text)
    clean_text = re.sub(r'[^\\w\\s]', '', clean_text)
    
    # Tokeniser le texte en phrases
    sentences = sent_tokenize(text)
    
    # Si le texte est trop court, retourner le texte original
    if len(sentences) <= num_sentences:
        return text
    
    # Calculer la fréquence des mots
    stop_words = set(stopwords.words('french') + stopwords.words('english'))
    word_frequencies = {}
    
    for word in word_tokenize(clean_text.lower()):
        if word not in stop_words:
            if word not in word_frequencies:
                word_frequencies[word] = 1
            else:
                word_frequencies[word] += 1
    
    # Normaliser les fréquences
    if word_frequencies:
        max_frequency = max(word_frequencies.values())
        for word in word_frequencies:
            word_frequencies[word] = word_frequencies[word] / max_frequency
    
    # Calculer le score de chaque phrase
    sentence_scores = {}
    for i, sentence in enumerate(sentences):
        for word in word_tokenize(sentence.lower()):
            if word in word_frequencies:
                if i not in sentence_scores:
                    sentence_scores[i] = word_frequencies[word]
                else:
                    sentence_scores[i] += word_frequencies[word]
    
    # Sélectionner les phrases avec les scores les plus élevés
    summary_sentences = heapq.nlargest(num_sentences, sentence_scores, key=sentence_scores.get)
    summary_sentences.sort()  # Trier par ordre d'apparition
    
    # Construire le résumé
    summary = [sentences[i] for i in summary_sentences]
    
    return ' '.join(summary)

def extract_keywords(text, num_keywords=10):
    """Extract the most important keywords from the text."""
    # Nettoyer le texte
    clean_text = re.sub(r'\\s+', ' ', text)
    clean_text = re.sub(r'[^\\w\\s]', '', clean_text)
    
    # Tokeniser le texte en mots
    words = word_tokenize(clean_text.lower())
    
    # Filtrer les mots vides
    stop_words = set(stopwords.words('french') + stopwords.words('english'))
    filtered_words = [word for word in words if word not in stop_words and len(word) > 2]
    
    # Calculer la fréquence des mots
    word_frequencies = {}
    for word in filtered_words:
        if word not in word_frequencies:
            word_frequencies[word] = 1
        else:
            word_frequencies[word] += 1
    
    # Sélectionner les mots-clés avec les fréquences les plus élevées
    keywords = heapq.nlargest(num_keywords, word_frequencies, key=word_frequencies.get)
    
    return keywords

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python text_summarizer.py <text_file_path>", file=sys.stderr)
        sys.exit(1)
    
    text_path = sys.argv[1]
    
    if not os.path.exists(text_path):
        print(f"Error: File {text_path} does not exist.", file=sys.stderr)
        sys.exit(1)
    
    try:
        with open(text_path, 'r', encoding='utf-8') as file:
            text = file.read()
        
        # Générer le résumé
        summary = summarize_text(text)
        
        # Extraire les mots-clés
        keywords = extract_keywords(text)
        
        # Afficher le résultat
        print("## Résumé du document")
        print(summary)
        print("\\n## Mots-clés")
        print(", ".join(keywords))
        
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)
`;
    
    fs.writeFileSync(scriptPath, scriptContent);
    
    // Créer un fichier requirements.txt pour les dépendances Python
    const requirementsPath = path.join(scriptDir, 'requirements.txt');
    const requirements = fs.existsSync(requirementsPath) 
      ? fs.readFileSync(requirementsPath, 'utf8') + 'nltk==3.8.1\n'
      : 'nltk==3.8.1\n';
    
    fs.writeFileSync(requirementsPath, requirements);
  }

  /**
   * Extrait des informations spécifiques d'un document
   * @param {Object} documentData - Données du document
   * @param {Object} options - Options d'extraction
   * @returns {Object} - Informations extraites
   */
  extractInformation(documentData, options) {
    try {
      const { type, content } = documentData;
      const { patterns, fields } = options;
      
      const result = {
        extractedFields: {},
        matches: []
      };
      
      // Si nous avons du contenu textuel, extraire les informations
      if (content && typeof content === 'string') {
        // Extraire les champs spécifiques si demandé
        if (fields && fields.length > 0) {
          fields.forEach(field => {
            const pattern = this._getPatternForField(field);
            if (pattern) {
              const match = content.match(pattern);
              if (match && match[1]) {
                result.extractedFields[field] = match[1].trim();
              }
            }
          });
        }
        
        // Rechercher des patterns spécifiques si demandé
        if (patterns && patterns.length > 0) {
          patterns.forEach(pattern => {
            const regex = new RegExp(pattern, 'gi');
            let match;
            while ((match = regex.exec(content)) !== null) {
              result.matches.push({
                pattern: pattern,
                match: match[0],
                index: match.index
              });
            }
          });
        }
      }
      
      return result;
    } catch (error) {
      console.error('Erreur lors de l\'extraction d\'informations:', error);
      return { error: error.message };
    }
  }

  /**
   * Obtient un pattern regex pour un champ spécifique
   * @param {string} field - Nom du champ
   * @returns {RegExp|null} - Pattern regex ou null si non trouvé
   */
  _getPatternForField(field) {
    const patterns = {
      'email': /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      'phone': /(\+\d{1,3}[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
      'date': /\b(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})\b/g,
      'address': /\b(\d+\s+[a-zA-Z]+\s+[a-zA-Z]+,?\s+[a-zA-Z]+,?\s+[A-Z]{2}\s+\d{5})\b/g,
      'name': /\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/g,
      'url': /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g,
      'price': /\b(\d+([.,]\d{1,2})?)\s*(€|EUR|USD|\$)\b/g,
      'percentage': /\b(\d+([.,]\d{1,2})?)\s*%\b/g
    };
    
    return patterns[field] || null;
  }

  /**
   * Classifie un document selon son contenu
   * @param {Object} documentData - Données du document
   * @returns {Promise<Object>} - Classification du document
   */
  async classifyDocument(documentData) {
    try {
      const { type, content, metadata } = documentData;
      
      // Classification basique basée sur des mots-clés
      const categories = {
        'facture': ['facture', 'paiement', 'montant', 'total', 'tva', 'ht', 'ttc'],
        'contrat': ['contrat', 'accord', 'parties', 'signataire', 'conditions', 'engagement'],
        'cv': ['cv', 'curriculum', 'expérience', 'compétences', 'formation', 'diplôme'],
        'rapport': ['rapport', 'analyse', 'résultats', 'conclusion', 'étude'],
        'lettre': ['madame', 'monsieur', 'cordialement', 'salutations']
      };
      
      // Si nous avons du contenu textuel, classifier le document
      if (content && typeof content === 'string') {
        const contentLower = content.toLowerCase();
        
        // Calculer le score pour chaque catégorie
        const scores = {};
        
        for (const [category, keywords] of Object.entries(categories)) {
          scores[category] = 0;
          
          keywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            const matches = contentLower.match(regex);
            
            if (matches) {
              scores[category] += matches.length;
            }
          });
        }
        
        // Trouver la catégorie avec le score le plus élevé
        let maxScore = 0;
        let maxCategory = 'autre';
        
        for (const [category, score] of Object.entries(scores)) {
          if (score > maxScore) {
            maxScore = score;
            maxCategory = category;
          }
        }
        
        return {
          category: maxCategory,
          confidence: maxScore > 0 ? Math.min(maxScore / 5, 1) : 0,
          scores
        };
      }
      
      return {
        category: 'inconnu',
        confidence: 0,
        scores: {}
      };
    } catch (error) {
      console.error('Erreur lors de la classification du document:', error);
      return {
        category: 'erreur',
        confidence: 0,
        error: error.message
      };
    }
  }

  /**
   * Traite une requête en langage naturel concernant un document
   * @param {string} query - Requête en langage naturel
   * @param {string} filePath - Chemin du fichier
   * @returns {Promise<Object>} - Résultat du traitement
   */
  async processNaturalLanguageQuery(query, filePath) {
    try {
      const lowercaseQuery = query.toLowerCase();
      
      // Analyser le document
      const documentData = await this.analyzeDocument(filePath);
      
      // Déterminer l'action à effectuer
      if (lowercaseQuery.includes('résumé') || lowercaseQuery.includes('résumer') || 
          lowercaseQuery.includes('synthèse') || lowercaseQuery.includes('aperçu')) {
        // Générer un résumé
        return {
          type: 'summary',
          content: documentData.summary,
          metadata: documentData.metadata
        };
      } else if (lowercaseQuery.includes('extraire') || lowercaseQuery.includes('extraction') || 
                 lowercaseQuery.includes('information') || lowercaseQuery.includes('données')) {
        // Extraire des informations
        const options = {
          fields: ['email', 'phone', 'date', 'price'],
          patterns: []
        };
        
        const extractedInfo = this.extractInformation(documentData, options);
        
        return {
          type: 'extraction',
          content: 'Informations extraites du document',
          data: extractedInfo,
          metadata: documentData.metadata
        };
      } else if (lowercaseQuery.includes('classifie') || lowercaseQuery.includes('catégorie') || 
                 lowercaseQuery.includes('type de document')) {
        // Classifier le document
        const classification = await this.classifyDocument(documentData);
        
        return {
          type: 'classification',
          content: `Ce document est classifié comme: ${classification.category} (confiance: ${Math.round(classification.confidence * 100)}%)`,
          data: classification,
          metadata: documentData.metadata
        };
      } else {
        // Par défaut, fournir une analyse générale
        return {
          type: 'analysis',
          content: 'Analyse du document',
          summary: documentData.summary,
          metadata: documentData.metadata,
          type: documentData.type
        };
      }
    } catch (error) {
      console.error('Erreur lors du traitement de la requête:', error);
      throw error;
    }
  }
}

module.exports = DocumentAgent;
