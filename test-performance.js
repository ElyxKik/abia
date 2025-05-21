/**
 * Script de test pour mesurer les performances d'ABIA
 * Ce script teste le temps de réponse pour différents types de requêtes
 */

const MainAgent = require('./agents/MainAgent');
const fs = require('fs');
const path = require('path');

// Fonction pour mesurer le temps d'exécution
async function measurePerformance(callback, label) {
  console.time(label);
  const result = await callback();
  console.timeEnd(label);
  return result;
}

// Fonction principale de test
async function runPerformanceTests() {
  console.log('=== Test de performance ABIA ===');
  
  // Initialiser l'agent principal
  const mainAgent = new MainAgent();
  await measurePerformance(() => mainAgent.initialize(), 'Initialisation');
  
  // Requêtes de test pour différents agents
  const testQueries = [
    { query: 'Bonjour, comment vas-tu ?', label: 'Requête de chat simple' },
    { query: 'Crée un dossier nommé Test', label: 'Requête système de fichiers' },
    { query: 'Analyse ce document PDF', label: 'Requête document' },
    { query: 'Envoie un email à Jean', label: 'Requête mail' },
    { query: 'Analyse ce fichier Excel', label: 'Requête Excel' },
    { query: 'Bonjour, comment vas-tu ?', label: 'Requête de chat répétée (test cache)' },
    { query: 'Crée un dossier nommé Test', label: 'Requête système de fichiers répétée (test cache)' }
  ];
  
  // Exécuter les requêtes de test
  const results = [];
  
  for (const test of testQueries) {
    console.log(`\nTest: ${test.label}`);
    try {
      const response = await measurePerformance(
        () => mainAgent.processQuery(test.query, {}),
        test.label
      );
      
      results.push({
        query: test.query,
        label: test.label,
        success: true,
        agentType: response._debug?.agentType || 'inconnu',
        processingTime: response._debug?.processingTime || 'non mesuré'
      });
      
      console.log(`Agent utilisé: ${response._debug?.agentType || 'inconnu'}`);
      console.log(`Temps de traitement: ${response._debug?.processingTime || 'non mesuré'}ms`);
    } catch (error) {
      console.error(`Erreur lors du test "${test.label}":`, error);
      results.push({
        query: test.query,
        label: test.label,
        success: false,
        error: error.message
      });
    }
  }
  
  // Générer un rapport de performance
  generatePerformanceReport(results);
}

// Fonction pour générer un rapport de performance
function generatePerformanceReport(results) {
  console.log('\n=== Rapport de performance ===');
  
  let totalTime = 0;
  let successCount = 0;
  
  // Tableau récapitulatif
  console.log('\nRésultats des tests:');
  console.log('--------------------------------------------------');
  console.log('| Type de requête                | Agent | Temps (ms) |');
  console.log('--------------------------------------------------');
  
  results.forEach(result => {
    if (result.success) {
      console.log(`| ${result.label.padEnd(30)} | ${result.agentType.padEnd(5)} | ${result.processingTime.toString().padEnd(9)} |`);
      totalTime += typeof result.processingTime === 'number' ? result.processingTime : 0;
      successCount++;
    } else {
      console.log(`| ${result.label.padEnd(30)} | ÉCHEC | ${result.error} |`);
    }
  });
  
  console.log('--------------------------------------------------');
  
  // Statistiques globales
  if (successCount > 0) {
    console.log(`\nTemps moyen de traitement: ${Math.round(totalTime / successCount)}ms`);
  }
  
  console.log(`Tests réussis: ${successCount}/${results.length}`);
  
  // Sauvegarder les résultats dans un fichier
  const reportData = {
    timestamp: new Date().toISOString(),
    results,
    summary: {
      totalTests: results.length,
      successfulTests: successCount,
      averageTime: successCount > 0 ? Math.round(totalTime / successCount) : 0
    }
  };
  
  fs.writeFileSync(
    path.join(__dirname, 'performance-report.json'),
    JSON.stringify(reportData, null, 2)
  );
  
  console.log('\nRapport de performance enregistré dans performance-report.json');
}

// Exécuter les tests
runPerformanceTests().catch(error => {
  console.error('Erreur lors des tests de performance:', error);
});
