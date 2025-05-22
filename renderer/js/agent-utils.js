/**
 * Utilitaires communs pour les agents ABIA
 * Ce module contient des fonctions partagées entre les différents agents
 */

/**
 * Ajoute ou met à jour un message de l'agent dans la zone de chat principale.
 * @param {string} messageText - Le contenu HTML du message.
 * @param {string} messageId - Un ID unique pour ce message.
 * @param {boolean} isProcessing - Si true, ajoute une classe pour un style de "traitement en cours".
 * @returns {HTMLElement} L'élément de message créé ou mis à jour.
 */
function addOrUpdateAgentChatMessage(messageText, messageId, isProcessing = false) {
  const chatMessagesContainer = document.getElementById('chat-messages');
  if (!chatMessagesContainer) {
    console.error('Conteneur de messages du chat (#chat-messages) non trouvé.');
    return null;
  }

  // Afficher la vue chat si elle est cachée
  const chatView = document.getElementById('chat-view');
  if (chatView && chatView.style.display === 'none') {
    // Afficher la vue chat
    document.querySelectorAll('[id$="-view"]').forEach(view => {
      view.style.display = 'none';
    });
    chatView.style.display = 'flex';
    
    // Mettre à jour la navigation si nécessaire
    document.querySelectorAll('.sidebar-item').forEach(item => {
      item.classList.remove('active');
    });
    const chatNavItem = document.querySelector('a[href="#chat"]');
    if (chatNavItem) {
      chatNavItem.classList.add('active');
    }
  }

  let messageElement = document.getElementById(messageId);

  if (messageElement) {
    // Mettre à jour le message existant
    const contentElement = messageElement.querySelector('.chat-message-content');
    if (contentElement) {
      contentElement.innerHTML = messageText;
    }
    if (isProcessing) {
      messageElement.classList.add('processing-message');
    } else {
      messageElement.classList.remove('processing-message');
    }
  } else {
    // Créer un nouveau message
    messageElement = document.createElement('div');
    messageElement.id = messageId;
    messageElement.classList.add('chat-message', 'chat-message-ai');
    if (isProcessing) {
      messageElement.classList.add('processing-message');
    }

    // Structure du message identique aux réponses normales du LLM dans le chat
    messageElement.innerHTML = `
      <div class="flex items-start">
        <div class="flex-shrink-0 h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
          <i class="fas fa-robot"></i>
        </div>
        <div class="ml-3 chat-message-content">
          ${messageText}
        </div>
      </div>
    `;
    chatMessagesContainer.appendChild(messageElement);
  }
  
  // Faire défiler vers le bas pour voir le nouveau message
  chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
  
  return messageElement;
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

/**
 * Affiche un message de chargement standard dans le chat pendant le traitement d'un fichier
 * @param {string} fileType - Le type de fichier (ex: "Excel", "document", etc.)
 * @returns {string} - L'ID du message créé (pour pouvoir le mettre à jour plus tard)
 */
function showFileProcessingMessage(fileType) {
  const processingMessageId = `file-processing-${Date.now()}`;
  
  // Créer un message avec animation de points
  const messageText = `
    <p class="text-sm">
      Traitement du fichier en cours<span class="loading-dots"></span><br>
      Veuillez patienter pendant que j'analyse votre ${fileType}.
    </p>
  `;
  
  // Ajouter le message au chat
  const messageElement = addOrUpdateAgentChatMessage(messageText, processingMessageId, true);
  
  // Ajouter l'animation des points
  if (messageElement) {
    // Créer et ajouter le style d'animation s'il n'existe pas déjà
    if (!document.getElementById('loading-dots-style')) {
      const style = document.createElement('style');
      style.id = 'loading-dots-style';
      style.textContent = `
        @keyframes loadingDots {
          0% { content: ''; }
          25% { content: '.'; }
          50% { content: '..'; }
          75% { content: '...'; }
          100% { content: ''; }
        }
        .loading-dots::after {
          content: '';
          animation: loadingDots 1.5s infinite;
          display: inline-block;
        }
        .processing-message {
          position: relative;
        }
        .processing-message::before {
          content: '';
          position: absolute;
          left: -10px;
          top: 50%;
          width: 5px;
          height: 5px;
          background-color: #4f46e5;
          border-radius: 50%;
          animation: pulse 1s infinite;
        }
        @keyframes pulse {
          0% { transform: scale(0.8); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(0.8); opacity: 0.5; }
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  return processingMessageId;
}

// Exporter les fonctions pour les rendre disponibles globalement
window.agentUtils = {
  addOrUpdateAgentChatMessage,
  formatFileSize,
  showFileProcessingMessage
};
