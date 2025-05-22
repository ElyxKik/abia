/**
 * Script de test pour le workflow d'analyse Excel et génération de rapports
 * Exécuter avec: node test-excel-report.js
 */

const path = require('path');
const fs = require('fs');
const { app, BrowserWindow } = require('electron');

// Chemin vers un fichier Excel de test
const TEST_EXCEL_PATH = path.join(__dirname, '../samples/exceltest.xls');

// Fonction principale de test
async function testExcelReport() {
  console.log('Test du workflow d\'analyse Excel');
  
  // Vérifier que le fichier Excel de test existe
  if (!fs.existsSync(TEST_EXCEL_PATH)) {
    console.error(`Erreur: Le fichier de test n'existe pas: ${TEST_EXCEL_PATH}`);
    return false;
  }
  
  console.log(`Utilisation du fichier Excel: ${TEST_EXCEL_PATH}`);
  
  try {
    // Charger l'agent Excel
    const ExcelAgent = require('../agents/ExcelAgent');
    const excelAgent = new ExcelAgent();
    
    // Initialiser l'agent
    console.log('Initialisation de l\'agent Excel...');
    const initialized = excelAgent.initialize();
    if (!initialized) {
      console.error('Erreur: Échec de l\'initialisation de l\'agent Excel');
      return false;
    }
    
    // Analyser le fichier Excel
    console.log('Analyse du fichier Excel...');
    const result = await excelAgent.processExcelWithActions(TEST_EXCEL_PATH, 'Analyser le budget et extraire les points clés');
    
    console.log('Résultat de l\'analyse:');
    console.log(JSON.stringify(result, null, 2));
    
    // Vérifier si le résultat contient des actions
    if (result.actions && result.actions.length > 0) {
      console.log(`Le résultat contient ${result.actions.length} action(s)`);
      
      // Trouver l'action pour ouvrir la fenêtre
      const openWindowAction = result.actions.find(a => a.type === 'open_window');
      if (openWindowAction && openWindowAction.data && openWindowAction.data.path) {
        console.log(`Action d'ouverture de fenêtre trouvée: ${openWindowAction.data.path}`);
        
        // Vérifier que le fichier HTML existe
        if (fs.existsSync(openWindowAction.data.path)) {
          console.log(`Le fichier HTML du rapport existe: ${openWindowAction.data.path}`);
          console.log('Test réussi!');
          return true;
        } else {
          console.error(`Erreur: Le fichier HTML du rapport n'existe pas: ${openWindowAction.data.path}`);
          return false;
        }
      } else {
        console.error('Erreur: Aucune action d\'ouverture de fenêtre trouvée dans le résultat');
        return false;
      }
    } else {
      console.error('Erreur: Aucune action trouvée dans le résultat');
      return false;
    }
  } catch (error) {
    console.error('Erreur lors du test:', error);
    return false;
  }
}

// Exécuter le test si ce script est exécuté directement
if (require.main === module) {
  console.log('Démarrage du test de rapport Excel...');
  testExcelReport()
    .then(success => {
      console.log(`Test ${success ? 'réussi' : 'échoué'}`);
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Erreur inattendue:', error);
      process.exit(1);
    });
}

module.exports = testExcelReport;
