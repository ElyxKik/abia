/**
 * Module pour gérer l'upload de fichiers dans l'application
 * Ce module est responsable de la gestion des interactions avec le bouton d'upload
 * et du traitement des fichiers sélectionnés par l'utilisateur.
 */

// Variable globale pour stocker le fichier temporairement
window.pendingFile = null;

// S'assurer que le module est chargé après le DOM
// Fonction pour détecter le type d'agent à utiliser en fonction du type de fichier
function detectAgentType(file) {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  const extension = name.split('.').pop();
  
  // Fichiers Excel
  if (type.includes('excel') || type.includes('spreadsheet') || 
      extension === 'xlsx' || extension === 'xls' || extension === 'csv') {
    return 'excel';
  }
  
  // Documents (PDF, Word, etc.)
  if (type.includes('pdf') || type.includes('word') || type.includes('text/plain') || 
      type.includes('opendocument') || extension === 'doc' || extension === 'docx' || 
      extension === 'txt' || extension === 'rtf' || extension === 'odt') {
    return 'document';
  }
  
  // Images
  if (type.includes('image/') || ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(extension)) {
    return 'vision';
  }
  
  // Fichiers de code
  if (['js', 'py', 'java', 'c', 'cpp', 'cs', 'php', 'html', 'css', 'rb', 'go', 'rust', 'ts', 'jsx', 'tsx'].includes(extension) || 
      type.includes('text/') || type.includes('application/json')) {
    return 'code';
  }
  
  // Fichiers audio
  if (type.includes('audio/') || ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'].includes(extension)) {
    return 'audio';
  }
  
  // Fichiers vidéo
  if (type.includes('video/') || ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv'].includes(extension)) {
    return 'video';
  }
  
  // Par défaut, traiter comme un document
  return 'document';
}

