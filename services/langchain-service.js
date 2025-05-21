// Import des modules nécessaires pour LangChain
const { PromptTemplate } = require('langchain/prompts');
const { LLMChain } = require('langchain/chains');
const { HumanMessage, SystemMessage } = require('langchain/schema');
const { StructuredOutputParser } = require('langchain/output_parsers');
const config = require('../config/config');

// Import pour les requêtes HTTP
const axios = require('axios');

/**
 * Service LangChain pour l'intégration avec les modèles LLM
 */
class LangChainService {
  constructor() {
    this.initialize();
  }

  /**
   * Initialise le service LangChain
   */
  initialize() {
    try {
      console.log('Début de l\'initialisation du service LangChain...');
      
      const apiKey = config.get('llm.apiKey', '');
      const model = config.get('llm.model', 'deepseek-chat');
      const temperature = config.get('llm.temperature', 0.7);
      const maxTokens = config.get('llm.maxTokens', 1000);
      
      if (!apiKey) {
        console.warn('Aucune clé API DeepSeek trouvée dans la configuration');
        // Signaler clairement que l'initialisation a échoué
        console.error('L\'initialisation du service LangChain a échoué : clé API manquante');
        return false;
      }
      
      console.log('Configuration du service LangChain pour DeepSeek...');
      console.log(`Utilisation du modèle: ${model}, Température: ${temperature}`);
      console.log(`Clé API: ${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 4)}`);
      
      // Stocker les paramètres DeepSeek
      this.deepseekConfig = {
        apiKey,
        model,
        temperature,
        maxTokens,
        baseUrl: 'https://api.deepseek.com/v1'
      };
      
      // Vérifier la connexion à l'API DeepSeek
      this.testApiConnection();
      
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du service LangChain:', error);
      return false;
    }
  }
  
  /**
   * Teste la connexion à l'API DeepSeek
   * @returns {Promise<boolean>} - True si la connexion est établie
   */
  async testApiConnection() {
    try {
      console.log('Test de la connexion à l\'API DeepSeek...');
      
      // Créer une requête simple pour tester la connexion
      const testMessage = [
        { role: 'system', content: 'Vous êtes un assistant intelligent.' },
        { role: 'user', content: 'Test de connexion' }
      ];
      
      const response = await this.sendRequestToDeepSeek(testMessage);
      
      if (response && response.choices && response.choices.length > 0) {
        console.log('Connexion à l\'API DeepSeek réussie!');
        return true;
      } else {
        console.error('La connexion à l\'API DeepSeek a échoué: réponse inattendue');
        return false;
      }
    } catch (error) {
      console.error('Erreur lors du test de connexion à l\'API DeepSeek:', error.message);
      return false;
    }
  }
  
  /**
   * Envoie une requête à l'API DeepSeek
   * @param {Array} messages - Messages à envoyer
   * @param {Object} options - Options supplémentaires
   * @returns {Promise<Object>} - Réponse de l'API
   */
  async sendRequestToDeepSeek(messages, options = {}) {
    try {
      if (!this.deepseekConfig || !this.deepseekConfig.apiKey) {
        throw new Error('Configuration DeepSeek manquante ou clé API non définie');
      }
      
      const requestData = {
        model: options.model || this.deepseekConfig.model,
        messages,
        temperature: options.temperature !== undefined ? options.temperature : this.deepseekConfig.temperature,
        max_tokens: options.maxTokens || this.deepseekConfig.maxTokens,
        stream: options.stream || false
      };
      
      const response = await axios.post(
        `${this.deepseekConfig.baseUrl}/chat/completions`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.deepseekConfig.apiKey}`
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la requête à DeepSeek:', 
        error.response?.data?.error || error.message);
      throw error;
    }
  }

  /**
   * Classifie une requête utilisateur
   * @param {string} query - Requête à classifier
   * @returns {Promise<Object>} - Classification de la requête
   */
  async classifyQuery(query) {
    try {
      const systemPrompt = `
      Vous êtes un assistant spécialisé dans la classification de requêtes. 
      Analysez la requête de l'utilisateur et déterminez à quel domaine elle appartient:
      
      - excel: pour les questions sur des fichiers Excel, analyse de données, tableaux
      - mail: pour les questions sur les emails, messages, communication
      - document: pour les questions sur des documents, PDFs, textes
      - general: pour les questions générales ne correspondant à aucune catégorie ci-dessus
      
      Donnez votre réponse sous forme d'un objet JSON avec les propriétés 'type' et 'confidence' (entre 0 et 1).
      `;
      
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ];
      
      const response = await this.sendRequestToDeepSeek(messages, { temperature: 0.1 });
      
      if (!response.choices || !response.choices[0] || !response.choices[0].message) {
        throw new Error('Réponse inattendue de l\'API DeepSeek');
      }
      
      const content = response.choices[0].message.content;
      
      // Extraire l'objet JSON de la réponse
      let jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        // Fallback si pas de JSON détecté
        return {
          type: 'general',
          confidence: 0.6
        };
      }
      
      const result = JSON.parse(jsonMatch[0]);
      return {
        type: result.type || 'general',
        confidence: result.confidence || 0.6
      };
    } catch (error) {
      console.error('Erreur lors de la classification de la requête:', error);
      // En cas d'erreur, retourner une classification par défaut
      return {
        type: 'general',
        confidence: 0.5
      };
    }
  }

  /**
   * Génère une réponse à une requête utilisateur
   * @param {string} query - Requête utilisateur
   * @param {Object} options - Options supplémentaires
   * @returns {Promise<string>} - Réponse générée
   */
  async generateResponse(query, options = {}) {
    try {
      const systemPrompt = options.systemPrompt || `
      Vous êtes ABIA, un assistant intelligent qui aide les utilisateurs à accomplir diverses tâches. 
      Répondez de manière claire, concise et utile.
      `;
      
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ];
      
      // Ajouter le contexte si disponible
      if (options.context) {
        messages.splice(1, 0, { role: 'system', content: `Contexte supplémentaire: ${options.context}` });
      }
      
      const response = await this.sendRequestToDeepSeek(messages);
      
      if (!response.choices || !response.choices[0] || !response.choices[0].message) {
        throw new Error('Réponse inattendue de l\'API DeepSeek');
      }
      
      return response.choices[0].message.content;
    } catch (error) {
      console.error('Erreur lors de la génération de la réponse:', error);
      throw error;
    }
  }

  /**
   * Génère une réponse basée sur l'agent et les données
   * @param {string} query - Requête utilisateur
   * @param {string} agent - Type d'agent (excel, mail, document, etc.)
   * @param {Object} data - Données pour enrichir la réponse
   * @returns {Promise<string>} - Réponse enrichie
   */
  async generateAgentResponse(query, agent, data = {}) {
    const agentPrompts = {
      excel: `
      Vous êtes un expert en analyse de données Excel. 
      Utilisez les informations suivantes pour répondre à la question de l'utilisateur:
      
      Données Excel:
      ${JSON.stringify(data, null, 2)}
      `,
      mail: `
      Vous êtes un assistant spécialisé dans la gestion des emails et des communications.
      Aidez l'utilisateur avec sa demande concernant les emails.
      `,
      document: `
      Vous êtes un expert en analyse de documents.
      Utilisez les informations suivantes pour répondre à la question de l'utilisateur:
      
      Contenu du document:
      ${data.content || 'Non fourni'}
      `
    };
    
    const systemPrompt = agentPrompts[agent] || agentPrompts.general;
    
    return this.generateResponse(query, {
      systemPrompt,
      context: JSON.stringify(data)
    });
  }
}

module.exports = LangChainService;
