// Script de test pour vérifier la fonctionnalité d'affichage des chemins absolus et d'ouverture de dossier

const path = require('path');
const fs = require('fs');
const FileSystemAgent = require('./agents/FileSystemAgent');
const config = require('./config/config');

// Configuration de test
const testFolderName = 'test-folder-' + Date.now();
const testSubfolderName = 'test-subfolder';
const testFileName = 'test-file.txt';

// Initialiser l'agent de système de fichiers
const fileSystemAgent = new FileSystemAgent();
fileSystemAgent.initialize();

// Récupérer le répertoire de base de l'agent
const baseDirectory = fileSystemAgent.baseDirectory;
console.log(`Répertoire de base de l'agent: ${baseDirectory}`);

// Fonction pour normaliser les chemins pour les tests
function normalizePath(p) {
  return path.normalize(p).replace(/\\/g, '/');
}

// Fonction pour obtenir le chemin absolu complet
function getFullPath(relativePath) {
  return path.join(__dirname, relativePath);
}

// Fonction pour vérifier si un chemin existe
function checkPathExists(pathToCheck) {
  // Vérifier d'abord dans le répertoire du projet
  if (fs.existsSync(path.join(__dirname, pathToCheck))) {
    return path.join(__dirname, pathToCheck);
  }
  
  // Vérifier ensuite dans le répertoire de base de l'agent
  if (fs.existsSync(path.join(baseDirectory, pathToCheck))) {
    return path.join(baseDirectory, pathToCheck);
  }
  
  // Vérifier si c'est déjà un chemin absolu
  if (path.isAbsolute(pathToCheck) && fs.existsSync(pathToCheck)) {
    return pathToCheck;
  }
  
  // Si le chemin n'existe pas
  return null;
}

async function runTests() {
  console.log('=== Démarrage des tests de l\'agent de système de fichiers avec affichage des chemins ===');
  
  try {
    // Test 1: Créer un dossier
    console.log('\n--- Test 1: Création d\'un dossier ---');
    const createFolderResult = await fileSystemAgent.createFolder('/', testFolderName);
    console.log('Résultat:', createFolderResult);
    console.log('Chemin relatif:', createFolderResult.relativePath);
    console.log('Chemin absolu:', createFolderResult.absolutePath);
    
    // Vérifier que le dossier a bien été créé
    const createdFolderPath = checkPathExists(createFolderResult.path);
    if (!createdFolderPath) {
      // Essayer avec le chemin relatif
      const altPath = checkPathExists(createFolderResult.relativePath);
      if (!altPath) {
        throw new Error(`Le dossier n'a pas été créé correctement. Chemin attendu: ${createFolderResult.path} ou ${createFolderResult.relativePath}`);
      }
      console.log(`Dossier vérifié (chemin relatif): ${altPath}`);
    } else {
      console.log(`Dossier vérifié (chemin direct): ${createdFolderPath}`);
    }
    
    // Test 2: Créer un sous-dossier
    console.log('\n--- Test 2: Création d\'un sous-dossier ---');
    // Utiliser le chemin relatif retourné par la première opération
    const parentPath = createFolderResult.relativePath;
    const createSubfolderResult = await fileSystemAgent.createFolder(parentPath, testSubfolderName);
    console.log('Résultat:', createSubfolderResult);
    console.log('Chemin relatif:', createSubfolderResult.relativePath);
    console.log('Chemin absolu:', createSubfolderResult.absolutePath);
    
    // Vérifier que le sous-dossier a bien été créé
    const createdSubfolderPath = checkPathExists(createSubfolderResult.path);
    if (!createdSubfolderPath) {
      // Essayer avec le chemin relatif
      const altPath = checkPathExists(createSubfolderResult.relativePath);
      if (!altPath) {
        throw new Error(`Le sous-dossier n'a pas été créé correctement. Chemin attendu: ${createSubfolderResult.path} ou ${createSubfolderResult.relativePath}`);
      }
      console.log(`Sous-dossier vérifié (chemin relatif): ${altPath}`);
    } else {
      console.log(`Sous-dossier vérifié (chemin direct): ${createdSubfolderPath}`);
    }
    
    // Test 3: Créer un fichier
    console.log('\n--- Test 3: Création d\'un fichier ---');
    // Utiliser le chemin du dossier vérifié pour créer le fichier
    const folderPath = createdFolderPath || checkPathExists(createFolderResult.path);
    if (!folderPath) {
      throw new Error(`Impossible de créer le fichier: le dossier parent n'a pas été trouvé`);
    }
    const filePath = path.join(folderPath, testFileName);
    fs.writeFileSync(filePath, 'Contenu de test');
    console.log(`Fichier créé: ${filePath}`);
    
    // Test 4: Lister les fichiers
    console.log('\n--- Test 4: Listage des fichiers ---');
    const listFilesResult = await fileSystemAgent.listFiles(createFolderResult.path);
    console.log('Résultat:', listFilesResult);
    console.log('Chemin relatif:', listFilesResult.relativePath);
    console.log('Chemin absolu:', listFilesResult.absolutePath);
    console.log('Eléments:', listFilesResult.items);
    
    // Test 5: Déplacer un fichier
    console.log('\n--- Test 5: Déplacement d\'un fichier ---');
    const sourceFilePath = path.join(createFolderResult.path, testFileName);
    const destFilePath = path.join(createSubfolderResult.path, testFileName);
    const moveFileResult = await fileSystemAgent.moveFile(sourceFilePath, destFilePath);
    console.log('Résultat:', moveFileResult);
    console.log('Chemin source relatif:', moveFileResult.sourceRelativePath);
    console.log('Chemin source absolu:', moveFileResult.sourceAbsolutePath);
    console.log('Chemin destination relatif:', moveFileResult.destinationRelativePath);
    console.log('Chemin destination absolu:', moveFileResult.destinationAbsolutePath);
    
    // Vérifier que le fichier a bien été déplacé
    // Utiliser le chemin du sous-dossier vérifié pour vérifier le fichier déplacé
    const subfolder = createdSubfolderPath || checkPathExists(createSubfolderResult.path);
    if (!subfolder) {
      throw new Error(`Impossible de vérifier le fichier déplacé: le sous-dossier n'a pas été trouvé`);
    }
    
    const movedFilePath = path.join(subfolder, testFileName);
    console.log(`Chemin attendu du fichier déplacé: ${movedFilePath}`);
    
    // Vérifier que le fichier a bien été déplacé
    if (!fs.existsSync(movedFilePath)) {
      throw new Error(`Le fichier n'a pas été déplacé correctement vers ${movedFilePath}`);
    }
    console.log(`Fichier déplacé vérifié: ${movedFilePath}`);
    
    // Test 6: Lister les fichiers du sous-dossier
    console.log('\n--- Test 6: Listage des fichiers du sous-dossier ---');
    const listSubfolderResult = await fileSystemAgent.listFiles(createSubfolderResult.path);
    console.log('Résultat:', listSubfolderResult);
    console.log('Chemin relatif:', listSubfolderResult.relativePath);
    console.log('Chemin absolu:', listSubfolderResult.absolutePath);
    console.log('Eléments:', listSubfolderResult.items);
    
    console.log('\n=== Tests terminés avec succès ===');
    console.log('Pour tester l\'ouverture de dossier, lancez l\'application et utilisez l\'agent de système de fichiers.');
    console.log(`Vous pouvez tester l'ouverture du dossier: ${path.join(baseDirectory, testFolderName)}`);
    
  } catch (error) {
    console.error('Erreur lors des tests:', error);
  }
}

// Exécuter les tests
runTests();
