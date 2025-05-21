const path = require('path');
const fs = require('fs');

// Pour éviter les dépendances circulaires et les erreurs lorsque le module Electron
// n'est pas disponible (exécution de scripts en ligne de commande, tests, etc.),
// nous essayons de charger Electron de manière défensive. Toutes les références
// à l'objet `app` d'Electron sont regroupées dans la variable `electronApp`.
// Si l'import échoue ou si nous ne sommes pas dans le contexte d'une application
// Electron, `electronApp` restera null et des chemins de secours seront utilisés.

let electronApp = null;
let userDataPath = null;

try {
  const { app } = require('electron');
  // Vérifier que l'objet app est bien initialisé (peut ne pas l'être dans certains contextes)
  if (app) {
    electronApp = app;
    userDataPath = app.getPath('userData');
  }
} catch (_) {
  // Electron n'est pas disponible – exécution dans un contexte Node classique
  electronApp = null;
  userDataPath = null;
}

/**
 * Classe de gestion de la configuration de l'application
 */
class Config {
  constructor() {
    // Chercher la configuration dans plusieurs endroits potentiels
    // 1. D'abord le répertoire local (toujours prioritaire pour le développement)
    const localConfigPath = path.join(__dirname, 'config.json');
    
    // 2. Ensuite le répertoire userData d'Electron si disponible
    const electronConfigPath = userDataPath ? path.join(userDataPath, 'config.json') : null;
    
    // Définir les chemins de configuration et vérifier leur existence
    this.configPaths = [
      localConfigPath,
      electronConfigPath
    ].filter(Boolean); // Filtrer les valeurs null/undefined
    
    // Chemin par défaut qui sera utilisé pour l'écriture si aucun fichier n'existe
    this.configPath = this.configPaths[0];
    this.defaultConfig = {
      app: {
        language: 'fr',
        darkMode: false,
        fontSize: 'medium',
        notificationsEnabled: true,
        autoUpdates: true
      },
      llm: {
        provider: 'deepseek',
        apiKey: '',
        model: 'deepseek-chat',
        temperature: 0.7,
        maxTokens: 1000
      },
      agents: {
        excel: {
          enabled: true,
          defaultOptions: {
            analyzeOnOpen: true,
            generateCharts: true
          }
        },
        mail: {
          enabled: true,
          defaultOptions: {
            format: 'pdf',
            includeSignature: true
          }
        },
        document: {
          enabled: true,
          defaultOptions: {
            summarizeOnOpen: true,
            extractEntities: true
          }
        }
      },
      storage: {
        historyLimit: 100,
        autoSave: true,
        backupEnabled: true,
        backupInterval: 86400 // 1 jour en secondes
      },
      // Déterminer les chemins standards en fonction de la disponibilité d'Electron
      paths: {
        downloads: electronApp ? electronApp.getPath('downloads') : path.join(process.env.HOME || process.env.USERPROFILE || __dirname, 'Downloads'),
        documents: electronApp ? electronApp.getPath('documents') : path.join(process.env.HOME || process.env.USERPROFILE || __dirname, 'Documents'),
        temp: electronApp ? electronApp.getPath('temp') : path.join(require('os').tmpdir())
      }
    };
    
    this.config = this.loadConfig();
  }

  /**
   * Charge la configuration depuis le fichier
   * @returns {Object} - Configuration chargée ou configuration par défaut
   */
  loadConfig() {
    // Essayer de charger la configuration à partir de chaque chemin possible
    for (const configPath of this.configPaths) {
      try {
        if (configPath && fs.existsSync(configPath)) {
          console.log(`Chargement de la configuration depuis: ${configPath}`);
          const configData = fs.readFileSync(configPath, 'utf8');
          const parsedConfig = JSON.parse(configData);
          
          // Si on a trouvé une configuration valide, la fusionner avec la configuration par défaut
          return this.mergeWithDefaultConfig(parsedConfig);
        }
      } catch (error) {
        console.error(`Erreur lors du chargement de la configuration à partir de ${configPath}:`, error);
      }
    }
    
    console.warn('Aucun fichier de configuration valide trouvé, utilisation de la configuration par défaut');
    // Si aucun fichier n'existe ou s'il y a une erreur, retourner la configuration par défaut
    return JSON.parse(JSON.stringify(this.defaultConfig));
  }

  /**
   * Fusionne la configuration chargée avec la configuration par défaut
   * @param {Object} loadedConfig - Configuration chargée
   * @returns {Object} - Configuration fusionnée
   */
  mergeWithDefaultConfig(loadedConfig) {
    const mergedConfig = JSON.parse(JSON.stringify(this.defaultConfig));
    
    // Fonction récursive pour fusionner les objets
    const mergeObjects = (target, source) => {
      for (const key in source) {
        if (source.hasOwnProperty(key)) {
          if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            // Si la propriété est un objet, fusionner récursivement
            if (!target[key]) target[key] = {};
            mergeObjects(target[key], source[key]);
          } else {
            // Sinon, copier la valeur
            target[key] = source[key];
          }
        }
      }
    };
    
    mergeObjects(mergedConfig, loadedConfig);
    return mergedConfig;
  }

  /**
   * Sauvegarde la configuration dans le fichier
   * @returns {boolean} - True si la sauvegarde a réussi
   */
  saveConfig() {
    try {
      const configDir = path.dirname(this.configPath);
      
      // Créer le répertoire s'il n'existe pas
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la configuration:', error);
      return false;
    }
  }

  /**
   * Obtient une valeur de configuration
   * @param {string} key - Chemin de la clé (ex: 'app.language')
   * @param {*} defaultValue - Valeur par défaut si la clé n'existe pas
   * @returns {*} - Valeur de la clé ou valeur par défaut
   */
  get(key, defaultValue) {
    const keys = key.split('.');
    let value = this.config;
    
    for (const k of keys) {
      if (value === undefined || value === null || typeof value !== 'object') {
        return defaultValue;
      }
      
      value = value[k];
    }
    
    return value !== undefined ? value : defaultValue;
  }

  /**
   * Définit une valeur de configuration
   * @param {string} key - Chemin de la clé (ex: 'app.language')
   * @param {*} value - Valeur à définir
   * @returns {boolean} - True si la valeur a été définie
   */
  set(key, value) {
    const keys = key.split('.');
    let current = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      
      if (current[k] === undefined || current[k] === null || typeof current[k] !== 'object') {
        current[k] = {};
      }
      
      current = current[k];
    }
    
    current[keys[keys.length - 1]] = value;
    
    // Sauvegarder la configuration
    return this.saveConfig();
  }

  /**
   * Réinitialise la configuration aux valeurs par défaut
   * @returns {boolean} - True si la réinitialisation a réussi
   */
  resetToDefault() {
    this.config = JSON.parse(JSON.stringify(this.defaultConfig));
    return this.saveConfig();
  }

  /**
   * Réinitialise une section spécifique de la configuration aux valeurs par défaut
   * @param {string} section - Section à réinitialiser (ex: 'app')
   * @returns {boolean} - True si la réinitialisation a réussi
   */
  resetSection(section) {
    if (this.defaultConfig[section]) {
      this.config[section] = JSON.parse(JSON.stringify(this.defaultConfig[section]));
      return this.saveConfig();
    }
    
    return false;
  }
}

module.exports = new Config();
