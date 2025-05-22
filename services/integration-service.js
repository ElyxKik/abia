const LLMService = require('./llm-service');
const LangChainService = require('./langchain-service');
const MemoryService = require('./memory-service');
const MainAgent = require('../agents/MainAgent');
const config = require('../config/config');
const path = require('path');
const fs = require('fs');
const excelLLMService = require('./excel-llm-service');
const pythonExcelService = require('./python-excel-service');

/**
 * Service d'intégration qui coordonne les différents agents et services
 */
class IntegrationService {
  constructor() {
    // Initialiser le service LLM avec les paramètres de configuration
    this.llmService = new LLMService({
      apiKey: config.get('llm.apiKey', ''),
      model: config.get('llm.model', 'deepseek-chat'),
      temperature: config.get('llm.temperature', 0.7),
      maxTokens: config.get('llm.maxTokens', 1000)
    });
    
    // Utiliser le service LangChain pour les fonctionnalités avancées
    this.langChainService = LangChainService;
    
    // Initialiser l'agent principal qui orchestrera tous les autres agents
    this.mainAgent = new MainAgent();
    
    // Utiliser le service de mémoire pour l'historique de conversation
    this.memoryService = MemoryService;
    this.maxHistoryLength = config.get('storage.historyLimit', 100);
    
    // Utiliser les services de traitement Excel
    this.excelLLMService = excelLLMService;
    this.pythonExcelService = pythonExcelService;
  }

