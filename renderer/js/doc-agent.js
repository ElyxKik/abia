/**
 * Module de gestion de l'agent Documents
 * Ce module contient les fonctions nécessaires pour gérer l'agent Documents
 * qui permet d'analyser des documents PDF ou texte et de poser des questions sur leur contenu.
 */

document.addEventListener('DOMContentLoaded', () => {
  initDocAgent();
});

/**
 * Initialise l'agent Documents
 */
function initDocAgent() {
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
    console.error('Éléments de l\'agent Documents non trouvés');
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
    
    // Afficher l'aperçu du fichier
    filename.textContent = file.name;
    filesize.textContent = formatFileSize(file.size);
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
  });
  
  // Gestionnaire d'événement pour l'analyse du document
  analyzeBtn.addEventListener('click', async () => {
    const file = fileUpload.files[0];
    const questionText = question.value.trim();
    
    if (!file) {
      alert('Veuillez d\'abord sélectionner un document');
      return;
    }
    
    if (!questionText) {
      alert('Veuillez poser une question sur le document');
      return;
    }
    
    // Afficher le message de patience standard dans le chat principal
    const processingMessageId = window.agentUtils.showFileProcessingMessage('document');
    
    // Simuler une analyse en cours
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Analyse en cours...';
    results.classList.add('hidden');
    
    // S'assurer que le popup de chargement ne s'affiche pas
    const processingAnimation = document.getElementById('processing-animation');
    if (processingAnimation) {
      processingAnimation.style.display = 'none';
    }
    
    try {
      // Obtenir le chemin réel du fichier sur le disque
      const filePath = file.path;
      if (!filePath) {
        throw new Error('Impossible d\'accéder au chemin du fichier. Veuillez réessayer.');
      }
      
      console.log(`Traitement du document: ${filePath} avec la question: ${questionText}`);
      
      // Appel réel à l'API Electron pour traiter le document
      const response = await window.api.processDocument(filePath, questionText);
      
      // Vérifier si la réponse contient une erreur
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Formater la réponse pour l'affichage
      const analysisResultHtml = `
        <p>Analyse du document <strong>${file.name}</strong> basée sur la question :</p>
        <blockquote class="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg my-3">${questionText}</blockquote>
        <div class="analysis-result">
          ${response.content || 'Aucun résultat disponible'}
        </div>
      `;
      
      // Mettre à jour le message dans le chat principal avec les résultats
      window.agentUtils.addOrUpdateAgentChatMessage(analysisResultHtml, processingMessageId, false);
      
      // Afficher également les résultats dans la section de l'agent Document
      resultsContent.innerHTML = analysisResultHtml;
      results.classList.remove('hidden');
    } catch (error) {
      console.error('Erreur lors du traitement du document:', error);
      
      // Afficher l'erreur dans le chat principal
      const errorMessage = `
        <p>Une erreur est survenue lors du traitement du document :</p>
        <p class="text-red-500">${error.message || 'Erreur inconnue'}</p>
      `;
      window.agentUtils.addOrUpdateAgentChatMessage(errorMessage, processingMessageId, false);
      
      // Afficher l'erreur dans la section de l'agent Document
      resultsContent.innerHTML = errorMessage;
      results.classList.remove('hidden');
    } finally {
      // Réactiver le bouton d'analyse
      analyzeBtn.disabled = false;
      analyzeBtn.innerHTML = '<i class="fas fa-search-plus mr-2"></i> Analyser le document';
    }
  });
}

// Utilise la fonction formatFileSize de agent-utils.js

// Exporter les fonctions pour les rendre disponibles dans d'autres modules
window.docAgent = {
  init: initDocAgent
};
