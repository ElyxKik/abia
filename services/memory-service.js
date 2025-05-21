/**
 * Service de gestion de la mémoire et du contexte pour ABIA
 * Ce service permet de stocker et récupérer le contexte des conversations
 * et des interactions avec les différents agents
 */

const path = require('path');
const fs = require('fs');
const Datastore = require('nedb');

// Gestion sécurisée de l'accès à Electron
let electronApp = null;
try {
  const { app } = require('electron');
  electronApp = app;
} catch (error) {
  // Electron n'est pas disponible
  console.warn('Electron non disponible pour le service de mémoire, utilisation du répertoire par défaut');
}

class MemoryService {
  constructor() {
    // Initialisation de la base de données NeDB pour stocker les mémoires
    this.dbPath = null;
    this.db = null;
    this.initialized = false;
    
    // Structure de mémoire pour la session actuelle
    this.currentContext = {
      sessionId: this._generateSessionId(),
      conversationHistory: [],
      activeAgent: null,
      activeFiles: [],
      lastQuery: null,
      lastResponse: null,
      metadata: {}
    };
    
    console.log('Service de mémoire créé');
  }
  
  /**
   * Initialise le service de mémoire
   * @returns {boolean} - True si l'initialisation a réussi
   */
  initialize() {
    console.log('[DEBUG] Entrée memoryService.initialize()');
    try {
      if (this.initialized) {
        console.log('Le service de mémoire est déjà initialisé');
        return true;
      }
      
      // Déterminer le chemin de la base de données
      try {
        let appModule;
        try {
          appModule = require('electron').app;
        } catch (e) {
          appModule = null; // Electron n'est pas disponible (ex: tests unitaires hors Electron)
          console.warn('[DEBUG] Module app Electron non trouvé, utilisation du chemin de fallback.');
        }

        if (appModule) {
          const userDataPath = appModule.getPath('userData');
          this.dbPath = path.join(userDataPath, 'memory.db');
          console.log(`[DEBUG] Utilisation du chemin userData d'Electron: ${this.dbPath}`);
          const dbDir = path.dirname(this.dbPath);
          if (!fs.existsSync(dbDir)) {
            console.log(`[DEBUG] Création du répertoire pour la base de données: ${dbDir}`);
            fs.mkdirSync(dbDir, { recursive: true });
          }
        } else {
          this.dbPath = path.join(process.cwd(), 'data', 'memory.db');
          console.log(`[DEBUG] Utilisation du chemin de fallback: ${this.dbPath}`);
          const dataDir = path.dirname(this.dbPath);
          if (!fs.existsSync(dataDir)) {
            console.log(`[DEBUG] Création du répertoire de données: ${dataDir}`);
            fs.mkdirSync(dataDir, { recursive: true });
          }
        }
      } catch (error) {
        console.error('[CRITICAL] Erreur critique lors de la détermination/création du chemin de la base de données:', error);
        this.dbPath = path.join(process.cwd(), 'memory.db'); // Fallback absolu minimaliste
        console.warn(`[DEBUG] Fallback absolu utilisé pour dbPath: ${this.dbPath}`);
        // S'assurer que le répertoire pour le fallback absolu existe aussi
        const fallbackDir = path.dirname(this.dbPath);
        if (!fs.existsSync(fallbackDir)) {
            try {
                fs.mkdirSync(fallbackDir, { recursive: true });
                console.log(`[DEBUG] Création du répertoire pour le fallback absolu: ${fallbackDir}`);
            } catch (mkdirError) {
                console.error(`[CRITICAL] Impossible de créer le répertoire pour le fallback absolu ${fallbackDir}:`, mkdirError);
                // Si même cela échoue, il y a un problème majeur de permissions/système de fichiers.
                // On pourrait envisager de ne pas initialiser la DB du tout.
            }
        }
      }
      
      console.log(`[DEBUG] Chemin final de la base de données: ${this.dbPath}`);

      // Initialiser la base de données
      this.db = new Datastore({ 
        filename: this.dbPath, 
        autoload: true,
        onload: (err) => {
          if (err) {
            console.error(`[CRITICAL] Erreur lors du chargement de la base de données NeDB (${this.dbPath}):`, err);
            // Ne pas marquer comme initialisé si le chargement échoue.
            // La méthode initialize retournera false plus bas via le catch principal.
            throw err; // Propage l'erreur pour qu'elle soit capturée par le catch externe.
          }
        }
      });
      
      console.log('Service de mémoire initialisé avec succès. Base de données:', this.dbPath);
      this.initialized = true;
      console.log('[DEBUG] Sortie memoryService.initialize() : true');
      return true;
    } catch (error) {
      console.error('[CRITICAL] Erreur majeure lors de l\'initialisation du service de mémoire:', error);
      console.log('[DEBUG] Sortie memoryService.initialize() : false');
      return false;
    }
  }
  
