/**
 * Module de gestion de l'agent Excel
 * Ce module contient les fonctions nécessaires pour gérer l'agent Excel
 * qui permet d'analyser des fichiers Excel et de poser des questions sur les données.
 */

document.addEventListener('DOMContentLoaded', () => {
  initExcelAgent();
});

/**
 * Initialise l'agent Excel
 */
function initExcelAgent() {
  const fileUpload = document.getElementById('excel-file-upload');
  const filePreview = document.getElementById('excel-file-preview');
  const filename = document.getElementById('excel-filename');
  const filesize = document.getElementById('excel-filesize');
  const fileRemove = document.getElementById('excel-file-remove');
  const analyzeBtn = document.getElementById('excel-analyze-btn');
  const question = document.getElementById('excel-question');
  const results = document.getElementById('excel-results');
  const resultsContent = document.getElementById('excel-results-content');
  
  if (!fileUpload || !filePreview || !filename || !filesize || !fileRemove || !analyzeBtn || !question || !results || !resultsContent) {
    console.error('Éléments de l\'agent Excel non trouvés');
    return;
  }
  
  // Gestionnaire d'événement pour le téléchargement de fichier
  fileUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Vérifier l'extension du fichier
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const extension = '.' + file.name.split('.').pop().toLowerCase();
    if (!validExtensions.includes(extension)) {
      alert('Veuillez sélectionner un fichier Excel valide (.xlsx, .xls, .csv)');
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
  
  // Gestionnaire d'événement pour l'analyse des données
  analyzeBtn.addEventListener('click', () => {
    const file = fileUpload.files[0];
    const questionText = question.value.trim();
    
    if (!file) {
      alert('Veuillez d\'abord sélectionner un fichier Excel');
      return;
    }
    
    if (!questionText) {
      alert('Veuillez poser une question sur vos données');
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
        <p>Analyse du fichier <strong>${file.name}</strong> basée sur la question :</p>
        <blockquote class="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg my-3">${questionText}</blockquote>
        <p>Résultats de l'analyse :</p>
        <ul>
          <li>Les données montrent une tendance à la hausse au cours du dernier trimestre.</li>
          <li>Le produit A a connu la plus forte croissance (23%).</li>
          <li>La région Nord représente 45% des ventes totales.</li>
        </ul>
        <p class="text-sm text-neutral-500 mt-4">Note: Ceci est une démonstration. Dans la version finale, les résultats seront générés par l'IA en fonction de vos données réelles.</p>
      `;
      
      // Réactiver le bouton d'analyse
      analyzeBtn.disabled = false;
      analyzeBtn.innerHTML = '<i class="fas fa-chart-line mr-2"></i> Analyser les données';
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
window.excelAgent = {
  init: initExcelAgent
};
