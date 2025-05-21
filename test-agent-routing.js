/**
 * Script de test pour vérifier que les requêtes sont correctement routées
 * vers les agents appropriés après les modifications
 */

const MainAgent = require('./agents/MainAgent');

// Fonction principale de test
async function testAgentRouting() {
  console.log('=== DÉBUT DES TESTS DE ROUTAGE DES REQUÊTES ===');
  
  // Initialiser l'agent principal
  const mainAgent = new MainAgent();
  const initResult = mainAgent.initialize();
  
  if (!initResult) {
    console.error('❌ Échec de l\'initialisation de l\'agent principal');
    return;
  }
  
  console.log('✅ Agent principal initialisé avec succès');
  
  // Définir les requêtes de test pour chaque agent
  const testQueries = [
    // Requêtes pour l'agent de chat
    { query: "Quelle est la capitale de la France?", expectedAgent: "chat" },
    { query: "Comment vas-tu aujourd'hui?", expectedAgent: "chat" },
    { query: "Explique-moi le concept de l'intelligence artificielle", expectedAgent: "chat" },
    
    // Requêtes pour l'agent Excel
    { query: "Je veux analyser un document Excel", expectedAgent: "excel" },
    { query: "Peux-tu m'aider à analyser ce tableau Excel?", expectedAgent: "excel" },
    { query: "Génère un graphique à partir de mes données", expectedAgent: "excel" },
    { query: "Comment calculer une moyenne dans un tableur?", expectedAgent: "excel" },
    
    // Requêtes pour l'agent Document
    { query: "Analyse ce document PDF et extrais les informations importantes", expectedAgent: "document" },
    { query: "Peux-tu lire ce document pour moi?", expectedAgent: "document" },
    { query: "Résume ce texte en quelques points", expectedAgent: "document" },
    
    // Requêtes pour l'agent Mail
    { query: "Envoie un email à john@example.com", expectedAgent: "mail" },
    { query: "Rédige un message pour mon collègue", expectedAgent: "mail" },
    { query: "Écris un mail avec comme objet 'Réunion'", expectedAgent: "mail" },
    
    // Requêtes pour l'agent FileSystem
    { query: "Crée un dossier nommé Elyq", expectedAgent: "filesystem" },
    { query: "Supprime le fichier rapport.pdf", expectedAgent: "filesystem" },
    { query: "Liste les fichiers dans mon dossier Documents", expectedAgent: "filesystem" },
    { query: "Organise mes documents par type", expectedAgent: "filesystem" },
    { query: "Déplace ce fichier dans le dossier Projets", expectedAgent: "filesystem" }
  ];
  
  // Tester chaque requête
  for (const [index, test] of testQueries.entries()) {
    console.log(`\n--- Test ${index + 1}: "${test.query}" ---`);
    
    // Réinitialiser l'agent actif pour chaque test
    mainAgent.activeAgent = null;
    
    // Déterminer l'agent recommandé
    const recommendedAgentType = mainAgent.determineAgentType(test.query);
    console.log(`Agent recommandé: ${recommendedAgentType}`);
    
    // Vérifier si l'agent recommandé correspond à l'agent attendu
    if (recommendedAgentType === test.expectedAgent) {
      console.log(`✅ L'agent ${test.expectedAgent} est correctement recommandé`);
    } else {
      console.log(`❌ L'agent ${recommendedAgentType} est recommandé au lieu de ${test.expectedAgent}`);
    }
    
    // Simuler le traitement de la requête
    try {
      // Appeler processQuery sans attendre la réponse complète
      // car nous voulons juste vérifier quel agent est activé
      mainAgent.processQuery(test.query);
      
      // Vérifier quel agent a été activé
      const activeAgentType = getActiveAgentType(mainAgent);
      
      if (activeAgentType === test.expectedAgent) {
        console.log(`✅ La requête a été correctement routée vers l'agent ${activeAgentType}`);
      } else {
        console.log(`❌ La requête a été routée vers l'agent ${activeAgentType} au lieu de ${test.expectedAgent}`);
      }
    } catch (error) {
      console.error(`❌ Erreur lors du traitement de la requête: ${error.message}`);
    }
  }
  
  // Test de changement d'agent en cours de conversation
  console.log("\n--- Test de changement d'agent en cours de conversation ---");
  
  try {
    // Définir l'agent de chat comme agent actif
    mainAgent.setActiveAgent('chat');
    console.log(`Agent actif initial: chat`);
    
    // Simuler une conversation avec changement de sujet
    const conversation = [
      { query: "Bonjour, comment vas-tu?", expectedAgent: "chat" },
      { query: "Peux-tu analyser ce document Excel?", expectedAgent: "excel" },
      { query: "Crée un dossier pour mes rapports", expectedAgent: "filesystem" },
      { query: "Merci pour ton aide", expectedAgent: "chat" }
    ];
    
    for (const [index, message] of conversation.entries()) {
      console.log(`\nMessage ${index + 1}: "${message.query}"`);
      
      // Traiter la requête
      await mainAgent.processQuery(message.query);
      
      // Vérifier quel agent a été activé
      const activeAgentType = getActiveAgentType(mainAgent);
      
      if (activeAgentType === message.expectedAgent) {
        console.log(`✅ La requête a été correctement routée vers l'agent ${activeAgentType}`);
      } else {
        console.log(`❌ La requête a été routée vers l'agent ${activeAgentType} au lieu de ${message.expectedAgent}`);
      }
    }
  } catch (error) {
    console.error(`❌ Erreur lors du test de conversation: ${error.message}`);
  }
  
  console.log('\n=== FIN DES TESTS DE ROUTAGE DES REQUÊTES ===');
}

// Fonction utilitaire pour déterminer le type d'agent actif
function getActiveAgentType(mainAgent) {
  const activeAgent = mainAgent.getActiveAgent();
  
  if (activeAgent === mainAgent.chatAgent) return 'chat';
  if (activeAgent === mainAgent.documentAgent) return 'document';
  if (activeAgent === mainAgent.excelAgent) return 'excel';
  if (activeAgent === mainAgent.mailAgent) return 'mail';
  if (activeAgent === mainAgent.fileSystemAgent) return 'filesystem';
  
  return 'unknown';
}

// Exécuter les tests
testAgentRouting().catch(error => {
  console.error('Erreur lors de l\'exécution des tests:', error);
});
