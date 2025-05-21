/**
 * Script de test pour vérifier l'affichage des chemins relatifs et absolus
 * dans l'agent de système de fichiers
 */

const FileSystemAgent = require('./agents/FileSystemAgent');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');

// Promisify fs functions
const mkdir = promisify(fs.mkdir);
const rmdir = promisify(fs.rmdir);
const unlink = promisify(fs.unlink);

// Fonction pour simuler un délai
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fonction principale de test
async function testFileSystemPaths() {
  console.log('=== DÉBUT DES TESTS DES CHEMINS RELATIFS ET ABSOLUS ===');
  
  // Initialiser l'agent de système de fichiers
  const fsAgent = new FileSystemAgent();
  const initResult = fsAgent.initialize();
  
  if (!initResult) {
    console.error('❌ Échec de l\'initialisation de l\'agent de système de fichiers');
    return;
  }
  
  console.log('✅ Agent de système de fichiers initialisé avec succès');
  console.log(`Répertoire de base: ${fsAgent.baseDirectory}`);
  
  // Créer un dossier temporaire pour les tests
  const testFolderName = `test-${Date.now()}`;
  
  try {
    // Test 1: Création d'un dossier
    console.log('\n--- Test 1: Création d\'un dossier ---');
    const createResult = await fsAgent.createFolder(testFolderName);
    console.log(`Résultat: ${createResult.message}`);
    console.log(`Chemin relatif: ${createResult.relativePath}`);
    console.log(`Chemin absolu: ${createResult.absolutePath}`);
    
    if (createResult.success && createResult.absolutePath) {
      console.log('✅ Création de dossier réussie avec affichage des chemins relatif et absolu');
    } else if (createResult.success) {
      console.log('⚠️ Création de dossier réussie mais le chemin absolu n\'est pas affiché');
    } else {
      console.log('❌ Échec de la création du dossier');
    }
    
    // Test 2: Listage des fichiers
    console.log('\n--- Test 2: Listage des fichiers ---');
    const listResult = await fsAgent.listFiles(createResult.path);
    console.log(`Résultat: ${listResult.message}`);
    console.log(`Chemin relatif: ${listResult.relativePath}`);
    console.log(`Chemin absolu: ${listResult.absolutePath}`);
    
    if (listResult.success && listResult.absolutePath) {
      console.log('✅ Listage des fichiers réussi avec affichage des chemins relatif et absolu');
      
      // Vérifier que les éléments de la liste ont aussi des chemins absolus
      if (listResult.items && listResult.items.length > 0) {
        const firstItem = listResult.items[0];
        console.log(`Premier élément: ${firstItem.name}`);
        console.log(`  - Chemin relatif: ${firstItem.relativePath}`);
        console.log(`  - Chemin absolu: ${firstItem.absolutePath}`);
        
        if (firstItem.absolutePath) {
          console.log('✅ Les éléments de la liste contiennent des chemins absolus');
        } else {
          console.log('⚠️ Les éléments de la liste ne contiennent pas de chemins absolus');
        }
      }
    } else if (listResult.success) {
      console.log('⚠️ Listage des fichiers réussi mais le chemin absolu n\'est pas affiché');
    } else {
      console.log('❌ Échec du listage des fichiers');
    }
    
    // Test 3: Création d'un sous-dossier
    console.log('\n--- Test 3: Création d\'un sous-dossier ---');
    const subFolderName = 'sous-dossier';
    const createSubResult = await fsAgent.createFolder(subFolderName, createResult.path);
    console.log(`Résultat: ${createSubResult.message}`);
    console.log(`Chemin relatif: ${createSubResult.relativePath}`);
    
    if (createSubResult.success) {
      console.log('✅ Création de sous-dossier réussie avec affichage du chemin relatif');
    } else {
      console.log('❌ Échec de la création du sous-dossier');
    }
    
    // Créer un fichier temporaire pour le test de déplacement
    const tempFilePath = path.join(createResult.path, 'fichier-test.txt');
    fs.writeFileSync(tempFilePath, 'Contenu de test');
    
    // Test 4: Déplacement d'un fichier
    console.log('\n--- Test 4: Déplacement d\'un fichier ---');
    const moveResult = await fsAgent.moveFile(tempFilePath, createSubResult.path);
    console.log(`Résultat: ${moveResult.message}`);
    console.log(`Chemin source relatif: ${moveResult.relativeSourcePath}`);
    console.log(`Chemin destination relatif: ${moveResult.relativeDestPath}`);
    
    if (moveResult.success) {
      console.log('✅ Déplacement de fichier réussi avec affichage des chemins relatifs');
    } else {
      console.log('❌ Échec du déplacement du fichier');
    }
    
    // Test 5: Classification des documents
    console.log('\n--- Test 5: Classification des documents ---');
    // Créer quelques fichiers de test avec différentes extensions
    const testFiles = [
      { name: 'document.pdf', content: 'PDF test' },
      { name: 'tableur.xlsx', content: 'XLSX test' },
      { name: 'image.jpg', content: 'JPG test' }
    ];
    
    for (const file of testFiles) {
      fs.writeFileSync(path.join(createResult.path, file.name), file.content);
    }
    
    const classifyResult = await fsAgent.classifyDocuments(createResult.path);
    console.log(`Résultat: ${classifyResult.message}`);
    
    if (classifyResult.success) {
      console.log('✅ Classification des documents réussie avec affichage du chemin relatif');
    } else {
      console.log('❌ Échec de la classification des documents');
    }
    
    // Test 6: Suppression du dossier
    console.log('\n--- Test 6: Suppression du dossier ---');
    const deleteResult = await fsAgent.deleteFolder(createResult.path);
    console.log(`Résultat: ${deleteResult.message}`);
    console.log(`Chemin relatif: ${deleteResult.relativePath}`);
    console.log(`Chemin absolu: ${deleteResult.absolutePath}`);
    
    if (deleteResult.success && deleteResult.absolutePath) {
      console.log('✅ Suppression du dossier réussie avec affichage des chemins relatif et absolu');
    } else if (deleteResult.success) {
      console.log('⚠️ Suppression du dossier réussie mais le chemin absolu n\'est pas affiché');
    } else {
      console.log('❌ Échec de la suppression du dossier');
    }
    
  } catch (error) {
    console.error('Erreur lors des tests:', error);
  } finally {
    // Nettoyage: s'assurer que le dossier de test est supprimé
    try {
      const testPath = path.join(fsAgent.baseDirectory, testFolderName);
      if (fs.existsSync(testPath)) {
        // Supprimer récursivement
        await deleteDirectoryRecursive(testPath);
      }
    } catch (cleanupError) {
      console.error('Erreur lors du nettoyage:', cleanupError);
    }
  }
  
  console.log('\n=== FIN DES TESTS DES CHEMINS RELATIFS ===');
}

// Fonction utilitaire pour supprimer un dossier récursivement
async function deleteDirectoryRecursive(dirPath) {
  if (fs.existsSync(dirPath)) {
    const entries = fs.readdirSync(dirPath);
    
    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry);
      const stats = fs.statSync(entryPath);
      
      if (stats.isDirectory()) {
        await deleteDirectoryRecursive(entryPath);
      } else {
        await unlink(entryPath);
      }
    }
    
    await rmdir(dirPath);
  }
}

// Exécuter les tests
testFileSystemPaths().catch(error => {
  console.error('Erreur lors de l\'exécution des tests:', error);
});
