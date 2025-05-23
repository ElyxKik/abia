/**
 * Agent de Traduction - Gère la traduction de texte et de documents
 * Suit le système standardisé d'étapes de traitement pour tous les agents
 */

// Définir les fonctions d'étapes de traitement standardisées
// Variable pour stocker l'instance des étapes de traitement du document
let documentProcessingSteps = null;

/**
 * Démarre une étape de traitement
 * @param {string} agentType - Type d'agent (uniquement 'translation-document' est supporté)
 * @param {string} stepId - ID de l'étape
 * @param {string} message - Message à afficher
 */
function startProcessingStep(agentType, stepId, message) {
  console.log(`Démarrage de l'étape ${stepId} pour ${agentType} avec message: ${message}`);
  
  // Vérifier que le module agentProcessingSteps est disponible
  if (!window.agentProcessingSteps) {
    console.error('Module agentProcessingSteps non disponible');
    return;
  }
  
  // Créer l'instance des étapes de traitement si nécessaire
  if (agentType === 'translation-document' && !documentProcessingSteps) {
    const containerId = 'translation-document-processing-container';
    // Créer un conteneur s'il n'existe pas
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      container.className = 'mb-4';
      const documentSteps = document.getElementById('translation-document-steps');
      if (documentSteps && documentSteps.parentNode) {
        documentSteps.parentNode.insertBefore(container, documentSteps);
      }
    }
    documentProcessingSteps = window.agentProcessingSteps.createProcessingSteps('Document', containerId);
  }
  
  // Mettre à jour l'étape actuelle
  const steps = agentType === 'translation-text' ? textProcessingSteps : documentProcessingSteps;
  if (steps) {
    const mappedStepId = mapStepId(stepId);
    steps.setCurrentStep(mappedStepId, message);
  }
}

/**
 * Complète une étape de traitement
 * @param {string} agentType - Type d'agent ('translation-text' ou 'translation-document')
 * @param {string} stepId - ID de l'étape
 */
function completeProcessingStep(agentType, stepId) {
  console.log(`Complétion de l'étape ${stepId} pour ${agentType}`);
  
  // Vérifier que le module agentProcessingSteps est disponible
  if (!window.agentProcessingSteps) {
    console.error('Module agentProcessingSteps non disponible');
    return;
  }
  
  // Mettre à jour l'étape comme complétée
  const steps = documentProcessingSteps;
  if (steps) {
    const mappedStepId = mapStepId(stepId);
    steps.updateStep(mappedStepId, 'completed');
  }
}

/**
 * Marque une étape de traitement comme échouée
 * @param {string} agentType - Type d'agent ('translation-text' ou 'translation-document')
 * @param {string} message - Message d'erreur
 */
function failProcessingStep(agentType, message) {
  console.log(`Échec du traitement pour ${agentType} avec message: ${message}`);
  
  // Vérifier que le module agentProcessingSteps est disponible
  if (!window.agentProcessingSteps) {
    console.error('Module agentProcessingSteps non disponible');
    return;
  }
  
  // Marquer comme erreur
  const steps = agentType === 'translation-text' ? textProcessingSteps : documentProcessingSteps;
  if (steps) {
    steps.setError(message);
  }
}

/**
 * Affiche une erreur de traitement
 * @param {string} title - Titre de l'erreur
 * @param {string} message - Message d'erreur
 */
function showProcessingError(title, message) {
  console.error(`Erreur: ${title} - ${message}`);
  
  // Créer une notification d'erreur
  const notification = document.createElement('div');
  notification.className = 'notification error';
  notification.innerHTML = `
    <div class="notification-content">
      <h3>${title}</h3>
      <p>${message}</p>
    </div>
    <button class="notification-close"><i class="fas fa-times"></i></button>
  `;
  
  // Ajouter la notification au conteneur
  const notificationsContainer = document.getElementById('notifications-container');
  if (notificationsContainer) {
    notificationsContainer.appendChild(notification);
    
    // Configurer le bouton de fermeture
    const closeButton = notification.querySelector('.notification-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        notification.remove();
      });
    }
    
    // Supprimer automatiquement après 5 secondes
    setTimeout(() => {
      notification.remove();
    }, 5000);
  } else {
    // Fallback: utiliser une alerte si le conteneur n'est pas disponible
    alert(`${title}: ${message}`);
  }
}