  /**
   * Génère un identifiant unique pour la session
   * @returns {string} Identifiant de session
   */
  _generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
  
  /**
   * Ajoute un message à l'historique de conversation
   * @param {string} role - 'user' ou 'assistant'
   * @param {string} content - Contenu du message
   * @param {Object} metadata - Métadonnées associées au message
   */
  addToConversationHistory(role, content, metadata = {}) {
    const timestamp = new Date().toISOString();
    
    this.currentContext.conversationHistory.push({
      role,
      content,
      timestamp,
      metadata
    });
    
    if (role === 'user') {
      this.currentContext.lastQuery = content;
    } else if (role === 'assistant') {
      this.currentContext.lastResponse = content;
    }
    
    // Limiter la taille de l'historique pour éviter des problèmes de mémoire
    if (this.currentContext.conversationHistory.length > 100) {
      this.currentContext.conversationHistory = this.currentContext.conversationHistory.slice(-100);
    }
    
    // Sauvegarder périodiquement dans la base de données
    this._saveContextToDb();
    
    return true;
  }
  
  /**
   * Définit l'agent actif
   * @param {string} agentName - Nom de l'agent (excel, mail, document)
   * @param {Object} agentState - État de l'agent
   */
  setActiveAgent(agentName, agentState = {}) {
    this.currentContext.activeAgent = {
      name: agentName,
      state: agentState,
      activatedAt: new Date().toISOString()
    };
    
    this._saveContextToDb();
    return true;
  }
  
  /**
   * Ajoute un fichier à la liste des fichiers actifs
   * @param {string} filePath - Chemin du fichier
   * @param {string} fileType - Type de fichier (excel, pdf, docx, etc.)
   * @param {Object} metadata - Métadonnées du fichier
   */
  addActiveFile(filePath, fileType, metadata = {}) {
    // Vérifier si le fichier existe déjà dans la liste
    const fileExists = this.currentContext.activeFiles.some(file => file.path === filePath);
    
    if (!fileExists) {
      this.currentContext.activeFiles.push({
        path: filePath,
        type: fileType,
        addedAt: new Date().toISOString(),
        metadata
      });
      
      this._saveContextToDb();
    }
    
    return !fileExists;
  }
  
  /**
   * Supprime un fichier de la liste des fichiers actifs
   * @param {string} filePath - Chemin du fichier
   */
  removeActiveFile(filePath) {
    const initialLength = this.currentContext.activeFiles.length;
    
    this.currentContext.activeFiles = this.currentContext.activeFiles.filter(
      file => file.path !== filePath
    );
    
    if (initialLength !== this.currentContext.activeFiles.length) {
      this._saveContextToDb();
      return true;
    }
    
    return false;
  }
  
  /**
   * Ajoute ou met à jour des métadonnées dans le contexte actuel
   * @param {string} key - Clé de la métadonnée
   * @param {any} value - Valeur de la métadonnée
   */
  setMetadata(key, value) {
    this.currentContext.metadata[key] = value;
    this._saveContextToDb();
    return true;
  }
  
  /**
   * Récupère une métadonnée du contexte actuel
   * @param {string} key - Clé de la métadonnée
   * @param {any} defaultValue - Valeur par défaut si la clé n'existe pas
   * @returns {any} Valeur de la métadonnée
   */
  getMetadata(key, defaultValue = null) {
    return key in this.currentContext.metadata 
      ? this.currentContext.metadata[key] 
      : defaultValue;
  }
  
