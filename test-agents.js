/**
 * Script de test pour vérifier que chaque agent est correctement appelé
 * en fonction du type de requête utilisateur
 */

const MainAgent = require('./agents/MainAgent');
const MemoryService = require('./services/memory-service');

// Fonction pour simuler un délai
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fonction principale de test
async function testAgents() {
  console.log('=== DÉBUT DES TESTS DES AGENTS ===');
  
  // Initialiser l'agent principal
  const mainAgent = new MainAgent();
  const initResult = mainAgent.initialize();
  
  if (!initResult) {
    console.error('❌ Échec de l\'initialisation de l\'agent principal');
    return;
  }
  
  console.log('✅ Agent principal initialisé avec succès');
  
  // Test 1: Vérifier l'agent par défaut
  console.log('\n--- Test 1: Agent par défaut ---');
  const defaultAgent = mainAgent.getActiveAgent();
  console.log(`Agent actif par défaut: ${defaultAgent === mainAgent.chatAgent ? 'ChatAgent ✅' : 'Autre agent ❌'}`);
  
  // Test 2: Requête générale (devrait utiliser ChatAgent)
  console.log('\n--- Test 2: Requête générale (ChatAgent) ---');
  const chatQuery = "Quelle est la capitale de la France?";
  console.log(`Requête: "${chatQuery}"`);
  
  try {
    // Réinitialiser l'agent actif pour ce test
    mainAgent.activeAgent = null;
    
    // Déterminer l'agent recommandé
    const recommendedAgentType = mainAgent.determineAgentType(chatQuery);
    console.log(`Agent recommandé: ${recommendedAgentType}`);
    
    // Vérifier si c'est bien l'agent de chat qui est recommandé
    if (recommendedAgentType === 'chat') {
      console.log('✅ L\'agent de chat est correctement recommandé pour une requête générale');
    } else {
      console.log('❌ L\'agent de chat n\'est pas recommandé pour une requête générale');
    }
    
    // Traiter la requête
    console.log('Traitement de la requête...');
    const response = await mainAgent.processQuery(chatQuery);
    
    // Vérifier si l'agent actif est bien l'agent de chat
    if (mainAgent.getActiveAgent() === mainAgent.chatAgent) {
      console.log('✅ L\'agent de chat a été utilisé pour traiter la requête générale');
    } else {
      console.log('❌ Un autre agent a été utilisé pour traiter la requête générale');
    }
    
    console.log(`Réponse reçue: ${response.message.substring(0, 50)}...`);
  } catch (error) {
    console.error(`❌ Erreur lors du test de l'agent de chat: ${error.message}`);
  }
  
  // Test 3: Requête liée aux documents
  console.log('\n--- Test 3: Requête liée aux documents (DocumentAgent) ---');
  const documentQuery = "Analyse ce document PDF et extrais les informations importantes";
  console.log(`Requête: "${documentQuery}"`);
  
  try {
    // Réinitialiser l'agent actif pour ce test
    mainAgent.activeAgent = null;
    
    // Déterminer l'agent recommandé
    const recommendedAgentType = mainAgent.determineAgentType(documentQuery);
    console.log(`Agent recommandé: ${recommendedAgentType}`);
    
    // Vérifier si c'est bien l'agent de document qui est recommandé
    if (recommendedAgentType === 'document') {
      console.log('✅ L\'agent de document est correctement recommandé pour une requête liée aux documents');
    } else {
      console.log('❌ L\'agent de document n\'est pas recommandé pour une requête liée aux documents');
    }
    
    // Traiter la requête (sans fichier, donc devrait demander un fichier)
    console.log('Traitement de la requête...');
    const response = await mainAgent.processQuery(documentQuery);
    
    // Vérifier si l'agent actif est bien l'agent de document
    if (mainAgent.getActiveAgent() === mainAgent.documentAgent) {
      console.log('✅ L\'agent de document a été utilisé pour traiter la requête liée aux documents');
    } else {
      console.log('❌ Un autre agent a été utilisé pour traiter la requête liée aux documents');
    }
    
    console.log(`Réponse reçue: ${response.message}`);
  } catch (error) {
    console.error(`❌ Erreur lors du test de l'agent de document: ${error.message}`);
  }
  
  // Test 4: Requête liée à Excel
  console.log('\n--- Test 4: Requête liée à Excel (ExcelAgent) ---');
  const excelQuery = "Analyse ce tableau Excel et génère un graphique des ventes";
  console.log(`Requête: "${excelQuery}"`);
  
  try {
    // Réinitialiser l'agent actif pour ce test
    mainAgent.activeAgent = null;
    
    // Déterminer l'agent recommandé
    const recommendedAgentType = mainAgent.determineAgentType(excelQuery);
    console.log(`Agent recommandé: ${recommendedAgentType}`);
    
    // Vérifier si c'est bien l'agent Excel qui est recommandé
    if (recommendedAgentType === 'excel') {
      console.log('✅ L\'agent Excel est correctement recommandé pour une requête liée à Excel');
    } else {
      console.log('❌ L\'agent Excel n\'est pas recommandé pour une requête liée à Excel');
    }
    
    // Traiter la requête (sans fichier, donc devrait demander un fichier)
    console.log('Traitement de la requête...');
    const response = await mainAgent.processQuery(excelQuery);
    
    // Vérifier si l'agent actif est bien l'agent Excel
    if (mainAgent.getActiveAgent() === mainAgent.excelAgent) {
      console.log('✅ L\'agent Excel a été utilisé pour traiter la requête liée à Excel');
    } else {
      console.log('❌ Un autre agent a été utilisé pour traiter la requête liée à Excel');
    }
    
    console.log(`Réponse reçue: ${response.message}`);
  } catch (error) {
    console.error(`❌ Erreur lors du test de l'agent Excel: ${error.message}`);
  }
  
  // Test 5: Requête liée aux emails
  console.log('\n--- Test 5: Requête liée aux emails (MailAgent) ---');
  const mailQuery = "Envoie un email à john@example.com avec comme objet 'Réunion'";
  console.log(`Requête: "${mailQuery}"`);
  
  try {
    // Réinitialiser l'agent actif pour ce test
    mainAgent.activeAgent = null;
    
    // Déterminer l'agent recommandé
    const recommendedAgentType = mainAgent.determineAgentType(mailQuery);
    console.log(`Agent recommandé: ${recommendedAgentType}`);
    
    // Vérifier si c'est bien l'agent de mail qui est recommandé
    if (recommendedAgentType === 'mail') {
      console.log('✅ L\'agent de mail est correctement recommandé pour une requête liée aux emails');
    } else {
      console.log('❌ L\'agent de mail n\'est pas recommandé pour une requête liée aux emails');
    }
    
    // Traiter la requête
    console.log('Traitement de la requête...');
    const response = await mainAgent.processQuery(mailQuery);
    
    // Vérifier si l'agent actif est bien l'agent de mail
    if (mainAgent.getActiveAgent() === mainAgent.mailAgent) {
      console.log('✅ L\'agent de mail a été utilisé pour traiter la requête liée aux emails');
    } else {
      console.log('❌ Un autre agent a été utilisé pour traiter la requête liée aux emails');
    }
    
    console.log(`Réponse reçue: ${response.message}`);
  } catch (error) {
    console.error(`❌ Erreur lors du test de l'agent de mail: ${error.message}`);
  }
  
  // Test 6: Requête liée au système de fichiers
  console.log('\n--- Test 6: Requête liée au système de fichiers (FileSystemAgent) ---');
  const fsQuery = "Créer un dossier nommé 'Projets'";
  console.log(`Requête: "${fsQuery}"`);
  
  try {
    // Réinitialiser l'agent actif pour ce test
    mainAgent.activeAgent = null;
    
    // Déterminer l'agent recommandé
    const recommendedAgentType = mainAgent.determineAgentType(fsQuery);
    console.log(`Agent recommandé: ${recommendedAgentType}`);
    
    // Vérifier si c'est bien l'agent de système de fichiers qui est recommandé
    if (recommendedAgentType === 'filesystem') {
      console.log('✅ L\'agent de système de fichiers est correctement recommandé pour une requête liée aux fichiers');
    } else {
      console.log('❌ L\'agent de système de fichiers n\'est pas recommandé pour une requête liée aux fichiers');
    }
    
    // Traiter la requête
    console.log('Traitement de la requête...');
    const response = await mainAgent.processQuery(fsQuery);
    
    // Vérifier si l'agent actif est bien l'agent de système de fichiers
    if (mainAgent.getActiveAgent() === mainAgent.fileSystemAgent) {
      console.log('✅ L\'agent de système de fichiers a été utilisé pour traiter la requête liée aux fichiers');
    } else {
      console.log('❌ Un autre agent a été utilisé pour traiter la requête liée aux fichiers');
    }
    
    console.log(`Réponse reçue: ${response.message}`);
  } catch (error) {
    console.error(`❌ Erreur lors du test de l'agent de système de fichiers: ${error.message}`);
  }
  
  // Test 7: Changement explicite d'agent
  console.log("\n--- Test 7: Changement explicite d'agent ---");
  console.log('Changement vers l\'agent de document...');
  
  try {
    // Changer explicitement vers l'agent de document
    const changeResult = mainAgent.setActiveAgent('document');
    
    if (changeResult && mainAgent.getActiveAgent() === mainAgent.documentAgent) {
      console.log("✅ Changement explicite vers l'agent de document réussi");
    } else {
      console.log("❌ Échec du changement explicite vers l'agent de document");
    }
    
    // Vérifier si une requête générale est toujours traitée par l'agent de document
    const generalQuery = "Quelle heure est-il?";
    console.log(`Traitement d'une requête générale avec l'agent de document: "${generalQuery}"`);
    
    const response = await mainAgent.processQuery(generalQuery);
    console.log(`Réponse reçue: ${response.message}`);
    
    // Vérifier si l'agent actif est toujours l'agent de document
    if (mainAgent.getActiveAgent() === mainAgent.documentAgent) {
      console.log("✅ L'agent de document est resté actif pour une requête générale");
    } else {
      console.log("❌ L'agent actif a changé lors du traitement d'une requête générale");
    }
  } catch (error) {
    console.error(`❌ Erreur lors du test de changement d'agent: ${error.message}`);
  }
  
  // Test 8: Fallback vers l'agent de chat
  console.log("\n--- Test 8: Fallback vers l'agent de chat ---");
  
  try {
    // Réinitialiser l'agent actif pour ce test
    mainAgent.activeAgent = null;
    
    // Traiter une requête avec un type d'agent non reconnu
    console.log('Traitement d\'une requête avec un type d\'agent non reconnu...');
    const response = await mainAgent.processQuery("Cette requête ne correspond à aucun agent spécifique");
    
    // Vérifier si l'agent actif est bien l'agent de chat (fallback)
    if (mainAgent.getActiveAgent() === mainAgent.chatAgent) {
      console.log("✅ Fallback vers l'agent de chat réussi");
    } else {
      console.log("❌ Échec du fallback vers l'agent de chat");
    }
    
    console.log(`Réponse reçue: ${response.message.substring(0, 50)}...`);
  } catch (error) {
    console.error(`❌ Erreur lors du test de fallback: ${error.message}`);
  }
  
  console.log('\n=== FIN DES TESTS DES AGENTS ===');
}

// Exécuter les tests
testAgents().catch(error => {
  console.error('Erreur lors de l\'exécution des tests:', error);
});
