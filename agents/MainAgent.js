const DocumentAgent = require('./DocumentAgent');
const ExcelAgent = require('./ExcelAgent');
const MailAgent = require('./MailAgent');
const ChatAgent = require('./ChatAgent');
const FileSystemAgent = require('./FileSystemAgent');
const MemoryService = require('../services/memory-service');

/**
 * Agent principal responsable de l'orchestration des tâches
 * et de la coordination entre les différents agents spécialisés
 */
class MainAgent {
  constructor() {
    this.documentAgent = new DocumentAgent();
    this.excelAgent = new ExcelAgent();
    this.mailAgent = new MailAgent();
    this.chatAgent = new ChatAgent();
    this.fileSystemAgent = new FileSystemAgent();
    this.memoryService = MemoryService;
    this.activeAgent = null;
    this.activeAgentType = null;
    this.initialized = false;
    
    // Cache pour les résultats de determineAgentType
    this.agentTypeCache = new Map();
    this.cacheMaxSize = 100; // Limiter la taille du cache
  }
  
  /**
   * Initialise l'agent principal et tous les agents spécialisés
   * @returns {Promise<boolean>} - True si l'initialisation a réussi
   */
  async initialize() {
    try {
      console.log('Initialisation de l\'agent principal...');
      
      // Initialiser le service de mémoire et tous les agents spécialisés en parallèle
      const memoryPromise = this.memoryService && typeof this.memoryService.initialize === 'function' 
        ? this.memoryService.initialize() 
        : Promise.resolve();
      
      // Initialiser tous les agents spécialisés en parallèle pour réduire le temps d'initialisation
      const initPromises = [
        this.documentAgent.initialize(),
        this.excelAgent.initialize(),
        this.mailAgent.initialize(),
        this.chatAgent.initialize(),
        this.fileSystemAgent.initialize(),
        memoryPromise
      ];
      
      // Attendre que toutes les initialisations soient terminées
      await Promise.all(initPromises);
      
      // Définir l'agent de chat comme agent actif par défaut
      this.setActiveAgent('chat');
      
      this.initialized = true;
      console.log('Agent principal initialisé avec succès');
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de l\'agent principal:', error);
      return false;
    }
  }

  /**
   * Définit l'agent actif
   * @param {string} agentType - Type d'agent ('document', 'excel', 'mail', 'chat')
   * @returns {boolean} - True si le changement a réussi
   */
  setActiveAgent(agentType) {
    try {
      switch (agentType.toLowerCase()) {
        case 'document':
          this.activeAgent = this.documentAgent;
          break;
        case 'excel':
          this.activeAgent = this.excelAgent;
          break;
        case 'mail':
          this.activeAgent = this.mailAgent;
          break;
        case 'chat':
          this.activeAgent = this.chatAgent;
          break;
        case 'filesystem':
        case 'fichier':
        case 'dossier':
          this.activeAgent = this.fileSystemAgent;
          break;
        default:
          throw new Error(`Type d'agent non reconnu: ${agentType}`);
      }
      
      this.activeAgentType = agentType.toLowerCase();
      
      // Enregistrer l'agent actif dans le service de mémoire
      if (this.memoryService) {
        this.memoryService.setActiveAgent(agentType.toLowerCase());
      }
      
      console.log(`Agent actif défini sur: ${agentType}`);
      return true;
    } catch (error) {
      console.error('Erreur lors du changement d\'agent actif:', error);
      return false;
    }
  }

  /**
   * Obtient l'agent actif
   * @returns {Object} - L'agent actif
   */
  getActiveAgent() {
    return this.activeAgent;
  }

  /**
   * Détermine le type d'agent à utiliser en fonction du contenu
   * @param {string} content - Contenu à analyser
   * @returns {string} - Type d'agent recommandé
   */
  determineAgentType(content) {
    // Normaliser le contenu pour le cache
    const normalizedContent = content.toLowerCase().trim();
    
    // Vérifier si la requête est dans le cache
    if (this.agentTypeCache.has(normalizedContent)) {
      console.log('Type d\'agent trouvé en cache');
      return this.agentTypeCache.get(normalizedContent);
    }
    
    const contentLower = normalizedContent;
    
    // Définir des patterns spécifiques pour chaque type d'agent
    // Ces patterns sont plus précis que de simples mots-clés
    
    // Patterns pour l'agent de système de fichiers
    const fsPatterns = [
      /cré(?:er|e)\s+(?:un\s+)?dossier/i,
      /nouveau\s+dossier/i,
      /supprimer\s+(?:un\s+)?(?:dossier|fichier)/i,
      /classer\s+(?:des\s+)?(?:documents|fichiers)/i,
      /organiser\s+(?:des|mes|les)\s+(?:dossiers|fichiers|documents)/i,
      /organise\s+(?:des|mes|les)\s+(?:dossiers|fichiers|documents)/i,
      /organise\s+(?:des|mes|les)\s+documents\s+par\s+type/i,
      /déplacer\s+(?:un|ce|le)\s+(?:dossier|fichier)/i,
      /liste\s+(?:des|les)\s+(?:dossiers|fichiers)/i,
      /afficher\s+(?:le\s+)?contenu/i,
      /voir\s+(?:les\s+)?(?:dossiers|fichiers)/i,
      /ranger\s+(?:les|mes)\s+(?:dossiers|fichiers|documents)/i,
      /dossier\s+nommé/i,
      /fichier\s+rapport/i
    ];
    
    // Patterns pour l'agent Excel
    const excelPatterns = [
      /analyser\s+(?:un|ce|le)\s+(?:document\s+)?excel/i,
      /analyser\s+(?:un|ce|le)\s+tableau/i,
      /traiter\s+(?:un|ce|le)\s+tableau/i,
      /générer\s+(?:un\s+)?graphique/i,
      /calculer\s+(?:des\s+)?données/i,
      /feuille\s+de\s+calcul/i,
      /fichier\s+excel/i,
      /tableur/i,
      /moyenne\s+dans\s+(?:un|le)\s+tableur/i,
      /document\s+excel/i
    ];
    
    // Patterns pour l'agent Document
    const docPatterns = [
      /analyser\s+(?:un|ce|le)\s+(?:document|pdf|texte)/i,
      /lire\s+(?:un|ce|le)\s+(?:document|pdf|texte)/i,
      /extraire\s+(?:du|le)\s+(?:document|pdf|texte)/i,
      /résumer\s+(?:un|ce|le)\s+(?:document|pdf|texte)/i,
      /résum(?:er|e)\s+(?:un|ce|le)\s+texte/i
    ];
    
    // Patterns pour l'agent Mail
    const mailPatterns = [
      /envoyer\s+(?:un\s+)?(?:email|mail|message)/i,
      /rédiger\s+(?:un\s+)?(?:email|mail|message)/i,
      /écrire\s+(?:un\s+)?(?:email|mail|message)/i,
      /destinataire/i,
      /objet\s+(?:du|de)\s+(?:mail|message)/i
    ];
    
    // Vérifier les patterns pour chaque agent
    // L'ordre de vérification est important (du plus spécifique au plus général)
    
    let result = null;
    
    // Vérifier les patterns du système de fichiers
    for (const pattern of fsPatterns) {
      if (pattern.test(contentLower)) {
        result = 'filesystem';
        break;
      }
    }
    
    // Vérifier les patterns Excel si aucun résultat n'a été trouvé
    if (!result) {
      for (const pattern of excelPatterns) {
        if (pattern.test(contentLower)) {
          result = 'excel';
          break;
        }
      }
    }
    
    // Vérifier les patterns Document si aucun résultat n'a été trouvé
    if (!result) {
      for (const pattern of docPatterns) {
        if (pattern.test(contentLower)) {
          result = 'document';
          break;
        }
      }
    }
    
    // Vérifier les patterns Mail si aucun résultat n'a été trouvé
    if (!result) {
      for (const pattern of mailPatterns) {
        if (pattern.test(contentLower)) {
          result = 'mail';
          break;
        }
      }
    }
    
    // Si aucun pattern spécifique n'est détecté, utiliser l'analyse par mots-clés comme fallback
    if (!result) {
      const keywords = {
        document: ['document', 'pdf', 'texte', 'lire', 'extraire'],
        excel: ['excel', 'tableau', 'données', 'graphique', 'cellule', 'feuille'],
        mail: ['email', 'mail', 'message', 'envoyer', 'destinataire', 'objet'],
        chat: ['discuter', 'parler', 'question', 'répondre', 'aide'],
        filesystem: ['dossier', 'fichier', 'créer', 'supprimer', 'classer', 'organiser', 'ranger', 'déplacer', 'liste', 'répertoire', 'classification']
      };
      
      let maxScore = 0;
      result = 'chat'; // Par défaut, utiliser l'agent de chat
      
      for (const [agent, agentKeywords] of Object.entries(keywords)) {
        const score = agentKeywords.reduce((count, keyword) => {
          return count + (contentLower.includes(keyword) ? 1 : 0);
        }, 0);
        
        if (score > maxScore) {
          maxScore = score;
          result = agent;
        }
      }
    }
    
    // Mettre en cache le résultat
    if (this.agentTypeCache.size >= this.cacheMaxSize) {
      // Supprimer la première entrée si le cache est plein
      const firstKey = this.agentTypeCache.keys().next().value;
      this.agentTypeCache.delete(firstKey);
    }
    this.agentTypeCache.set(normalizedContent, result);
    
    return result;
  }

  /**
   * Traite une requête utilisateur et renvoie une réponse
   * @param {string} userQuery - Requête de l'utilisateur
   * @param {Object} context - Contexte de la requête
   * @returns {Promise<Object>} - Réponse de l'agent
   */
  async processQuery(userQuery, context = {}) {
    // Mesurer le temps de traitement pour les performances
    const startTime = Date.now();
    
    if (!this.initialized) {
      await this.initialize();
    }
    
    // Optimisation: normaliser la requête pour éviter les problèmes de casse et d'espaces
    const normalizedQuery = userQuery.trim();
    
    // Déterminer le type d'agent recommandé pour cette requête (utilise maintenant le cache)
    const recommendedAgentType = this.determineAgentType(normalizedQuery);
    
    // Si l'agent recommandé n'est pas l'agent de chat ou si aucun agent actif n'est défini,
    // définir l'agent actif comme l'agent recommandé
    if (recommendedAgentType !== 'chat' || !this.activeAgent) {
      this.setActiveAgent(recommendedAgentType);
    }
    
    // Optimisation: préparer le contexte une seule fois
    const enhancedContext = {
      ...context,
      activeAgentType: this.activeAgentType,
      userQuery: normalizedQuery,
      timestamp: Date.now()
    };
    
    // Stocker la requête dans l'historique de conversation
    const memoryPromise = this.memoryService ? 
      Promise.resolve(this.memoryService.addToConversationHistory('user', normalizedQuery, { timestamp: new Date().toISOString() })) : 
      Promise.resolve();
    
    // Traiter la requête avec l'agent actif
    try {
      // Appeler la méthode appropriée en fonction du type d'agent
      let response;
      
      // Traiter la requête avec l'agent actif en parallèle avec la mise à jour de la mémoire
      if (this.activeAgentType === 'chat') {
        [response] = await Promise.all([
          this.activeAgent.processChat(normalizedQuery, enhancedContext),
          memoryPromise
        ]);
      } else if (this.activeAgentType === 'document') {
        if (enhancedContext.filePath) {
          [response] = await Promise.all([
            this.activeAgent.processDocument(enhancedContext.filePath, normalizedQuery),
            memoryPromise
          ]);
        } else {
          response = {
            message: "Pour analyser un document, veuillez fournir un fichier.",
            type: 'prompt'
          };
        }
      } else if (this.activeAgentType === 'excel') {
        if (enhancedContext.filePath) {
          const excelData = await this.activeAgent.analyzeExcelFile(enhancedContext.filePath);
          response = {
            message: this.activeAgent.generateSummary(excelData),
            type: 'excel',
            data: excelData
          };
        } else {
          response = {
            message: "Pour analyser un fichier Excel, veuillez fournir un fichier.",
            type: 'prompt'
          };
        }
      } else if (this.activeAgentType === 'mail') {
        response = {
          message: "L'agent de messagerie est en cours de développement. Comment puis-je vous aider avec vos emails?",
          type: 'mail'
        };
      } else if (this.activeAgentType === 'filesystem') {
        // Extraire les informations de la requête pour déterminer l'action à effectuer
        const query = normalizedQuery.toLowerCase();
        
        if (query.includes('créer') && query.includes('dossier')) {
          // Extraire le nom du dossier à créer
          let folderName = this.extractFolderName(normalizedQuery);
          if (!folderName) folderName = 'Nouveau Dossier';
          
          // Déterminer le chemin parent si spécifié
          const parentPath = enhancedContext.currentPath || '';
          
          // Créer le dossier
          response = await this.fileSystemAgent.createFolder(folderName, parentPath);
        } else if (query.includes('supprimer') && (query.includes('dossier') || query.includes('fichier'))) {
          if (enhancedContext.selectedPath) {
            const recursive = !query.includes('vide');
            response = await this.fileSystemAgent.deleteFolder(enhancedContext.selectedPath, recursive);
          } else {
            response = {
              message: "Pour supprimer un dossier ou un fichier, veuillez d'abord le sélectionner.",
              type: 'prompt'
            };
          }
        } else if ((query.includes('classer') || query.includes('organiser')) && query.includes('document')) {
          if (enhancedContext.selectedPath) {
            response = await this.fileSystemAgent.classifyDocuments(enhancedContext.selectedPath);
          } else {
            response = {
              message: "Pour classer des documents, veuillez d'abord sélectionner un dossier.",
              type: 'prompt'
            };
          }
        } else if (query.includes('liste') || query.includes('afficher') || query.includes('voir')) {
          const pathToList = enhancedContext.selectedPath || enhancedContext.currentPath || '';
          response = await this.fileSystemAgent.listFiles(pathToList);
        } else if (query.includes('déplacer') || query.includes('ranger')) {
          if (enhancedContext.sourcePath && enhancedContext.destinationPath) {
            response = await this.fileSystemAgent.moveFile(enhancedContext.sourcePath, enhancedContext.destinationPath);
          } else {
            response = {
              message: "Pour déplacer un fichier, veuillez spécifier le fichier source et le dossier de destination.",
              type: 'prompt'
            };
          }
        } else {
          response = {
            message: "Je peux vous aider à gérer vos fichiers et dossiers. Que souhaitez-vous faire ? Créer un dossier, supprimer un fichier, classer des documents, ou lister le contenu d'un répertoire ?",
            type: 'filesystem'
          };
        }
      } else {
        // Fallback pour les agents non reconnus
        response = {
          message: `Je ne sais pas comment traiter cette requête avec l'agent ${this.activeAgentType}. Comment puis-je vous aider autrement ?`,
          type: 'error'
        };
      }
      
      // Mesurer le temps de traitement pour les performances
      const processingTime = Date.now() - startTime;
      console.log(`Requête traitée en ${processingTime}ms par l'agent ${this.activeAgentType}`);
      
      // Ajouter le temps de traitement à la réponse pour le débogage
      return {
        ...response,
        _debug: {
          processingTime,
          agentType: this.activeAgentType
        }
      };
    } catch (error) {
      console.error(`Erreur lors du traitement de la requête par l'agent ${this.activeAgentType}:`, error);
      
      // En cas d'erreur, revenir à l'agent de chat
      if (this.activeAgentType !== 'chat') {
        console.log('Retour à l\'agent de chat suite à une erreur');
        this.setActiveAgent('chat');
        return this.activeAgent.processChat(
          `Je n'ai pas pu traiter votre demande précédente. Comment puis-je vous aider autrement?`,
          enhancedContext
        );
      }
      
      // Mesurer le temps de traitement pour les performances, même en cas d'erreur
      const processingTime = Date.now() - startTime;
      
      return {
        success: false,
        message: `Désolé, je n'ai pas pu traiter votre demande. Erreur: ${error.message}`,
        _debug: {
          processingTime,
          error: error.message,
          agentType: this.activeAgentType
        }
      };
    }
  }
  
  /**
   * Extrait le nom de dossier d'une requête utilisateur
   * @param {string} query - Requête utilisateur
   * @returns {string|null} - Nom de dossier extrait ou null
   */
  extractFolderName(query) {
    // Rechercher des patterns comme "créer un dossier nommé X" ou "créer un dossier X"
    const namedPattern = /(?:dossier|répertoire)\s+(?:nommé|appelé|intitulé)\s+["']([^"']+)["']/i;
    const simplePattern = /créer\s+(?:un\s+)?dossier\s+["']([^"']+)["']/i;
    const quotedPattern = /["']([^"']+)["']\s+(?:comme nom de dossier|comme dossier)/i;
    
    // Essayer d'abord avec les guillemets pour une extraction plus précise
    let match = query.match(namedPattern);
    if (match && match[1]) {
      return match[1].trim();
    }
    
    match = query.match(simplePattern);
    if (match && match[1]) {
      return match[1].trim();
    }
    
    match = query.match(quotedPattern);
    if (match && match[1]) {
      return match[1].trim();
    }
    
    // Si aucun pattern avec guillemets ne correspond, essayer sans guillemets mais avec plus de précautions
    const fallbackNamedPattern = /(?:dossier|répertoire)\s+(?:nommé|appelé|intitulé)\s+([\w\s-]+)/i;
    const fallbackSimplePattern = /créer\s+(?:un\s+)?dossier\s+([\w\s-]+)(?:\s|$)/i;
    
    match = query.match(fallbackNamedPattern);
    if (match && match[1]) {
      // Vérifier que le nom extrait n'est pas trop long ou trop court
      const name = match[1].trim();
      if (name.length > 1 && name.length < 30 && !name.includes('dans') && !name.includes('avec')) {
        return name;
      }
    }
    
    match = query.match(fallbackSimplePattern);
    if (match && match[1]) {
      // Vérifier que le nom extrait n'est pas trop long ou trop court
      const name = match[1].trim();
      if (name.length > 1 && name.length < 30 && !name.includes('dans') && !name.includes('avec')) {
        return name;
      }
    }
    
    // Si aucun pattern ne correspond ou si le nom extrait est suspect, utiliser un nom par défaut
    return null;
  }
  
  /**
   * Change de contexte (par exemple, lors du changement de fichier)
   * @param {Object} newContext - Nouveau contexte
   */
  updateContext(newContext) {
    if (this.memoryService) {
      this.memoryService.updateContext(newContext);
    }
  }
}

module.exports = MainAgent;
