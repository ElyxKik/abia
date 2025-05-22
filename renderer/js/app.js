/**
 * Script principal de l'application ABIA4
 * Gère les interactions utilisateur, les vues et les appels API
 */

document.addEventListener('DOMContentLoaded', function() {
  // Masquer l'écran de chargement s'il existe
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.style.display = 'none';
  }
  
  // Récupération des éléments du DOM
  const themeToggle = document.getElementById('theme-toggle');
  const languageToggle = document.getElementById('language-toggle');
  const settingsButton = document.getElementById('settings-button');
  const newChatButton = document.getElementById('new-chat-button');
  const sendMessageButton = document.getElementById('send-message');
  const chatInput = document.getElementById('chat-input');
  const sidebar = document.getElementById('sidebar');
  
  // Récupération des vues
  const dashboardView = document.getElementById('dashboard-view');
  const chatView = document.getElementById('chat-view');
  
  // S'assurer que le tableau de bord est visible au démarrage
  if (dashboardView) {
    dashboardView.style.display = 'block';
  }
  
  // S'assurer que la vue de chat est masquée au démarrage
  if (chatView) {
    chatView.style.display = 'none';
  }
  
  // Récupération des liens de navigation
  const navLinks = document.querySelectorAll('a[href^="#"]');
  
  // Initialisation du thème
  initTheme();
  
  // Initialisation de la langue
  initLanguage();
  
  // Écouteurs d'événements - avec vérification de l'existence des éléments
  if (themeToggle) {
    console.log("Ajout de l'écouteur sur le bouton de thème");
    themeToggle.addEventListener('click', toggleTheme);
  } else {
    console.error("Bouton de thème non trouvé");
  }
  
  if (languageToggle) {
    console.log("Ajout de l'écouteur sur le bouton de langue");
    languageToggle.addEventListener('click', toggleLanguage);
  } else {
    console.error("Bouton de langue non trouvé");
  }
  
  if (settingsButton) {
    console.log("Ajout de l'écouteur sur le bouton de paramètres");
    settingsButton.addEventListener('click', openSettings);
  } else {
    console.error("Bouton de paramètres non trouvé");
  }
  
  // Écouteurs d'événements pour le bouton d'envoi
  if (sendMessageButton) {
    console.log("Ajout de l'écouteur sur le bouton d'envoi");
    sendMessageButton.addEventListener('click', sendMessage);
  } else {
    console.error("Bouton d'envoi non trouvé");
  }
  
  // Écouteur pour le téléchargement de fichiers
  const fileUploadInput = document.getElementById('file-upload');
  
  if (fileUploadInput) {
    console.log("Ajout de l'écouteur sur l'input de téléchargement de fichiers");
    
    // Gestion du téléchargement de fichiers
    fileUploadInput.addEventListener('change', (e) => {
      const files = e.target.files;
      if (files.length > 0) {
        console.log(`${files.length} fichier(s) sélectionné(s)`);
        // Appeler la fonction de gestion des fichiers
        if (typeof window.handleFileUpload === 'function') {
          window.handleFileUpload(files);
        } else {
          console.log("Fonction handleFileUpload non disponible");
          // Afficher un aperçu simple des fichiers
          const filePreview = document.getElementById('file-preview');
          if (filePreview) {
            filePreview.innerHTML = '';
            filePreview.classList.remove('hidden');
            
            Array.from(files).forEach(file => {
              const fileItem = document.createElement('div');
              fileItem.className = 'p-2 bg-neutral-100 dark:bg-neutral-800 rounded mb-2 flex items-center';
              fileItem.innerHTML = `
                <i class="fas fa-file mr-2"></i>
                <span class="text-sm">${file.name}</span>
                <span class="text-xs text-neutral-500 ml-2">(${(file.size / 1024).toFixed(1)} KB)</span>
              `;
              filePreview.appendChild(fileItem);
            });
          }
        }
      }
    });
  }
  
  if (newChatButton) {
    console.log("Ajout de l'écouteur sur le bouton de nouvelle conversation");
    newChatButton.addEventListener('click', startNewChat);
  } else {
    console.error("Bouton de nouvelle conversation non trouvé");  
  }
  
  // Initialiser les modules
  if (window.navigation && typeof window.navigation.init === 'function') {
    window.navigation.init();
  }
  
  if (window.commandButtons && typeof window.commandButtons.init === 'function') {
    window.commandButtons.init();
  }
  
  // Écouteur d'événement pour la touche Entrée dans le champ de saisie
  if (chatInput) {
    console.log("Ajout de l'écouteur sur le champ de saisie pour la touche Entrée");
    
    chatInput.addEventListener('keydown', handleChatInputKeydown);
    
    // Ajouter un placeholder pour contenteditable
    chatInput.addEventListener('focus', function() {
      if (this.innerHTML === '<p><br></p>' || this.innerHTML === '') {
        this.innerHTML = '<p><br></p>';
      }
    });
    
    chatInput.addEventListener('blur', function() {
      if (this.innerHTML === '<p><br></p>' || this.innerHTML.trim() === '') {
        this.innerHTML = '<p><br></p>';
      }
    });
  } else {
    console.error("Champ de saisie non trouvé");
  }
  
  // Fonction pour gérer l'événement keydown sur le champ de saisie
  function handleChatInputKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
      return false;
    }
    // Pour contenteditable, pas besoin d'ajuster manuellement la hauteur
    // car elle s'ajuste automatiquement
  }
  
  // Écouteurs d'événements pour les liens de navigation - avec vérification de sécurité
  if (navLinks && navLinks.length > 0) {
    console.log(`Attachement des écouteurs sur ${navLinks.length} liens de navigation`);
    navLinks.forEach(link => {
      if (link) {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const target = link.getAttribute('href').substring(1);
          if (typeof navigateTo === 'function') {
            navigateTo(target);
            
            // Marquer le lien actif
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
          } else {
            console.error("La fonction navigateTo n'est pas définie");
          }
        });
      }
    });
  } else {
    console.log("Aucun lien de navigation trouvé ou navLinks n'est pas un tableau");
  }
  
  // Écouteurs d'événements pour l'API Electron
  if (window.api) {
    window.api.onNewMessage((message) => {
      addAIMessage(message);
    });
    
    window.api.onThemeChange((isDark) => {
      setTheme(isDark ? 'dark' : 'light');
    });
    
    window.api.onLanguageChange((language) => {
      setLanguage(language);
    });
  }
  
  // Fonction pour initialiser le thème
  function initTheme() {
    if (window.api) {
      window.api.getStoreValue('darkMode', false)
        .then(isDark => {
          setTheme(isDark ? 'dark' : 'light');
        })
        .catch(() => {
          setTheme('light');
        });
    } else {
      // Fallback si l'API n'est pas disponible
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  }
  
  // Fonction pour définir le thème
  function setTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
  
  // Les fonctions handleFileUpload et showFilePreview ont été déplacées dans le module file-uploader.js
  
  // Fonction pour basculer le thème
  function toggleTheme() {
    const isDarkMode = document.documentElement.classList.contains('dark');
    const newTheme = isDarkMode ? 'light' : 'dark';
    
    // Animer les icônes avant de changer le thème
    const sunIcon = document.querySelector('#theme-toggle .fa-sun');
    const moonIcon = document.querySelector('#theme-toggle .fa-moon');
    
    if (sunIcon && moonIcon) {
      if (isDarkMode) {
        // Passage au mode clair: afficher le soleil, masquer la lune
        sunIcon.classList.remove('dark:theme-icon-out');
        sunIcon.classList.add('theme-icon-in');
        moonIcon.classList.remove('dark:theme-icon-in');
        moonIcon.classList.add('theme-icon-out');
      } else {
        // Passage au mode sombre: afficher la lune, masquer le soleil
        moonIcon.classList.remove('theme-icon-out');
        moonIcon.classList.add('dark:theme-icon-in');
        sunIcon.classList.remove('theme-icon-in');
        sunIcon.classList.add('dark:theme-icon-out');
      }
    }
    
    // Appliquer le changement de thème
    setTheme(newTheme);
    
    // Sauvegarder le réglage si l'API est disponible
    if (window.api) {
      window.api.setStoreValue('darkMode', newTheme === 'dark');
    }
  }
  
  // Fonction pour initialiser la langue
  function initLanguage() {
    if (window.api) {
      window.api.getStoreValue('language', 'fr')
        .then(language => {
          setLanguage(language);
        })
        .catch(() => {
          setLanguage('fr');
        });
    } else {
      // Fallback si l'API n'est pas disponible
      setLanguage('fr');
    }
  }
  
  // Fonction pour définir la langue
  function setLanguage(language) {
    document.documentElement.setAttribute('lang', language);
    
    // Mettre à jour le texte du bouton de langue
    if (languageToggle) {
      languageToggle.querySelector('span').textContent = language.toUpperCase();
    }
    
    // Mettre à jour les textes de l'interface en fonction de la langue
    updateUITexts(language);
  }
  
  // Fonction pour basculer la langue
  function toggleLanguage() {
    const currentLang = document.documentElement.getAttribute('lang') || 'fr';
    const newLang = currentLang === 'fr' ? 'en' : 'fr';
    
    setLanguage(newLang);
    
    if (window.api) {
      window.api.setStoreValue('language', newLang);
    }
  }
  
  // Fonction pour mettre à jour les textes de l'interface
  function updateUITexts(language) {
    const texts = language === 'fr' ? {
      welcome: "Bonjour ! Comment puis-je vous aider aujourd'hui ?",
      sendPlaceholder: "Envoyez un message...",
      newChat: "Nouvelle conversation",
      settings: "Paramètres",
      disclaimer: "ABIA peut faire des erreurs. Vérifiez les informations importantes."
    } : {
      welcome: "Hello! How can I help you today?",
      sendPlaceholder: "Send a message...",
      newChat: "New conversation",
      settings: "Settings",
      disclaimer: "ABIA can make mistakes. Verify important information."
    };
    
    // Mettre à jour les textes
    if (chatInput) {
      chatInput.setAttribute('placeholder', texts.sendPlaceholder);
    }
    
    if (newChatButton) {
      newChatButton.textContent = texts.newChat;
    }
    
    // Mettre à jour les autres textes si nécessaire
    const disclaimer = document.querySelector('.mt-2.text-xs.text-neutral-500');
    if (disclaimer) {
      disclaimer.textContent = texts.disclaimer;
    }
  }
  
  // Fonction pour ouvrir les paramètres
  function openSettings() {
    console.log("Ouverture des paramètres...");
    // TODO: Implémenter la logique pour ouvrir la fenêtre des paramètres
  }
  
  // Fonction pour démarrer une nouvelle conversation
  function startNewChat() {
    // Déléguer au module new-chat-button s'il est disponible
    if (window.newChatButton && typeof window.newChatButton.handleNewChatClick === 'function') {
      window.newChatButton.handleNewChatClick();
      return;
    }
    
    console.log("Démarrage d'une nouvelle conversation...");
    
    // Naviguer vers la vue de chat
    if (typeof navigateTo === 'function') {
      navigateTo('chat');
    } else {
      // Fallback si la fonction navigateTo n'est pas disponible
      const dashboardView = document.getElementById('dashboard-view');
      const chatView = document.getElementById('chat-view');
      
      if (dashboardView) dashboardView.style.display = 'none';
      if (chatView) chatView.style.display = 'flex';
    }
    
    // Récupérer le conteneur des messages
    const chatMessages = document.getElementById('chat-messages');
    
    if (!chatMessages) {
      console.error("Conteneur de messages non trouvé");
      return;
    }
    
    // Vider la conversation
    chatMessages.innerHTML = '';
    
    // Ajouter un message de bienvenue
    const welcomeMessage = document.createElement('div');
    welcomeMessage.className = 'chat-message chat-message-ai';
    welcomeMessage.innerHTML = `
      <div class="flex items-start">
        <div class="flex-shrink-0 h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
          <i class="fas fa-robot"></i>
        </div>
        <div class="ml-3">
          <p class="text-sm">Bonjour ! Comment puis-je vous aider aujourd'hui ?</p>
        </div>
      </div>
    `;
    
    chatMessages.appendChild(welcomeMessage);
    
    // Demander à l'API de créer une nouvelle session si disponible
    if (window.api && typeof window.api.createNewSession === 'function') {
      window.api.createNewSession()
        .then(() => {
          console.log("Nouvelle session créée avec succès");
          // Définir l'agent par défaut
          return window.api.setActiveAgent('chat'); // Utiliser 'chat' au lieu de 'ai'
        })
        .then(() => {
          console.log("Agent par défaut défini");
        })
        .catch(error => {
          console.error("Erreur lors de la création d'une nouvelle session:", error);
        });
    }
    
    // Effacer le champ de saisie
    if (chatInput) {
      chatInput.innerHTML = '<p><br></p>';
      chatInput.focus();
    }
  }
  
  // Fonction pour envoyer un message
  function sendMessage() {
    console.log("Fonction sendMessage appelée");
    
    // Récupérer le champ de saisie à chaque appel pour éviter les problèmes de référence
    const chatInputElement = document.getElementById('chat-input');
    
    if (!chatInputElement) {
      console.error("Champ de saisie non trouvé");
      return;
    }
    
    // Pour un élément contenteditable, on récupère le texte avec innerText ou textContent
    const message = chatInputElement.innerText.trim();
    console.log(`Message: "${message}"`);
    
    if (message && message !== '\n') {
      // Vider le champ de saisie
      chatInputElement.innerHTML = '<p><br></p>';
      
      // Vérifier s'il y a un fichier en attente
      console.log("Vérification de la présence d'un fichier en attente:", window.pendingFile);
      if (window.pendingFile && window.sendMessageWithFile && typeof window.sendMessageWithFile === 'function') {
        console.log("Fichier en attente détecté, envoi avec instructions:", message);
        // Si la fonction renvoie true, cela signifie qu'un fichier a été traité
        const fileProcessed = window.sendMessageWithFile(message);
        if (fileProcessed) {
          console.log("Message envoyé avec fichier joint");
          return; // Ne pas continuer avec le traitement normal du message
        }
      } else {
        console.log("Aucun fichier en attente ou fonction sendMessageWithFile non disponible");
      }
      
      // Si aucun fichier n'est en attente, traiter normalement le message
      // Ajouter le message à la conversation
      addUserMessage(message);
      
      // Traiter le message
      processUserMessage(message);
    } else {
      console.log("Message vide, rien à envoyer");
    }
  }
  
  // Fonction pour ajouter un message utilisateur à la conversation
  function addUserMessage(message) {
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
  }
  
  // Fonction pour ajouter un message de l'IA à la conversation
  function addAIMessage(message, actions = []) {
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
            <button class="btn ${action.primary ? 'btn-primary' : 'btn-outline'} text-sm py-1" data-action="${action.id || ''}" 
            ${action.data ? Object.entries(action.data).map(([key, value]) => `data-${key}="${value}"`).join(' ') : ''}>
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
    
    // Ajouter des écouteurs d'événements aux boutons d'action
    if (actions && actions.length > 0) {
      const actionButtons = messageElement.querySelectorAll('button[data-action]');
      actionButtons.forEach(button => {
        const actionId = button.getAttribute('data-action');
        const action = actions.find(a => a.id === actionId);
        
        if (action && action.handler) {
          button.addEventListener('click', action.handler);
        } else if (action) {
          // Gérer les actions prédéfinies basées sur le type
          switch (action.type) {
            case 'open_window':
              button.addEventListener('click', () => handleOpenWindow(action));
              break;
            case 'view_report':
              button.addEventListener('click', () => handleViewReport(action));
              break;
            case 'download':
              button.addEventListener('click', () => handleDownload(action));
              break;
            default:
              console.log(`Type d'action non géré: ${action.type}`);
          }
        }
      });
    }
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
    
    // Ouvrir le rapport dans une fenêtre modale ou dans un panneau
    if (window.excelReportViewer) {
      const reportContainer = document.getElementById('report-container') || 
                             document.createElement('div');
      
      if (!document.getElementById('report-container')) {
        reportContainer.id = 'report-container';
        reportContainer.className = 'p-4 bg-white dark:bg-neutral-800 rounded-lg shadow-lg';
        document.body.appendChild(reportContainer);
      }
      
      window.excelReportViewer.displayReport(action.data.report, 'report-container');
    } else {
      console.error("Le visualiseur de rapport Excel n'est pas disponible");
      alert("Le visualiseur de rapport Excel n'est pas disponible");
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
    
    // Utiliser l'API Electron pour télécharger le fichier
    window.api.saveFile({
      defaultPath: action.data.defaultName || 'rapport-excel.json',
      filters: [{ name: 'Fichiers JSON', extensions: ['json'] }]
    })
    .then(savePath => {
      if (savePath) {
        // Ici, il faudrait implémenter la copie du fichier source vers savePath
        // via une méthode IPC spécifique
        console.log(`Fichier à sauvegarder à: ${savePath}`);
      }
    })
    .catch(error => {
      console.error("Erreur lors du téléchargement du fichier:", error);
      alert(`Erreur lors du téléchargement du fichier: ${error.message || error}`);
    });
  }
  
  // Fonction pour traiter un message utilisateur
  function processUserMessage(message) {
    if (!message) return;
    
    // Vérifier si l'API est disponible
    if (window.api && typeof window.api.processQuery === 'function') {
      // Générer un ID de requête unique
      const requestId = 'req_' + Date.now();
      
      // Créer un élément de chargement
      const loadingElement = document.createElement('div');
      loadingElement.className = 'chat-message chat-message-ai';
      loadingElement.id = `loading-${requestId}`;
      
      // Déterminer le type d'agent et l'icône en fonction du contenu du message
      let agentType = 'chat'; // Utiliser 'chat' au lieu de 'ai' pour être compatible avec le backend
      let agentIcon = 'robot';
      let agentName = 'ABIA';
      let thinkingText = 'Je réfléchis...';
      
      if (message.toLowerCase().includes('excel') || message.toLowerCase().includes('tableau') || message.toLowerCase().includes('fichier')) {
        agentType = 'excel';
        agentIcon = 'table';
        agentName = 'Excel Agent';
        thinkingText = 'Analyse du tableau...';
      } else if (message.toLowerCase().includes('pdf') || message.toLowerCase().includes('document') || message.toLowerCase().includes('texte')) {
        agentType = 'document';
        agentIcon = 'file-alt';
        agentName = 'Document Agent';
        thinkingText = 'Analyse du document...';
      }
      
      // Définir l'agent actif via l'API
      window.api.setActiveAgent(agentType)
        .then(() => {
          console.log(`Agent actif défini sur: ${agentType}`);
          const chatMessages = document.getElementById('chat-messages');
          
          if (!chatMessages) {
            throw new Error("Conteneur de messages non trouvé");
          }
          
          // Créer l'élément de chargement avec l'icône et l'animation
          loadingElement.innerHTML = `
            <div class="flex items-start">
              <div class="flex-shrink-0 h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 agent-icon thinking">
                <i class="fas fa-${agentIcon}"></i>
              </div>
              <div class="ml-3">
                <div class="flex items-center">
                  <span class="text-xs text-neutral-500 dark:text-neutral-400 mr-2">${agentName}</span>
                  <div class="loading-animation">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                  </div>
                </div>
                <p class="text-sm mt-1"><span class="loading-text">${thinkingText}</span></p>
              </div>
            </div>
          `;
          
          // Ajouter l'élément de chargement à la conversation
          chatMessages.appendChild(loadingElement);
          
          // Faire défiler vers le bas pour voir le message de chargement
          chatMessages.scrollTop = chatMessages.scrollHeight;
          
          // Appeler l'API pour traiter le message avec l'ID de requête unique
          return window.api.processQuery(message, { requestId, skipCache: true });
        })
        .then(response => {
          // Remplacer le message de chargement par la réponse
          if (loadingElement && loadingElement.parentNode) {
            loadingElement.parentNode.removeChild(loadingElement);
          }
          
          // Ajouter la réponse avec les actions si disponibles
          if (response && response.message) {
            addAIMessage(response.message, response.actions || []);
          }
        })
        .catch(error => {
          console.error("Erreur lors du traitement du message:", error);
          
          // Supprimer le message de chargement en cas d'erreur
          if (loadingElement && loadingElement.parentNode) {
            loadingElement.parentNode.removeChild(loadingElement);
          }
          
          // Afficher un message d'erreur
          addAIMessage("Désolé, une erreur est survenue lors du traitement de votre demande. Veuillez réessayer.");
        });
    } else {
      // Mode hors ligne ou mode de développement sans API
      console.log("API non disponible, simulation de la réponse...");
      
      // Simuler un délai de réponse
      setTimeout(() => {
        addAIMessage("Je suis en mode hors ligne ou en développement. Votre message: \"" + message + "\"");
      }, 1000);
    }
  }
  
  // Fonction pour tester les boutons d'action
  function testActionButtons() {
    console.log("Test des boutons d'action...");
    
    const testActions = [
      {
        id: 'action1',
        text: 'Afficher plus',
        icon: 'plus',
        primary: true,
        handler: function() {
          console.log("Action 'Afficher plus' cliquée");
          addAIMessage("Voici plus d'informations comme demandé.");
        }
      },
      {
        id: 'action2',
        text: 'Télécharger',
        icon: 'download',
        primary: false,
        handler: function() {
          console.log("Action 'Télécharger' cliquée");
          
          // Simuler une action de téléchargement
          const link = document.createElement('a');
          link.href = 'data:text/plain;charset=utf-8,Contenu de test à télécharger';
          link.download = 'test.txt';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          addAIMessage("Téléchargement démarré.");
        }
      }
    ];
    
    addAIMessage("Voici un exemple de message avec des boutons d'action.", testActions);
  }
  
  // Fonction pour naviguer vers une vue
  function navigateTo(viewId) {
    // Déléguer à la fonction du module navigation si disponible
    if (window.navigation && typeof window.navigation.navigateTo === 'function') {
      window.navigation.navigateTo(viewId);
      return;
    }
    
    console.log(`Navigation vers: ${viewId}`);
    
    // Récupérer toutes les vues
    const views = document.querySelectorAll('[id$="-view"]');
    
    // Masquer toutes les vues
    views.forEach(view => {
      view.style.display = 'none';
    });
    
    // Afficher la vue demandée
    const targetView = document.getElementById(`${viewId}-view`);
    if (targetView) {
      targetView.style.display = 'flex';
    } else {
      console.error(`Vue cible non trouvée: ${viewId}-view`);
    }
  }
  
  // Rendre globalement disponibles certaines fonctions
  window.addUserMessage = addUserMessage;
  window.addAIMessage = addAIMessage;
  window.processUserMessage = processUserMessage;
  window.navigateTo = navigateTo;
  window.sendMessage = sendMessage;
  window.startNewChat = startNewChat;
  
  // Démarrer une nouvelle conversation au chargement de la page
  startNewChat();
});
