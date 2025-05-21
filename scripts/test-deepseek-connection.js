/**
 * Script pour tester la connexion à l'API DeepSeek
 * Ce script vérifie si la clé API DeepSeek configurée est valide
 * et si la connexion à l'API fonctionne correctement.
 */

const config = require('../config/config');
const LLMService = require('../services/llm-service');

// Récupérer la configuration LLM
const llmConfig = {
  apiKey: config.get('llm.apiKey', ''),
  model: config.get('llm.model', 'deepseek-chat'),
  temperature: config.get('llm.temperature', 0.7),
  maxTokens: config.get('llm.maxTokens', 1000)
};

// Créer une instance du service LLM
const llmService = new LLMService(llmConfig);

// Message de test simple
const testMessages = [
  { role: 'system', content: 'Vous êtes un assistant intelligent.' },
  { role: 'user', content: 'Bonjour, êtes-vous connecté?' }
];

// Fonction principale pour tester la connexion
async function testDeepSeekConnection() {
  console.log('Test de connexion à l\'API DeepSeek...');
  console.log(`URL de base: ${llmService.baseUrl}`);
  console.log(`Modèle: ${llmService.model}`);
  
  // Vérifier si la clé API est configurée
  if (!llmService.isConfigured()) {
    console.error('❌ ERREUR: Aucune clé API DeepSeek n\'est configurée.');
    console.log('Veuillez configurer une clé API dans config/config.json ou définir la variable d\'environnement DEEPSEEK_API_KEY.');
    return false;
  }
  
  console.log(`Clé API: ${llmService.apiKey.substring(0, 5)}...${llmService.apiKey.substring(llmService.apiKey.length - 4)}`);
  
  try {
    console.log('Envoi d\'une requête de test à l\'API DeepSeek...');
    const startTime = Date.now();
    
    // Envoyer une requête de test
    const response = await llmService.sendRequest(testMessages);
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`✅ SUCCÈS: Connexion établie en ${duration.toFixed(2)} secondes.`);
    console.log('Réponse reçue:');
    console.log(`"${response.choices[0].message.content}"`);
    
    return true;
  } catch (error) {
    console.error('❌ ERREUR: Impossible de se connecter à l\'API DeepSeek.');
    
    if (error.response) {
      // Erreur de l'API avec une réponse
      console.error(`Code d'erreur: ${error.response.status}`);
      console.error('Message d\'erreur:', error.response.data);
    } else if (error.request) {
      // Erreur de réseau sans réponse
      console.error('Erreur de réseau: Aucune réponse reçue du serveur.');
      console.error('Vérifiez votre connexion internet ou si l\'API est en maintenance.');
    } else {
      // Autre type d'erreur
      console.error('Message d\'erreur:', error.message);
    }
    
    // Suggestions pour résoudre le problème
    console.log('\nSuggestions pour résoudre le problème:');
    console.log('1. Vérifiez que votre clé API est correcte et active.');
    console.log('2. Assurez-vous que vous avez accès à l\'API DeepSeek.');
    console.log('3. Vérifiez votre connexion internet.');
    console.log('4. Vérifiez si l\'API DeepSeek est en maintenance.');
    
    return false;
  }
}

// Exécuter le test
testDeepSeekConnection()
  .then(isConnected => {
    if (!isConnected) {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Erreur inattendue:', error);
    process.exit(1);
  });
