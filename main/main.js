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
let documentService = null;
let vectorStoreService = null;
let translationService = null;
let taskService = null;
let themeService = null;
let i18nService = null;
let updaterService = null;
let pluginLoader = null;

// Importer les services
try {
  // Essayer d'abord le service principal
  try {
    const TranslationService = require('./translation-service');
    // Vérifier si le service est déjà une instance ou s'il s'agit d'une classe
    if (typeof TranslationService === 'object' && TranslationService !== null) {
      translationService = TranslationService;
      console.log('Service de traduction importé avec succès (instance)');
    } else if (typeof TranslationService === 'function') {
      // Si c'est une classe, l'instancier
      translationService = new TranslationService();
      console.log('Service de traduction instancié avec succès');
    } else {
      throw new Error('Le module de service de traduction n\'est pas valide');
    }
  } catch (mainServiceError) {
    console.error('Erreur lors du chargement du service de traduction principal:', mainServiceError);
    // Essayer le service alternatif dans le dossier services
    try {
      const TranslationServiceAlt = require('../services/translation-service');
      translationService = new TranslationServiceAlt();
      console.log('Service de traduction alternatif chargé avec succès');
    } catch (altServiceError) {
      console.error('Erreur lors du chargement du service de traduction alternatif:', altServiceError);
      throw new Error('Impossible de charger un service de traduction valide');
    }
  }

  // Vérifier explicitement que la méthode translateDocument est disponible
  if (typeof translationService.translateDocument !== 'function') {
    console.error('Méthode translateDocument manquante, tentative de correction...');
    // Si nous avons la classe TranslationService, essayons d'accéder au prototype
    const TranslationServiceClass = translationService.constructor;
    if (typeof TranslationServiceClass === 'function' && 
        typeof TranslationServiceClass.prototype.translateDocument === 'function') {
      translationService.translateDocument = TranslationServiceClass.prototype.translateDocument.bind(translationService);
      console.log('Méthode translateDocument correctement réattachée');
    } else {
      // Si toujours pas disponible, essayer de charger l'autre service
      try {
        const ServicesTranslationService = require('../services/translation-service');
        const serviceInstance = new ServicesTranslationService();
        translationService.translateDocument = serviceInstance.translateDocument.bind(translationService);
        console.log('Méthode translateDocument empruntée au service alternatif');
      } catch (e) {
        console.error('Impossible de récupérer la méthode translateDocument:', e);
      }
    }
  }
  
  // Vérification finale
  console.log('translateDocument est disponible:', typeof translationService.translateDocument === 'function');
} catch (error) {
  console.error('Erreur lors de l\'importation du service de traduction:', error);
}
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
    const documentServicePath = path.join(servicesPath, 'document-service.js');
    const vectorStoreServicePath = path.join(servicesPath, 'vector-store-service.js');
    const translationServicePath = path.join(servicesPath, 'translation-service.js');
    const taskServicePath = path.join(servicesPath, 'task-service.js');
    const themeServicePath = path.join(servicesPath, 'theme-service.js');
    const updaterServicePath = path.join(servicesPath, 'updater-service.js');
    const i18nPath = path.join(__dirname, '../config/i18n.js');
    const pluginLoaderPath = path.join(__dirname, '../plugins/plugin-loader.js');
    
    if (!fs.existsSync(integrationServicePath)) {
      console.error(`Fichier non trouvé: ${integrationServicePath}`);
      return false;
    }
    
    if (!fs.existsSync(memoryServicePath)) {
      console.error(`Fichier non trouvé: ${memoryServicePath}`);
      return false;
    }
    
    if (!fs.existsSync(documentServicePath)) {
      console.error(`Fichier non trouvé: ${documentServicePath}`);
      return false;
    }
    
    // Importer les services
    integrationService = require(integrationServicePath);
    memoryService = require(memoryServicePath);
    documentService = require(documentServicePath);
    
    // Importer les nouveaux services s'ils existent
    try {
      if (fs.existsSync(vectorStoreServicePath)) {
        vectorStoreService = require(vectorStoreServicePath);
        console.log('Service vectoriel chargé');
      }
      
      if (fs.existsSync(translationServicePath)) {
        try {
          const TranslationServiceClass = require(translationServicePath);
          if (typeof TranslationServiceClass === 'function') {
            translationService = new TranslationServiceClass();
          } else {
            translationService = TranslationServiceClass;
          }
          console.log('Service de traduction chargé');
          
          // Vérifier que la méthode translateDocument est disponible
          if (typeof translationService.translateDocument !== 'function') {
            console.error('Méthode translateDocument non disponible dans le service chargé');
            // Essayer d'initialiser le service si possible
            if (typeof translationService.initialize === 'function') {
              translationService.initialize();
              console.log('Service de traduction initialisé');
            }
          }
        } catch (e) {
          console.error('Erreur lors du chargement du service de traduction:', e);
        }
      }
      
      if (fs.existsSync(taskServicePath)) {
        taskService = require(taskServicePath);
        console.log('Service de tâches chargé');
      }
      
      if (fs.existsSync(themeServicePath)) {
        themeService = require(themeServicePath);
        console.log('Service de thème chargé');
      }
      
      if (fs.existsSync(updaterServicePath)) {
        updaterService = require(updaterServicePath);
        console.log('Service de mise à jour chargé');
      }
      
      if (fs.existsSync(i18nPath)) {
        i18nService = require(i18nPath);
        console.log('Service i18n chargé');
      }
      
      if (fs.existsSync(pluginLoaderPath)) {
        pluginLoader = require(pluginLoaderPath);
        console.log('Chargeur de plugins chargé');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des services supplémentaires:', error);
    }
    
    // Vérifier que les services sont correctement importés
    if (!integrationService || typeof integrationService !== 'object') {
      console.error('Le service d\'intégration n\'a pas été correctement importé');
      return false;
    }
    
    if (!memoryService || typeof memoryService !== 'object') {
      console.error('Le service de mémoire n\'a pas été correctement importé');
      return false;
    }
    
    if (!documentService || typeof documentService !== 'object') {
      console.error('Le service de document n\'a pas été correctement importé');
      return false;
    }
    
    console.log('Service d\'intégration chargé:', typeof integrationService);
    console.log('Service de mémoire chargé:', typeof memoryService);
    console.log('Service de document chargé:', typeof documentService);
    
    // Initialiser les services
    let integrationInitialized = false;
    let memoryInitialized = false;
    let documentInitialized = false;
    let vectorStoreInitialized = false;
    let translationInitialized = false;
    let taskInitialized = false;
    let themeInitialized = false;
    let i18nInitialized = false;
    let updaterInitialized = false;
    let pluginInitialized = false;
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
    
    // Initialiser le service de document
    try {
      if (documentService && typeof documentService.initialize === 'function') {
        console.log('[DEBUG] Appel documentService.initialize()');
        const documentInitResult = documentService.initialize();
        documentInitialized = !!documentInitResult;
        console.log(`[DEBUG] documentService.initialize() => ${documentInitResult}`);
        if (documentInitialized) {
          console.log('Service de document initialisé avec succès');
        }
      } else {
        // Si le service n'a pas de méthode initialize, mais qu'il est un objet valide,
        // nous pouvons considérer qu'il est déjà initialisé
        if (documentService && typeof documentService === 'object') {
          console.log('Le service de document n\'a pas de méthode initialize, mais c\'est un objet valide');
          documentInitialized = true;
          console.log('Service de document considéré comme initialisé');
        } else {
          console.error('Le service de document n\'est pas valide ou n\'a pas de méthode initialize');
          console.error('[DEBUG] documentService =', documentService);
        }
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du service de document:', error);
    }
    
    // Initialiser les nouveaux services
    try {
      // Initialiser le service vectoriel
      if (vectorStoreService && typeof vectorStoreService.initialize === 'function') {
        console.log('Initialisation du service vectoriel...');
        const vectorStoreInitResult = vectorStoreService.initialize();
        vectorStoreInitialized = !!vectorStoreInitResult;
        if (vectorStoreInitialized) {
          console.log('Service vectoriel initialisé avec succès');
        }
      }
      
      // Initialiser le service de traduction
      if (translationService && typeof translationService.initialize === 'function') {
        console.log('Initialisation du service de traduction...');
        translationService.initialize();
        translationInitialized = true;
        console.log('Service de traduction initialisé avec succès');
      }
      
      // Initialiser le service de tâches
      if (taskService && typeof taskService.initialize === 'function') {
        console.log('Initialisation du service de tâches...');
        taskService.initialize();
        taskInitialized = true;
        console.log('Service de tâches initialisé avec succès');
      }
      
      // Initialiser le service de thème
      if (themeService && typeof themeService.initialize === 'function') {
        console.log('Initialisation du service de thème...');
        themeService.initialize();
        themeInitialized = true;
        console.log('Service de thème initialisé avec succès');
      }
      
      // Initialiser le service i18n
      if (i18nService) {
        i18nInitialized = true;
        console.log('Service i18n prêt');
      }
      
      // Initialiser le service de mise à jour
      if (updaterService && typeof updaterService.initialize === 'function' && mainWindow) {
        console.log('Initialisation du service de mise à jour...');
        updaterService.initialize(mainWindow);
        updaterInitialized = true;
        console.log('Service de mise à jour initialisé avec succès');
      }
      
      // Charger les plugins
      if (pluginLoader && typeof pluginLoader.loadPlugins === 'function') {
        console.log('Chargement des plugins...');
        const appContext = { mainWindow, services: { 
          integrationService, memoryService, documentService, 
          vectorStoreService, translationService, taskService,
          themeService, i18nService, updaterService
        }};
        
        pluginLoader.loadPlugins(appContext);
        pluginInitialized = true;
        console.log('Plugins chargés avec succès');
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation des services supplémentaires:', error);
    }
    
    // Vérifier que les services essentiels sont initialisés
    // Les services d'intégration et de mémoire sont essentiels, le service de document est optionnel
    if (integrationInitialized && memoryInitialized) {
      if (documentInitialized) {
        console.log('[DEBUG] Tous les services sont initialisés avec succès');
      } else {
        console.warn('[DEBUG] Services essentiels initialisés, mais le service de document n\'est pas initialisé');
        console.warn('Certaines fonctionnalités liées aux documents pourraient ne pas fonctionner correctement');
      }
      servicesInitialized = true;
      return true;
    } else {
      console.error('[DEBUG] Certains services essentiels n\'ont pas pu être initialisés');
      console.error(`[DEBUG] integrationInitialized=${integrationInitialized}, memoryInitialized=${memoryInitialized}, documentInitialized=${documentInitialized}`);
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
    icon: path.join(__dirname, '../renderer/assets/logo-abia.png'),
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
      console.log(`Traitement du fichier Excel standard: ${filePath}`);
      console.log(`Query: ${query}`);
      
      // Essayer d'initialiser les services si ce n'est pas déjà fait
      if (!servicesInitialized) {
        try {
          const initialized = initializeServices();
          if (!initialized) {
            console.warn('Initialisation partielle des services');
          }
        } catch (initError) {
          console.error('Erreur lors de l\'initialisation des services:', initError);
        }
      }
      
      // Vérifier que le service d'intégration est disponible
      if (!integrationService) {
        throw new Error('Le service d\'intégration n\'est pas disponible');
      }
      
      // Vérifier que le chemin du fichier est valide
      if (!filePath || typeof filePath !== 'string') {
        throw new Error('Chemin du fichier Excel invalide');
      }
      
      // Vérifier que le fichier existe
      if (!fs.existsSync(filePath)) {
        throw new Error(`Le fichier ${filePath} n'existe pas`);
      }
      
      // Vérifier que la méthode processExcelFile existe
      if (!integrationService.processExcelFile || typeof integrationService.processExcelFile !== 'function') {
        throw new Error('La méthode processExcelFile n\'est pas disponible dans le service d\'intégration');
      }
      
      // Traiter le fichier Excel avec le service d'intégration
      const result = await integrationService.processExcelFile(filePath, query);
      return result;
    } catch (error) {
      console.error('Erreur lors du traitement du fichier Excel:', error);
      return { 
        type: 'error',
        content: `Erreur lors du traitement du fichier Excel: ${error.message}`,
        error: error.message 
      };
    }
  });

  ipcMain.handle('open-excel-report-window', async (event, reportPath) => {
    try {
      console.log(`Ouverture du rapport Excel: ${reportPath}`);
      
      // Vérifier que le fichier existe
      if (!fs.existsSync(reportPath)) {
        throw new Error(`Le fichier de rapport ${reportPath} n'existe pas`);
      }
      
      // Créer une nouvelle fenêtre pour le rapport
      const reportWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          enableRemoteModule: false,
          preload: path.join(__dirname, 'preload.js')
        },
        title: 'Rapport Excel - ABIA',
        icon: path.join(__dirname, '../logo-abia.png'),
        autoHideMenuBar: false
      });
      
      // Charger le fichier HTML
      reportWindow.loadFile(reportPath);
      
      // Ouvrir les outils de développement en mode développement
      if (process.env.NODE_ENV === 'development') {
        reportWindow.webContents.openDevTools();
      }
      
      // Gérer la fermeture de la fenêtre
      reportWindow.on('closed', () => {
        console.log('Fenêtre de rapport fermée');
      });
      
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de l\'ouverture de la fenêtre de rapport:', error);
      return { 
        success: false,
        error: error.message 
      };
    }
  });

  ipcMain.handle('process-excel-with-actions', async (event, filePath, instructions = '') => {
    try {
      console.log(`Traitement du fichier Excel avec actions: ${filePath}`);
      
      // Essayer d'initialiser les services si ce n'est pas déjà fait
      if (!servicesInitialized) {
        const initialized = initializeServices();
        if (!initialized) {
          throw new Error('Impossible d\'initialiser les services');
        }
      }
      
      // Vérifier que le service d'intégration est disponible
      if (!integrationService || !integrationService.mainAgent) {
        throw new Error('Le service d\'intégration n\'est pas disponible');
      }
      
      // Vérifier que le fichier existe
      if (!fs.existsSync(filePath)) {
        throw new Error(`Le fichier ${filePath} n'existe pas`);
      }
      
      // Définir l'agent actif sur 'excel'
      await integrationService.mainAgent.setActiveAgent('excel');
      
      // Traiter le fichier Excel avec actions
      const excelAgent = integrationService.mainAgent.excelAgent;
      if (!excelAgent || typeof excelAgent.processExcelWithActions !== 'function') {
        throw new Error('La méthode processExcelWithActions n\'est pas disponible');
      }
      
      // Vérifier si l'agent Excel est prêt
      if (!excelAgent.isReady()) {
        throw new Error('L\'agent Excel n\'est pas prêt. Le service Excel LLM n\'est peut-être pas disponible.');
      }
      
      // Utiliser la nouvelle méthode processExcelWithActions
      const result = await excelAgent.processExcelWithActions(filePath, instructions);
      
      if (!result) {
        throw new Error('Aucun résultat retourné par l\'agent Excel');
      }
      
      return result;
    } catch (error) {
      console.error('Erreur lors du traitement du fichier Excel avec actions:', error);
      return { 
        text: `\u274c Erreur lors de l'analyse du fichier Excel: ${error.message}`,
        error: true,
        errorDetail: error.message || 'Erreur inconnue'
      };
    }
  });

  ipcMain.handle('process-excel-with-llm', async (event, filePath, instructions, options = {}) => {
    try {
      console.log(`Traitement du fichier Excel avec LLM: ${filePath}`);
      console.log(`Instructions: ${instructions}`);
      
      // Essayer d'initialiser les services si ce n'est pas déjà fait
      if (!servicesInitialized) {
        try {
          const initialized = initializeServices();
          if (!initialized) {
            console.warn('Initialisation partielle des services');
          }
        } catch (initError) {
          console.error('Erreur lors de l\'initialisation des services:', initError);
        }
      }
      
      // Vérifier que le service de document est disponible
      if (!documentService) {
        // Essayer de charger directement le service de document si nécessaire
        try {
          console.log('Tentative de chargement direct du service de document...');
          const documentServicePath = path.join(__dirname, '../services/document-service.js');
          if (fs.existsSync(documentServicePath)) {
            documentService = require(documentServicePath);
            console.log('Service de document chargé avec succès (chargement direct)');
          } else {
            throw new Error(`Le fichier du service de document n'existe pas: ${documentServicePath}`);
          }
        } catch (loadError) {
          console.error('Erreur lors du chargement direct du service de document:', loadError);
          throw new Error('Le service de document n\'est pas disponible');
        }
      }
      
      // Vérifier que le chemin du fichier est valide
      if (!filePath || typeof filePath !== 'string') {
        throw new Error('Chemin du fichier Excel invalide');
      }
      
      // Vérifier que le fichier existe
      if (!fs.existsSync(filePath)) {
        throw new Error(`Le fichier ${filePath} n'existe pas`);
      }
      
      // Définir l'agent actif sur 'excel'
      if (integrationService && integrationService.mainAgent) {
        try {
          await integrationService.mainAgent.setActiveAgent('excel');
          console.log('Agent Excel défini comme agent actif');
        } catch (agentError) {
          console.warn('Impossible de définir l\'agent Excel comme agent actif:', agentError);
        }
      }
      
      // Vérifier que la méthode processExcelWithLLM existe
      if (!documentService.processExcelWithLLM || typeof documentService.processExcelWithLLM !== 'function') {
        throw new Error('La méthode processExcelWithLLM n\'est pas disponible dans le service de document');
      }
      
      // Traiter le fichier Excel avec le service de document et LLM
      const result = await documentService.processExcelWithLLM(filePath, instructions, options);
      return result;
    } catch (error) {
      console.error('Erreur lors du traitement du fichier Excel avec LLM:', error);
      return { 
        type: 'error',
        content: `Erreur lors du traitement du fichier Excel avec LLM: ${error.message}`,
        error: error.message 
      };
    }
  });

  ipcMain.handle('generate-excel-report', async (event, filePath, instructions, options = {}) => {
    try {
      console.log(`Génération d'un rapport structuré pour le fichier Excel: ${filePath}`);
      console.log(`Instructions: ${instructions}`);
      
      if (!servicesInitialized) {
        const initialized = initializeServices();
        if (!initialized) {
          throw new Error('Impossible d\'initialiser les services');
        }
      }
      
      if (!integrationService || !integrationService.excelLLMService) {
        throw new Error('Le service Excel LLM n\'est pas disponible');
      }
      
      const result = await integrationService.excelLLMService.generateStructuredReport(filePath, instructions, options);
      return result;
    } catch (error) {
      console.error('Erreur lors de la génération du rapport structuré:', error);
      return {
        type: 'error',
        content: `Erreur lors de la génération du rapport structuré: ${error.message || error}`
      };
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
      
      const result = await integrationService.generateLetter(templateType, data);
      return result;
    } catch (error) {
      console.error('Erreur lors de la génération de la lettre:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Gestionnaires d'événements pour le service de traduction
  ipcMain.handle('translate-text', async (event, text, targetLang, sourceLang = 'auto') => {
    try {
      if (!translationService) {
        throw new Error('Le service de traduction n\'est pas initialisé');
      }
      
      const result = await translationService.translateText(text, targetLang, sourceLang);
      return result;
    } catch (error) {
      console.error('Erreur lors de la traduction du texte:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  ipcMain.handle('translate-document', async (event, filePath, targetLang, sourceLang = 'auto') => {
    try {
      if (!translationService) {
        throw new Error('Le service de traduction n\'est pas initialisé');
      }
      
      // Créer une fonction de callback pour suivre la progression
      const progressCallback = (progress) => {
        // Envoyer la progression à la fenêtre de rendu
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('translation-progress', progress);
        }
      };
      
      const result = await translationService.translateDocument(filePath, targetLang, sourceLang, progressCallback);
      return result;
    } catch (error) {
      console.error('Erreur lors de la traduction du document:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  ipcMain.handle('get-supported-languages', async () => {
    try {
      if (!translationService) {
        throw new Error('Le service de traduction n\'est pas initialisé');
      }
      
      return translationService.getSupportedLanguages();
    } catch (error) {
      console.error('Erreur lors de la récupération des langues supportées:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  ipcMain.handle('get-supported-file-types', async () => {
    try {
      if (!translationService) {
        throw new Error('Le service de traduction n\'est pas initialisé');
      }
      
      return translationService.getSupportedFileTypes();
    } catch (error) {
      console.error('Erreur lors de la récupération des types de fichiers supportés:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Gestionnaire pour ouvrir un dossier contenant un fichier
  ipcMain.handle('openFolder', async (event, filePath) => {
    try {
      // Vérifier si le chemin existe
      if (!fs.existsSync(filePath)) {
        throw new Error(`Le chemin ${filePath} n'existe pas`);
      }
      
      // Déterminer si le chemin est un fichier ou un dossier
      const stats = fs.statSync(filePath);
      let folderPath;
      
      if (stats.isFile()) {
        // Si c'est un fichier, ouvrir le dossier parent
        folderPath = path.dirname(filePath);
      } else if (stats.isDirectory()) {
        // Si c'est déjà un dossier, l'ouvrir directement
        folderPath = filePath;
      } else {
        throw new Error(`Le chemin ${filePath} n'est ni un fichier ni un dossier`);
      }
      
      // Ouvrir le dossier dans l'explorateur de fichiers du système
      const opened = await shell.openPath(folderPath);
      
      if (opened !== '') {
        throw new Error(`Erreur lors de l'ouverture du dossier: ${opened}`);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de l\'ouverture du dossier:', error);
      return {
        success: false,
        error: error.message
      };
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
    return memoryService.getAllConversations(limit);
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
