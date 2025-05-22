/**
 * Utilitaires communs pour les agents ABIA
 * Ce module contient des fonctions partagées entre les différents agents
 */

/**
 * Ajoute ou met à jour un message de l'agent dans la zone de chat principale.
 * @param {string|Object} messageOptions - Le contenu HTML du message ou un objet d'options avec content, actions, etc.
 * @param {string} messageId - Un ID unique pour ce message (optionnel si passé dans messageOptions).
 * @param {boolean} isProcessing - Si true, ajoute une classe pour un style de "traitement en cours".
 * @param {boolean} isHtml - Si true, interprète le contenu comme du HTML brut.
 * @returns {HTMLElement} L'élément de message créé ou mis à jour.
 */
function addOrUpdateAgentChatMessage(messageOptions, messageId, isProcessing = false, isHtml = false) {
  // Normaliser les options
  let content, actions = [], source, type;
  
  if (typeof messageOptions === 'string') {
    // Si c'est une simple chaîne de caractères
    content = messageOptions;
  } else if (typeof messageOptions === 'object') {
    // Si c'est un objet d'options
    content = messageOptions.content || messageOptions.text || '';
    actions = messageOptions.actions || [];
    messageId = messageOptions.id || messageId || `msg-${Date.now()}`;
    isProcessing = messageOptions.isProcessing || isProcessing;
    isHtml = messageOptions.isHtml || isHtml;
    source = messageOptions.source || 'ABIA';
    type = messageOptions.type || 'ai';
  } else {
    console.error('messageOptions doit être une chaîne ou un objet');
    return null;
  }
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
      contentElement.innerHTML = isHtml ? content : `<p class="text-sm">${content}</p>`;
      
      // Gérer les actions si elles existent
      let actionsContainer = messageElement.querySelector('.message-actions');
      
      // Supprimer les anciennes actions s'il y en a
      if (actionsContainer) {
        actionsContainer.remove();
      }
      
      // Ajouter les nouvelles actions si nécessaire
      if (actions && actions.length > 0) {
        actionsContainer = document.createElement('div');
        actionsContainer.className = 'message-actions mt-3 flex flex-wrap gap-2';
        
        // Créer les boutons d'action
        actions.forEach(action => {
          const button = document.createElement('button');
          button.className = `btn ${action.primary ? 'btn-primary' : 'btn-outline'} text-sm py-1`;
          button.dataset.action = action.id || '';
          
          // Ajouter les attributs data-* pour les données d'action
          if (action.data) {
            Object.entries(action.data).forEach(([key, value]) => {
              // Pour les objets JSON, stocker sous forme de chaîne
              if (typeof value === 'object') {
                button.dataset[key] = JSON.stringify(value);
              } else {
                button.dataset[key] = value;
              }
            });
          }
          
          // Ajouter l'icône si nécessaire
          if (action.icon) {
            const icon = document.createElement('i');
            icon.className = `fas fa-${action.icon} mr-1`;
            button.appendChild(icon);
          }
          
          // Ajouter le texte du bouton
          const textNode = document.createTextNode(action.text);
          button.appendChild(textNode);
          
          // Ajouter l'écouteur d'événement pour l'action
          button.addEventListener('click', () => {
            if (action.handler) {
              action.handler();
            } else {
              // Gérer les actions prédéfinies basées sur le type
              switch (action.type) {
                case 'open_window':
                  window.handleOpenWindow && window.handleOpenWindow(action);
                  break;
                case 'view_report':
                  window.handleViewReport && window.handleViewReport(action);
                  break;
                case 'download':
                  window.handleDownload && window.handleDownload(action);
                  break;
                default:
                  console.log(`Type d'action non géré: ${action.type}`);
              }
            }
          });
          
          actionsContainer.appendChild(button);
        });
        
        contentElement.appendChild(actionsContainer);
      }
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
    
    // Créer le contenu HTML de base
    const mainContent = isHtml ? content : `<p class="text-sm">${content}</p>`;
    
    // Générer le HTML pour les actions si nécessaire
    let actionsHTML = '';
    if (actions && actions.length > 0) {
      actionsHTML = `
        <div class="message-actions mt-3 flex flex-wrap gap-2">
          ${actions.map(action => `
            <button class="btn ${action.primary ? 'btn-primary' : 'btn-outline'} text-sm py-1" data-action="${action.id || ''}" 
            ${action.data ? Object.entries(action.data).map(([key, value]) => {
              // Pour les objets JSON, stocker sous forme de chaîne
              if (typeof value === 'object') {
                return `data-${key}='${JSON.stringify(value)}'`;
              } else {
                return `data-${key}="${value}"`;
              }
            }).join(' ') : ''}>
              ${action.icon ? `<i class="fas fa-${action.icon} mr-1"></i>` : ''}
              ${action.text}
            </button>
          `).join('')}
        </div>
      `;
    }
    
    // Structure du message identique aux réponses normales du LLM dans le chat
    messageElement.innerHTML = `
      <div class="flex items-start">
        <div class="flex-shrink-0 h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
          <i class="fas fa-robot"></i>
        </div>
        <div class="ml-3 chat-message-content">
          ${mainContent}
          ${actionsHTML}
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

/**
 * Gère l'action d'ouverture d'une fenêtre
 * @param {Object} action - Action avec les propriétés nécessaires
 */
function handleOpenWindow(action) {
  if (!action.data || !action.data.path) {
    console.error("Chemin de la fenêtre non spécifié");
    return;
  }
  
  console.log(`Ouverture de la fenêtre: ${action.data.path}`);
  window.api.openExcelWindow(action.data.path)
    .then(result => {
      if (!result.success) {
        console.error(`Erreur lors de l'ouverture de la fenêtre: ${result.error}`);
        alert(`Erreur lors de l'ouverture de la fenêtre: ${result.error}`);
      }
    })
    .catch(error => {
      console.error("Erreur lors de l'ouverture de la fenêtre:", error);
      alert(`Erreur lors de l'ouverture de la fenêtre: ${error.message || error}`);
    });
}

