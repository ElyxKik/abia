/**
 * Module de gestion de l'agent Document
 * Ce module contient les fonctions nécessaires pour gérer l'agent Document
 * qui permet d'analyser des fichiers PDF, DOCX, etc. et de poser des questions sur le contenu.
 */

document.addEventListener('DOMContentLoaded', () => {
  initDocumentAgent();
});

// Utilise la fonction addOrUpdateAgentChatMessage de agent-utils.js

/**
 * Initialise l'agent Document
 */
function initDocumentAgent() {
  const fileUpload = document.getElementById('doc-file-upload');
  const filePreview = document.getElementById('doc-file-preview');
  const filename = document.getElementById('doc-filename');
  const filesize = document.getElementById('doc-filesize');
  const fileRemove = document.getElementById('doc-file-remove');
  const analyzeBtn = document.getElementById('doc-analyze-btn');
  const question = document.getElementById('doc-question');
  const results = document.getElementById('doc-results');
  const resultsContent = document.getElementById('doc-results-content');
  
  if (!fileUpload || !filePreview || !filename || !filesize || !fileRemove || !analyzeBtn || !question || !results || !resultsContent) {
    console.error('Éléments de l\'agent Document non trouvés');
    return;
  }
  
  // Gestionnaire d'événement pour le téléchargement de fichier
  fileUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Vérifier l'extension du fichier
    const validExtensions = ['.pdf', '.docx', '.doc', '.txt'];
    const extension = '.' + file.name.split('.').pop().toLowerCase();
    if (!validExtensions.includes(extension)) {
      alert('Veuillez sélectionner un document valide (.pdf, .docx, .doc, .txt)');
      fileUpload.value = '';
      return;
    }
    
    // Déterminer l'icône et la couleur en fonction de l'extension
    let iconClass = 'fa-file-pdf';
    let bgColor = 'bg-red-600';
    let extensionColor = 'text-white';
    
    if (['.docx', '.doc'].includes(extension)) {
      iconClass = 'fa-file-word';
      bgColor = 'bg-blue-600';
    } else if (['.txt'].includes(extension)) {
      iconClass = 'fa-file-alt';
      bgColor = 'bg-gray-600';
    }
    
    // Ajouter une animation d'upload dans la vue agent (similaire à celle du chat)
    const uploadContainer = document.getElementById('doc-upload-animation');
    if (!uploadContainer) {
      // Créer un conteneur pour l'animation si nécessaire
      const newUploadContainer = document.createElement('div');
      newUploadContainer.id = 'doc-upload-animation';
      newUploadContainer.className = 'my-4 w-full max-w-md';
      
      // Insérer après la prévisualisation du fichier
      if (filePreview && filePreview.parentNode) {
        filePreview.parentNode.insertBefore(newUploadContainer, filePreview.nextSibling);
      }
      
      // Animation de l'importation du fichier
      newUploadContainer.innerHTML = `
        <div class="file-upload-animation flex items-center p-2 rounded-lg border border-gray-200 dark:border-gray-700 mb-2 w-full">
          <div class="${bgColor} rounded-md w-10 h-10 flex items-center justify-center flex-shrink-0 text-white mr-3">
            <i class="fas ${iconClass}"></i>
          </div>
          <div class="flex-grow">
            <p class="text-sm font-medium truncate mb-1" title="${file.name}">${file.name}</p>
            <div class="relative h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div class="upload-progress absolute left-0 top-0 h-full bg-primary-500 rounded-full w-0 transition-all duration-1000"></div>
            </div>
          </div>
          <div class="ml-3 flex-shrink-0 ${bgColor} rounded-md px-2 py-1 ${extensionColor} text-xs font-bold uppercase">
            ${extension.substring(1)}
          </div>
        </div>
      `;
      
      // Animation de la barre de progression
      const progressBar = newUploadContainer.querySelector('.upload-progress');
      
      // Simuler la progression de l'upload
      setTimeout(() => { progressBar.style.width = '30%'; }, 300);
      setTimeout(() => { progressBar.style.width = '60%'; }, 800);
      setTimeout(() => { progressBar.style.width = '85%'; }, 1300);
      setTimeout(() => { 
        progressBar.style.width = '100%'; 
        
        // Une fois le téléchargement terminé, remplacer l'animation par un message de confirmation
        setTimeout(() => {
          const fileUploadAnimation = newUploadContainer.querySelector('.file-upload-animation');
          fileUploadAnimation.innerHTML = `
            <div class="${bgColor} rounded-md w-10 h-10 flex items-center justify-center flex-shrink-0 text-white mr-3">
              <i class="fas ${iconClass}"></i>
            </div>
            <div class="flex-grow">
              <p class="text-sm font-medium truncate mb-1" title="${file.name}">${file.name}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">${window.agentUtils.formatFileSize(file.size)} - Importé avec succès</p>
            </div>
            <div class="ml-3 flex-shrink-0 bg-green-500 rounded-md px-2 py-1 text-white text-xs flex items-center">
              <i class="fas fa-check mr-1"></i> OK
            </div>
          `;
        }, 500);
      }, 1800);
    }
    
    // Afficher l'aperçu du fichier
    filename.textContent = file.name;
    filesize.textContent = window.agentUtils.formatFileSize(file.size);
    filePreview.classList.remove('hidden');
    
    // Activer le bouton d'analyse
    analyzeBtn.disabled = false;
  });
  
  // Gestionnaire d'événement pour supprimer le fichier
  fileRemove.addEventListener('click', () => {
    fileUpload.value = '';
    filePreview.classList.add('hidden');
    analyzeBtn.disabled = true;
    results.classList.add('hidden');
    
    // Supprimer l'animation d'upload si elle existe
    const uploadAnimation = document.getElementById('doc-upload-animation');
    if (uploadAnimation) {
      uploadAnimation.remove();
    }
  });
  
  // Gestionnaire d'événement pour analyser le document
  analyzeBtn.addEventListener('click', async () => {
    const file = fileUpload.files[0];
    
    if (!file) {
      alert('Veuillez d\'abord sélectionner un document');
      return;
    }
    
    const userQuestion = question.value.trim() || 'Analyser ce document et extraire les points clés';
    
    // Afficher le message de patience standard dans le chat principal
    const processingMessageId = window.agentUtils.showFileProcessingMessage('document');
    
    // Simuler une analyse en cours
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Analyse en cours...';
    results.classList.add('hidden');
    
    try {
      // Obtenir le chemin réel du fichier sur le disque
      const filePath = file.path;
      if (!filePath) {
        throw new Error('Impossible d\'accéder au chemin du fichier. Veuillez réessayer.');
      }
      
      console.log(`Analyse du document: ${filePath} avec la question: ${userQuestion}`);
      
      // Appeler l'API pour analyser le document via l'agent Document
      const response = await window.api.processDocumentWithActions(filePath, userQuestion);
      
      // Afficher le message de l'agent dans le chat principal avec les actions contextuelles
      if (response && !response.error) {
        // Supprimer le message de traitement en cours
        window.agentUtils.removeProcessingMessage(processingMessageId);
        
        // Ajouter le message avec les actions contextuelles
        const aiMessageOptions = {
          type: 'ai',
          content: response.text,
          actions: response.actions || [],
          fileInfo: {
            name: file.name,
            size: file.size,
            path: filePath
          }
        };
        
        window.agentUtils.addOrUpdateAgentChatMessage(aiMessageOptions);
        
        // Afficher également le résultat dans la section résultats
        resultsContent.innerHTML = `<div class="markdown-content">${response.text}</div>`;
        results.classList.remove('hidden');
      } else {
        // Gérer l'erreur
        console.error('Erreur lors de l\'analyse du document:', response?.error || 'Réponse invalide');
        
        // Supprimer le message de traitement en cours
        window.agentUtils.removeProcessingMessage(processingMessageId);
        
        // Afficher l'erreur dans le chat
        const errorMessage = response?.error || 'Une erreur est survenue lors de l\'analyse du document.';
        window.agentUtils.addOrUpdateAgentChatMessage({
          type: 'ai',
          content: `⚠️ ${errorMessage}`,
          error: true
        });
        
        // Afficher également l'erreur dans la section résultats
        resultsContent.innerHTML = `<div class="p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md">
          <p>⚠️ ${errorMessage}</p>
          <p class="mt-2 text-sm">Veuillez réessayer ou utiliser un document différent.</p>
        </div>`;
        results.classList.remove('hidden');
      }
    } catch (error) {
      console.error('Exception lors de l\'analyse du document:', error);
      
      // Supprimer le message de traitement en cours
      window.agentUtils.removeProcessingMessage(processingMessageId);
      
      // Afficher l'erreur dans le chat
      window.agentUtils.addOrUpdateAgentChatMessage({
        type: 'ai',
        content: `⚠️ Une erreur est survenue : ${error.message}`,
        error: true
      });
      
      // Afficher également l'erreur dans la section résultats
      resultsContent.innerHTML = `<div class="p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md">
        <p>⚠️ Une erreur est survenue : ${error.message}</p>
        <p class="mt-2 text-sm">Veuillez réessayer ou utiliser un document différent.</p>
      </div>`;
      results.classList.remove('hidden');
    } finally {
      // Réinitialiser le bouton d'analyse
      analyzeBtn.disabled = false;
      analyzeBtn.innerHTML = '<i class="fas fa-search-plus mr-2"></i> Analyser le document';
    }
  });
}

// Exposer l'initialisation pour pouvoir l'appeler depuis d'autres modules
window.documentAgent = {
  init: initDocumentAgent
};