/**
 * Convertit les IDs d'étapes utilisés dans l'agent de traduction
 * vers les IDs d'étapes standardisés
 * @param {string} stepId - ID de l'étape dans l'agent de traduction
 * @returns {string} - ID de l'étape standardisé
 */
function mapStepId(stepId) {
  const mapping = {
    'Initialisation': 'initialization',
    'Prétraitement': 'preprocessing',
    'Traitement': 'processing',
    'Post-traitement': 'postprocessing',
    'Finalisation': 'completion',
    'Erreur': 'error'
  };
  
  return mapping[stepId] || stepId;
}

// État de l'agent de traduction
const translationAgentState = {
  sourceLanguage: 'auto',
  targetLanguage: 'en',
  sourceText: '',
  file: null,
  isProcessing: false
};

/**
 * Initialise l'agent de traduction
 */
function initTranslationAgent() {
  console.log('Initialisation de l\'agent de traduction...');
  
  // Récupérer les éléments du DOM
  const fileUpload = document.getElementById('translation-file-upload');
  const filePreview = document.getElementById('translation-file-preview');
  const fileName = document.getElementById('translation-filename');
  const fileSize = document.getElementById('translation-filesize');
  const fileRemoveButton = document.getElementById('translation-file-remove');
  const documentTranslateButton = document.getElementById('translation-document-translate-btn');
  
  const resultsContainer = document.getElementById('translation-results');
  const resultsContent = document.getElementById('translation-results-content');
  const downloadButton = document.getElementById('translation-download-btn');
  
  // Configurer l'écouteur d'événements pour les mises à jour de progression
  window.api.onTranslationProgress((progress) => {
    console.log('Progression de la traduction reçue:', progress);
    updateDocumentTranslationProgress(progress);
    
    // Si la progression est terminée (100%), mettre à jour l'interface
    if (progress.step === 'complete' || progress.progress === 100) {
      // Réactiver le bouton de traduction et restaurer son apparence
      if (documentTranslateButton) {
        documentTranslateButton.disabled = false;
        documentTranslateButton.innerHTML = '<i class="fas fa-language mr-2"></i> Traduire le document';
        documentTranslateButton.classList.remove('bg-primary-400', 'cursor-wait');
      }
    }
  });
  
  // Ajouter les écouteurs d'événements
  if (fileUpload) {
    fileUpload.addEventListener('change', (event) => {
      handleFileUpload(event);
    });
  }
  
  if (fileRemoveButton) {
    fileRemoveButton.addEventListener('click', () => {
      removeFile();
    });
  }
  
  if (documentTranslateButton) {
    documentTranslateButton.addEventListener('click', () => {
      translateDocument();
    });
  }
  
  if (downloadButton) {
    downloadButton.addEventListener('click', () => {
      downloadTranslatedDocument();
    });
  }
  
  // Support du glisser-déposer pour les fichiers
  setupDragAndDrop();
  
  console.log('Agent de traduction initialisé avec succès');
}

/**
 * Configure le glisser-déposer pour les fichiers
 */
function setupDragAndDrop() {
  const dropZone = document.querySelector('label[for="translation-file-upload"]');
  if (!dropZone) return;
  
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
  });
  
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, highlight, false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, unhighlight, false);
  });
  
  function highlight() {
    dropZone.classList.add('bg-neutral-50', 'dark:bg-neutral-800/50');
  }
  
  function unhighlight() {
    dropZone.classList.remove('bg-neutral-50', 'dark:bg-neutral-800/50');
  }
  
  dropZone.addEventListener('drop', handleDrop, false);
  
  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
      const fileUpload = document.getElementById('translation-file-upload');
      if (fileUpload) {
        fileUpload.files = files;
        const event = new Event('change', { bubbles: true });
        fileUpload.dispatchEvent(event);
      }
    }
  }
}

/**
 * Gère l'upload de fichier
 * @param {Event} event - Événement de changement de fichier
 */