/**
 * Gère l'action d'affichage d'un rapport Excel
 * @param {Object} action - Action avec les propriétés nécessaires
 */
function handleViewReport(action) {
  if (!action.data || !action.data.report) {
    console.error("Données du rapport non spécifiées");
    return;
  }
  
  console.log(`Affichage du rapport:`, action.data.report);
  
  // Vérifier si le visualiseur de rapport est disponible
  if (!window.excelReportViewer) {
    console.error("Le visualiseur de rapport n'est pas disponible");
    alert("Le visualiseur de rapport n'est pas disponible. Veuillez réessayer ultérieurement.");
    return;
  }
  
  // Afficher le rapport dans l'interface utilisateur
  try {
    // S'assurer que le rapport est un objet si passé comme chaîne JSON
    let reportData = typeof action.data.report === 'string' 
      ? JSON.parse(action.data.report) 
      : action.data.report;
    
    // Vérifier si le rapport est déjà structuré ou s'il est contenu dans une propriété 'report'
    if (reportData.report && typeof reportData.report === 'object') {
      console.log('Extraction du rapport depuis la propriété report');
      reportData = reportData.report;
    }
    
    // Vérifier que le rapport contient les propriétés minimales requises
    if (!reportData.title) {
      reportData.title = reportData.fileName 
        ? `Rapport d'analyse: ${reportData.fileName}` 
        : 'Rapport d\'analyse Excel';
    }
    
    if (!reportData.sections && Array.isArray(reportData.data)) {
      // Convertir les anciennes structures en nouveau format
      reportData.sections = reportData.data.map(item => ({
        title: item.title || 'Section sans titre',
        content: item.content || item.text || JSON.stringify(item)
      }));
    }
    
    if (!reportData.sections) {
      reportData.sections = [];
    }
    
    console.log('Données de rapport préparées pour l\'affichage:', reportData);
    
    // Charger et afficher le rapport
    window.excelReportViewer.initialize();
    window.excelReportViewer.loadReportData(reportData);
  } catch (error) {
    console.error("Erreur lors de l'affichage du rapport:", error);
    alert(`Erreur lors de l'affichage du rapport: ${error.message || error}`);
  }
}

/**
 * Gère l'action de téléchargement d'un fichier
 * @param {Object} action - Action avec les propriétés nécessaires
 */
function handleDownload(action) {
  if (!action.data || !action.data.path) {
    console.error("Chemin du fichier non spécifié");
    return;
  }
  
  console.log(`Téléchargement du fichier: ${action.data.path}`);
  window.api.downloadFile(action.data.path, action.data.defaultName)
    .then(result => {
      if (!result.success) {
        console.error(`Erreur lors du téléchargement: ${result.error}`);
        alert(`Erreur lors du téléchargement: ${result.error}`);
      }
    })
    .catch(error => {
      console.error("Erreur lors du téléchargement:", error);
      alert(`Erreur lors du téléchargement: ${error.message || error}`);
    });
}

// Supprimer un message de traitement en cours
function removeProcessingMessage(messageId) {
  const messageElement = document.getElementById(messageId);
  if (messageElement) {
    messageElement.remove();
  }
}

// Exporter les fonctions pour les rendre disponibles globalement
window.agentUtils = {
  addOrUpdateAgentChatMessage,
  formatFileSize,
  showFileProcessingMessage,
  removeProcessingMessage
};

// Exporter également les gestionnaires d'action pour les rendre disponibles globalement
window.handleOpenWindow = handleOpenWindow;
window.handleViewReport = handleViewReport;
window.handleDownload = handleDownload;
