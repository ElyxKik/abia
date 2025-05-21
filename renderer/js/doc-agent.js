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
  analyzeBtn.addEventListener('click', () => {
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
    
    // Simuler une analyse en cours
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Analyse en cours...';
    results.classList.add('hidden');
    
    // Envoyer le fichier et la question au backend
    const formData = new FormData();
    formData.append('file', file);
    formData.append('question', questionText);
    
    // Simuler un délai de traitement (à remplacer par un appel API réel)
    setTimeout(() => {
      // Afficher les résultats (à remplacer par les résultats réels de l'API)
      resultsContent.innerHTML = `
        <p>Analyse du document <strong>${file.name}</strong> basée sur la question :</p>
        <blockquote class="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg my-3">${questionText}</blockquote>
        <p>Résultats de l'analyse :</p>
        <div class="my-4">
          <h3 class="text-lg font-medium mb-2">Résumé du document</h3>
          <p>Ce document traite principalement des sujets suivants :</p>
          <ul class="list-disc pl-5 mt-2">
            <li>Introduction aux concepts fondamentaux</li>
            <li>Analyse des tendances actuelles</li>
            <li>Recommandations stratégiques</li>
            <li>Perspectives d'avenir</li>
          </ul>
        </div>
        <div class="my-4">
          <h3 class="text-lg font-medium mb-2">Réponse à votre question</h3>
          <p>D'après l'analyse du document, les points clés sont :</p>
          <ol class="list-decimal pl-5 mt-2">
            <li>Le marché connaît une croissance annuelle de 12% depuis 2020.</li>
            <li>Les principaux acteurs ont adopté des stratégies d'innovation pour maintenir leur avantage concurrentiel.</li>
            <li>Les défis réglementaires constituent le principal obstacle à l'expansion.</li>
            <li>Les opportunités de croissance se situent principalement dans les marchés émergents d'Asie et d'Afrique.</li>
          </ol>
        </div>
        <p class="text-sm text-neutral-500 mt-4">Note: Ceci est une démonstration. Dans la version finale, les résultats seront générés par l'IA en fonction de votre document réel.</p>
      `;
      
      // Réactiver le bouton d'analyse
      analyzeBtn.disabled = false;
      analyzeBtn.innerHTML = '<i class="fas fa-search-plus mr-2"></i> Analyser le document';
      results.classList.remove('hidden');
    }, 2000);
  });
}

/**
 * Formate la taille du fichier en unités lisibles
 * @param {number} bytes - Taille en octets
 * @returns {string} Taille formatée
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Exporter les fonctions pour les rendre disponibles dans d'autres modules
window.docAgent = {
  init: initDocAgent
};