function handleFileUpload(event) {
  const fileUpload = event.target;
  const filePreview = document.getElementById('translation-file-preview');
  const fileName = document.getElementById('translation-filename');
  const fileSize = document.getElementById('translation-filesize');
  
  if (fileUpload.files.length > 0) {
    const file = fileUpload.files[0];
    
    // Vérifier le type de fichier
    const acceptedTypes = ['.pdf', '.docx', '.doc', '.txt'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!acceptedTypes.includes(fileExtension)) {
      showProcessingError('Type de fichier non supporté', `Les types de fichiers supportés sont: ${acceptedTypes.join(', ')}`);
      fileUpload.value = '';
      return;
    }
    
    // Vérifier la taille du fichier (max 10 MB)
    const maxSize = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxSize) {
      showProcessingError('Fichier trop volumineux', 'La taille maximale est de 10 MB');
      fileUpload.value = '';
      return;
    }
    
    // Mettre à jour l'état
    translationAgentState.file = file;
    
    // Mettre à jour l'interface
    if (fileName) fileName.textContent = file.name;
    if (fileSize) fileSize.textContent = formatFileSize(file.size);
    if (filePreview) filePreview.classList.remove('hidden');
  }
}

/**
 * Formate la taille du fichier en unités lisibles
 * @param {number} bytes - Taille en octets
 * @returns {string} - Taille formatée
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Supprime le fichier sélectionné
 */
function removeFile() {
  const fileUpload = document.getElementById('translation-file-upload');
  const filePreview = document.getElementById('translation-file-preview');
  
  if (fileUpload) fileUpload.value = '';
  if (filePreview) filePreview.classList.add('hidden');
  
  translationAgentState.file = null;
}

/**
 * Traduit le document sélectionné
 * Suit le système standardisé d'étapes de traitement
 */
