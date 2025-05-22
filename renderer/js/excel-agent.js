/**
 * Module de gestion de l'agent Excel
 * Ce module contient les fonctions nécessaires pour gérer l'agent Excel
 * qui permet d'analyser des fichiers Excel et de poser des questions sur les données.
 */

document.addEventListener('DOMContentLoaded', () => {
  initExcelAgent();
});

// Utilise la fonction addOrUpdateAgentChatMessage de agent-utils.js

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
  
  // Ajouter un bouton pour générer un rapport structuré
  let reportBtn = document.getElementById('excel-report-btn');
  if (!reportBtn) {
    reportBtn = document.createElement('button');
    reportBtn.id = 'excel-report-btn';
    reportBtn.className = 'btn btn-secondary ml-2';
    reportBtn.innerHTML = '<i class="fas fa-file-alt mr-2"></i> Générer un rapport structuré';
    reportBtn.disabled = true;
    
    // Insérer le bouton après le bouton d'analyse
    if (analyzeBtn && analyzeBtn.parentNode) {
      analyzeBtn.parentNode.insertBefore(reportBtn, analyzeBtn.nextSibling);
    }
  }
  
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
    
    // Déterminer l'icône et la couleur en fonction de l'extension
    let iconClass = 'fa-file-excel';
    let bgColor = 'bg-green-600';
    let extensionColor = 'text-white';
    
    // Ajouter une animation d'upload dans la vue agent (similaire à celle du chat)
    const uploadContainer = document.getElementById('excel-upload-animation');
    if (!uploadContainer) {
      // Créer un conteneur pour l'animation si nécessaire
      const newUploadContainer = document.createElement('div');
      newUploadContainer.id = 'excel-upload-animation';
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
    
    // Activer les boutons d'analyse et de rapport
    analyzeBtn.disabled = false;
    reportBtn.disabled = false;
  });
  
  // Gestionnaire d'événement pour supprimer le fichier
  fileRemove.addEventListener('click', () => {
    fileUpload.value = '';
    filePreview.classList.add('hidden');
    analyzeBtn.disabled = true;
    reportBtn.disabled = true;
    results.classList.add('hidden');
  });
  
  // Gestionnaire d'événement pour générer un rapport structuré
  reportBtn.addEventListener('click', async () => {
    const file = fileUpload.files[0];
    
    if (!file) {
      alert('Veuillez d\'abord sélectionner un fichier Excel');
      return;
    }
    
    // Afficher le message de patience standard dans le chat principal
    const processingMessageId = window.agentUtils.showFileProcessingMessage('document Excel (rapport structuré)');
    
    // Simuler une analyse en cours
    reportBtn.disabled = true;
    reportBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Génération en cours...';
    results.classList.add('hidden');
    
    try {
      // Obtenir le chemin réel du fichier sur le disque
      const filePath = file.path;
      if (!filePath) {
        throw new Error('Impossible d\'accéder au chemin du fichier. Veuillez réessayer.');
      }
      
      console.log(`Génération d'un rapport structuré interactif pour le fichier Excel: ${filePath}`);
      
      // Instructions pour générer un rapport structuré
      const instructions = "Générer un rapport structuré avec analyse approfondie de ces données Excel, incluant des visualisations et recommandations";
      
      // Utiliser la nouvelle API processExcelWithActions pour obtenir un résultat avec actions contextuelles
      const response = await window.api.processExcelWithActions(filePath, instructions);
      
      // Afficher le message de l'agent dans le chat principal avec les actions contextuelles
      if (response && !response.error) {
        // Supprimer le message de traitement en cours
        window.agentUtils.removeProcessingMessage(processingMessageId);
        
        // Ajouter le message avec les actions contextuelles
        const aiMessageOptions = {
          type: 'ai',
          content: response.text,
          actions: response.actions || [],
          source: 'Excel Report Agent'
        };
        
        window.agentUtils.addOrUpdateAgentChatMessage(aiMessageOptions);
        
        // Afficher un résumé des résultats dans le panneau de l'agent Excel
        resultsContent.innerHTML = `
          <div class="bg-primary-50 dark:bg-primary-900/30 p-4 rounded-lg">
            <h3 class="text-lg font-semibold mb-2">Rapport généré</h3>
            <p class="mb-4">Un rapport interactif a été généré et est disponible dans la zone de chat avec des options pour le visualiser.</p>
            <div class="flex items-center text-primary-600 dark:text-primary-400">
              <i class="fas fa-check-circle mr-2"></i>
              <span>Actions disponibles: voir le rapport, afficher dans le chat, ou télécharger.</span>
            </div>
          </div>
        `;
        results.classList.remove('hidden');
      } else {
        // Gérer l'erreur de manière plus détaillée
        console.error('Erreur de réponse:', response);
        
        // Supprimer le message de traitement en cours
        window.agentUtils.removeProcessingMessage(processingMessageId);
        
        // Ajouter un message d'erreur plus informatif
        const errorMessage = typeof response.error === 'string' 
          ? response.error 
          : 'Erreur lors de la génération du rapport. Veuillez réessayer.';
          
        const aiMessageOptions = {
          type: 'ai',
          content: `\u274c ${errorMessage}`,
          source: 'Excel Report Agent'
        };
        
        window.agentUtils.addOrUpdateAgentChatMessage(aiMessageOptions);
        
        // Afficher également l'erreur dans le panneau de l'agent
        resultsContent.innerHTML = `
          <div class="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg">
            <h3 class="text-lg font-semibold mb-2 text-red-800 dark:text-red-400">Erreur de génération du rapport</h3>
            <p class="mb-4 text-red-700 dark:text-red-300">${errorMessage}</p>
            <div class="flex items-center text-red-600 dark:text-red-400">
              <i class="fas fa-exclamation-circle mr-2"></i>
              <span>Veuillez vérifier le format du fichier et réessayer.</span>
            </div>
          </div>
        `;
        results.classList.remove('hidden');
      }
      
      // Le reste de la logique est maintenant géré par le nouvel API processExcelWithActions
      // Le message est affiché dans le chat via window.agentUtils.addOrUpdateAgentChatMessage
    } catch (error) {
      console.error('Erreur lors de la génération du rapport structuré:', error);
      
      // Supprimer le message de traitement en cours
      window.agentUtils.removeProcessingMessage(processingMessageId);
      
      // Ajouter un message d'erreur dans le chat principal
      const aiMessageOptions = {
        type: 'ai',
        content: `❌ Erreur lors de la génération du rapport structuré: ${error.message || 'Une erreur inconnue est survenue'}`,
        error: true,
        source: 'Excel Report Agent'
      };
      
      window.agentUtils.addOrUpdateAgentChatMessage(aiMessageOptions);
      
      // Afficher également l'erreur dans la section de résultats
      resultsContent.innerHTML = `
        <div class="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg">
          <h3 class="text-lg font-semibold mb-2 text-red-800 dark:text-red-400">Erreur de génération du rapport</h3>
          <p class="mb-4 text-red-700 dark:text-red-300">${error.message || 'Une erreur inconnue est survenue'}</p>
          <div class="flex items-center text-red-600 dark:text-red-400">
            <i class="fas fa-exclamation-circle mr-2"></i>
            <span>Veuillez vérifier le format du fichier et réessayer.</span>
          </div>
        </div>
      `;
      results.classList.remove('hidden');
    } finally {
      // Réactiver le bouton
      reportBtn.disabled = false;
      reportBtn.innerHTML = '<i class="fas fa-file-alt mr-2"></i> Générer un rapport structuré';
    }
  });
  
  // Gestionnaire d'événement pour l'analyse des données
  analyzeBtn.addEventListener('click', async () => {
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
    
    // Afficher le message de patience standard dans le chat principal
    const processingMessageId = window.agentUtils.showFileProcessingMessage('document Excel');
    
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
      
      console.log(`Traitement du fichier Excel: ${filePath} avec la question: ${questionText}`);
      
      // Appel réel à l'API Electron pour traiter le fichier Excel avec le LLM
      const options = {
        formatType: 'markdown', // Format de sortie préféré pour l'affichage dans le chat
        maxRows: 100,          // Limiter le nombre de lignes pour éviter de surcharger le contexte du LLM
        includeHeaders: true   // Inclure les en-têtes dans les données
      };
      
      // Appel au processus principal via l'API exposée dans preload.js
      const response = await window.api.processExcelWithLLM(filePath, questionText, options);
      
      // Vérifier si la réponse contient une erreur
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Vérifier si la réponse est du Markdown (on le spécifie dans les options comme 'markdown')
      const isMarkdownResponse = options.formatType === 'markdown' && typeof response.content === 'string';
      
      if (isMarkdownResponse) {
        console.log('Détection de contenu Markdown dans la réponse d\'analyse Excel');
        
        // Créer un conteneur pour l'en-tête
        const headerHtml = `
          <div class="excel-analysis-header mb-4">
            <p>Analyse du fichier <strong>${file.name}</strong> basée sur la question :</p>
            <blockquote class="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg my-3">${questionText}</blockquote>
          </div>
        `;
        
        // Mettre à jour le message dans le chat principal
        window.agentUtils.addOrUpdateAgentChatMessage(headerHtml, processingMessageId, false, true);
        
        // Créer un élément div pour le contenu Markdown dans le chat
        const chatMarkdownContainer = document.createElement('div');
        chatMarkdownContainer.id = 'chat-markdown-container-' + Date.now();
        
        // Ajouter ce conteneur au message du chat
        const chatMessage = document.getElementById(processingMessageId);
        if (chatMessage) {
          chatMessage.appendChild(chatMarkdownContainer);
          
          // Rendre le Markdown dans ce conteneur
          window.markdownViewer.render(response.content, chatMarkdownContainer, {
            title: 'Analyse Excel',
            showHeader: true
          });
        }
        
        // Vider le contenu précédent de la section de résultats
        resultsContent.innerHTML = '';
        
        // Ajouter l'en-tête aux résultats
        const headerElement = document.createElement('div');
        headerElement.innerHTML = headerHtml;
        resultsContent.appendChild(headerElement);
        
        // Créer un conteneur pour le Markdown dans la section de résultats
        const resultsMarkdownContainer = document.createElement('div');
        resultsMarkdownContainer.id = 'results-markdown-container-' + Date.now();
        resultsContent.appendChild(resultsMarkdownContainer);
        
        // Rendre le Markdown dans ce conteneur
        window.markdownViewer.render(response.content, resultsMarkdownContainer, {
          title: 'Analyse Excel',
          showHeader: true
        });
        
        results.classList.remove('hidden');
      } else {
        // Format HTML traditionnel pour les réponses non-Markdown
        const analysisResultHtml = `
          <p>Analyse du fichier <strong>${file.name}</strong> basée sur la question :</p>
          <blockquote class="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg my-3">${questionText}</blockquote>
          <div class="analysis-result">
            ${response.content || 'Aucun résultat disponible'}
          </div>
        `;
        
        // Mettre à jour le message dans le chat principal avec les résultats
        window.agentUtils.addOrUpdateAgentChatMessage(analysisResultHtml, processingMessageId, false);
        
        // Afficher également les résultats dans la section de l'agent Excel
        resultsContent.innerHTML = analysisResultHtml;
        results.classList.remove('hidden');
      }
    } catch (error) {
      console.error('Erreur lors du traitement du fichier Excel:', error);
      
      // Afficher l'erreur dans le chat principal
      const errorMessage = `
        <p>Une erreur est survenue lors du traitement du fichier Excel :</p>
        <p class="text-red-500">${error.message || 'Erreur inconnue'}</p>
      `;
      window.agentUtils.addOrUpdateAgentChatMessage(errorMessage, processingMessageId, false);
      
      // Afficher l'erreur dans la section de l'agent Excel
      resultsContent.innerHTML = errorMessage;
      results.classList.remove('hidden');
    } finally {
      // Réactiver le bouton d'analyse
      analyzeBtn.disabled = false;
      analyzeBtn.innerHTML = '<i class="fas fa-chart-line mr-2"></i> Analyser les données';
    }
  });
  
  // Gestionnaire d'événement pour la génération de rapport structuré
  reportBtn.addEventListener('click', async () => {
    const file = fileUpload.files[0];
    
    if (!file) {
      alert('Veuillez d\'abord sélectionner un fichier Excel');
      return;
    }
    
    // Créer un gestionnaire d'étapes de traitement standardisées
    const processingSteps = window.agentProcessingSteps.createProcessingSteps('Excel', 'chat-content');
    
    // Initialiser les étapes de traitement
    processingSteps.setCurrentStep('initialization');
    
    // Simuler une analyse en cours
    reportBtn.disabled = true;
    reportBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Génération du rapport...';
    
    // Définir un timeout de sécurité pour arrêter l'animation après 30 secondes dans tous les cas
    const globalTimeoutId = setTimeout(() => {
      // Réactiver le bouton et réinitialiser son état
      reportBtn.disabled = false;
      reportBtn.innerHTML = '<i class="fas fa-file-alt mr-2"></i> Générer un rapport structuré';
      
      // Mettre à jour l'étape avec une erreur de timeout
      processingSteps.setError("La génération du rapport prend plus de temps que prévu. Le processus a été interrompu pour éviter un blocage.");
      
      // Supprimer le gestionnaire d'étapes après un délai
      setTimeout(() => processingSteps.remove(), 5000);
    }, 30000); // 30 secondes
    
    try {
      // Passer à l'étape de prétraitement
      processingSteps.setCurrentStep('preprocessing', 'Vérification du fichier Excel et préparation des données...');
      
      // Obtenir le chemin réel du fichier sur le disque
      const filePath = file.path;
      if (!filePath) {
        throw new Error('Impossible d\'accéder au chemin du fichier. Veuillez réessayer.');
      }
      
      console.log(`Génération d'un rapport structuré pour le fichier Excel: ${filePath}`);
      
      // Instructions par défaut pour le rapport structuré
      const instructions = "Analyse ce fichier Excel et structure les données par section dans un format JSON clair avec la structure du fichier, les sections clés, les points à vérifier, les calculs exemples et les recommandations.";
      
      // Options pour la génération du rapport
      const options = {
        maxRows: 200,          // Augmenter le nombre de lignes pour une analyse plus complète
        includeHeaders: true   // Inclure les en-têtes dans les données
      };
      
      // Passer à l'étape de traitement principal
      processingSteps.setCurrentStep('processing', 'Analyse du fichier Excel et génération du rapport structuré...');
      
      // Ajouter un timeout côté client pour éviter un chargement infini
      const clientTimeout = 20000; // 20 secondes
      let reportResponse;
      
      try {
        // Créer une promesse avec timeout
        const reportPromise = window.api.generateExcelReport(filePath, instructions, options);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Le temps d'attente a été dépassé. Le service ne répond plus.")), clientTimeout);
        });
        
        // Appel au processus principal avec timeout
        reportResponse = await Promise.race([reportPromise, timeoutPromise]);
      } catch (timeoutError) {
        console.error('Timeout lors de la génération du rapport:', timeoutError);
        throw timeoutError;
      }
      
      // Passer à l'étape de post-traitement
      processingSteps.setCurrentStep('postprocessing', 'Finalisation et formatage des résultats...');
      
      // Vérifier si la réponse contient une erreur
      if (reportResponse.type === 'error' || reportResponse.error) {
        throw new Error(reportResponse.content || reportResponse.error || 'Erreur lors de la génération du rapport');
      }
      
      // Vérifier si la réponse est au format JSON structuré ou Markdown
      if (typeof reportResponse === 'object' && reportResponse.report) {
        // Réponse structurée au format JSON : utiliser le visualiseur de rapport
        console.log('Utilisation du visualiseur de rapport structuré');
        
        // Passer à l'étape de complétion
        processingSteps.setCurrentStep('completion', 'Rapport structuré généré avec succès');
        
        // Afficher le rapport structuré
        window.excelReportViewer.displayReport(reportResponse, 'chat-content');
        
        // Afficher un message de succès dans le chat
        const aiMessageOptions = {
          type: 'ai',
          content: `✅ Rapport structuré généré avec succès.`,
          source: 'Excel Report Agent'
        };
        
        window.agentUtils.addOrUpdateAgentChatMessage(aiMessageOptions);
        
        // Supprimer le gestionnaire d'étapes après un délai
        setTimeout(() => processingSteps.remove(), 3000);
      } else if (typeof reportResponse === 'string' || (typeof reportResponse === 'object' && reportResponse.content)) {
        // Réponse au format Markdown : afficher directement
        const content = typeof reportResponse === 'string' ? reportResponse : reportResponse.content;
        
        // Passer à l'étape de complétion
        processingSteps.setCurrentStep('completion', 'Rapport généré avec succès');
        
        // Afficher la réponse dans le chat
        const aiMessageOptions = {
          type: 'ai',
          content: content,
          source: 'Excel Report Agent'
        };
        
        window.agentUtils.addOrUpdateAgentChatMessage(aiMessageOptions);
        // Bouton de prévisualisation enrichie
        const previewButton = document.createElement('button');
        previewButton.className = 'px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm flex items-center';
        previewButton.innerHTML = `
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
          </svg>
          Prévisualiser avec graphiques
        `;
        
        // Zone pour la prévisualisation enrichie
        const previewContainer = document.createElement('div');
        previewContainer.id = 'enhanced-preview-container-' + Date.now();
        previewContainer.className = 'hidden mt-4';
        
        // Ajouter les événements
        previewButton.addEventListener('click', () => {
          // Basculer l'affichage de la prévisualisation
          if (previewContainer.classList.contains('hidden')) {
            previewContainer.classList.remove('hidden');
            previewButton.innerHTML = `
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
              Masquer la prévisualisation
            `;
            
            // Générer la prévisualisation enrichie avec graphiques
            window.excelReportExporter.previewReport(
              reportResponse.content, 
              previewContainer.id, 
              {
                title: `Analyse du fichier ${file.name}`,
                fileName: `rapport-excel-${file.name.replace(/\.[^\.]+$/, '')}-${new Date().toISOString().split('T')[0]}`,
                showExportOptions: true,
                extractChartData: true
              }
            );
          } else {
            previewContainer.classList.add('hidden');
            previewButton.innerHTML = `
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
              Prévisualiser avec graphiques
            `;
          }
        });
        
        // Bouton de copie
        const copyButton = document.createElement('button');
        copyButton.className = 'px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm flex items-center';
        copyButton.innerHTML = `
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
          </svg>
          Copier le contenu
        `;
        
        copyButton.addEventListener('click', () => {
          navigator.clipboard.writeText(reportResponse.content)
            .then(() => {
              // Afficher un message de confirmation
              const toast = document.createElement('div');
              toast.className = 'fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded shadow-lg z-50 animate-fade-in';
              toast.textContent = 'Rapport copié dans le presse-papiers';
              
              document.body.appendChild(toast);
              
              setTimeout(() => {
                toast.classList.add('animate-fade-out');
                setTimeout(() => {
                  document.body.removeChild(toast);
                }, 300);
              }, 3000);
            })
            .catch(err => console.error('Erreur lors de la copie:', err));
        });
        
        // Assembler les boutons
        actionButtons.appendChild(previewButton);
        actionButtons.appendChild(copyButton);
        reportContainer.appendChild(actionButtons);
        reportContainer.appendChild(previewContainer);
        
        // Ajouter au message du chat
        const chatMessage = document.getElementById(processingMessageId);
        if (chatMessage) {
          chatMessage.appendChild(reportContainer);
          
          // Rendre le Markdown dans le conteneur principal
          window.markdownViewer.render(reportResponse.content, chatMarkdownContainer, {
            title: 'Rapport d\'analyse Excel',
            showHeader: true
          });
        }
      } else {
        // Format texte simple ou non reconnu, afficher le contenu tel quel
        const contentText = typeof reportResponse === 'string' ? reportResponse : 
                            reportResponse.content || JSON.stringify(reportResponse, null, 2);
        
        const textMessage = `
          <p>Rapport généré pour le fichier <strong>${file.name}</strong> :</p>
          <pre class="p-3 bg-gray-50 rounded-lg my-3 overflow-auto max-h-[400px]">${contentText}</pre>
        `;
        window.agentUtils.addOrUpdateAgentChatMessage(textMessage, processingMessageId, false);
      }
      
    } catch (error) {
      console.error('Erreur lors de la génération du rapport structuré:', error);
      
      // Afficher l'erreur dans le chat principal
      const errorMessage = `
        <p>Une erreur est survenue lors de la génération du rapport structuré :</p>
        <p class="text-red-500">${error.message || 'Erreur inconnue'}</p>
        <p class="mt-2"><i class="fas fa-info-circle"></i> Si ce problème persiste, essayez de redémarrer l'application ou vérifiez que le fichier Excel n'est pas corrompu.</p>
      `;
      window.agentUtils.addOrUpdateAgentChatMessage(errorMessage, processingMessageId, false);
      
      // Afficher l'erreur dans la section de l'agent Excel
      resultsContent.innerHTML = errorMessage;
      results.classList.remove('hidden');
    } finally {
      // Réactiver le bouton de rapport
      reportBtn.disabled = false;
      reportBtn.innerHTML = '<i class="fas fa-file-alt mr-2"></i> Générer un rapport structuré';
      
      // Annuler le timeout global si on arrive ici avant
      clearTimeout(globalTimeoutId);
      
      // S'assurer que tous les indicateurs de chargement sont arrêtés
      const allLoadingIndicators = document.querySelectorAll('.fa-spinner.fa-spin');
      allLoadingIndicators.forEach(indicator => {
        // Vérifier si l'indicateur appartient à notre bouton
        const parent = indicator.parentElement;
        if (parent && parent.id === 'excel-report-btn') {
          parent.innerHTML = '<i class="fas fa-file-alt mr-2"></i> Générer un rapport structuré';
        }
      });
    }
  });
}

// Utilise la fonction formatFileSize de agent-utils.js

// Exporter les fonctions pour les rendre disponibles dans d'autres modules
window.excelAgent = {
  init: initExcelAgent
};
