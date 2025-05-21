const fs = require('fs');
const path = require('path');
const { dialog } = require('electron');
const config = require('../config/config');

/**
 * Service de gestion des fichiers
 */
class FileService {
  constructor() {
    this.downloadsPath = config.get('paths.downloads', '');
    this.documentsPath = config.get('paths.documents', '');
    this.tempPath = config.get('paths.temp', '');
  }

  /**
   * Initialise le service de fichiers
   */
  initialize() {
    // Créer les répertoires s'ils n'existent pas
    this.ensureDirectoryExists(this.downloadsPath);
    this.ensureDirectoryExists(this.documentsPath);
    this.ensureDirectoryExists(this.tempPath);
  }

  /**
   * S'assure qu'un répertoire existe
   * @param {string} dirPath - Chemin du répertoire
   * @returns {boolean} - True si le répertoire existe ou a été créé
   */
  ensureDirectoryExists(dirPath) {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      return true;
    } catch (error) {
      console.error(`Erreur lors de la création du répertoire ${dirPath}:`, error);
      return false;
    }
  }

  /**
   * Lit le contenu d'un fichier
   * @param {string} filePath - Chemin du fichier
   * @param {string} encoding - Encodage du fichier (par défaut: utf8)
   * @returns {Promise<string|Buffer>} - Contenu du fichier
   */
  async readFile(filePath, encoding = 'utf8') {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, encoding, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }

  /**
   * Écrit du contenu dans un fichier
   * @param {string} filePath - Chemin du fichier
   * @param {string|Buffer} content - Contenu à écrire
   * @param {string} encoding - Encodage du fichier (par défaut: utf8)
   * @returns {Promise<boolean>} - True si l'écriture a réussi
   */
  async writeFile(filePath, content, encoding = 'utf8') {
    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, content, encoding, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }

  /**
   * Copie un fichier
   * @param {string} sourcePath - Chemin du fichier source
   * @param {string} destinationPath - Chemin du fichier de destination
   * @returns {Promise<boolean>} - True si la copie a réussi
   */
  async copyFile(sourcePath, destinationPath) {
    return new Promise((resolve, reject) => {
      fs.copyFile(sourcePath, destinationPath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }

  /**
   * Supprime un fichier
   * @param {string} filePath - Chemin du fichier
   * @returns {Promise<boolean>} - True si la suppression a réussi
   */
  async deleteFile(filePath) {
    return new Promise((resolve, reject) => {
      fs.unlink(filePath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }

  /**
   * Liste les fichiers d'un répertoire
   * @param {string} dirPath - Chemin du répertoire
   * @param {Object} options - Options de listage
   * @returns {Promise<Array>} - Liste des fichiers
   */
  async listFiles(dirPath, options = {}) {
    const { extensions = [], recursive = false } = options;
    
    return new Promise((resolve, reject) => {
      fs.readdir(dirPath, { withFileTypes: true }, async (err, entries) => {
        if (err) {
          reject(err);
          return;
        }
        
        try {
          let files = [];
          
          for (const entry of entries) {
            const entryPath = path.join(dirPath, entry.name);
            
            if (entry.isDirectory() && recursive) {
              // Récursion pour les sous-répertoires
              const subFiles = await this.listFiles(entryPath, options);
              files = files.concat(subFiles);
            } else if (entry.isFile()) {
              // Filtrer par extension si spécifié
              if (extensions.length === 0 || extensions.includes(path.extname(entry.name).toLowerCase())) {
                files.push({
                  name: entry.name,
                  path: entryPath,
                  extension: path.extname(entry.name),
                  size: fs.statSync(entryPath).size,
                  modifiedTime: fs.statSync(entryPath).mtime
                });
              }
            }
          }
          
          resolve(files);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Obtient des informations sur un fichier
   * @param {string} filePath - Chemin du fichier
   * @returns {Promise<Object>} - Informations sur le fichier
   */
  async getFileInfo(filePath) {
    return new Promise((resolve, reject) => {
      fs.stat(filePath, (err, stats) => {
        if (err) {
          reject(err);
          return;
        }
        
        resolve({
          name: path.basename(filePath),
          path: filePath,
          extension: path.extname(filePath),
          size: stats.size,
          createdTime: stats.birthtime,
          modifiedTime: stats.mtime,
          isDirectory: stats.isDirectory(),
          isFile: stats.isFile()
        });
      });
    });
  }

  /**
   * Crée un fichier temporaire
   * @param {string} prefix - Préfixe du nom de fichier
   * @param {string} extension - Extension du fichier
   * @returns {string} - Chemin du fichier temporaire
   */
  createTempFilePath(prefix = 'abia-', extension = '') {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 10000);
    const fileName = `${prefix}${timestamp}-${random}${extension}`;
    
    return path.join(this.tempPath, fileName);
  }

  /**
   * Affiche une boîte de dialogue pour sélectionner un fichier
   * @param {Object} options - Options de la boîte de dialogue
   * @param {BrowserWindow} parentWindow - Fenêtre parente
   * @returns {Promise<Array>} - Chemins des fichiers sélectionnés
   */
  async showOpenDialog(options = {}, parentWindow = null) {
    const defaultOptions = {
      properties: ['openFile'],
      filters: []
    };
    
    const dialogOptions = { ...defaultOptions, ...options };
    const result = await dialog.showOpenDialog(parentWindow, dialogOptions);
    
    return result.canceled ? [] : result.filePaths;
  }

  /**
   * Affiche une boîte de dialogue pour enregistrer un fichier
   * @param {Object} options - Options de la boîte de dialogue
   * @param {BrowserWindow} parentWindow - Fenêtre parente
   * @returns {Promise<string|null>} - Chemin du fichier ou null si annulé
   */
  async showSaveDialog(options = {}, parentWindow = null) {
    const defaultOptions = {
      properties: ['createDirectory', 'showOverwriteConfirmation'],
      filters: []
    };
    
    const dialogOptions = { ...defaultOptions, ...options };
    const result = await dialog.showSaveDialog(parentWindow, dialogOptions);
    
    return result.canceled ? null : result.filePath;
  }

  /**
   * Nettoie les fichiers temporaires
   * @param {number} maxAge - Âge maximum des fichiers en millisecondes
   * @returns {Promise<number>} - Nombre de fichiers supprimés
   */
  async cleanupTempFiles(maxAge = 24 * 60 * 60 * 1000) { // 24 heures par défaut
    try {
      const now = new Date().getTime();
      const files = await this.listFiles(this.tempPath);
      let deletedCount = 0;
      
      for (const file of files) {
        const fileAge = now - file.modifiedTime.getTime();
        
        if (fileAge > maxAge) {
          await this.deleteFile(file.path);
          deletedCount++;
        }
      }
      
      return deletedCount;
    } catch (error) {
      console.error('Erreur lors du nettoyage des fichiers temporaires:', error);
      return 0;
    }
  }
}

module.exports = new FileService();