  /**
   * Récupère le contexte actuel
   * @returns {Object} Contexte actuel
   */
  getCurrentContext() {
    return { ...this.currentContext };
  }
  
  /**
   * Récupère l'historique de conversation
   * @param {number} limit - Nombre maximum de messages à récupérer
   * @returns {Array} Historique de conversation
   */
  getConversationHistory(limit = 50) {
    return this.currentContext.conversationHistory.slice(-limit);
  }
  
  /**
   * Récupère l'agent actif
   * @returns {Object|null} Agent actif
   */
  getActiveAgent() {
    return this.currentContext.activeAgent;
  }
  
  /**
   * Récupère la liste des fichiers actifs
   * @returns {Array} Liste des fichiers actifs
   */
  getActiveFiles() {
    return [...this.currentContext.activeFiles];
  }
  
  /**
   * Sauvegarde le contexte actuel dans la base de données
   * @private
   */
  _saveContextToDb() {
    const contextToSave = {
      _id: this.currentContext.sessionId,
      ...this.currentContext,
      updatedAt: new Date().toISOString()
    };
    
    this.db.update(
      { _id: this.currentContext.sessionId }, 
      contextToSave, 
      { upsert: true },
      (err) => {
        if (err) {
          console.error('Erreur lors de la sauvegarde du contexte:', err);
        }
      }
    );
  }
  
  /**
   * Charge un contexte depuis la base de données
   * @param {string} sessionId - Identifiant de la session
   * @returns {Promise<Object>} Contexte chargé
   */
  loadContext(sessionId) {
    return new Promise((resolve, reject) => {
      this.db.findOne({ _id: sessionId }, (err, doc) => {
        if (err) {
          reject(err);
        } else if (doc) {
          this.currentContext = doc;
          resolve(this.currentContext);
        } else {
          reject(new Error(`Session ${sessionId} non trouvée`));
        }
      });
    });
  }
  
  /**
   * Récupère la liste des sessions disponibles
   * @param {number} limit - Nombre maximum de sessions à récupérer
   * @returns {Promise<Array>} Liste des sessions
   */
  listSessions(limit = 10) {
    return new Promise((resolve, reject) => {
      this.db.find({})
        .sort({ updatedAt: -1 })
        .limit(limit)
        .exec((err, docs) => {
          if (err) {
            reject(err);
          } else {
            // Retourner uniquement les informations essentielles
            const sessions = docs.map(doc => ({
              sessionId: doc._id,
              updatedAt: doc.updatedAt,
              messageCount: doc.conversationHistory.length,
              activeAgent: doc.activeAgent ? doc.activeAgent.name : null,
              activeFilesCount: doc.activeFiles.length
            }));
            
            resolve(sessions);
          }
        });
    });
  }
  
  /**
   * Crée une nouvelle session
   * @returns {string} Identifiant de la nouvelle session
   */
  createNewSession() {
    // Vérifier que le service est initialisé
    if (!this.initialized) {
      throw new Error('Le service de mémoire n\'est pas initialisé');
    }
    
    // Générer un nouvel ID de session
    const sessionId = this._generateSessionId();
    
    // Réinitialiser le contexte actuel
    this.currentContext = {
      sessionId: sessionId,
      conversationHistory: [],
      activeAgent: null,
      activeFiles: [],
      lastQuery: null,
      lastResponse: null,
      metadata: {},
      createdAt: new Date().toISOString()
    };
    
    this._saveContextToDb();
    return this.currentContext.sessionId;
  }
  
  /**
   * Supprime une session
   * @param {string} sessionId - Identifiant de la session
   * @returns {Promise<boolean>} Résultat de la suppression
   */
  deleteSession(sessionId) {
    return new Promise((resolve, reject) => {
      this.db.remove({ _id: sessionId }, {}, (err, numRemoved) => {
        if (err) {
          reject(err);
        } else {
          resolve(numRemoved > 0);
        }
      });
    });
  }
}

module.exports = new MemoryService();
