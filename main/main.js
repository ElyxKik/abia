// Importer Electron de manière sécurisée pour éviter les erreurs
let app, BrowserWindow, ipcMain, dialog, shell, Menu, Tray, Notification;
try {
  const electron = require('electron');
  app = electron.app;
  BrowserWindow = electron.BrowserWindow;
  ipcMain = electron.ipcMain;
  dialog = electron.dialog;
  shell = electron.shell;
  Menu = electron.Menu;
  Tray = electron.Tray;
  Notification = electron.Notification;
} catch (error) {
  console.error('Erreur lors de l\'importation d\'Electron:', error);
}

const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

// Services de l'application
let integrationService = null;
let memoryService = null;
let servicesInitialized = false;

// Fonction pour initialiser les services
function initializeServices() {
  if (servicesInitialized) return true;
  
  try {
    const servicesPath = path.join(__dirname, '../services');
    console.log('Chemin des services:', servicesPath);
    
    // Vérifier que les fichiers existent avant de les importer
    const integrationServicePath = path.join(servicesPath, 'integration-service.js');
    const memoryServicePath = path.join(servicesPath, 'memory-service.js');
    
    if (!fs.existsSync(integrationServicePath)) {
      console.error(`Fichier non trouvé: ${integrationServicePath}`);
      return false;
    }
    
    if (!fs.existsSync(memoryServicePath)) {
      console.error(`Fichier non trouvé: ${memoryServicePath}`);
      return false;
    }
    
    // Importer les services
    integrationService = require(integrationServicePath);
    memoryService = require(memoryServicePath);
    
    // Vérifier que les services sont correctement importés
    if (!integrationService || typeof integrationService !== 'object') {
      console.error('Le service d\'intégration n\'a pas été correctement importé');
      return false;
    }
    
    if (!memoryService || typeof memoryService !== 'object') {
      console.error('Le service de mémoire n\'a pas été correctement importé');
      return false;
    }
    
    console.log('Service d\'intégration chargé:', typeof integrationService);
    console.log('Service de mémoire chargé:', typeof memoryService);
    
    // Initialiser les services
    let integrationInitialized = false;
    let memoryInitialized = false;
    console.log('[DEBUG] Début initializeServices');
    // Initialiser le service d'intégration
    if (typeof integrationService.initialize === 'function') {
      console.log('[DEBUG] Appel integrationService.initialize()');
      integrationService.initialize();
      integrationInitialized = true;
      console.log('Service d\'intégration initialisé avec succès');
    } else {
      console.error('Le service d\'intégration n\'a pas de méthode initialize');
    }
    
    // Initialiser le service de mémoire
    if (typeof memoryService.initialize === 'function') {
      console.log('[DEBUG] Appel memoryService.initialize()');
      const memoryInitResult = memoryService.initialize();
      memoryInitialized = !!memoryInitResult;
      console.log(`[DEBUG] memoryService.initialize() => ${memoryInitResult}`);
      if (memoryInitialized) {
        console.log('Service de mémoire initialisé avec succès');
      }
    } else {
      console.error('Le service de mémoire n\'a pas de méthode initialize');
      console.error('[DEBUG] memoryService =', memoryService);
    }
    
    // Vérifier que les deux services sont initialisés
    if (integrationInitialized && memoryInitialized) {
      console.log('[DEBUG] Tous les services sont initialisés avec succès');
      servicesInitialized = true;
      return true;
    } else {
      console.error('[DEBUG] Certains services n\'ont pas pu être initialisés');
      console.error(`[DEBUG] integrationInitialized=${integrationInitialized}, memoryInitialized=${memoryInitialized}`);
      return false;
    }
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des services:', error);
    return false;
  }
}

// Définir une variable pour l'autoUpdater
let autoUpdater = null;

// Configuration du stockage local
const store = new Store();

// Variable pour stocker la fenêtre principale
let mainWindow;
let tray = null;

// Création de la fenêtre principale
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../renderer/assets/icons/icon.png'),
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#ffffff'
  });

  // Chargement de l'interface utilisateur
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Ouvrir les DevTools en mode développement
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Gestion de la fermeture de la fenêtre
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Création du menu de l'application
  createMenu();
}