  /**
   * Initialise le service d'intégration
   */
  initialize() {
    try {
      console.log('Début de l\'initialisation du service d\'intégration...');
      
      // Vérifier et initialiser le service LLM
      if (!this.llmService.isConfigured()) {
        console.warn('Le service LLM n\'est pas configuré. Veuillez fournir une clé API.');
        // Essayer de récupérer la clé API une dernière fois
        const apiKey = config.get('llm.apiKey', '');
        if (apiKey) {
          console.log('Tentative de configuration du service LLM avec la clé API trouvée...');
          this.llmService.configure({ apiKey });
        }
      }
      
      // Initialiser les services Excel
      console.log('Initialisation des services Excel...');
      if (this.excelLLMService && typeof this.excelLLMService.initialize === 'function') {
        this.excelLLMService.initialize();
        console.log('Service Excel LLM initialisé');
      } else {
        console.warn('Service Excel LLM non disponible ou méthode initialize non trouvée');
      }
      
      if (this.pythonExcelService && typeof this.pythonExcelService.initialize === 'function') {
        const pythonInitialized = this.pythonExcelService.initialize();
        if (pythonInitialized) {
          console.log('Service Python Excel initialisé');
        } else {
          console.warn('Initialisation du service Python Excel a échoué');
        }
      } else {
        console.warn('Service Python Excel non disponible ou méthode initialize non trouvée');
      }
      
      // Vérifier et initialiser le service LangChain
      if (this.langChainService && typeof this.langChainService.initialize === 'function') {
        console.log('Initialisation du service LangChain...');
        this.langChainService.initialize();
      } else {
        console.warn('Service LangChain non disponible ou déjà initialisé');
      }
      
      // Initialiser l'agent principal qui orchestrera tous les autres agents
      if (this.mainAgent && typeof this.mainAgent.initialize === 'function') {
        console.log('Initialisation de l\'agent principal...');
        this.mainAgent.initialize();
      } else {
        console.warn('Agent principal non disponible');
      }
      
      // Créer une nouvelle session dans le service de mémoire
      if (this.memoryService && typeof this.memoryService.createNewSession === 'function') {
        const sessionId = this.memoryService.createNewSession();
        console.log(`Nouvelle session créée: ${sessionId}`);
      } else {
        console.warn('Service de mémoire non disponible');
      }
      
      console.log('Service d\'intégration initialisé avec succès');
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du service d\'intégration:', error);
      return false;
    }
  }

  /**
   * Méthode de secours pour classifier une requête
   * Utilise une analyse simple basée sur des mots-clés
   * @param {string} query - Requête à classifier
   * @returns {Object} - Type de requête et confiance
   */
  async classifyQuery(query) {
    const lowercaseQuery = query.toLowerCase();
    
    // Mots-clés simples pour la classification
    const keywords = {
      excel: ['excel', 'tableau', 'feuille de calcul', 'graphique', 'cellule', 'xls'],
      mail: ['email', 'mail', 'message', 'envoyer', 'boite de réception', 'outlook'],
      document: ['document', 'pdf', 'texte', 'doc', 'fichier', 'lire', 'analyser'],
      chat: ['discuter', 'parler', 'question', 'répondre', 'aide']
    };
    
    // Calcul du score pour chaque catégorie
    const scores = {};
    for (const [category, categoryKeywords] of Object.entries(keywords)) {
      scores[category] = categoryKeywords.reduce((score, keyword) => {
        if (lowercaseQuery.includes(keyword)) {
          return score + 1;
        }
        return score;
      }, 0);
    }
    
    // Déterminer la catégorie avec le score le plus élevé
    let highestScore = 0;
    let highestCategory = 'chat';
    
    for (const [category, score] of Object.entries(scores)) {
      if (score > highestScore) {
        highestScore = score;
        highestCategory = category;
      }
    }
    
    // Calculer la confiance en fonction du score
    const confidence = Math.min(0.5 + (highestScore * 0.1), 0.9);
    
    return {
      type: highestCategory,
      confidence: confidence
    };
  }

  /**
   * Traite une requête utilisateur et détermine quel agent utiliser
   * @param {string} query - Requête de l'utilisateur
   * @param {Object} options - Options supplémentaires
   * @returns {Promise<Object>} - Réponse à la requête
   */
  async processQuery(query, options = {}) {
    try {
      // Ajouter la requête à l'historique avec des métadonnées
      if (this.memoryService && typeof this.memoryService.addToConversationHistory === 'function') {
        this.memoryService.addToConversationHistory('user', query, {
          timestamp: new Date().toISOString()
        });
      }
      
      // Vérifier si le service LLM est configuré
      if (!this.llmService.isConfigured()) {
        console.error('Le service LLM n\'est pas configuré correctement. Vérifiez votre clé API.');
        return {
          type: 'error',
          message: 'Désolé, le service d\'intelligence artificielle n\'est pas configuré correctement. Veuillez contacter l\'administrateur.',
          actions: []
        };
      }
      
      // Tentative directe de communication avec DeepSeek
      try {
        // Envoyer une requête simple de test pour vérifier la connexion
        const testMessage = [
          { role: 'system', content: 'Vous êtes un assistant intelligent.' },
          { role: 'user', content: 'Test de connexion' }
        ];
        // Ajouter un identifiant unique pour éviter les faux positifs dans le cache
        const testRequestId = `test_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        await this.llmService.sendRequest(testMessage, {
          requestId: testRequestId,
          skipCache: true // Toujours ignorer le cache pour les tests de connexion
        });
        console.log('Connexion à DeepSeek établie avec succès');
      } catch (connectionError) {
        console.error('Erreur de connexion à DeepSeek:', connectionError);
        return {
          type: 'error',
          message: 'Désolé, impossible de se connecter au service d\'intelligence artificielle. Veuillez vérifier votre connexion internet ou réessayer plus tard.',
          actions: []
        };
      }
      
      // Récupérer le contexte actuel
      let context = {};
      if (this.memoryService && typeof this.memoryService.getCurrentContext === 'function') {
        context = this.memoryService.getCurrentContext() || {};
      }
      
      // Utiliser l'agent principal pour traiter la requête
      if (!this.mainAgent) {
        console.error('L\'agent principal n\'est pas initialisé');
        return {
          type: 'error',
          message: 'Désolé, une erreur interne s\'est produite. Veuillez redémarrer l\'application.',
          actions: []
        };
      }
      
      // Préparer le contexte pour l'agent principal
      let history = [];
      if (this.memoryService && typeof this.memoryService.getConversationHistory === 'function') {
        history = this.memoryService.getConversationHistory(10) || [];
      }
      
      // Préparer le contexte pour l'agent principal
      // Générer un identifiant unique pour cette requête
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      
      const agentContext = {
        ...context,
        ...options,
        history: history,
        llmService: this.llmService,
        requestId: requestId,
        // Désactiver le cache pour les nouvelles requêtes
        skipCache: options.skipCache === true || query.toLowerCase().includes('nouvelle') || query.toLowerCase().includes('nouveau')
      };
      
      // Si un fichier est sélectionné, l'ajouter au contexte
      if (this.memoryService && this.memoryService.getCurrentContext() && this.memoryService.getCurrentContext().activeFile) {
        agentContext.filePath = this.memoryService.getCurrentContext().activeFile.path;
        agentContext.fileType = this.memoryService.getCurrentContext().activeFile.type;
      }
      
      // Traiter la requête avec l'agent principal
      const response = await this.mainAgent.processQuery(query, agentContext);
      
      // Enregistrer la réponse dans l'historique
      if (this.memoryService && typeof this.memoryService.addToConversationHistory === 'function') {
        // S'assurer qu'on logue le contenu textuel du message
        const messageToLog = (typeof response === 'string') ? response : (response.message || JSON.stringify(response));
        this.memoryService.addToConversationHistory('assistant', messageToLog, {
          timestamp: new Date().toISOString()
        });
      }
      
      // Préparer la réponse pour le renderer
      let messageContent = "";
      let actionsContent = [];
      let responseType = 'general'; // Type par défaut

      if (typeof response === 'string') {
        messageContent = response;
      } else if (response && typeof response.message === 'string') {
        messageContent = response.message;
        if (Array.isArray(response.actions)) {
          actionsContent = response.actions;
        }
        if (response.type) {
            responseType = response.type;
        }
      } else if (response && typeof response.content === 'string') { // Fallback pour une structure { content: "..." }
        messageContent = response.content;
        if (response.type) {
            responseType = response.type;
        }
        // Si actions est présent à ce niveau, on le prend aussi
        if (Array.isArray(response.actions)) {
            actionsContent = response.actions;
        }
      } else {
        console.error('[DEBUG] integrationService.processQuery: Réponse inattendue du MainAgent:', response);
        messageContent = "J'ai reçu une réponse mais je ne peux pas l'afficher correctement.";
        // On pourrait aussi essayer de convertir l'objet en JSON string pour debug
        // messageContent = JSON.stringify(response) || "Réponse non-stringifiable.";
        responseType = 'error';
      }
      
      return {
        type: responseType,
        message: messageContent,
        actions: actionsContent
      };
    } catch (error) {
      console.error('Erreur lors du traitement de la requête:', error);
      return {
        type: 'error',
        message: `Désolé, une erreur s'est produite lors du traitement de votre demande: ${error.message}`,
        actions: []
      };
    }
  }

  /**
   * Traite un fichier Excel
   * @param {string} filePath - Chemin du fichier Excel
   * @param {string} query - Requête de l'utilisateur
   * @returns {Promise<Object>} - Résultat de l'analyse
   */
  async processExcelFile(filePath, query = '') {
    try {
      console.log(`Traitement du fichier Excel: ${filePath}`);
      
      // Vérifier que le fichier existe
      if (!fs.existsSync(filePath)) {
        throw new Error(`Le fichier ${filePath} n'existe pas.`);
      }
      
      // Vérifier que c'est un fichier Excel
      const ext = path.extname(filePath).toLowerCase();
      if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
        throw new Error(`Le fichier ${filePath} n'est pas un fichier Excel valide.`);
      }
      
      // Mettre à jour le contexte avec le fichier actif
      if (this.memoryService && typeof this.memoryService.updateContext === 'function') {
        this.memoryService.updateContext({
          activeFile: filePath,
          fileType: 'excel'
        });
      }
      
      // Utiliser l'agent principal pour traiter le fichier
      if (!this.mainAgent) {
        throw new Error('L\'agent principal n\'est pas initialisé');
      }
      
      // Définir l'agent actif sur Excel
      this.mainAgent.setActiveAgent('excel');
      
      // Préparer le contexte
      const context = {
        filePath,
        fileType: 'excel',
        query
      };
      
      // Traiter le fichier avec l'agent principal
      const response = await this.mainAgent.processQuery(query || 'Analyser ce fichier Excel', context);
      
      return response;
    } catch (error) {
      console.error('Erreur lors du traitement du fichier Excel:', error);
      return {
        type: 'error',
        content: `Erreur lors du traitement du fichier Excel: ${error.message}`
      };
    }
  }

  /**
   * Traite un document (PDF, Word, etc.)
   * @param {string} filePath - Chemin du document
   * @param {string} query - Requête de l'utilisateur
   * @returns {Promise<Object>} - Résultat de l'analyse
   */
  async processDocument(filePath, query = '') {
    try {
      console.log(`Traitement du document: ${filePath}`);
      
      // Vérifier que le fichier existe
      if (!fs.existsSync(filePath)) {
        throw new Error(`Le fichier ${filePath} n'existe pas.`);
      }
      
      // Déterminer le type de document
      const ext = path.extname(filePath).toLowerCase();
      let fileType = 'document';
      
      if (['.pdf'].includes(ext)) {
        fileType = 'pdf';
      } else if (['.docx', '.doc'].includes(ext)) {
        fileType = 'word';
      } else if (['.txt', '.md'].includes(ext)) {
        fileType = 'text';
      }
      
      // Mettre à jour le contexte avec le fichier actif
      if (this.memoryService && typeof this.memoryService.updateContext === 'function') {
        this.memoryService.updateContext({
          activeFile: filePath,
          fileType
        });
      }
      
      // Utiliser l'agent principal pour traiter le document
      if (!this.mainAgent) {
        throw new Error('L\'agent principal n\'est pas initialisé');
      }
      
      // Définir l'agent actif sur Document
      this.mainAgent.setActiveAgent('document');
      
      // Préparer le contexte
      const context = {
        filePath,
        fileType,
        query
      };
      
      // Traiter le document avec l'agent principal
      const response = await this.mainAgent.processQuery(query || 'Analyser ce document', context);
      
      return response;
    } catch (error) {
      console.error('Erreur lors du traitement du document:', error);
      return {
        type: 'error',
        content: `Erreur lors du traitement du document: ${error.message}`
      };
    }
  }

  /**
   * Vérifie si un fichier est un fichier Excel
   * @param {string} filePath - Chemin du fichier
   * @returns {boolean} - True si c'est un fichier Excel
   */
  isExcelFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return ['.xlsx', '.xls', '.csv'].includes(ext);
  }

  /**
   * Obtient le type de fichier à partir de son extension
   * @param {string} filePath - Chemin du fichier
   * @returns {string} - Type de fichier
   */
  getFileType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    if (['.xlsx', '.xls', '.csv'].includes(ext)) {
      return 'excel';
    } else if (['.pdf'].includes(ext)) {
      return 'pdf';
    } else if (['.docx', '.doc'].includes(ext)) {
      return 'word';
    } else if (['.txt', '.md'].includes(ext)) {
      return 'text';
    } else {
      return 'unknown';
    }
  }

  /**
   * Obtient le prompt système en fonction du contexte
   * @param {Object} context - Contexte de la conversation
   * @returns {string} - Prompt système
   */
  getSystemPrompt(context = {}) {
    let prompt = 'Vous êtes ABIA, un assistant IA intelligent et utile. ';
    
    if (context.activeFile) {
      prompt += `Vous travaillez actuellement sur le fichier ${path.basename(context.activeFile)}. `;
      
      if (context.fileType) {
        prompt += `C'est un fichier de type ${context.fileType}. `;
      }
    }
    
    prompt += 'Soyez concis, précis et utile dans vos réponses.';
    
    return prompt;
  }
}

module.exports = new IntegrationService();
