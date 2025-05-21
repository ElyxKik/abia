const path = require('path');
const fs = require('fs');
const LLMService = require('../services/llm-service');
const config = require('../config/config');

/**
 * Agent de chat responsable des interactions conversationnelles générales
 */
class ChatAgent {
  constructor() {
    this.initialized = false;
    this.llmService = null;
    this.systemPrompt = `Vous êtes ABIA, un assistant IA intelligent et utile. 
Vous êtes courtois, serviable et vous fournissez des réponses précises et concises.
Vous pouvez aider avec diverses tâches comme répondre à des questions, fournir des informations,
et assister l'utilisateur dans ses tâches quotidiennes.`;
  }
  
  /**
   * Initialise l'agent de chat
   * @returns {boolean} - True si l'initialisation a réussi
   */
  initialize() {
    try {
      console.log('Initialisation de l\'agent de chat...');
      
      // Initialiser le service LLM
      this._initializeLLMService();
      
      this.initialized = true;
      console.log('Agent de chat initialisé avec succès');
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de l\'agent de chat:', error);
      return false;
    }
  }

  /**
   * Initialise le service LLM (DeepSeek ou autre)
   * @private
   */
  _initializeLLMService() {
    try {
      // Vérifier si une clé API est configurée
      const apiKey = config.get('llm.apiKey', '') || process.env.DEEPSEEK_API_KEY;
      
      if (!apiKey) {
        console.warn('Aucune clé API DeepSeek trouvée dans la configuration');
        return;
      }
      
      // Configurer le service LLM
      this.llmService = new LLMService({
        apiKey: apiKey,
        model: config.get('llm.model', 'deepseek-chat'),
        temperature: config.get('llm.temperature', 0.7),
        maxTokens: config.get('llm.maxTokens', 1000)
      });
      
      console.log('Service LLM DeepSeek initialisé avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du service LLM:', error);
    }
  }

  /**
   * Traite une requête de chat
   * @param {string} userQuery - Requête de l'utilisateur
   * @param {Object} context - Contexte de la conversation
   * @returns {Promise<Object>} - Réponse à la requête
   */
  async processChat(userQuery, context = {}) {
    try {
      // Vérifier si le service LLM est initialisé
      if (!this.llmService) {
        return {
          message: "Je ne peux pas traiter votre demande pour le moment car le service LLM n'est pas disponible. Veuillez vérifier votre configuration.",
          error: true
        };
      }
      
      // Construire les messages pour l'API
      const messages = [
        { role: 'system', content: this.systemPrompt }
      ];
      
      // Ajouter l'historique de conversation si disponible
      if (context.history && Array.isArray(context.history)) {
        // Limiter l'historique aux 10 derniers messages pour éviter de dépasser les limites de tokens
        const recentHistory = context.history.slice(-10);
        messages.push(...recentHistory);
      }
      
      // Ajouter la requête actuelle
      messages.push({ role: 'user', content: userQuery });
      
      // Appeler l'API LLM via notre service
      // Ajouter un identifiant unique pour éviter les faux positifs dans le cache
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      
      const response = await this.llmService.sendRequest(messages, {
        model: config.get('llm.model', 'deepseek-chat'),
        temperature: 0.7,
        maxTokens: 1000,
        requestId: requestId,
        // Désactiver le cache pour les nouvelles requêtes utilisateur
        skipCache: context.skipCache === true || userQuery.toLowerCase().includes('nouvelle') || userQuery.toLowerCase().includes('nouveau')
      });
      
      // Extraire le contenu du message de la réponse de l'API DeepSeek
      let assistantResponse = '';
      
      if (response && response.choices && response.choices.length > 0) {
        assistantResponse = response.choices[0].message.content;
      } else if (typeof response === 'string') {
        assistantResponse = response;
      } else {
        console.warn('Format de réponse inattendu de l\'API DeepSeek:', response);
        assistantResponse = 'Je n\'ai pas pu générer une réponse appropriée. Veuillez réessayer.';
      }
      
      return {
        message: assistantResponse,
        type: 'chat'
      };
    } catch (error) {
      console.error('Erreur lors du traitement de la requête de chat:', error);
      
      return {
        message: `Désolé, une erreur s'est produite lors du traitement de votre demande: ${error.message}`,
        error: true
      };
    }
  }

  /**
   * Génère une réponse de secours en cas d'échec du service LLM
   * @param {string} userQuery - Requête de l'utilisateur
   * @returns {string} - Réponse de secours
   */
  generateFallbackResponse(userQuery) {
    const fallbackResponses = [
      "Je suis désolé, je ne peux pas traiter votre demande pour le moment.",
      "Il semble que je rencontre des difficultés à vous répondre. Pourriez-vous reformuler votre question ?",
      "Je ne peux pas accéder au service LLM actuellement. Veuillez réessayer plus tard.",
      "Votre question est intéressante, mais je ne peux pas y répondre pour l'instant en raison d'un problème technique."
    ];
    
    // Sélectionner une réponse aléatoire
    const randomIndex = Math.floor(Math.random() * fallbackResponses.length);
    return fallbackResponses[randomIndex];
  }

  /**
   * Détecte la langue de l'utilisateur
   * @param {string} text - Texte à analyser
   * @returns {string} - Code de langue détecté (fr, en, etc.)
   */
  detectLanguage(text) {
    // Analyse simple basée sur des mots fréquents
    const frenchWords = ['je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'le', 'la', 'les', 'un', 'une', 'des', 'et', 'ou', 'mais', 'donc', 'car', 'pour', 'avec', 'sans', 'dans', 'sur', 'sous'];
    const englishWords = ['i', 'you', 'he', 'she', 'we', 'they', 'the', 'a', 'an', 'and', 'or', 'but', 'so', 'because', 'for', 'with', 'without', 'in', 'on', 'under'];
    
    const words = text.toLowerCase().split(/\W+/);
    
    let frenchCount = 0;
    let englishCount = 0;
    
    for (const word of words) {
      if (frenchWords.includes(word)) frenchCount++;
      if (englishWords.includes(word)) englishCount++;
    }
    
    return frenchCount > englishCount ? 'fr' : 'en';
  }

  /**
   * Adapte le système de prompts en fonction de la langue détectée
   * @param {string} language - Code de langue (fr, en, etc.)
   */
  adaptToLanguage(language) {
    if (language === 'en') {
      this.systemPrompt = `You are ABIA, an intelligent and helpful AI assistant. 
You are courteous, helpful, and you provide accurate and concise answers.
You can help with various tasks such as answering questions, providing information,
and assisting the user with their daily tasks.`;
    } else {
      // Par défaut, utiliser le français
      this.systemPrompt = `Vous êtes ABIA, un assistant IA intelligent et utile. 
Vous êtes courtois, serviable et vous fournissez des réponses précises et concises.
Vous pouvez aider avec diverses tâches comme répondre à des questions, fournir des informations,
et assister l'utilisateur dans ses tâches quotidiennes.`;
    }
  }
}

module.exports = ChatAgent;