// Création du menu de l'application
function createMenu() {
  const template = [
    {
      label: 'Fichier',
      submenu: [
        { 
          label: 'Nouvelle conversation', 
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow.webContents.send('new-conversation')
        },
        { type: 'separator' },
        { 
          label: 'Préférences', 
          accelerator: 'CmdOrCtrl+,',
          click: () => mainWindow.webContents.send('open-settings')
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Édition',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'Affichage',
      submenu: [
        { 
          label: 'Mode sombre',
          type: 'checkbox',
          checked: store.get('darkMode', false),
          click: (item) => {
            store.set('darkMode', item.checked);
            mainWindow.webContents.send('toggle-dark-mode', item.checked);
          }
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Langue',
      submenu: [
        {
          label: 'Français',
          type: 'radio',
          checked: store.get('language', 'fr') === 'fr',
          click: () => {
            store.set('language', 'fr');
            mainWindow.webContents.send('change-language', 'fr');
          }
        },
        {
          label: 'English',
          type: 'radio',
          checked: store.get('language', 'fr') === 'en',
          click: () => {
            store.set('language', 'en');
            mainWindow.webContents.send('change-language', 'en');
          }
        }
      ]
    },
    {
      label: 'Aide',
      submenu: [
        {
          label: 'Documentation',
          click: async () => {
            await shell.openExternal('https://github.com/yourusername/abia/wiki');
          }
        },
        {
          label: 'À propos d\'ABIA',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              title: 'À propos d\'ABIA',
              message: 'ABIA - Assistant Intelligent',
              detail: `Version: ${app.getVersion()}\nCréé avec Electron et ❤️`,
              buttons: ['OK'],
              icon: path.join(__dirname, '../renderer/assets/icons/icon.png')
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Création de l'icône dans la barre des tâches
function createTray() {
  tray = new Tray(path.join(__dirname, '../renderer/assets/icons/tray-icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Ouvrir ABIA', 
      click: () => {
        if (mainWindow === null) {
          createWindow();
        } else {
          mainWindow.show();
        }
      }
    },
    { type: 'separator' },
    { 
      label: 'Quitter', 
      click: () => {
        app.quit();
      }
    }
  ]);
  tray.setToolTip('ABIA - Assistant Intelligent');
  tray.setContextMenu(contextMenu);
}

// Initialisation de l'application - vérifier que l'app Electron est disponible
if (app && typeof app.whenReady === 'function') {
  app.whenReady().then(() => {
    // Créer la fenêtre principale et l'icône du système
    createWindow();
    createTray();
    
    // Initialiser les services
    initializeServices();
    
    // Déterminer si l'application est en mode développement
    const isDevelopment = process.env.NODE_ENV === 'development' || !app.isPackaged;
    
    // Initialiser l'autoUpdater uniquement en production
    if (!isDevelopment) {
      try {
        const { autoUpdater: updater } = require('electron-updater');
        autoUpdater = updater;
        autoUpdater.checkForUpdatesAndNotify();
      } catch (error) {
        console.error('Erreur lors de l\'initialisation de l\'autoUpdater:', error);
      }
    }
  });
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}

// Quitter l'application quand toutes les fenêtres sont fermées (sauf sur macOS)
// Gérer la fermeture de toutes les fenêtres
if (app) {
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

// Gestion des mises à jour automatiques
if (app && typeof app.whenReady === 'function') {
  app.whenReady().then(() => {
    // Configurer l'autoUpdater uniquement si nous sommes en production
    if (autoUpdater) {
      autoUpdater.on('update-downloaded', () => {
        dialog.showMessageBox(mainWindow, {
          title: 'Mise à jour disponible',
          message: 'Une mise à jour a été téléchargée',
          detail: 'Voulez-vous redémarrer l\'application pour installer la mise à jour ?',
          buttons: ['Redémarrer', 'Plus tard'],
          cancelId: 1
        }).then(result => {
          if (result.response === 0) {
            autoUpdater.quitAndInstall();
          }
        });
      });
    }
  });
}

// Gestion des IPC (Inter-Process Communication)
if (ipcMain) {
  ipcMain.handle('select-file', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, options);
    return result;
  });

  ipcMain.handle('save-file', async (event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, options);
    return result;
  });

  ipcMain.handle('get-app-path', () => {
    return app.getPath('userData');
  });

  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

  ipcMain.handle('get-store-value', (event, key, defaultValue) => {
    return store.get(key, defaultValue);
  });

  ipcMain.handle('set-store-value', (event, key, value) => {
    store.set(key, value);
    return true;
  });

  // Gestionnaires d'événements pour le service d'intégration
  ipcMain.handle('process-query', async (event, query, options) => {
    try {
      // Essayer d'initialiser les services si ce n'est pas déjà fait
      if (!servicesInitialized) {
        const initialized = initializeServices();
        if (!initialized) {
          throw new Error('Impossible d\'initialiser les services');
        }
      }
      
      if (!integrationService) {
        throw new Error('Le service d\'intégration n\'est pas initialisé');
      }
      
      return await integrationService.processQuery(query, options);
    } catch (error) {
      console.error('Erreur lors du traitement de la requête:', error);
      throw error;
    }
  });

  ipcMain.handle('process-excel-file', async (event, filePath, query) => {
    try {
      // Essayer d'initialiser les services si ce n'est pas déjà fait
      if (!servicesInitialized) {
        const initialized = initializeServices();
        if (!initialized) {
          throw new Error('Impossible d\'initialiser les services');
        }
      }
      
      if (!integrationService) {
        throw new Error('Le service d\'intégration n\'est pas initialisé');
      }
      
      return await integrationService.processExcelFile(filePath, query);
    } catch (error) {
      console.error('Erreur lors du traitement du fichier Excel:', error);
      throw error;
    }
  });

  ipcMain.handle('process-document', async (event, filePath, query) => {
    try {
      // Essayer d'initialiser les services si ce n'est pas déjà fait
      if (!servicesInitialized) {
        const initialized = initializeServices();
        if (!initialized) {
          throw new Error('Impossible d\'initialiser les services');
        }
      }
      
      if (!integrationService) {
        throw new Error('Le service d\'intégration n\'est pas initialisé');
      }
      
      return await integrationService.processDocument(filePath, query);
    } catch (error) {
      console.error('Erreur lors du traitement du document:', error);
      throw error;
    }
  });
  ipcMain.handle('generate-letter', async (event, templateType, data) => {
    try {
      // Essayer d'initialiser les services si ce n'est pas déjà fait
      if (!servicesInitialized) {
        const initialized = initializeServices();
        if (!initialized) {
          throw new Error('Impossible d\'initialiser les services');
        }
      }
      
      if (!integrationService) {
        throw new Error('Le service d\'intégration n\'est pas initialisé');
      }
      
      return await integrationService.generateLetter(templateType, data);
    } catch (error) {
      console.error('Erreur lors de la génération de la lettre:', error);
      throw error;
    }
  });

  // Gestionnaires d'événements pour le service de mémoire
  ipcMain.handle('create-new-session', async () => {
    try {
      // Essayer d'initialiser les services si ce n'est pas déjà fait
      if (!servicesInitialized) {
        const initialized = initializeServices();
        if (!initialized) {
          throw new Error('Impossible d\'initialiser les services');
        }
      }
      
      if (!memoryService) {
        throw new Error('Le service de mémoire n\'est pas initialisé');
      }
    
      return memoryService.createNewSession();
    } catch (error) {
      console.error('Erreur lors de la création d\'une nouvelle session:', error);
      throw error;
    }
  });

ipcMain.handle('get-current-context', async () => {
  try {
    // Essayer d'initialiser les services si ce n'est pas déjà fait
    if (!servicesInitialized) {
      const initialized = initializeServices();
      if (!initialized) {
        throw new Error('Impossible d\'initialiser les services');
      }
    }
    
    if (!memoryService) {
      throw new Error('Le service de mémoire n\'est pas initialisé');
    }
    
    return memoryService.getCurrentContext();
  } catch (error) {
    console.error('Erreur lors de la récupération du contexte actuel:', error);
    throw error;
  }
});

ipcMain.handle('get-conversation-history', async (event, limit) => {
  try {
    if (!memoryService) {
      throw new Error('Le service de mémoire n\'est pas initialisé');
    }
    return memoryService.getConversationHistory(limit);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique de conversation:', error);
    throw error;
  }
});

// Gestionnaire pour récupérer les statistiques d'utilisation des tokens
ipcMain.handle('get-token-stats', async () => {
  try {
    // Essayer d'initialiser les services si ce n'est pas déjà fait
    if (!servicesInitialized) {
      const initialized = initializeServices();
      if (!initialized) {
        throw new Error('Impossible d\'initialiser les services');
      }
    }
    
    // Vérifier que le service LLM est disponible
    if (!llmService) {
      throw new Error('Le service LLM n\'est pas initialisé');
    }
    
    // Récupérer les statistiques d'utilisation des tokens
    return llmService.getTokenStats();
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques de tokens:', error);
    // Retourner des statistiques par défaut en cas d'erreur
    return {
      today: 0,
      month: 0,
      total: 0,
      lastCall: null,
      model: 'DeepSeek'
    };
  }
});

// Fonction pour ouvrir un dossier dans l'explorateur de fichiers
ipcMain.handle('open-folder', async (event, folderPath) => {
  try {
    if (!shell) {
      throw new Error('Shell n\'est pas disponible');
    }
    
    // Vérifier que le chemin est valide
    if (!folderPath || typeof folderPath !== 'string') {
      return { 
        success: false, 
        error: 'Chemin de dossier invalide ou manquant',
        message: 'Impossible d\'ouvrir le dossier: chemin invalide ou manquant'
      };
    }
    
    // Vérifier que le chemin existe
    if (!fs.existsSync(folderPath)) {
      // Essayer de créer le dossier parent si possible
      try {
        const parentDir = path.dirname(folderPath);
        if (fs.existsSync(parentDir)) {
          // Ouvrir le dossier parent au lieu du dossier inexistant
          await shell.openPath(parentDir);
          return { 
            success: true, 
            message: `Le dossier ${folderPath} n'existe pas. Ouverture du dossier parent: ${parentDir}`,
            parentOpened: true,
            requestedPath: folderPath,
            openedPath: parentDir
          };
        } else {
          return { 
            success: false, 
            error: `Le dossier ${folderPath} et son parent n'existent pas`,
            message: `Impossible d'ouvrir le dossier: ${folderPath} n'existe pas`
          };
        }
      } catch (innerError) {
        return { 
          success: false, 
          error: `Le dossier ${folderPath} n'existe pas: ${innerError.message}`,
          message: `Impossible d'ouvrir le dossier: ${folderPath} n'existe pas`
        };
      }
    }
    
    // Vérifier que c'est un dossier
    const stats = fs.statSync(folderPath);
    if (!stats.isDirectory()) {
      // Si c'est un fichier, on ouvre le dossier parent
      const parentDir = path.dirname(folderPath);
      await shell.openPath(parentDir);
      return { 
        success: true, 
        message: `${folderPath} est un fichier. Ouverture du dossier parent: ${parentDir}`,
        parentOpened: true,
        requestedPath: folderPath,
        openedPath: parentDir
      };
    }
    
    // Ouvrir le dossier dans l'explorateur de fichiers
    await shell.openPath(folderPath);
    return { success: true, message: `Dossier ouvert: ${folderPath}` };
  } catch (error) {
    console.error('Erreur lors de l\'ouverture du dossier:', error);
    return { 
      success: false, 
      error: error.message,
      message: `Impossible d'ouvrir le dossier: ${error.message}`
    };
  }
});

ipcMain.handle('get-active-agent', async () => {
  try {
    if (!memoryService) {
      throw new Error('Le service de mémoire n\'est pas initialisé');
    }
    return memoryService.getActiveAgent();
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'agent actif:', error);
    throw error;
  }
});

ipcMain.handle('set-active-agent', async (event, agentType) => {
  try {
    if (!integrationService || !integrationService.mainAgent) {
      throw new Error('Le service d\'intégration ou l\'agent principal n\'est pas initialisé');
    }
    
    // Vérifier que le type d'agent est valide
    if (!agentType || typeof agentType !== 'string') {
      throw new Error('Type d\'agent invalide');
    }
    
    // Définir l'agent actif
    const success = integrationService.mainAgent.setActiveAgent(agentType);
    
    if (!success) {
      throw new Error(`Impossible de définir l'agent actif sur: ${agentType}`);
    }
    
    console.log(`Agent actif défini sur: ${agentType}`);
    return { success: true, agent: agentType };
  } catch (error) {
    console.error('Erreur lors de la définition de l\'agent actif:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-active-files', async () => {
  try {
    if (!memoryService) {
      throw new Error('Le service de mémoire n\'est pas initialisé');
    }
    return memoryService.getActiveFiles();
  } catch (error) {
    console.error('Erreur lors de la récupération des fichiers actifs:', error);
    throw error;
  }
});

ipcMain.handle('list-sessions', async (event, limit) => {
  try {
    if (!memoryService) {
      throw new Error('Le service de mémoire n\'est pas initialisé');
    }
    return await memoryService.listSessions(limit);
  } catch (error) {
    console.error('Erreur lors de la récupération de la liste des sessions:', error);
    throw error;
  }
});

ipcMain.handle('load-session', async (event, sessionId) => {
  try {
    if (!memoryService) {
      throw new Error('Le service de mémoire n\'est pas initialisé');
    }
    return await memoryService.loadContext(sessionId);
  } catch (error) {
    console.error('Erreur lors du chargement de la session:', error);
    throw error;
  }
});

} // Fermeture du bloc ipcMain
