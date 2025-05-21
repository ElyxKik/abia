const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  // File operations
  selectFile: (options) => ipcRenderer.invoke('select-file', options),
  saveFile: (options) => ipcRenderer.invoke('save-file', options),
  
  // App info
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Store operations
  getStoreValue: (key, defaultValue) => ipcRenderer.invoke('get-store-value', key, defaultValue),
  setStoreValue: (key, value) => ipcRenderer.invoke('set-store-value', key, value),
  
  // Notifications
  showNotification: (options) => ipcRenderer.invoke('show-notification', options),
  
  // Event listeners
  onNewConversation: (callback) => ipcRenderer.on('new-conversation', callback),
  onOpenSettings: (callback) => ipcRenderer.on('open-settings', callback),
  onToggleDarkMode: (callback) => ipcRenderer.on('toggle-dark-mode', (_, value) => callback(value)),
  onChangeLanguage: (callback) => ipcRenderer.on('change-language', (_, value) => callback(value)),
  
  // Remove event listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
  
  // Integration service methods
  processQuery: (query, options) => ipcRenderer.invoke('process-query', query, options),
  processExcelFile: (filePath, query) => ipcRenderer.invoke('process-excel-file', filePath, query),
  processDocument: (filePath, query) => ipcRenderer.invoke('process-document', filePath, query),
  generateLetter: (templateType, data) => ipcRenderer.invoke('generate-letter', templateType, data),
  
  // Memory service methods
  createNewSession: () => ipcRenderer.invoke('create-new-session'),
  getCurrentContext: () => ipcRenderer.invoke('get-current-context'),
  getConversationHistory: (limit) => ipcRenderer.invoke('get-conversation-history', limit),
  getActiveAgent: () => ipcRenderer.invoke('get-active-agent'),
  setActiveAgent: (agentType) => ipcRenderer.invoke('set-active-agent', agentType),
  getActiveFiles: () => ipcRenderer.invoke('get-active-files'),
  listSessions: (limit) => ipcRenderer.invoke('list-sessions', limit),
  loadSession: (sessionId) => ipcRenderer.invoke('load-session', sessionId),
  
  // File system operations
  openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath)
});
