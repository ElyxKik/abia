/**
 * Module settings.js
 * Gère les paramètres de l'application (thème, langue, etc.)
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialisation des paramètres
  initSettings();
  
  // Gestionnaires d'événements
  setupEventListeners();
});

/**
 * Initialise les paramètres et charge les valeurs sauvegardées
 */
async function initSettings() {
  try {
    // Charger la version depuis package.json pour l'afficher
    const appVersion = await window.api.getAppVersion();
    const versionElement = document.getElementById('current-version');
    if (versionElement) {
      versionElement.textContent = appVersion || '1.0.0';
    }
    
    // Initialiser l'état du thème
    const currentTheme = await window.api.getTheme();
    setThemeUI(currentTheme || 'system');
    
    // Initialiser la langue
    const currentLanguage = await window.api.getLanguage();
    const languageSelector = document.getElementById('language-selector');
    if (languageSelector && currentLanguage) {
      languageSelector.value = currentLanguage;
    }
    
    // Initialiser le modèle LLM
    const currentModel = await window.api.getLLMModel();
    const modelSelector = document.getElementById('model-selector');
    if (modelSelector && currentModel) {
      modelSelector.value = currentModel;
    }
    
    // Afficher la taille du cache
    updateCacheSize();
    
    console.log('Paramètres initialisés avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des paramètres:', error);
  }
}

/**
 * Configure les écouteurs d'événements pour les interactions utilisateur
 */
function setupEventListeners() {
  // Bouton de bascule du thème
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
  
  // Options de thème
  const themeOptions = document.querySelectorAll('.theme-option');
  themeOptions.forEach(option => {
    option.addEventListener('click', function() {
      const theme = this.dataset.theme;
      setTheme(theme);
    });
  });
  
  // Changement de langue
  const languageSelector = document.getElementById('language-selector');
  if (languageSelector) {
    languageSelector.addEventListener('change', function() {
      setLanguage(this.value);
    });
  }
  
  // Changement de modèle LLM
  const modelSelector = document.getElementById('model-selector');
  if (modelSelector) {
    modelSelector.addEventListener('change', function() {
      setLLMModel(this.value);
    });
  }
  
  // Bouton pour afficher/masquer l'API key
  const showApiKeyBtn = document.getElementById('show-api-key');
  if (showApiKeyBtn) {
    showApiKeyBtn.addEventListener('click', toggleApiKeyVisibility);
  }
  
  // Bouton pour vider le cache
  const clearCacheBtn = document.getElementById('clear-cache');
  if (clearCacheBtn) {
    clearCacheBtn.addEventListener('click', clearCache);
  }
  
  // Bouton pour vérifier les mises à jour
  const checkUpdatesBtn = document.getElementById('check-updates');
  if (checkUpdatesBtn) {
    checkUpdatesBtn.addEventListener('click', checkForUpdates);
  }
  
  // Slider de taille de police
  const fontSizeSlider = document.getElementById('font-size-slider');
  if (fontSizeSlider) {
    fontSizeSlider.addEventListener('input', function() {
      setFontSize(this.value);
    });
  }
}

/**
 * Met à jour l'interface utilisateur en fonction du thème
 * @param {string} theme - Le thème à appliquer ('light', 'dark', 'system')
 */
function setThemeUI(theme) {
  const themeOptions = document.querySelectorAll('.theme-option');
  themeOptions.forEach(option => {
    if (option.dataset.theme === theme) {
      option.querySelector('div').classList.add('ring-2', 'ring-blue-500');
    } else {
      option.querySelector('div').classList.remove('ring-2', 'ring-blue-500');
    }
  });
  
  // Si le thème est 'system', utiliser la préférence de l'OS
  if (theme === 'system' && window.matchMedia) {
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', isDarkMode);
  } else {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }
}

/**
 * Change le thème de l'application
 * @param {string} theme - Le thème à appliquer ('light', 'dark', 'system')
 */
async function setTheme(theme) {
  try {
    await window.api.setTheme(theme);
    setThemeUI(theme);
    console.log(`Thème changé en: ${theme}`);
  } catch (error) {
    console.error('Erreur lors du changement de thème:', error);
  }
}

/**
 * Bascule entre les thèmes clair et sombre
 */
async function toggleTheme() {
  try {
    const currentTheme = await window.api.getTheme();
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  } catch (error) {
    console.error('Erreur lors du basculement de thème:', error);
  }
}

/**
 * Change la langue de l'interface
 * @param {string} language - Code de langue ('fr', 'en')
 */
async function setLanguage(language) {
  try {
    await window.api.setLanguage(language);
    console.log(`Langue changée en: ${language}`);
    
    // Afficher un message pour indiquer qu'un redémarrage est nécessaire
    const message = language === 'fr' 
      ? 'Redémarrage requis pour appliquer les changements de langue.' 
      : 'Restart required to apply language changes.';
    
    showNotification(message, 'info');
  } catch (error) {
    console.error('Erreur lors du changement de langue:', error);
  }
}

/**
 * Définit le modèle LLM à utiliser
 * @param {string} model - Nom du modèle
 */
async function setLLMModel(model) {
  try {
    await window.api.setLLMModel(model);
    console.log(`Modèle LLM changé en: ${model}`);
    
    // Si 'custom' est sélectionné, afficher le champ API key
    const apiKeyContainer = document.getElementById('api-key').parentElement;
    if (apiKeyContainer) {
      apiKeyContainer.style.display = model === 'custom' ? 'flex' : 'none';
    }
  } catch (error) {
    console.error('Erreur lors du changement de modèle LLM:', error);
  }
}