async function translateDocument() {
  const documentTranslateButton = document.getElementById('translation-document-translate-btn');
  const resultsContainer = document.getElementById('translation-results');
  const resultsContent = document.getElementById('translation-results-content');
  const downloadButton = document.getElementById('translation-download-btn');
  const stepsContainer = document.getElementById('translation-document-steps');
  
  // Vérifier si un fichier est sélectionné
  if (!translationAgentState.file) {
    showProcessingError('Aucun fichier sélectionné', 'Veuillez sélectionner un fichier à traduire');
    return;
  }
  
  // Récupérer les langues source et cible spécifiques au document
  const sourceLanguage = document.getElementById('translation-doc-source-lang').value;
  const targetLanguage = document.getElementById('translation-doc-target-lang').value;
  
  // Vérifier que les langues sont différentes
  if (sourceLanguage === targetLanguage && sourceLanguage !== 'auto') {
    showProcessingError('Langues identiques', 'Les langues source et cible sont identiques');
    return;
  }
  
  // Désactiver les contrôles pendant le traitement et montrer un indicateur visuel
  if (documentTranslateButton) {
    documentTranslateButton.disabled = true;
    documentTranslateButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Traduction en cours...';
    documentTranslateButton.classList.add('bg-primary-400', 'cursor-wait');
  }
  
  // Masquer les résultats précédents s'ils sont affichés
  if (resultsContainer && !resultsContainer.classList.contains('hidden')) {
    resultsContainer.classList.add('hidden');
  }
  
  // Afficher le conteneur des étapes
  if (stepsContainer && stepsContainer.classList.contains('hidden')) {
    stepsContainer.classList.remove('hidden');
  }
  
  try {
    // Mettre à jour l'état
    translationAgentState.isProcessing = true;
    translationAgentState.sourceLanguage = sourceLanguage;
    translationAgentState.targetLanguage = targetLanguage;
    
    // Initialiser les étapes de progression
    updateDocumentTranslationProgress({
      step: 'initialisation',
      progress: 0,
      message: 'Initialisation du processus de traduction...'
    });

    // Appeler l'API de traduction de document avec DeepL
    const translationResult = await window.api.translateDocument(
      translationAgentState.file.path, // Chemin du fichier
      translationAgentState.targetLanguage,
      translationAgentState.sourceLanguage
    );

    if (!translationResult.success) {
      throw new Error(translationResult.error || 'Erreur lors de la traduction du document');
    }

    // Sauvegarder le résultat pour le téléchargement
    translationAgentState.translatedDocumentPath = translationResult.outputPath;
    translationAgentState.translatedDocumentName = translationResult.fileName;

    // Préparer l'affichage des résultats
    if (resultsContent) {
      resultsContent.innerHTML = `
        <div class="flex items-center justify-center flex-col p-6">
          <i class="fas fa-check-circle text-green-500 text-4xl mb-4"></i>
          <h3 class="text-xl font-semibold mb-2">Traduction terminée</h3>
          <p class="text-center mb-4">Votre document a été traduit avec succès de ${getLanguageName(translationAgentState.sourceLanguage)} vers ${getLanguageName(translationAgentState.targetLanguage)}.</p>
          <div class="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-4 w-full max-w-md">
            <div class="flex items-center">
              <i class="fas fa-file-alt text-primary-500 mr-3"></i>
              <div>
                <p class="font-medium">${translationAgentState.translatedDocumentName}</p>
                <p class="text-xs text-neutral-500 dark:text-neutral-400">Prêt à télécharger</p>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // Activer le bouton de téléchargement
    if (downloadButton) {
      downloadButton.disabled = false;
    }

    // Ne pas afficher les résultats immédiatement
    // L'affichage sera géré par la fonction updateDocumentTranslationProgress
    // lorsque la progression atteindra 100%

    // Terminer le processus
    translationAgentState.isProcessing = false;

    // Réactiver le bouton de traduction
    if (documentTranslateButton) documentTranslateButton.disabled = false;

    // Ajouter la traduction à l'historique
    try {
      saveTranslationToHistory({
        type: 'document',
        sourceLanguage: translationAgentState.sourceLanguage,
        targetLanguage: translationAgentState.targetLanguage,
        fileName: translationAgentState.file.name,
        translatedFileName: translationAgentState.translatedDocumentName,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Impossible d\'ajouter la traduction à l\'historique:', e);
    }
  } catch (error) {
    console.error('Erreur lors de la traduction du document:', error);
    
    // Mettre à jour l'interface pour indiquer l'erreur
    updateDocumentTranslationProgress({
      step: 'traitement', // Reste à l'étape en cours lors de l'erreur
      progress: 0,
      message: 'Erreur: ' + (error.message || 'Une erreur est survenue')
    });
    
    // Afficher l'erreur
    showProcessingError('Erreur de traduction', error.message || 'Une erreur est survenue lors de la traduction du document');
    
    // Réinitialiser l'état
    translationAgentState.isProcessing = false;
    
    // Réactiver le bouton de traduction et restaurer son apparence
    if (documentTranslateButton) {
      documentTranslateButton.disabled = false;
      documentTranslateButton.innerHTML = '<i class="fas fa-language mr-2"></i> Traduire le document';
      documentTranslateButton.classList.remove('bg-primary-400', 'cursor-wait');
    }
    
    // Supprimer l'écouteur d'événements de progression pour éviter les fuites de mémoire
    window.api.removeAllListeners('translation-progress');
    // Supprimer l'écouteur d'événement de progression
    window.api.removeAllListeners('translation-progress');
  }
}

/**
 * Met à jour la progression de la traduction du document
 * @param {Object} progressData - Données de progression
 */
function updateDocumentTranslationProgress(progressData) {
  console.log('Mise à jour de la progression:', progressData);
  const progressElement = document.getElementById('translation-document-progress');
  const stepsContainer = document.getElementById('translation-document-steps');
  
  // Afficher le conteneur des étapes s'il est caché
  if (stepsContainer && stepsContainer.classList.contains('hidden')) {
    stepsContainer.classList.remove('hidden');
  }
  
  // Mettre à jour la barre de progression
  if (progressElement && progressData.progress !== undefined) {
    // S'assurer que la progression est un nombre entre 0 et 100
    const progress = Math.min(Math.max(0, parseInt(progressData.progress) || 0), 100);
    progressElement.style.width = `${progress}%`;
    
    // Afficher le pourcentage dans la barre de progression si elle est assez large
    if (progress > 10) {
      progressElement.textContent = `${progress}%`;
    } else {
      progressElement.textContent = '';
    }
    
    // Si la progression est terminée, mettre à jour l'interface
    if (progress === 100) {
      // Marquer toutes les étapes comme complétées
      markPreviousStepsAsCompleted('finalisation');
      
      // Masquer la section de progression après un court délai pour permettre à l'utilisateur de voir la progression complète
      setTimeout(() => {
        // Masquer la section de progression
        if (stepsContainer) {
          stepsContainer.classList.add('hidden');
        }
        
        // Afficher la section de résultats
        const resultsContainer = document.getElementById('translation-results');
        if (resultsContainer) {
          resultsContainer.classList.remove('hidden');
        }
      }, 1000); // Délai de 1 seconde
    }
  }
  
  // Mettre à jour le statut de l'étape en cours
  if (progressData.step) {
    const step = progressData.step;
    let stepElement;
    let statusElement;
    
    switch (step) {
      case 'upload':
      case 'initialisation':
        stepElement = document.getElementById('translation-step-initialisation');
        statusElement = document.getElementById('translation-step-initialisation-status');
        break;
      case 'pretraitement':
        stepElement = document.getElementById('translation-step-pretraitement');
        statusElement = document.getElementById('translation-step-pretraitement-status');
        break;
      case 'translation':
      case 'traitement':
        stepElement = document.getElementById('translation-step-traitement');
        statusElement = document.getElementById('translation-step-traitement-status');
        break;
      case 'download':
      case 'post-traitement':
        stepElement = document.getElementById('translation-step-posttraitement');
        statusElement = document.getElementById('translation-step-posttraitement-status');
        break;
      case 'complete':
      case 'finalisation':
        stepElement = document.getElementById('translation-step-finalisation');
        statusElement = document.getElementById('translation-step-finalisation-status');
        break;
    }
    
    // Mettre à jour l'indicateur visuel de l'étape
    if (stepElement) {
      // Marquer les étapes précédentes comme complétées
      markPreviousStepsAsCompleted(step);
      
      // Mettre en surbrillance l'étape en cours
      const indicator = stepElement.querySelector('div');
      if (indicator) {
        indicator.classList.remove('bg-neutral-200', 'dark:bg-neutral-700');
        indicator.classList.add('bg-primary-500');
      }
    }
    
    // Mettre à jour le message de statut
    if (statusElement && progressData.message) {
      statusElement.textContent = progressData.message;
    }
  }
}

/**
 * Marque les étapes précédentes comme complétées
 * @param {string} currentStep - Étape actuelle
 */
function markPreviousStepsAsCompleted(currentStep) {
  const steps = ['initialisation', 'pretraitement', 'traitement', 'post-traitement', 'finalisation'];
  const currentIndex = steps.findIndex(step => {
    return currentStep === step || 
           (currentStep === 'upload' && step === 'initialisation') ||
           (currentStep === 'translation' && step === 'traitement') ||
           (currentStep === 'download' && step === 'post-traitement') ||
           (currentStep === 'complete' && step === 'finalisation');
  });
  
  if (currentIndex > 0) {
    // Marquer toutes les étapes précédentes comme complétées
    for (let i = 0; i < currentIndex; i++) {
      const stepElement = document.getElementById(`translation-step-${steps[i]}`);
      if (stepElement) {
        const indicator = stepElement.querySelector('div');
        const checkIcon = stepElement.querySelector('i');
        
        if (indicator) {
          indicator.classList.remove('bg-neutral-200', 'dark:bg-neutral-700');
          indicator.classList.add('bg-green-500');
        }
        
        if (checkIcon) {
          checkIcon.classList.remove('opacity-0');
        }
      }
    }
  }
}

/**
 * Télécharge le document traduit
 * Suit le système standardisé d'étapes de traitement
 */
async function downloadTranslatedDocument() {
  const downloadButton = document.getElementById('translation-download-btn');
  
  // Vérifier si le chemin du document traduit est disponible
  if (!translationAgentState.translatedDocumentPath) {
    showProcessingError('Document non disponible', 'Le document traduit n\'est pas disponible pour le téléchargement');
    return;
  }
  
  // Désactiver le bouton pendant le téléchargement
  if (downloadButton) {
    downloadButton.disabled = true;
    const originalText = downloadButton.innerHTML;
    downloadButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Téléchargement...';
    
    try {
      // Mettre à jour l'interface pour indiquer le téléchargement
      updateDocumentTranslationProgress({
        step: 'download',
        progress: 95,
        message: 'Préparation du téléchargement...'
      });
      
      // Ouvrir le dossier contenant le fichier traduit
      await window.api.openFolder(translationAgentState.translatedDocumentPath);
      
      // Mettre à jour l'interface pour indiquer le succès
      updateDocumentTranslationProgress({
        step: 'complete',
        progress: 100,
        message: 'Document téléchargé avec succès!'
      });
      
      // Afficher un message de succès temporaire sur le bouton
      downloadButton.innerHTML = '<i class="fas fa-check mr-2"></i> Document disponible';
      downloadButton.classList.remove('btn-primary');
      downloadButton.classList.add('btn-success');
      
      // Rétablir le bouton après 3 secondes
      setTimeout(() => {
        downloadButton.innerHTML = originalText;
        downloadButton.classList.remove('btn-success');
        downloadButton.classList.add('btn-primary');
        downloadButton.disabled = false;
      }, 3000);
      
      console.log('Document téléchargé avec succès');
    } catch (error) {
      console.error('Erreur lors du téléchargement du document:', error);
      
      // Mettre à jour l'interface pour indiquer l'erreur
      updateDocumentTranslationProgress({
        step: 'download',
        progress: 0,
        message: 'Erreur: ' + (error.message || 'Une erreur est survenue')
      });
      
      // Afficher l'erreur
      showProcessingError('Erreur de téléchargement', error.message || 'Une erreur est survenue lors du téléchargement du document');
      
      // Rétablir le bouton
      downloadButton.innerHTML = originalText;
      downloadButton.disabled = false;
    }
  } else {
    try {
      // Si le bouton n'est pas disponible, essayer quand même d'ouvrir le dossier
      await window.api.openFolder(translationAgentState.translatedDocumentPath);
      console.log('Dossier ouvert avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'ouverture du dossier:', error);
      showProcessingError('Erreur', 'Impossible d\'ouvrir le dossier contenant le fichier traduit');
    }
  }
}

/**
 * Obtient le nom complet d'une langue à partir de son code
 * @param {string} langCode - Code de la langue
 * @returns {string} - Nom complet de la langue
 */
function getLanguageName(langCode) {
  const languages = {
    'auto': 'Détection automatique',
    'fr': 'Français',
    'en': 'Anglais',
    'es': 'Espagnol',
    'de': 'Allemand',
    'it': 'Italien',
    'pt': 'Portugais',
    'nl': 'Néerlandais',
    'ru': 'Russe',
    'zh': 'Chinois',
    'ja': 'Japonais',
    'ar': 'Arabe'
  };
  
  return languages[langCode] || langCode;
}

/**
 * Enregistre une traduction dans l'historique
 * @param {Object} translationData - Données de la traduction à sauvegarder
 */
function saveTranslationToHistory(translationData) {
  // Récupérer l'historique existant ou créer un nouvel historique vide
  let history = JSON.parse(localStorage.getItem('translationHistory') || '[]');
  
  // Ajouter la nouvelle traduction au début de l'historique
  history.unshift(translationData);
  
  // Limiter l'historique à 50 entrées
  if (history.length > 50) {
    history = history.slice(0, 50);
  }
  
  // Sauvegarder l'historique mis à jour
  localStorage.setItem('translationHistory', JSON.stringify(history));
  
  // Mettre à jour l'interface si nécessaire
  updateTranslationHistoryUI();
}

/**
 * Met à jour l'interface utilisateur de l'historique des traductions
 */
function updateTranslationHistoryUI() {
  // Cette fonction peut être implémentée plus tard pour afficher
  // l'historique des traductions dans l'interface utilisateur
  console.log('Historique des traductions mis à jour');
}

// Initialiser l'agent de traduction lorsque le document est chargé
document.addEventListener('DOMContentLoaded', initTranslationAgent);

// Exposer l'agent de traduction globalement
window.translationAgent = {
  init: initTranslationAgent,
  translateDocument,
  downloadTranslatedDocument,
  handleFileUpload,
  removeFile,
  saveTranslationToHistory,
  updateTranslationHistoryUI
};
