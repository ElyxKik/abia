const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const config = require('../config/config');

// Promisify fs functions
const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);
const rmdir = promisify(fs.rmdir);
const copyFile = promisify(fs.copyFile);
const rename = promisify(fs.rename);

/**
 * Agent responsable de la gestion des fichiers et dossiers
 * Permet la création, suppression, et classification des documents
 */
class FileSystemAgent {
  constructor() {
    this.initialized = false;
    this.baseDirectory = config.get('fileSystem.baseDirectory', path.join(process.env.HOME || process.env.USERPROFILE, 'Documents', 'ABIA'));
  }

  /**
   * Initialise l'agent de système de fichiers
   * @returns {boolean} - True si l'initialisation a réussi
   */
  initialize() {
    try {
      console.log('Initialisation de l\'agent de système de fichiers...');
      
      // Créer le répertoire de base s'il n'existe pas
      if (!fs.existsSync(this.baseDirectory)) {
        fs.mkdirSync(this.baseDirectory, { recursive: true });
      }
      
      this.initialized = true;
      console.log('Agent de système de fichiers initialisé avec succès');
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de l\'agent de système de fichiers:', error);
      return false;
    }
  }

  /**
   * Crée un nouveau dossier
   * @param {string} folderName - Nom du dossier à créer
   * @param {string} parentPath - Chemin du dossier parent (optionnel)
   * @returns {Promise<Object>} - Résultat de l'opération
   */
  async createFolder(folderName, parentPath = '') {
    try {
      // Valider le nom du dossier
      if (!folderName || typeof folderName !== 'string') {
        return {
          success: false,
          message: 'Nom de dossier invalide. Veuillez fournir un nom valide.',
          error: 'Nom de dossier invalide'
        };
      }
      
      // Vérifier si le nom du dossier est trop long ou trop court
      if (folderName.length < 2 || folderName.length > 50) {
        return {
          success: false,
          message: `Le nom du dossier "${folderName}" est ${folderName.length < 2 ? 'trop court' : 'trop long'}. Veuillez fournir un nom entre 2 et 50 caractères.`,
          error: 'Longueur de nom invalide'
        };
      }
      
      // Nettoyer le nom du dossier pour éviter les caractères problématiques
      const sanitizedName = this.sanitizeFileName(folderName);
      
      // Vérifier si le nom a été modifié significativement après nettoyage
      if (sanitizedName !== folderName && sanitizedName.length < folderName.length * 0.7) {
        return {
          success: false,
          message: `Le nom du dossier "${folderName}" contient trop de caractères invalides. Veuillez utiliser un nom avec des caractères alphanumériques, des espaces, des tirets ou des underscores.`,
          error: 'Caractères invalides dans le nom'
        };
      }
      
      // Déterminer le chemin complet
      const targetPath = parentPath 
        ? path.join(parentPath, sanitizedName)
        : path.join(this.baseDirectory, sanitizedName);
      
      // Vérifier si le dossier parent existe
      const parentDir = parentPath || this.baseDirectory;
      if (!fs.existsSync(parentDir)) {
        return {
          success: false,
          message: `Le dossier parent "${parentDir}" n'existe pas. Impossible de créer le dossier "${sanitizedName}".`,
          error: 'Dossier parent inexistant'
        };
      }
      
      // Vérifier si le dossier existe déjà
      if (fs.existsSync(targetPath)) {
        // Vérifier si c'est bien un dossier
        const stats = await stat(targetPath);
        if (stats.isDirectory()) {
          return {
            success: false,
            message: `Le dossier "${sanitizedName}" existe déjà.`,
            path: targetPath,
            relativePath: this.getPathInfo(targetPath).relativePath,
            absolutePath: targetPath,
            folderExists: true
          };
        }
      }
      
      // Créer le dossier
      await mkdir(targetPath, { recursive: true });
      
      // Vérifier que le dossier a bien été créé
      if (!fs.existsSync(targetPath)) {
        throw new Error(`Le dossier "${sanitizedName}" n'a pas pu être créé pour une raison inconnue.`);
      }
      
      // Obtenir les informations de chemin
      const pathInfo = this.getPathInfo(targetPath);
      
      return {
        success: true,
        message: `Dossier "${sanitizedName}" créé avec succès.\nChemin relatif: ${pathInfo.relativePath}\nChemin absolu: ${pathInfo.absolutePath}`,
        path: targetPath,
        relativePath: pathInfo.relativePath,
        absolutePath: pathInfo.absolutePath,
        folderName: sanitizedName
      };
    } catch (error) {
      console.error('Erreur lors de la création du dossier:', error);
      return {
        success: false,
        message: `Erreur lors de la création du dossier: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Supprime un dossier et son contenu
   * @param {string} folderPath - Chemin du dossier à supprimer
   * @param {boolean} recursive - Si true, supprime récursivement le contenu
   * @returns {Promise<Object>} - Résultat de l'opération
   */
  async deleteFolder(folderPath, recursive = true) {
    try {
      // Valider le chemin du dossier
      if (!folderPath || typeof folderPath !== 'string') {
        throw new Error('Chemin de dossier invalide');
      }
      
      // Vérifier si le dossier existe
      if (!fs.existsSync(folderPath)) {
        return {
          success: false,
          message: `Le dossier ${folderPath} n'existe pas`
        };
      }
      
      // Vérifier que c'est bien un dossier
      const stats = await stat(folderPath);
      if (!stats.isDirectory()) {
        return {
          success: false,
          message: `${folderPath} n'est pas un dossier`
        };
      }
      
      if (recursive) {
        // Supprimer récursivement le contenu
        await this.deleteDirectoryRecursive(folderPath);
      } else {
        // Vérifier si le dossier est vide
        const files = await readdir(folderPath);
        if (files.length > 0) {
          return {
            success: false,
            message: `Le dossier ${folderPath} n'est pas vide. Utilisez l'option recursive pour supprimer son contenu.`
          };
        }
        
        // Supprimer le dossier vide
        await rmdir(folderPath);
      }
      
      // Obtenir les informations de chemin pour l'affichage
      const pathInfo = this.getPathInfo(folderPath);
      
      return {
        success: true,
        message: `Dossier supprimé avec succès (chemin relatif: ${pathInfo.relativePath}, chemin absolu: ${pathInfo.absolutePath})`,
        path: folderPath,
        relativePath: pathInfo.relativePath,
        absolutePath: pathInfo.absolutePath
      };
    } catch (error) {
      console.error('Erreur lors de la suppression du dossier:', error);
      return {
        success: false,
        message: `Erreur lors de la suppression du dossier: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Supprime récursivement un dossier et son contenu
   * @param {string} dirPath - Chemin du dossier à supprimer
   * @returns {Promise<void>}
   * @private
   */
  async deleteDirectoryRecursive(dirPath) {
    const entries = await readdir(dirPath);
    
    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry);
      const entryStats = await stat(entryPath);
      
      if (entryStats.isDirectory()) {
        await this.deleteDirectoryRecursive(entryPath);
      } else {
        await unlink(entryPath);
      }
    }
    
    await rmdir(dirPath);
  }

  /**
   * Déplace un fichier vers un dossier spécifique
   * @param {string} filePath - Chemin du fichier à déplacer
   * @param {string} destinationFolder - Dossier de destination
   * @returns {Promise<Object>} - Résultat de l'opération
   */
  async moveFile(filePath, destinationFolder) {
    try {
      // Valider les chemins
      if (!filePath || !destinationFolder) {
        throw new Error('Chemins invalides');
      }
      
      // Vérifier si le fichier existe
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          message: `Le fichier ${filePath} n'existe pas`
        };
      }
      
      // Vérifier si le dossier de destination existe
      if (!fs.existsSync(destinationFolder)) {
        // Créer le dossier de destination s'il n'existe pas
        await mkdir(destinationFolder, { recursive: true });
      }
      
      // Obtenir le nom du fichier
      const fileName = path.basename(filePath);
      
      // Chemin complet de destination
      const destinationPath = path.join(destinationFolder, fileName);
      
      // Déplacer le fichier
      await rename(filePath, destinationPath);
      
      // Obtenir les informations de chemin pour l'affichage
      const sourcePathInfo = this.getPathInfo(filePath);
      const destPathInfo = this.getPathInfo(destinationPath);
      
      return {
        success: true,
        message: `Fichier déplacé avec succès\nDe: ${sourcePathInfo.relativePath} (absolu: ${sourcePathInfo.absolutePath})\nVers: ${destPathInfo.relativePath} (absolu: ${destPathInfo.absolutePath})`,
        sourcePath: filePath,
        destinationPath: destinationPath,
        relativeSourcePath: sourcePathInfo.relativePath,
        relativeDestPath: destPathInfo.relativePath,
        absoluteSourcePath: sourcePathInfo.absolutePath,
        absoluteDestPath: destPathInfo.absolutePath
      };
    } catch (error) {
      console.error('Erreur lors du déplacement du fichier:', error);
      return {
        success: false,
        message: `Erreur lors du déplacement du fichier: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Classe les documents en fonction de leur type
   * @param {string} sourceDirectory - Répertoire source contenant les fichiers à classer
   * @returns {Promise<Object>} - Résultat de l'opération
   */
  async classifyDocuments(sourceDirectory) {
    try {
      // Valider le répertoire source
      if (!sourceDirectory || !fs.existsSync(sourceDirectory)) {
        throw new Error('Répertoire source invalide ou inexistant');
      }
      
      // Lire tous les fichiers du répertoire
      const files = await readdir(sourceDirectory);
      
      // Statistiques de classification
      const stats = {
        total: files.length,
        classified: 0,
        byCategory: {}
      };
      
      // Parcourir tous les fichiers
      for (const file of files) {
        const filePath = path.join(sourceDirectory, file);
        const fileStats = await stat(filePath);
        
        // Ignorer les dossiers
        if (fileStats.isDirectory()) {
          continue;
        }
        
        // Déterminer la catégorie en fonction de l'extension
        const extension = path.extname(file).toLowerCase();
        let category;
        
        switch (extension) {
          case '.pdf':
          case '.doc':
          case '.docx':
          case '.txt':
          case '.rtf':
            category = 'Documents';
            break;
          case '.xls':
          case '.xlsx':
          case '.csv':
            category = 'Tableurs';
            break;
          case '.jpg':
          case '.jpeg':
          case '.png':
          case '.gif':
          case '.bmp':
          case '.tiff':
            category = 'Images';
            break;
          case '.mp3':
          case '.wav':
          case '.flac':
          case '.aac':
            category = 'Audio';
            break;
          case '.mp4':
          case '.avi':
          case '.mov':
          case '.mkv':
            category = 'Videos';
            break;
          case '.zip':
          case '.rar':
          case '.7z':
          case '.tar':
          case '.gz':
            category = 'Archives';
            break;
          default:
            category = 'Autres';
        }
        
        // Créer le dossier de catégorie s'il n'existe pas
        const categoryPath = path.join(sourceDirectory, category);
        if (!fs.existsSync(categoryPath)) {
          await mkdir(categoryPath, { recursive: true });
        }
        
        // Déplacer le fichier dans le dossier de catégorie
        const destinationPath = path.join(categoryPath, file);
        await rename(filePath, destinationPath);
        
        // Mettre à jour les statistiques
        stats.classified++;
        stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
      }
      
      // Obtenir le chemin relatif
      const relativePath = this.getRelativePath(sourceDirectory);
      
      return {
        success: true,
        message: `Classification terminée: ${stats.classified} fichiers classés sur ${stats.total} dans ${relativePath}`,
        stats: stats,
        relativePath: relativePath
      };
    } catch (error) {
      console.error('Erreur lors de la classification des documents:', error);
      return {
        success: false,
        message: `Erreur lors de la classification des documents: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Liste les fichiers d'un répertoire
   * @param {string} directoryPath - Chemin du répertoire à lister
   * @returns {Promise<Object>} - Résultat de l'opération
   */
  async listFiles(directoryPath = '') {
    try {
      // Déterminer le chemin complet
      const targetPath = directoryPath || this.baseDirectory;
      
      // Vérifier si le répertoire existe
      if (!fs.existsSync(targetPath)) {
        return {
          success: false,
          message: `Le répertoire ${targetPath} n'existe pas`
        };
      }
      
      // Obtenir les informations de chemin pour l'affichage
      const pathInfo = this.getPathInfo(targetPath);
      
      // Lire le contenu du répertoire
      const entries = await readdir(targetPath);
      
      // Collecter les informations sur chaque entrée
      const items = [];
      
      for (const entry of entries) {
        const entryPath = path.join(targetPath, entry);
        const entryStats = await stat(entryPath);
        const entryPathInfo = this.getPathInfo(entryPath);
        
        items.push({
          name: entry,
          path: entryPath,
          relativePath: entryPathInfo.relativePath,
          absolutePath: entryPathInfo.absolutePath,
          isDirectory: entryStats.isDirectory(),
          size: entryStats.size,
          modified: entryStats.mtime
        });
      }
      
      // Trier: dossiers d'abord, puis fichiers (par ordre alphabétique)
      items.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
      
      return {
        success: true,
        message: `Contenu du répertoire\nChemin relatif: ${pathInfo.relativePath}\nChemin absolu: ${pathInfo.absolutePath}`,
        path: targetPath,
        relativePath: pathInfo.relativePath,
        absolutePath: pathInfo.absolutePath,
        items: items
      };
    } catch (error) {
      console.error('Erreur lors de la lecture du répertoire:', error);
      return {
        success: false,
        message: `Erreur lors de la lecture du répertoire: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Nettoie un nom de fichier pour éviter les caractères problématiques
   * @param {string} fileName - Nom de fichier à nettoyer
   * @returns {string} - Nom de fichier nettoyé
   * @private
   */
  sanitizeFileName(fileName) {
    // Remplacer les caractères problématiques par des underscores
    return fileName.replace(/[\\/:*?"<>|]/g, '_');
  }
  
  /**
   * Convertit un chemin absolu en chemin relatif par rapport au répertoire de base
   * et retourne à la fois le chemin relatif et le chemin absolu
   * @param {string} absolutePath - Chemin absolu à convertir
   * @returns {Object} - Objet contenant le chemin relatif et le chemin absolu
   * @private
   */
  getPathInfo(absolutePath) {
    try {
      // Si le chemin est dans le répertoire de base, calculer le chemin relatif
      let relativePath = absolutePath;
      if (absolutePath.startsWith(this.baseDirectory)) {
        relativePath = path.relative(this.baseDirectory, absolutePath) || '.'; // Si c'est le répertoire de base lui-même, retourner '.'
      }
      
      return {
        relativePath: relativePath,
        absolutePath: absolutePath
      };
    } catch (error) {
      console.error('Erreur lors de la conversion du chemin:', error);
      return {
        relativePath: absolutePath,
        absolutePath: absolutePath
      };
    }
  }
  
  /**
   * Méthode de compatibilité pour l'ancienne fonction getRelativePath
   * @param {string} absolutePath - Chemin absolu à convertir
   * @returns {string} - Chemin relatif
   * @deprecated Utiliser getPathInfo à la place
   */
  getRelativePath(absolutePath) {
    return this.getPathInfo(absolutePath).relativePath;
  }
}

module.exports = FileSystemAgent;
