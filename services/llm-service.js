const axios = require('axios');
const fs = require('fs');
const path = require('path');

class LLMService {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.DEEPSEEK_API_KEY;
    this.baseUrl = config.baseUrl || 'https://api.deepseek.com/v1';
    this.model = config.model || 'deepseek-chat';
    this.temperature = config.temperature || 0.7;
    this.maxTokens = config.maxTokens || 1000;
    
    // Configuration des tentatives et timeout
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000; // 1 seconde
    this.timeout = config.timeout || 60000; // 60 secondes par défaut
    
    // Système de cache pour les réponses
    this.responseCache = new Map();
    this.cacheTTL = 3600000; // 1 heure en millisecondes
    this.cacheMaxSize = 50; // Nombre maximum d'entrées dans le cache
    
    // État de connexion
    this.connectionStatus = 'unknown'; // unknown, connected, error
    this.lastConnectionError = null;
  }

  /**
   * Configure le service LLM
   * @param {Object} config - Configuration du service
   */
  configure(config) {
    if (config.apiKey) this.apiKey = config.apiKey;
    if (config.baseUrl) this.baseUrl = config.baseUrl;
    if (config.model) this.model = config.model;
    if (config.temperature !== undefined) this.temperature = config.temperature;
    if (config.maxTokens) this.maxTokens = config.maxTokens;
    if (config.maxRetries !== undefined) this.maxRetries = config.maxRetries;
    if (config.retryDelay !== undefined) this.retryDelay = config.retryDelay;
    if (config.timeout !== undefined) this.timeout = config.timeout;
  }

  /**
   * Vérifie si le service est correctement configuré
   * @returns {boolean} - True si le service est configuré
   */
  isConfigured() {
    return !!this.apiKey;
  }

  /**
   * Envoie une requête au modèle LLM avec gestion des tentatives
   * @param {Array} messages - Messages à envoyer au modèle
   * @param {Object} options - Options supplémentaires
   * @returns {Promise<Object>} - Réponse du modèle
   */
  async sendRequest(messages, options = {}) {
    if (!this.isConfigured()) {
      throw new Error('Le service LLM n\'est pas configuré. Veuillez fournir une clé API.');
    }
    
    // Ne pas utiliser le cache si le streaming est activé
    if (!options.stream && !options.skipCache) {
      // Créer une clé de cache basée sur les messages et options
      const cacheKey = this._createCacheKey(messages, options);
      
      // Vérifier si la réponse est en cache et valide
      if (this.responseCache.has(cacheKey)) {
        const cachedData = this.responseCache.get(cacheKey);
        if (Date.now() - cachedData.timestamp < this.cacheTTL) {
          console.log('Réponse trouvée en cache');
          return cachedData.response;
        }
      }
    }
    
    // Paramètres de l'appel API
    const requestOptions = {
      model: options.model || this.model,
      messages,
      temperature: options.temperature !== undefined ? options.temperature : this.temperature,
      max_tokens: options.maxTokens || this.maxTokens,
      stream: options.stream || false
    };
    
    // Configurer les paramètres de tentatives
    const maxRetries = options.maxRetries !== undefined ? options.maxRetries : this.maxRetries;
    const retryDelay = options.retryDelay || this.retryDelay;
    const timeout = options.timeout || this.timeout;
    
    // Tentatives multiples
    let lastError = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Si ce n'est pas la première tentative, attendre avant de réessayer
        if (attempt > 0) {
          const delayMs = retryDelay * Math.pow(2, attempt - 1); // Backoff exponentiel
          console.log(`Tentative ${attempt}/${maxRetries} après ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        
        // Créer un contrôleur d'abandon pour le timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
          console.warn(`La requête a été abandonnée après ${timeout/1000} secondes`);
        }, timeout);
        
        // Effectuer la requête
        console.log(`Envoi de la requête à l'API DeepSeek (tentative ${attempt+1}/${maxRetries+1})`);
        const response = await axios.post(`${this.baseUrl}/chat/completions`, requestOptions, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          signal: controller.signal,
          timeout: timeout // Timeout Axios en plus de l'AbortController
        });
        
        // Requête réussie, annuler le timer de timeout
        clearTimeout(timeoutId);
        
        // Mettre à jour l'état de connexion
        this.connectionStatus = 'connected';
        this.lastConnectionError = null;
        
        // Mettre en cache la réponse si ce n'est pas une requête en streaming
        if (!options.stream && !options.skipCache) {
          this._cacheResponse(this._createCacheKey(messages, options), response.data);
        }
        
        return response.data;
      } catch (error) {
        lastError = error;
        
        // Mettre à jour l'état de connexion
        this.connectionStatus = 'error';
        this.lastConnectionError = error;
        
        // Log détaillé de l'erreur
        console.error(`Erreur lors de l'appel à l'API LLM (tentative ${attempt+1}/${maxRetries+1}):`, 
          error.code || error.response?.status || error.message);
        
        // Ne pas réessayer en cas d'erreurs non récupérables
        if (
          error.response?.status === 401 || // Erreur d'authentification
          error.response?.status === 400 || // Mauvaise requête
          error.response?.status === 404 || // Endpoint non trouvé
          attempt >= maxRetries // Nombre maximum de tentatives atteint
        ) {
          console.error("Abandon des tentatives car l'erreur n'est pas récupérable ou nombre maximum atteint.");
          break;
        }
        
        // Pour les autres erreurs, on continue avec la prochaine tentative
      }
    }
    
    // Si toutes les tentatives ont échoué
    console.error(`Échec de la connexion à l'API DeepSeek après ${maxRetries+1} tentatives.`);
    
    // Créer un message d'erreur plus informatif
    let errorMessage = "Impossible de se connecter à l'API DeepSeek";
    if (lastError) {
      if (lastError.code === 'ERR_CANCELED') {
        errorMessage = "La requête a été annulée en raison d'un délai d'attente trop long. Veuillez vérifier votre connexion internet.";
      } else if (lastError.response?.status) {
        errorMessage = `Erreur HTTP ${lastError.response.status}: ${lastError.response.data?.error?.message || lastError.message}`;
      } else if (lastError.code) {
        errorMessage = `Erreur de réseau (${lastError.code}): ${lastError.message}`;
      } else {
        errorMessage = lastError.message;
      }
    }
    
    throw new Error(errorMessage);
  }
  
  /**
   * Crée une clé de cache basée sur les messages et options
   * @param {Array} messages - Messages à envoyer au modèle
   * @param {Object} options - Options supplémentaires
   * @returns {string} - Clé de cache
   * @private
   */
  _createCacheKey(messages, options) {
    // Simplifier les messages pour la clé de cache
    const simplifiedMessages = messages.map(m => ({
      role: m.role,
      content: m.content
    }));
    
    // Ajouter un identifiant unique pour les messages de l'utilisateur
    // afin d'éviter les faux positifs dans le cache
    const userMessages = messages.filter(m => m.role === 'user');
    const lastUserMessage = userMessages[userMessages.length - 1];
    
    // Créer une clé unique basée sur les messages et les options importantes
    return JSON.stringify({
      messages: simplifiedMessages,
      model: options.model || this.model,
      temperature: options.temperature !== undefined ? options.temperature : this.temperature,
      max_tokens: options.maxTokens || this.maxTokens,
      // Utiliser un identifiant de requête s'il est fourni, sinon générer un aléatoire
      requestId: options.requestId || this._generateRequestId()
    });
  }
  
  /**
   * Génère un identifiant de requête unique
   * @returns {string} - ID unique
   * @private
   */
  _generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
  
  /**
   * Vérifie l'état de la connexion à l'API
   * @returns {Promise<boolean>} - True si la connexion est établie
   */
  async checkConnection() {
    try {
      // Envoyer une requête simple pour vérifier la connexion
      const testMessages = [
        { role: 'system', content: "Vous êtes un assistant intelligent." },
        { role: 'user', content: "Test de connexion" }
      ];
      
      // Limiter à 1 token pour économiser des ressources
      const options = {
        maxTokens: 1,
        timeout: 10000, // 10 secondes
        skipCache: true
      };
      
      await this.sendRequest(testMessages, options);
      return true;
    } catch (error) {
      console.error("Test de connexion à l'API DeepSeek échoué:", error.message);
      return false;
    }
  }
  
  /**
   * Met en cache une réponse
   * @param {string} cacheKey - Clé de cache
   * @param {Object} response - Réponse à mettre en cache
   * @private
   */
  _cacheResponse(cacheKey, response) {
    // Gérer la taille du cache
    if (this.responseCache.size >= this.cacheMaxSize) {
      // Supprimer l'entrée la plus ancienne
      let oldestKey = null;
      let oldestTime = Date.now();
      
      for (const [key, value] of this.responseCache.entries()) {
        if (value.timestamp < oldestTime) {
          oldestTime = value.timestamp;
          oldestKey = key;
        }
      }
      
      if (oldestKey) {
        this.responseCache.delete(oldestKey);
      }
    }
    
    // Ajouter la nouvelle réponse au cache
    this.responseCache.set(cacheKey, {
      response,
      timestamp: Date.now()
    });
  }

  /**
   * Envoie une requête en streaming au modèle LLM
   * @param {Array} messages - Messages à envoyer au modèle
   * @param {Function} onChunk - Fonction appelée pour chaque morceau de réponse
   * @param {Object} options - Options supplémentaires
   * @returns {Promise<void>}
   */
  async streamRequest(messages, onChunk, options = {}) {
    if (!this.isConfigured()) {
      throw new Error('Le service LLM n\'est pas configuré. Veuillez fournir une clé API.');
    }

    try {
      const requestOptions = {
        model: options.model || this.model,
        messages,
        temperature: options.temperature !== undefined ? options.temperature : this.temperature,
        max_tokens: options.maxTokens || this.maxTokens,
        stream: true
      };

      const response = await axios.post(`${this.baseUrl}/chat/completions`, requestOptions, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        responseType: 'stream'
      });

      response.data.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6);
            
            if (data === '[DONE]') {
              return;
            }
            
            try {
              const parsedData = JSON.parse(data);
              const content = parsedData.choices[0]?.delta?.content || '';
              
              if (content) {
                onChunk(content);
              }
            } catch (e) {
              console.error('Erreur lors du parsing des données de streaming:', e);
            }
          }
        }
      });

      return new Promise((resolve, reject) => {
        response.data.on('end', resolve);
        response.data.on('error', reject);
      });
    } catch (error) {
      console.error('Erreur lors de l\'appel en streaming à l\'API LLM:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Envoie une simple requête de chat au modèle LLM
   * @param {string} prompt - Message de l'utilisateur
   * @param {string} systemPrompt - Message système (instructions)
   * @param {Object} options - Options supplémentaires
   * @returns {Promise<string>} - Réponse du modèle
   */
  async chat(prompt, systemPrompt = '', options = {}) {
    const messages = [];
    
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }
    
    messages.push({
      role: 'user',
      content: prompt
    });
    
    const response = await this.sendRequest(messages, options);
    return response.choices[0]?.message?.content || '';
  }

  /**
   * Génère un résumé d'un texte
   * @param {string} text - Texte à résumer
   * @param {number} maxLength - Longueur maximale du résumé
   * @returns {Promise<string>} - Résumé généré
   */
  async summarize(text, maxLength = 200) {
    const prompt = `Résume le texte suivant en ${maxLength} mots maximum:\n\n${text}`;
    const systemPrompt = 'Tu es un assistant spécialisé dans la création de résumés concis et informatifs.';
    
    return this.chat(prompt, systemPrompt, { temperature: 0.3 });
  }

  /**
   * Analyse un texte pour en extraire des informations clés
   * @param {string} text - Texte à analyser
   * @param {Array} fields - Champs à extraire
   * @returns {Promise<Object>} - Informations extraites
   */
  async extractInformation(text, fields) {
    const prompt = `Extrait les informations suivantes du texte ci-dessous. Réponds uniquement au format JSON avec les champs demandés.
    
Champs à extraire: ${fields.join(', ')}

Texte:
${text}`;
    
    const systemPrompt = 'Tu es un assistant spécialisé dans l\'extraction d\'informations précises à partir de textes. Réponds uniquement au format JSON.';
    
    const response = await this.chat(prompt, systemPrompt, { temperature: 0.1 });
    
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('Erreur lors du parsing de la réponse JSON:', error);
      return { error: 'Format de réponse invalide', rawResponse: response };
    }
  }

  /**
   * Génère un texte créatif basé sur un prompt
   * @param {string} prompt - Prompt créatif
   * @param {Object} options - Options supplémentaires
   * @returns {Promise<string>} - Texte généré
   */
  async generateCreativeText(prompt, options = {}) {
    const systemPrompt = 'Tu es un assistant créatif qui génère des textes originaux et engageants.';
    
    return this.chat(prompt, systemPrompt, { 
      temperature: options.temperature || 0.9,
      maxTokens: options.maxTokens || 2000
    });
  }

  /**
   * Répond à une question basée sur un contexte
   * @param {string} question - Question posée
   * @param {string} context - Contexte pour répondre à la question
   * @returns {Promise<string>} - Réponse à la question
   */
  async answerQuestion(question, context) {
    const prompt = `Question: ${question}\n\nContexte: ${context}`;
    const systemPrompt = 'Tu es un assistant qui répond précisément aux questions en te basant uniquement sur le contexte fourni.';
    
    return this.chat(prompt, systemPrompt, { temperature: 0.3 });
  }
  
  /**
   * Obtient l'état actuel de la connexion
   * @returns {Object} État de la connexion
   */
  getConnectionStatus() {
    return {
      status: this.connectionStatus,
      lastError: this.lastConnectionError ? {
        message: this.lastConnectionError.message,
        code: this.lastConnectionError.code,
        status: this.lastConnectionError.response?.status
      } : null
    };
  }
}

module.exports = LLMService;