document.addEventListener('DOMContentLoaded', function() {
  console.log("Initialisation du module file-uploader");
  
  // Récupérer les éléments nécessaires
  const fileUploadButton = document.getElementById('file-upload-button');
  const fileUploadInput = document.getElementById('file-upload');
  
  if (fileUploadButton && fileUploadInput) {
    console.log("Éléments d'upload trouvés, ajout des écouteurs d'événements");
    
    // Ajouter les écouteurs d'événements
    fileUploadButton.addEventListener('click', () => {
      fileUploadInput.click();
    });
    
    fileUploadInput.addEventListener('change', handleFileSelect);
  } else {
    console.error("Éléments d'upload non trouvés");
    if (!fileUploadButton) console.error("Bouton d'upload non trouvé");
    if (!fileUploadInput) console.error("Input file non trouvé");
  }
  
  // Fonction pour gérer la sélection de fichier
  function handleFileSelect(e) {
    const files = e.target.files;
    
    if (!files || files.length === 0) {
      console.log("Aucun fichier sélectionné");
      return;
    }
    
    const file = files[0];
    console.log(`Fichier sélectionné: ${file.name}, type: ${file.type}, taille: ${file.size} octets`);
    
    // Réinitialiser l'input pour permettre de sélectionner le même fichier plusieurs fois
    e.target.value = '';
    
    // Stocker le fichier temporairement
    window.pendingFile = {
      file: file,
      agentType: detectAgentType(file)
    };
    
    // Logs détaillés sur le fichier
    console.log("=== Détails du fichier sélectionné ===");
    console.log("Fichier stocké globalement:", window.pendingFile);
    console.log("Type MIME:", file.type);
    console.log("Chemin du fichier (file.path):", file.path);
    console.log("Propriétés du fichier:", Object.keys(file));
    console.log("Est-ce que le fichier a un chemin?", file.hasOwnProperty('path'));
    console.log("Type d'agent détecté:", detectAgentType(file));
    
    // Afficher un message dans le chat pour indiquer le fichier sélectionné
    addFilePreview(file);
  }
  
  // Fonction pour ajouter un aperçu du fichier au-dessus du champ de saisie
  function addFilePreview(file) {
    const filePreview = document.getElementById('file-preview');
    if (!filePreview) {
      console.error("Conteneur d'aperçu de fichier non trouvé");
      return;
    }
    
    // Afficher le conteneur d'aperçu et s'assurer qu'il est visible
    filePreview.classList.remove('hidden');
    filePreview.style.display = 'block';
    filePreview.innerHTML = '';
    
    // Déterminer l'extension du fichier et l'agent approprié
    const fileExtension = file.name.split('.').pop().toLowerCase();
    let iconClass = 'fa-file';
    let bgColor = 'bg-blue-500';
    let extensionColor = 'bg-blue-600';
    let agentType = 'document'; // Par défaut
    let agentName = 'Document';
    
    // Définir l'icône et l'agent en fonction de l'extension
    if (['xlsx', 'xls', 'csv'].includes(fileExtension)) {
      iconClass = 'fa-file-excel';
      bgColor = 'bg-green-600';
      extensionColor = 'bg-green-700';
      agentType = 'excel';
      agentName = 'Excel';
    } else if (['pdf'].includes(fileExtension)) {
      iconClass = 'fa-file-pdf';
      bgColor = 'bg-red-600';
      extensionColor = 'bg-red-700';
      agentType = 'document';
      agentName = 'Document';
    } else if (['doc', 'docx'].includes(fileExtension)) {
      iconClass = 'fa-file-word';
      bgColor = 'bg-blue-600';
      extensionColor = 'bg-blue-700';
      agentType = 'document';
      agentName = 'Document';
    } else if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(fileExtension)) {
      iconClass = 'fa-file-image';
      bgColor = 'bg-purple-600';
      extensionColor = 'bg-purple-700';
      agentType = 'vision';
      agentName = 'Vision';
    } else if (['mp3', 'wav', 'ogg'].includes(fileExtension)) {
      iconClass = 'fa-file-audio';
      bgColor = 'bg-yellow-600';
      extensionColor = 'bg-yellow-700';
      agentType = 'audio';
      agentName = 'Audio';
    } else if (['mp4', 'avi', 'mov', 'wmv'].includes(fileExtension)) {
      iconClass = 'fa-file-video';
      bgColor = 'bg-pink-600';
      extensionColor = 'bg-pink-700';
      agentType = 'video';
      agentName = 'Vidéo';
    } else if (['txt', 'json', 'xml', 'html', 'css', 'js', 'py', 'java', 'c', 'cpp'].includes(fileExtension)) {
      iconClass = 'fa-file-code';
      bgColor = 'bg-gray-700';
      extensionColor = 'bg-gray-800';
      agentType = 'code';
      agentName = 'Code';
    }
    
    // Stocker le type d'agent avec le fichier
    window.pendingFile = {
      file: file,
      agentType: agentType
    };
    console.log("Fichier stocké globalement:", window.pendingFile);
    
    // Créer l'élément d'aperçu avec animation
    const previewElement = document.createElement('div');
    previewElement.className = 'file-preview-animation rounded-lg border border-neutral-200 dark:border-neutral-700 p-3 bg-white dark:bg-neutral-800';
    previewElement.style.display = 'block';
    previewElement.style.width = '100%';
    
    previewElement.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center flex-grow">
          <div class="${bgColor} rounded-md w-12 h-12 flex items-center justify-center flex-shrink-0 text-white mr-3 shadow-md transition-all duration-300 hover:scale-105">
            <i class="fas ${iconClass} text-lg"></i>
          </div>
          <div class="flex-grow">
            <div class="flex items-center">
              <p class="text-sm font-medium truncate mr-2" title="${file.name}">${file.name}</p>
              <span class="${extensionColor} text-white text-xs font-bold uppercase px-2 py-1 rounded">${fileExtension}</span>
            </div>
            <div class="mt-1 flex items-center">
              <span class="text-xs text-neutral-500 dark:text-neutral-400 mr-2">${formatFileSize(file.size)}</span>
              <span class="bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs px-2 py-0.5 rounded-full flex items-center">
                <i class="fas fa-robot mr-1 text-${bgColor.replace('bg-', '')}"></i> Agent: ${agentName}
              </span>
            </div>
          </div>
        </div>
        <div class="flex space-x-2">
          <button id="change-file" class="px-2 py-1 text-xs bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded transition-colors duration-200 flex items-center">
            <i class="fas fa-exchange-alt mr-1"></i> Changer
          </button>
          <button id="remove-file" class="px-2 py-1 text-xs bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 rounded transition-colors duration-200 flex items-center">
            <i class="fas fa-trash-alt mr-1"></i> Supprimer
          </button>
        </div>
      </div>
      <div class="mt-2 relative h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
        <div class="upload-progress absolute left-0 top-0 h-full ${bgColor} rounded-full w-0 transition-all duration-1000"></div>
      </div>
    `;
    
    filePreview.appendChild(previewElement);
    
    // Animation de la barre de progression
    const progressBar = previewElement.querySelector('.upload-progress');
    setTimeout(() => { progressBar.style.width = '30%'; }, 300);
    setTimeout(() => { progressBar.style.width = '60%'; }, 600);
    setTimeout(() => { progressBar.style.width = '100%'; }, 900);
    
    // Ajouter un écouteur pour le bouton de suppression
    const removeButton = document.getElementById('remove-file');
    if (removeButton) {
      removeButton.addEventListener('click', function() {
        console.log("Bouton de suppression cliqué");
        // Réinitialiser le fichier en attente
        window.pendingFile = null;
        
        // Cacher l'aperçu du fichier avec animation
        const filePreview = document.getElementById('file-preview');
        if (filePreview) {
          // Animation de disparition
          const previewElement = filePreview.querySelector('.file-preview-animation');
          if (previewElement) {
            previewElement.style.opacity = '0';
            previewElement.style.transform = 'translateY(-10px)';
          }
          
          // Attendre la fin de l'animation avant de cacher complètement
          setTimeout(() => {
            filePreview.classList.add('hidden');
            filePreview.innerHTML = '';
          }, 300);
        }
      });
    } else {
      console.error("Bouton de suppression non trouvé");
    }
    
    // Ajouter un écouteur pour le bouton de changement
    const changeButton = document.getElementById('change-file');
    if (changeButton) {
      changeButton.addEventListener('click', () => {
        // Animation de changement
        const previewElement = filePreview.querySelector('.file-preview-animation');
        if (previewElement) {
          // Effet de transition
          previewElement.style.transform = 'scale(0.98)';
          previewElement.style.opacity = '0.8';
          
          // Revenir à la normale après un court délai
          setTimeout(() => {
            previewElement.style.transform = 'scale(1)';
            previewElement.style.opacity = '1';
          }, 200);
        }
        
        // Déclencher le sélecteur de fichier
        const fileUploadInput = document.getElementById('file-upload');
        if (fileUploadInput) {
          fileUploadInput.click();
        }
      });
    }
    
    // Mettre le focus sur le champ de saisie pour ajouter des instructions
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
      chatInput.focus();
    }
  }
  
  // Fonction pour ajouter un message utilisateur concernant le fichier avec animation
  window.addUserFileMessage = function(file, instructions = '') {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) {
      console.error("Conteneur de messages non trouvé");
      return;
    }
    
    // Déterminer l'extension du fichier
    const fileExtension = file.name.split('.').pop().toLowerCase();
    let iconClass = 'fa-file';
    let bgColor = 'bg-blue-500';
    let extensionColor = 'text-white';
    
    // Définir l'icône et la couleur en fonction de l'extension
    if (['xlsx', 'xls', 'csv'].includes(fileExtension)) {
      iconClass = 'fa-file-excel';
      bgColor = 'bg-green-600';
    } else if (['pdf'].includes(fileExtension)) {
      iconClass = 'fa-file-pdf';
      bgColor = 'bg-red-600';
    } else if (['doc', 'docx'].includes(fileExtension)) {
      iconClass = 'fa-file-word';
      bgColor = 'bg-blue-600';
    } else if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(fileExtension)) {
      iconClass = 'fa-file-image';
      bgColor = 'bg-purple-600';
    } else if (['mp3', 'wav', 'ogg'].includes(fileExtension)) {
      iconClass = 'fa-file-audio';
      bgColor = 'bg-yellow-600';
      extensionColor = 'text-gray-800';
    } else if (['mp4', 'avi', 'mov', 'wmv'].includes(fileExtension)) {
      iconClass = 'fa-file-video';
      bgColor = 'bg-pink-600';
    } else if (['zip', 'rar', '7z'].includes(fileExtension)) {
      iconClass = 'fa-file-archive';
      bgColor = 'bg-yellow-700';
    } else if (['js', 'html', 'css', 'php', 'py', 'java', 'c', 'cpp'].includes(fileExtension)) {
      iconClass = 'fa-file-code';
      bgColor = 'bg-gray-700';
    }
    
    // Créer l'élément de message avec animation
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message chat-message-user';
    
    // Animation de l'importation du fichier
    messageElement.innerHTML = `
      <div class="flex items-start">
        <div class="flex-shrink-0 h-8 w-8 rounded-full bg-secondary-100 dark:bg-secondary-900/30 flex items-center justify-center text-secondary-600 dark:text-secondary-400">
          <i class="fas fa-user"></i>
        </div>
        <div class="ml-3 w-full">
          ${instructions ? `<p class="text-sm mb-2">${instructions}</p>` : ''}
          <div class="file-upload-animation flex items-center p-2 rounded-lg border border-gray-200 dark:border-gray-700 mb-2 w-full max-w-md">
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
              ${fileExtension}
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Ajouter le message au chat
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Animation de la barre de progression
    const progressBar = messageElement.querySelector('.upload-progress');
    
    // Simuler la progression de l'upload
    setTimeout(() => { progressBar.style.width = '30%'; }, 300);
    setTimeout(() => { progressBar.style.width = '60%'; }, 800);
    setTimeout(() => { progressBar.style.width = '85%'; }, 1300);
    setTimeout(() => { 
      progressBar.style.width = '100%'; 
      
      // Une fois le téléchargement terminé, remplacer l'animation par un message de confirmation
      setTimeout(() => {
        const fileUploadAnimation = messageElement.querySelector('.file-upload-animation');
        fileUploadAnimation.innerHTML = `
          <div class="${bgColor} rounded-md w-10 h-10 flex items-center justify-center flex-shrink-0 text-white mr-3">
            <i class="fas ${iconClass}"></i>
          </div>
          <div class="flex-grow">
            <p class="text-sm font-medium truncate mb-1" title="${file.name}">${file.name}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">${formatFileSize(file.size)} - Importé avec succès</p>
          </div>
          <div class="ml-3 flex-shrink-0 bg-green-500 rounded-md px-2 py-1 text-white text-xs flex items-center">
            <i class="fas fa-check mr-1"></i> OK
          </div>
        `;
      }, 500);
      
    }, 1800);
  }
  
  // Fonction pour traiter le fichier avec les instructions
  window.processFileWithInstructions = function(fileData, instructions) {
    console.log("=== Début du traitement du fichier avec instructions ===");
    console.log("Fichier (fileData):");
    console.dir(fileData);
    console.log("Instructions:", instructions);
    
    const originalFile = fileData.file; // L'objet File original de l'input
    const agentType = fileData.agentType || 'document'; // Utiliser l'agent détecté ou par défaut
    
    console.log(`Type d'agent détecté: ${agentType} pour le fichier ${originalFile.name}`);
    
    // Pour déboguer, vérifions si nous avons un chemin de fichier
    if (originalFile.path) {
      console.log(`Chemin du fichier original: ${originalFile.path}`);
    } else {
      console.log("Aucun chemin de fichier (originalFile.path) n'est disponible");
      console.log("Propriétés disponibles du fichier:", Object.getOwnPropertyNames(originalFile));
    }
    
    // Fonction pour traiter la réponse de l'API
    function handleApiResponse(apiPromise) {
      return apiPromise.then(response => {
        console.log(`Fichier traité avec succès par l'agent ${agentType}`);
        
        console.log("--- Début de l'inspection de la réponse API ---");
        console.log("Réponse de l'API (brute):", response);
        try {
          console.log("Réponse de l'API (JSON.stringify):", JSON.stringify(response, null, 2));
        } catch (e) {
          console.error("Erreur lors de JSON.stringify(response):", e);
        }
        console.log("Réponse de l'API (console.dir):");
        console.dir(response, {depth: null});
        console.log("--- Fin de l'inspection de la réponse API ---");

        // Afficher la réponse de l'IA
        let aiResponseMessage = null;
        if (response) {
          if (response.type === 'success' && response.content) {
            aiResponseMessage = response.content;
          } else if (response.type === 'error' && response.content) {
            aiResponseMessage = `Erreur de l'agent: ${response.content}`;
          } else if (typeof response === 'string') { // Au cas où l'API renvoie une chaîne simple
            aiResponseMessage = response;
          } else if (response.message) { // Fallback pour une propriété 'message'
             aiResponseMessage = response.message;
          }
        }

        if (aiResponseMessage) {
          console.log("Affichage de la réponse de l'API:", aiResponseMessage);
          if (typeof window.addAIMessage === 'function') {
            window.addAIMessage(aiResponseMessage);
          } else {
            // Alternative si window.addAIMessage n'est pas disponible
            console.error("window.addAIMessage n'est pas disponible, impossible d'afficher la réponse de l'API");
            // Essayer d'utiliser une alternative pour afficher le message
            try {
              const chatMessages = document.getElementById('chat-messages');
              if (chatMessages) {
                const messageElement = document.createElement('div');
                messageElement.className = 'chat-message chat-message-ai';
                messageElement.innerHTML = `
                  <div class="flex items-start">
                    <div class="flex-shrink-0 h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
                      <i class="fas fa-robot"></i>
                    </div>
                    <div class="ml-3">
                      <p class="text-sm">${aiResponseMessage}</p>
                    </div>
                  </div>
                `;
                chatMessages.appendChild(messageElement);
                chatMessages.scrollTop = chatMessages.scrollHeight;
              }
            } catch (e) {
              console.error("Impossible d'afficher le message en alternative:", e);
            }
          }
        } else {
          const defaultMessage = `J'ai bien reçu votre fichier ${originalFile.name} et vos instructions. Je travaille dessus en utilisant l'agent ${agentType.toUpperCase()}.`;
          console.log("Affichage d'un message par défaut:", defaultMessage);
          
          if (typeof window.addAIMessage === 'function') {
            window.addAIMessage(defaultMessage);
          } else {
            // Alternative si window.addAIMessage n'est pas disponible
            console.error("window.addAIMessage n'est pas disponible, utilisation d'une alternative");
            // Essayer d'utiliser une alternative pour afficher le message
            try {
              const chatMessages = document.getElementById('chat-messages');
              if (chatMessages) {
                const messageElement = document.createElement('div');
                messageElement.className = 'chat-message chat-message-ai';
                messageElement.innerHTML = `
                  <div class="flex items-start">
                    <div class="flex-shrink-0 h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
                      <i class="fas fa-robot"></i>
                    </div>
                    <div class="ml-3">
                      <p class="text-sm">${defaultMessage}</p>
                    </div>
                  </div>
                `;
                chatMessages.appendChild(messageElement);
                chatMessages.scrollTop = chatMessages.scrollHeight;
              }
            } catch (e) {
              console.error("Impossible d'afficher le message en alternative:", e);
            }
          }
        }
        
        return response;
      });
    }
    
    // Fonction pour gérer les erreurs
    function handleError(error) {
      console.error(`Erreur lors du traitement du fichier par l'agent ${agentType}:`, error);
      if (typeof window.addAIMessage === 'function') {
        window.addAIMessage(`Une erreur est survenue lors du traitement de votre fichier par l'agent ${agentType}. Détails: ${error.message || error}`);
      }
    }
    
    // Essayons une méthode directe avec le chemin du fichier
    if (originalFile.path) {
      if (window.api && typeof window.api.setActiveAgent === 'function') {
        window.api.setActiveAgent(agentType)
          .then(() => {
            console.log(`Agent actif défini sur: ${agentType}`);
            console.log(`Tentative d'envoi du fichier ${originalFile.name} avec le chemin ${originalFile.path} à l'agent ${agentType}`);
            
            let apiPromise;
            if (agentType === 'excel' && typeof window.api.processExcelFile === 'function') {
              console.log("Utilisation de processExcelFile avec le chemin du fichier");
              
              // Vérifier si les instructions contiennent des mots-clés pour l'analyse LLM
              const llmKeywords = ['analyser', 'analyse', 'résumer', 'résumé', 'tendance', 'tendances', 'visualiser', 
                                  'visualisation', 'interpréter', 'interprétation', 'expliquer', 'explication',
                                  'llm', 'gpt', 'deepseek', 'ia', 'intelligence artificielle'];
              
              const useLLM = llmKeywords.some(keyword => instructions.toLowerCase().includes(keyword.toLowerCase()));
              
              // Ne pas afficher l'animation de chargement (popup), utiliser le message dans le chat à la place
              const processingAnimation = document.getElementById('processing-animation');
              if (processingAnimation) {
                processingAnimation.style.display = 'none';
              }
              
              // Afficher un message de chargement dans le chat
              const processingMessageId = window.agentUtils.showFileProcessingMessage('document Excel');
              
              if (useLLM) {
                console.log("Détection d'une demande d'analyse LLM pour Excel");
                apiPromise = window.api.processExcelWithLLM(originalFile.path, instructions);
              } else {
                console.log("Utilisation du traitement Excel standard");
                apiPromise = window.api.processExcelFile(originalFile.path, `${originalFile.name} - Instructions: ${instructions}`);
              }
              
              // Modifier la promesse pour masquer l'animation à la fin du traitement
              const originalPromise = apiPromise;
              apiPromise = originalPromise.then(result => {
                // Masquer l'animation de chargement
                if (processingAnimation) {
                  processingAnimation.style.display = 'none';
                }
                return result;
              }).catch(error => {
                // Masquer l'animation de chargement en cas d'erreur
                if (processingAnimation) {
                  processingAnimation.style.display = 'none';
                }
                throw error;
              });
            } 
            else if (agentType === 'document' && typeof window.api.processDocument === 'function') {
              console.log("Utilisation de processDocument avec le chemin du fichier");
              
              // Ne pas afficher l'animation de chargement (popup), utiliser le message dans le chat à la place
              const processingAnimation = document.getElementById('processing-animation');
              if (processingAnimation) {
                processingAnimation.style.display = 'none';
              }
              
              // Afficher un message de chargement dans le chat
              const processingMessageId = window.agentUtils.showFileProcessingMessage('document');
              
              apiPromise = window.api.processDocument(originalFile.path, `${originalFile.name} - Instructions: ${instructions}`);
              
              // Modifier la promesse pour masquer l'animation à la fin du traitement
              const originalPromise = apiPromise;
              apiPromise = originalPromise.then(result => {
                // Masquer l'animation de chargement
                if (processingAnimation) {
                  processingAnimation.style.display = 'none';
                }
                return result;
              }).catch(error => {
                // Masquer l'animation de chargement en cas d'erreur
                if (processingAnimation) {
                  processingAnimation.style.display = 'none';
                }
                throw error;
              });
            }
            else if (typeof window.api.processFile === 'function') {
              console.log("Utilisation de processFile avec le chemin du fichier");
              
              // Ne pas afficher l'animation de chargement (popup), utiliser le message dans le chat à la place
              const processingAnimation = document.getElementById('processing-animation');
              if (processingAnimation) {
                processingAnimation.style.display = 'none';
              }
              
              // Afficher un message de chargement dans le chat
              const processingMessageId = window.agentUtils.showFileProcessingMessage('fichier');
              
              apiPromise = window.api.processFile(originalFile.path, originalFile.name, agentType, instructions);
              
              // Modifier la promesse pour masquer l'animation à la fin du traitement
              const originalPromise = apiPromise;
              apiPromise = originalPromise.then(result => {
                // Masquer l'animation de chargement
                if (processingAnimation) {
                  processingAnimation.style.display = 'none';
                }
                return result;
              }).catch(error => {
                // Masquer l'animation de chargement en cas d'erreur
                if (processingAnimation) {
                  processingAnimation.style.display = 'none';
                }
                throw error;
              });
            }
            else {
              throw new Error(`Aucune méthode API disponible pour traiter ce type de fichier: ${agentType}`);
            }
            
            return handleApiResponse(apiPromise);
          })
          .catch(error => {
            console.error("Erreur avec la méthode du chemin direct, passage à la méthode alternative:", error);
            readFileAndProcess();
          });
      } else {
        console.error("API Electron non disponible, passage à la méthode alternative");
        readFileAndProcess();
      }
    } else {
      console.log("Aucun chemin disponible dans l'objet File, utilisation de la méthode alternative");
      readFileAndProcess();
    }
    
    // Fonction pour lire le fichier et le traiter
    function readFileAndProcess() {
      console.log("Lecture du contenu du fichier...");
      const reader = new FileReader();
      
      reader.onload = function(e) {
        const fileContent = e.target.result;
        console.log(`Contenu du fichier lu: ${fileContent.byteLength} octets`);
        
        // Fonction pour convertir ArrayBuffer en base64
        function arrayBufferToBase64(buffer) {
          let binary = '';
          const bytes = new Uint8Array(buffer);
          const len = bytes.byteLength;
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          return window.btoa(binary);
        }
        
        // Convertir le contenu en base64
        const base64Content = arrayBufferToBase64(fileContent);
        console.log(`Contenu converti en base64: ${base64Content.substring(0, 50)}... (${base64Content.length} caractères)`);
        
        // Créer un objet simplifié avec les infos essentielles du fichier
        const fileInfo = {
          name: originalFile.name,
          type: originalFile.type,
          size: originalFile.size,
          content: base64Content,
          instructions: instructions
        };
        
        // Tentative d'envoi
        if (window.api && typeof window.api.setActiveAgent === 'function') {
          window.api.setActiveAgent(agentType)
            .then(() => {
              console.log(`Agent actif défini sur: ${agentType}`);
              console.log(`Tentative d'envoi du fichier ${originalFile.name} en base64 à l'agent ${agentType}`);
              
              let apiPromise;
              
              // Essai avec originalFile directement (peut-être que le backend sait le gérer)
              if (agentType === 'excel' && typeof window.api.processExcelFile === 'function') {
                console.log("Essai 1: Utilisation de processExcelFile avec l'objet File original");
                apiPromise = window.api.processExcelFile(originalFile, `${originalFile.name} - Instructions: ${instructions}`);
              }
              else if (agentType === 'document' && typeof window.api.processDocument === 'function') {
                console.log("Essai 1: Utilisation de processDocument avec l'objet File original");
                apiPromise = window.api.processDocument(originalFile, `${originalFile.name} - Instructions: ${instructions}`);
              }
              else if (typeof window.api.processFile === 'function') {
                console.log("Essai 1: Utilisation de processFile avec l'objet File original");
                apiPromise = window.api.processFile(originalFile, originalFile.name, agentType, instructions);
              }
              
              return apiPromise;
            })
            .then(response => {
              return handleApiResponse(response);
            })
            .catch(error => {
              console.error("Erreur avec l'objet File original, tentative avec une chaîne brute:", error);
              
              // Deuxième tentative: utiliser une chaîne JSON comme paramètre
              if (window.api && typeof window.api.setActiveAgent === 'function') {
                window.api.setActiveAgent(agentType)
                  .then(() => {
                    console.log(`Agent actif défini sur: ${agentType}`);
                    console.log("Essai 2: Utilisation d'une chaîne JSON stringifiée");
                    
                    let apiPromise;
                    const fileInfoStr = JSON.stringify(fileInfo);
                    
                    if (agentType === 'excel' && typeof window.api.processExcelFile === 'function') {
                      apiPromise = window.api.processExcelFile(fileInfoStr, `${originalFile.name} - Instructions: ${instructions}`);
                    }
                    else if (agentType === 'document' && typeof window.api.processDocument === 'function') {
                      apiPromise = window.api.processDocument(fileInfoStr, `${originalFile.name} - Instructions: ${instructions}`);
                    }
                    else if (typeof window.api.processFile === 'function') {
                      apiPromise = window.api.processFile(fileInfoStr, originalFile.name, agentType, instructions);
                    }
                    
                    return apiPromise;
                  })
                  .then(response => {
                    return handleApiResponse(response);
                  })
                  .catch(handleError);
              }
            });
        } else {
          handleError(new Error("L'API Electron n'est pas disponible"));
        }
      };
      
      reader.onerror = function(error) {
        handleError(new Error(`Erreur lors de la lecture du fichier: ${error}`));
      };
      
      // Lancer la lecture du fichier
      reader.readAsArrayBuffer(originalFile);
    }
  };
});

