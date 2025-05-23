/**
 * Service de traduction utilisant l'API DeepL
 * Ce service permet de traduire du texte et des documents
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { app } = require('electron');

// Essayer de charger la configuration depuis le fichier principal
let config = {};

// Chemin vers les fichiers de configuration possibles
const configPaths = [
  '../config/config.json',
  '../config.json',
  './config/config.json',
  './config.json'
];

// Essayer de charger la configuration à partir des chemins possibles
let configLoaded = false;
for (const configPath of configPaths) {
  try {
    config = require(configPath);
    console.log(`Configuration chargée avec succès depuis ${configPath}`);
    configLoaded = true;
    break;
  } catch (error) {
    console.error(`Erreur lors du chargement de la configuration depuis ${configPath}:`, error.message);
  }
}

// Si aucune configuration n'a été chargée, utiliser les valeurs par défaut
if (!configLoaded) {
  console.warn('Aucune configuration n\'a pu être chargée, utilisation des valeurs par défaut');
  config = {
    api: {
      deepl: {
        key: 'f10489c0-3467-4b72-9b6c-8ad3e29d102d:fx', // Utilisation de la clé API trouvée dans config.json
        url: 'https://api.deepl.com/v2'
      }
    }
  };
}

// Créer directement un objet avec les méthodes nécessaires
const translationService = {
  apiKey: config.api?.deepl?.key || 'YOUR_DEEPL_API_KEY_HERE',
  apiUrl: config.api?.deepl?.url || 'https://api.deepl.com/v2',
  supportedLanguages: config.supportedLanguages || {
    source: [
      {"code": "auto", "name": "Détection automatique"},
      {"code": "FR", "name": "Français"},
      {"code": "EN", "name": "Anglais"},
      {"code": "DE", "name": "Allemand"},
      {"code": "ES", "name": "Espagnol"},
      {"code": "IT", "name": "Italien"}
    ],
    target: [
      {"code": "FR", "name": "Français"},
      {"code": "EN-US", "name": "Anglais (US)"},
      {"code": "EN-GB", "name": "Anglais (UK)"},
      {"code": "DE", "name": "Allemand"},
      {"code": "ES", "name": "Espagnol"},
      {"code": "IT", "name": "Italien"}
    ]
  },
  supportedFileTypes: config.supportedFileTypes?.translation || [".pdf", ".docx", ".pptx", ".txt"],
  
  // Méthodes exportées directement sans classe
  getSupportedLanguages() {
    return this.supportedLanguages;
  },
  
  getSupportedFileTypes() {
    return this.supportedFileTypes;
  },
  
  async translateText(text, targetLang, sourceLang = 'auto') {
    try {
      const formData = new FormData();
      formData.append('text', text);
      formData.append('target_lang', targetLang);
      
      if (sourceLang !== 'auto') {
        formData.append('source_lang', sourceLang);
      }

      const response = await axios.post(`${this.apiUrl}/translate`, formData, {
        headers: {
          'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
          ...formData.getHeaders()
        }
      });

      return {
        success: true,
        translatedText: response.data.translations[0].text,
        detectedSourceLanguage: response.data.translations[0].detected_source_language
      };
    } catch (error) {
      console.error('Erreur lors de la traduction du texte:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  },

  async translateDocument(filePath, targetLang, sourceLang = 'auto', progressCallback = null) {
    try {
      // Vérifier que le fichier existe
      if (!fs.existsSync(filePath)) {
        throw new Error(`Le fichier ${filePath} n'existe pas.`);
      }
      
      // Vérifier l'extension du fichier
      const fileExt = path.extname(filePath).toLowerCase();
      if (!this.supportedFileTypes.includes(fileExt)) {
        return {
          success: false,
          error: `Le type de fichier ${fileExt} n'est pas supporté. Types supportés: ${this.supportedFileTypes.join(', ')}`
        };
      }

      // Étape 1: Uploader le document
      if (progressCallback) progressCallback({ step: 'upload', progress: 0 });
      
      const form = new FormData();
      form.append('file', fs.createReadStream(filePath));
      form.append('target_lang', targetLang);
      
      if (sourceLang !== 'auto') {
        form.append('source_lang', sourceLang);
      }

      const upload = await axios.post(`${this.apiUrl}/document`, form, {
        headers: {
          'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
          ...form.getHeaders()
        }
      });

      const { document_id, document_key } = upload.data;

      // Étape 2: Polling pour vérifier si la traduction est terminée
      if (progressCallback) progressCallback({ step: 'translation', progress: 10 });
      
      let status = '';
      let progress = 10;
      while (status !== 'done') {
        const check = await axios.get(`${this.apiUrl}/document/${document_id}`, {
          params: { document_key },
          headers: {
            'Authorization': `DeepL-Auth-Key ${this.apiKey}`
          }
        });
        
        status = check.data.status;
        
        // Mettre à jour la progression
        if (status === 'translating') {
          progress = Math.min(90, progress + 10);
          if (progressCallback) progressCallback({ step: 'translation', progress });
        }
        
        // Attendre 2 secondes entre les vérifications
        await new Promise(r => setTimeout(r, 2000));
      }

      // Étape 3: Récupération du fichier traduit
      if (progressCallback) progressCallback({ step: 'download', progress: 95 });
      
      const traduction = await axios({
        url: `${this.apiUrl}/document/${document_id}/result`,
        method: 'GET',
        responseType: 'stream',
        params: { document_key },
        headers: {
          'Authorization': `DeepL-Auth-Key ${this.apiKey}`
        }
      });

      // Créer le dossier de sortie s'il n'existe pas
      const downloadsPath = path.join(app.getPath('downloads'), 'ABIA_Traductions');
      if (!fs.existsSync(downloadsPath)) {
        fs.mkdirSync(downloadsPath, { recursive: true });
      }

      // Générer un nom de fichier pour la traduction
      const fileName = path.basename(filePath);
      const fileNameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
      const outputPath = path.join(
        downloadsPath, 
        `${fileNameWithoutExt}_${targetLang}${fileExt}`
      );

      // Écrire le fichier traduit
      const writer = fs.createWriteStream(outputPath);
      traduction.data.pipe(writer);

      return new Promise((resolve) => {
        writer.on('finish', () => {
          if (progressCallback) progressCallback({ step: 'complete', progress: 100 });
          resolve({
            success: true,
            outputPath,
            fileName: path.basename(outputPath)
          });
        });
        
        writer.on('error', (err) => {
          resolve({
            success: false,
            error: `Erreur lors de l'écriture du fichier: ${err.message}`
          });
        });
      });
    } catch (error) {
      console.error('Erreur lors de la traduction du document:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }
};

// Afficher les méthodes disponibles pour le débogage
console.log('Méthodes disponibles dans le service de traduction:', Object.keys(translationService));
console.log('translateDocument est une fonction:', typeof translationService.translateDocument === 'function');

// Export direct de l'objet de service
module.exports = translationService;
