/**
 * Module pour gérer l'upload de fichiers dans l'application
 * Ce module est responsable de la gestion des interactions avec le bouton d'upload
 * et du traitement des fichiers sélectionnés par l'utilisateur.
 */

// S'assurer que le module est chargé après le DOM
document.addEventListener('DOMContentLoaded', function() {
  console.log("Initialisation du module file-uploader");
  
  // Récupérer les éléments nécessaires
  const fileUploadButton = document.getElementById('file-upload-button');
  const fileUploadInput = document.getElementById('file-upload-input');
  
  if (fileUploadButton && fileUploadInput) {
    console.log("Éléments d'upload trouvés, ajout des écouteurs d'événements");
    
    // Supprimer les écouteurs existants pour éviter les doublons
    fileUploadButton.removeEventListener('click', handleUploadButtonClick);
    fileUploadInput.removeEventListener('change', handleFileSelect);
    
    // Ajouter les nouveaux écouteurs
    fileUploadButton.addEventListener('click', handleUploadButtonClick);
    fileUploadInput.addEventListener('change', handleFileSelect);
  } else {
    console.error("Éléments d'upload non trouvés");
    if (!fileUploadButton) console.error("Bouton d'upload non trouvé");
    if (!fileUploadInput) console.error("Input file non trouvé");
  }
  
  // Fonction pour gérer le clic sur le bouton d'upload
  function handleUploadButtonClick(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log("Clic sur le bouton d'upload");
    
    // Affichage de la boîte de dialogue de sélection de fichier
    if (fileUploadInput) {
      fileUploadInput.click();
    }
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
    fileUploadInput.value = '';
    
    // Afficher un message dans le chat pour indiquer le fichier sélectionné
    addUserFileMessage(file);
    
    // Traiter le fichier selon son type
    processFile(file);
  }
  
  // Fonction pour ajouter un message utilisateur concernant le fichier avec animation
  function addUserFileMessage(file) {
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
  
  // Fonction utilitaire pour formater la taille du fichier
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  // Fonction pour traiter le fichier
  function processFile(file) {
    // Déterminer l'agent approprié en fonction du type de fichier
    let agentType = 'document'; // Par défaut
    
    if (file.type.includes('spreadsheet') || file.type.includes('excel') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      agentType = 'excel';
    } else if (file.type.includes('pdf')) {
      agentType = 'document';
    }
    
    // Afficher un message de traitement
    if (typeof window.addAIMessage === 'function') {
      window.addAIMessage(`Je traite votre fichier ${file.name}...`);
    }
    
    // Vérifier que l'API est disponible
    if (window.api && typeof window.api.setActiveAgent === 'function') {
      // Lire le fichier
      const reader = new FileReader();
      
      reader.onload = function(e) {
        const fileContent = e.target.result;
        
        // Créer un objet Blob pour représenter le fichier
        const blob = new Blob([fileContent], { type: file.type });
        
        // Créer un objet File à partir du Blob
        const fileObject = new File([blob], file.name, { type: file.type });
        
        // Créer une URL temporaire pour le fichier
        const tempFilePath = URL.createObjectURL(fileObject);
        
        // Définir l'agent actif et traiter le fichier selon son type
        window.api.setActiveAgent(agentType)
          .then(() => {
            console.log(`Agent actif défini sur: ${agentType}`);
            
            // Appeler la méthode API appropriée selon le type de fichier
            if (agentType === 'excel') {
              // Pour les fichiers Excel
              return window.api.processExcelFile(tempFilePath, file.name);
            } else if (agentType === 'document') {
              // Pour les documents PDF
              return window.api.processDocument(tempFilePath, file.name);
            } else {
              // Pour les autres types de fichiers
              throw new Error(`Type de fichier non supporté: ${file.type}`);
            }
          })
          .then(response => {
            // Libérer l'URL temporaire
            URL.revokeObjectURL(tempFilePath);
            
            // Afficher la réponse de l'IA
            if (response && response.message && typeof window.addAIMessage === 'function') {
              window.addAIMessage(response.message);
            } else if (typeof window.addAIMessage === 'function') {
              window.addAIMessage(`J'ai bien reçu votre fichier ${file.name}. Comment puis-je vous aider avec ce document ?`);
            }
          })
          .catch(error => {
            // Libérer l'URL temporaire en cas d'erreur
            URL.revokeObjectURL(tempFilePath);
            
            console.error('Erreur lors du traitement du fichier:', error);
            if (typeof window.addAIMessage === 'function') {
              window.addAIMessage(`Désolé, je n'ai pas pu traiter le fichier. Erreur: ${error.message || 'Erreur inconnue'}`);
            }
          });
      };
      
      reader.onerror = function() {
        console.error('Erreur lors de la lecture du fichier');
        if (typeof window.addAIMessage === 'function') {
          window.addAIMessage("Désolé, je n'ai pas pu lire le fichier. Veuillez réessayer.");
        }
      };
      
      // Lire le fichier comme un tableau d'octets
      reader.readAsArrayBuffer(file);
    } else {
      // Si l'API n'est pas disponible
      console.error("API non disponible pour le traitement du fichier");
      if (typeof window.addAIMessage === 'function') {
        window.addAIMessage(`J'ai bien reçu votre fichier, mais je ne peux pas le traiter car l'API n'est pas disponible.`);
      }
    }
  }
});

// Exporter les fonctions d'ajout de messages pour les rendre disponibles globalement
window.addUserMessage = function(message) {
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

window.addAIMessage = function(message, actions = []) {
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

// Informer de l'initialisation complète du module
console.log("Module file-uploader chargé et prêt à l'emploi");
