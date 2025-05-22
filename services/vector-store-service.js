/**
 * Service de stockage vectoriel pour ABIA
 * Permet d'indexer et de rechercher des documents, conversations et autres contenus
 * en utilisant des embeddings vectoriels pour une recherche sémantique
 * Version simplifiée utilisant vector-storage qui ne nécessite pas de compilation native
 */

const path = require('path');
const fs = require('fs');
const VectorStorage = require('vector-storage');
const { Document } = require('langchain/document');
const axios = require('axios');

// Gestion sécurisée de l'accès à Electron
let electronApp = null;
try {
  const { app } = require('electron');
  electronApp = app;
} catch (error) {
  console.warn('Electron non disponible pour le service vectoriel, utilisation du répertoire par défaut');
}

class VectorStoreService {
  constructor() {
    this.dbPath = null;
    this.vectorStore = null;
    this.initialized = false;
    this.dimensions = 384; // Dimensions pour un modèle d'embeddings simplifié
  }

  /**
   * Obtient des embeddings pour un texte via une API
   * @param {string} text - Texte à encoder
   * @returns {Promise<Array<number>>} - Vecteur d'embedding
   */
  async getEmbeddings(text) {
    try {
      // Méthode locale simple pour créer des embeddings
      // En production, vous utiliseriez une API comme OpenAI
      const hash = await this._simpleHash(text);
      const vector = new Array(this.dimensions).fill(0);
      
      // Remplir le vecteur avec des valeurs dérivées du hash
      for (let i = 0; i < Math.min(hash.length, this.dimensions); i++) {
        vector[i] = parseInt(hash.charAt(i % hash.length), 16) / 16;
      }
      
      return vector;
    } catch (error) {
      console.error('Erreur lors de la génération des embeddings:', error);
      // Retourner un vecteur aléatoire en cas d'erreur
      return Array.from({length: this.dimensions}, () => Math.random());
    }
  }

  /**
   * Génère un hash simple pour un texte
   * @private
   * @param {string} text - Texte à hasher
   * @returns {Promise<string>} - Hash du texte
   */
  async _simpleHash(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Initialise le service de stockage vectoriel
   * @returns {boolean} - True si l'initialisation a réussi
   */
  async initialize() {
    try {
      console.log('Initialisation du service vectoriel simplifié...');

      // Déterminer le chemin de la base de données
      const userDataPath = electronApp ? 
        electronApp.getPath('userData') : 
        path.join(process.cwd(), 'data');
      
      // Créer le répertoire vectorstore s'il n'existe pas
      this.dbPath = path.join(userDataPath, 'vectorstore');
      if (!fs.existsSync(this.dbPath)) {
        fs.mkdirSync(this.dbPath, { recursive: true });
      }

      // Créer ou charger le stockage vectoriel
      const dbFile = path.join(this.dbPath, 'vectors.json');
      if (fs.existsSync(dbFile)) {
        try {
          const data = fs.readFileSync(dbFile, 'utf8');
          const parsed = JSON.parse(data);
          this.vectorStore = new VectorStorage(this.dimensions, parsed);
          console.log('Stockage vectoriel chargé avec succès');
        } catch (err) {
          console.log('Erreur lors du chargement du stockage vectoriel, création d\'un nouveau');
          this.vectorStore = new VectorStorage(this.dimensions);
        }
      } else {
        console.log('Création d\'un nouveau stockage vectoriel');
        this.vectorStore = new VectorStorage(this.dimensions);
      }

      this.initialized = true;
      console.log('Service vectoriel initialisé avec succès');
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du service vectoriel:', error);
      return false;
    }
  }

  /**
   * Ajoute un document au stockage vectoriel
   * @param {string} content - Contenu du document
   * @param {Object} metadata - Métadonnées associées
   * @returns {Promise<boolean>} - True si l'ajout a réussi
   */
  async addDocument(content, metadata = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const vector = await this.getEmbeddings(content);
      const docId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
      
      const docData = {
        id: docId,
        content,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString()
        }
      };

      this.vectorStore.add(docId, vector, docData);
      await this.saveVectorStore();
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'ajout d\'un document au vectorstore:', error);
      return false;
    }
  }

  /**
   * Recherche des documents similaires
   * @param {string} query - Requête de recherche
   * @param {number} k - Nombre de résultats à retourner
   * @param {Object} filter - Filtre sur les métadonnées
   * @returns {Promise<Array>} - Documents trouvés
   */
  async search(query, k = 5, filter = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const queryVector = await this.getEmbeddings(query);
      const results = this.vectorStore.search(queryVector, k);
      
      // Filtrer les résultats par métadonnées si nécessaire
      const filteredResults = filter && Object.keys(filter).length > 0 ? 
        results.filter(result => {
          for (const [key, value] of Object.entries(filter)) {
            if (!result.item.metadata || result.item.metadata[key] !== value) {
              return false;
            }
          }
          return true;
        }) : results;
      
      // Formatter les résultats pour correspondre à l'API LangChain
      return filteredResults.map(result => ({
        pageContent: result.item.content,
        metadata: result.item.metadata || {},
        score: result.score
      }));
    } catch (error) {
      console.error('Erreur lors de la recherche dans le vectorstore:', error);
      return [];
    }
  }

  /**
   * Sauvegarde le vectorstore sur disque
   * @returns {Promise<boolean>} - True si la sauvegarde a réussi
   */
  async saveVectorStore() {
    try {
      const dbFile = path.join(this.dbPath, 'vectors.json');
      const data = JSON.stringify(this.vectorStore.export());
      fs.writeFileSync(dbFile, data, 'utf8');
      return true;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du vectorstore:', error);
      return false;
    }
  }

  /**
   * Supprime des documents du vectorstore
   * @param {Object} filter - Filtre sur les métadonnées
   * @returns {Promise<boolean>} - True si la suppression a réussi
   */
  async deleteDocuments(filter = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      if (!filter || Object.keys(filter).length === 0) {
        console.warn('Tentative de suppression sans filtre, opération ignorée');
        return false;
      }
      
      // Exporter tous les documents pour filtrage
      const allDocs = this.vectorStore.export();
      const idsToDelete = [];
      
      // Identifier les documents à supprimer
      for (const [id, item] of Object.entries(allDocs.items || {})) {
        let shouldDelete = true;
        for (const [key, value] of Object.entries(filter)) {
          if (!item.metadata || item.metadata[key] !== value) {
            shouldDelete = false;
            break;
          }
        }
        if (shouldDelete) {
          idsToDelete.push(id);
        }
      }
      
      // Supprimer les documents identifiés
      for (const id of idsToDelete) {
        this.vectorStore.remove(id);
      }
      
      console.log(`${idsToDelete.length} documents supprimés du vectorstore`);
      await this.saveVectorStore();
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression de documents du vectorstore:', error);
      return false;
    }
  }
}

module.exports = new VectorStoreService();
