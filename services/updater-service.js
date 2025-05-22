const { autoUpdater } = require('electron-updater');
const { dialog, app } = require('electron');
const log = require('electron-log');

class UpdaterService {
  constructor() {
    this.updateAvailable = false;
    this.updateDownloaded = false;
    this.mainWindow = null;
    this.initialized = false;
    
    // Configuration des logs
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    
    // Gestionnaires d'événements
    autoUpdater.on('checking-for-update', () => {
      this.sendStatusToWindow('Recherche de mises à jour...');
    });
    
    autoUpdater.on('update-available', (info) => {
      this.updateAvailable = true;
      this.sendStatusToWindow('Mise à jour disponible.');
      dialog.showMessageBox({
        type: 'info',
        title: 'Mise à jour disponible',
        message: `Une nouvelle version ${info.version} est disponible. Souhaitez-vous la télécharger maintenant?`,
        buttons: ['Oui', 'Non']
      }).then((returnValue) => {
        if (returnValue.response === 0) {
          autoUpdater.downloadUpdate();
        }
      });
    });
    
    autoUpdater.on('update-not-available', () => {
      this.sendStatusToWindow('Aucune mise à jour disponible.');
    });
    
    autoUpdater.on('error', (err) => {
      this.sendStatusToWindow(`Erreur lors de la mise à jour: ${err.toString()}`);
    });
    
    autoUpdater.on('download-progress', (progressObj) => {
      let logMessage = `Téléchargement: ${Math.round(progressObj.percent)}%`;
      this.sendStatusToWindow(logMessage);
    });
    
    autoUpdater.on('update-downloaded', () => {
      this.updateDownloaded = true;
      this.sendStatusToWindow('Mise à jour téléchargée.');
      dialog.showMessageBox({
        type: 'info',
        title: 'Mise à jour prête',
        message: 'Une mise à jour a été téléchargée. Redémarrer l\'application pour l\'installer?',
        buttons: ['Redémarrer', 'Plus tard']
      }).then((returnValue) => {
        if (returnValue.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
    });
  }
  
  initialize(window) {
    this.mainWindow = window;
    this.initialized = true;
    console.log('Service de mise à jour initialisé');
    return true;
  }
  
  sendStatusToWindow(text) {
    log.info(text);
    if (this.mainWindow) {
      this.mainWindow.webContents.send('update-status', text);
    }
  }
  
  checkForUpdates() {
    if (!this.initialized) {
      console.error('Le service de mise à jour n\'est pas initialisé');
      return false;
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Mode développement: vérification des mises à jour désactivée');
      return false;
    }
    
    console.log('Vérification des mises à jour...');
    autoUpdater.checkForUpdates();
    return true;
  }
}

module.exports = new UpdaterService();
