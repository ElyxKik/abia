const { app, BrowserWindow } = require('electron');
const path = require('path');

// Variable pour stocker la fenêtre principale
let mainWindow;

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
}

// Initialisation de l'application
app.whenReady().then(() => {
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quitter l'application quand toutes les fenêtres sont fermées (sauf sur macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