// Fonctions utilitaires exportées globalement si nécessaire
window.formatFileSize = function(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Exporter les fonctions pour les rendre disponibles globalement
// Ces fonctions sont déjà globales car attachées à window directement dans le DOMContentLoaded

// Fonction pour envoyer un message avec le fichier en attente
window.sendMessageWithFile = function(message) {
  console.log("sendMessageWithFile appelé avec message:", message);
  console.log("window.pendingFile:", window.pendingFile);
  
  if (window.pendingFile) {
    console.log("FICHIER DÉTECTÉ - Début du traitement");
    const fileData = window.pendingFile;
    
    try {
      // Cacher l'aperçu du fichier
      const filePreview = document.getElementById('file-preview');
      if (filePreview) {
        console.log("Masquage de l'aperçu du fichier");
        filePreview.classList.add('hidden');
        filePreview.innerHTML = '';
      } else {
        console.error("filePreview non trouvé");
      }
      
      // Afficher un message utilisateur avec le fichier et les instructions
      window.addUserFileMessage(fileData.file, message);
      
      // Afficher un message de traitement
      if (typeof window.addAIMessage === 'function') {
        window.addAIMessage(`Je traite votre fichier ${fileData.file.name} avec vos instructions...`);
      }
      
      // Réinitialiser le fichier en attente APRÈS avoir affiché les messages
      window.pendingFile = null;
      
      // Traiter le fichier avec les instructions
      // Utiliser setTimeout pour s'assurer que l'UI est mise à jour avant de commencer le traitement
      setTimeout(() => {
        window.processFileWithInstructions(fileData, message);
      }, 100);
      
      return true;
    } catch (error) {
      console.error("Erreur lors du traitement du fichier:", error);
      window.pendingFile = null; // Réinitialiser en cas d'erreur
      return false;
    }
  }
  console.log("Aucun fichier en attente");
  return false;
};

// Fonction de test pour vérifier l'envoi de fichiers avec instructions
window.testFileUploadWithInstructions = function(fileType) {
  const fileName = `${fileType}test.${fileType === 'excel' ? 'xlsx' : fileType === 'document' ? 'pdf' : 'txt'}`;
  const dummyFile = new File(["dummy content"], fileName, { type: 'text/plain', path: `/fake/path/${fileName}` }); // Ajout de path pour le test
  const fileData = {
    file: dummyFile,
    agentType: fileType
  };
  const instructions = `Test instructions for ${fileType} file`;

  // Simuler la sélection de fichier et l'affichage de l'aperçu
  // (Cette partie est normalement gérée par handleFileSelect et addFilePreview)
  window.pendingFile = fileData;
  window.addFilePreview(dummyFile);
  
  // Simuler l'envoi du message
  setTimeout(() => {
    if (window.sendMessageWithFile) {
      const result = window.sendMessageWithFile(instructions);
      if (result) {
        console.log(`Test: Message pour ${fileName} avec instructions envoyé.`);
      } else {
        console.error("Test: Échec de l'envoi du message avec fichier.");
      }
    } else {
      console.error("Test: sendMessageWithFile n'est pas défini.");
    }
  }, 500);
};

// Fonction pour simuler l'envoi d'un fichier avec des instructions spécifiques
window.simulateFileUploadWithInstructions = function(fileType, instructions) {
  const fileName = `simulated_${fileType}.${fileType === 'excel' ? 'xlsx' : fileType === 'document' ? 'pdf' : 'txt'}`;
  const dummyFile = new File(["simulated content"], fileName, { type: 'text/plain', path: `/fake/path/simulated/${fileName}` }); // Ajout de path
  const fileData = {
    file: dummyFile,
    agentType: fileType
  };

  window.pendingFile = fileData;
  window.addFilePreview(dummyFile);

  setTimeout(() => {
    if (window.sendMessageWithFile) {
      window.sendMessageWithFile(instructions);
    } else {
      console.error("simulateFileUploadWithInstructions: sendMessageWithFile n'est pas défini.");
    }
  }, 500);
};

// Définir notre propre version de addAIMessage si elle n'existe pas déjà
if (typeof window.addAIMessage !== 'function') {
  window.addAIMessage = function(message, actions = []) {
    console.log("Utilisation de la version addAIMessage de file-uploader.js");
    const chatMessages = document.getElementById('chat-messages');
    
    if (!chatMessages) {
      console.error("Conteneur de messages non trouvé");
      return;
    }
    
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message chat-message-ai';
    
    let actionsHTML = '';
    if (actions && actions.length > 0) {
      actionsHTML = `
        <div class="mt-3 flex flex-wrap gap-2">
          ${actions.map(action => `
            <button class="btn ${action.primary ? 'btn-primary' : 'btn-outline'} text-sm py-1">
              ${action.icon ? `<i class="fas fa-${action.icon} mr-1"></i>` : ''}
              ${action.text}
            </button>
          `).join('')}
        </div>
      `;
    }
    
    messageElement.innerHTML = `
      <div class="flex items-start">
        <div class="flex-shrink-0 h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
          <i class="fas fa-robot"></i>
        </div>
        <div class="ml-3">
          <p class="text-sm">${message}</p>
          ${actionsHTML}
        </div>
      </div>
    `;
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  };
}

// Définir notre propre version de addUserMessage si elle n'existe pas déjà
if (typeof window.addUserMessage !== 'function') {
  window.addUserMessage = function(message) {
    console.log("Utilisation de la version addUserMessage de file-uploader.js");
    const chatMessages = document.getElementById('chat-messages');
    
    if (!chatMessages) {
      console.error("Conteneur de messages non trouvé");
      return;
    }
    
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message chat-message-user';
    messageElement.innerHTML = `
      <div class="flex items-start">
        <div class="flex-shrink-0 h-8 w-8 rounded-full bg-secondary-100 dark:bg-secondary-900/30 flex items-center justify-center text-secondary-600 dark:text-secondary-400">
          <i class="fas fa-user"></i>
        </div>
        <div class="ml-3">
          <p class="text-sm">${message}</p>
        </div>
      </div>
    `;
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  };
}

// Informer de l'initialisation complète du module
console.log("Module file-uploader chargé et prêt à l'emploi");