/**
 * Bascule la visibilité de l'API key
 */
function toggleApiKeyVisibility() {
  const apiKeyInput = document.getElementById('api-key');
  const showApiKeyBtn = document.getElementById('show-api-key');
  
  if (apiKeyInput && showApiKeyBtn) {
    const type = apiKeyInput.type;
    apiKeyInput.type = type === 'password' ? 'text' : 'password';
    
    // Changer l'icône
    const icon = showApiKeyBtn.querySelector('i');
    if (icon) {
      icon.classList.toggle('fa-eye');
      icon.classList.toggle('fa-eye-slash');
    }
  }
}

/**
 * Vide le cache de l'application
 */
async function clearCache() {
  try {
    await window.api.clearCache();
    showNotification('Cache vidé avec succès', 'success');
    updateCacheSize();
  } catch (error) {
    console.error('Erreur lors du vidage du cache:', error);
    showNotification('Erreur lors du vidage du cache', 'error');
  }
}

/**
 * Met à jour l'affichage de la taille du cache
 */
async function updateCacheSize() {
  try {
    const size = await window.api.getCacheSize();
    const cacheSizeElement = document.getElementById('cache-size');
    if (cacheSizeElement) {
      cacheSizeElement.textContent = formatSize(size);
    }
  } catch (error) {
    console.error('Erreur lors de la récupération de la taille du cache:', error);
  }
}

/**
 * Vérifie les mises à jour disponibles
 */
async function checkForUpdates() {
  try {
    const checkUpdatesBtn = document.getElementById('check-updates');
    const updateStatusElement = document.getElementById('update-status');
    
    if (checkUpdatesBtn) {
      // Désactiver le bouton et afficher un état "en cours"
      checkUpdatesBtn.disabled = true;
      checkUpdatesBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Vérification...';
    }
    
    if (updateStatusElement) {
      updateStatusElement.textContent = 'Vérification des mises à jour...';
    }
    
    const updateResult = await window.api.checkForUpdates();
    
    if (checkUpdatesBtn) {
      checkUpdatesBtn.disabled = false;
      checkUpdatesBtn.innerHTML = 'Vérifier les mises à jour';
    }
    
    if (updateStatusElement) {
      if (updateResult.available) {
        updateStatusElement.textContent = `Mise à jour disponible: v${updateResult.version}`;
        updateStatusElement.classList.add('text-green-600');
        updateStatusElement.classList.remove('text-gray-500');
      } else {
        updateStatusElement.textContent = 'Aucune mise à jour disponible';
        updateStatusElement.classList.remove('text-green-600');
        updateStatusElement.classList.add('text-gray-500');
      }
    }
  } catch (error) {
    console.error('Erreur lors de la vérification des mises à jour:', error);
    
    const checkUpdatesBtn = document.getElementById('check-updates');
    const updateStatusElement = document.getElementById('update-status');
    
    if (checkUpdatesBtn) {
      checkUpdatesBtn.disabled = false;
      checkUpdatesBtn.innerHTML = 'Vérifier les mises à jour';
    }
    
    if (updateStatusElement) {
      updateStatusElement.textContent = 'Erreur lors de la vérification des mises à jour';
      updateStatusElement.classList.remove('text-green-600');
      updateStatusElement.classList.add('text-red-500');
    }
  }
}

/**
 * Définit la taille de police de l'interface
 * @param {number} sizePercent - Pourcentage de taille (90-110)
 */
function setFontSize(sizePercent) {
  try {
    document.documentElement.style.fontSize = `${sizePercent}%`;
    window.api.setFontSize(sizePercent);
  } catch (error) {
    console.error('Erreur lors du changement de taille de police:', error);
  }
}

/**
 * Affiche une notification à l'utilisateur
 * @param {string} message - Message à afficher
 * @param {string} type - Type de notification ('success', 'error', 'info')
 */
function showNotification(message, type = 'info') {
  // Créer l'élément de notification
  const notification = document.createElement('div');
  notification.className = 'fixed bottom-4 right-4 px-4 py-2 rounded-md shadow-lg transform transition-all duration-500 translate-y-20 opacity-0';
  
  // Définir la couleur en fonction du type
  if (type === 'success') {
    notification.classList.add('bg-green-100', 'text-green-800', 'border-l-4', 'border-green-500');
  } else if (type === 'error') {
    notification.classList.add('bg-red-100', 'text-red-800', 'border-l-4', 'border-red-500');
  } else {
    notification.classList.add('bg-blue-100', 'text-blue-800', 'border-l-4', 'border-blue-500');
  }
  
  notification.textContent = message;
  
  // Ajouter la notification au document
  document.body.appendChild(notification);
  
  // Afficher la notification avec une animation
  setTimeout(() => {
    notification.classList.remove('translate-y-20', 'opacity-0');
  }, 10);
  
  // Masquer et supprimer la notification après 3 secondes
  setTimeout(() => {
    notification.classList.add('translate-y-20', 'opacity-0');
    setTimeout(() => {
      notification.remove();
    }, 500);
  }, 3000);
}

/**
 * Formate une taille en octets en format lisible
 * @param {number} bytes - Taille en octets
 * @returns {string} - Taille formatée
 */
function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}
