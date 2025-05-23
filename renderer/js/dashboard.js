/**
 * Module dashboard.js
 * Gère l'affichage et la mise à jour des données dans le tableau de bord
 * et la page d'historique
 */

// Fonction principale initialisée au chargement du document
document.addEventListener('DOMContentLoaded', function() {
  console.log("Initialisation du tableau de bord...");
  initDashboard();
  
  // Surveiller la navigation pour mettre à jour les données quand nécessaire
  if (window.navigation && typeof window.navigation.navigateTo === 'function') {
    const originalNavigateTo = window.navigation.navigateTo;
    
    // Surcharger la fonction navigateTo pour mettre à jour les données
    window.navigation.navigateTo = function(viewName) {
      originalNavigateTo(viewName);
      
      if (viewName === 'dashboard') {
        updateDashboardData();
      } else if (viewName === 'history') {
        loadHistoryData();
      }
    };
  }
});

/**
 * Initialise le tableau de bord
 */
async function initDashboard() {
  try {
    // Vérifier si l'API est disponible
    if (!window.api) {
      console.error("API non disponible pour charger les données du tableau de bord");
      return;
    }
    
    // Charger les données initiales
    await updateDashboardData();
    
    // Ajouter des écouteurs d'événements pour les boutons du tableau de bord
    setupDashboardListeners();
    
    console.log("Tableau de bord initialisé avec succès");
  } catch (error) {
    console.error("Erreur lors de l'initialisation du tableau de bord:", error);
  }
}

/**
 * Mise à jour des données du tableau de bord
 */
async function updateDashboardData() {
  try {
    console.log("Mise à jour des données du tableau de bord...");
    
    // Récupérer les statistiques
    const context = await window.api.getCurrentContext();
    const history = await window.api.getConversationHistory(10); // Limité à 10 conversations
    const activeAgent = await window.api.getActiveAgent();
    const activeFiles = await window.api.getActiveFiles();
    const sessions = await window.api.listSessions(5); // Limité à 5 sessions
    
    console.log("Données récupérées:", { context, history, activeAgent, activeFiles, sessions });
    
    // Mise à jour des statistiques
    updateStatistics(history, activeFiles);
    
    // Mise à jour de l'activité récente
    updateRecentActivity(history);
    
    // Mise à jour des conversations récentes dans la barre latérale
    updateRecentConversations(history);
    
    // Mise à jour des widgets
    updateWidgets(context, activeAgent, activeFiles);
    
    console.log("Données du tableau de bord mises à jour avec succès");
  } catch (error) {
    console.error("Erreur lors de la mise à jour des données du tableau de bord:", error);
  }
}

/**
 * Mise à jour de la section statistiques
 */
function updateStatistics(history, activeFiles) {
  // Compter le nombre de conversations
  const conversationCount = history ? history.length : 0;
  const conversationCountElement = document.querySelector('#stats-conversations-count');
  const conversationProgressElement = document.querySelector('#stats-conversations-progress');
  
  if (conversationCountElement) {
    conversationCountElement.textContent = conversationCount;
  }
  
  if (conversationProgressElement) {
    // Définir une progression relative (par exemple, 100% si plus de 30 conversations)
    const conversationProgress = Math.min(Math.round((conversationCount / 30) * 100), 100);
    conversationProgressElement.style.width = `${conversationProgress}%`;
  }
  
  // Compter les documents analysés
  const documentsCount = activeFiles ? activeFiles.filter(file => 
    file.type === 'document' || file.type === 'pdf').length : 0;
  const documentsCountElement = document.querySelector('#stats-documents-count');
  const documentsProgressElement = document.querySelector('#stats-documents-progress');
  
  if (documentsCountElement) {
    documentsCountElement.textContent = documentsCount;
  }
  
  if (documentsProgressElement) {
    const documentsProgress = Math.min(Math.round((documentsCount / 20) * 100), 100);
    documentsProgressElement.style.width = `${documentsProgress}%`;
  }
  
  // Compter les fichiers générés
  const filesCount = activeFiles ? activeFiles.filter(file => 
    file.type === 'generated' || file.generated).length : 0;
  const filesCountElement = document.querySelector('#stats-files-count');
  const filesProgressElement = document.querySelector('#stats-files-progress');
  
  if (filesCountElement) {
    filesCountElement.textContent = filesCount;
  }
  
  if (filesProgressElement) {
    const filesProgress = Math.min(Math.round((filesCount / 15) * 100), 100);
    filesProgressElement.style.width = `${filesProgress}%`;
  }
}

/**
 * Mise à jour de la section activité récente
 */
function updateRecentActivity(history) {
  const recentActivityContainer = document.querySelector('#recent-activity');
  
  if (!recentActivityContainer || !history || !history.length) {
    return;
  }
  
  // Vider le conteneur
  recentActivityContainer.innerHTML = '';
  
  // Prendre les 3 plus récentes activités
  const recentItems = history.slice(0, 3);
  
  recentItems.forEach(item => {
    const timestamp = new Date(item.timestamp || Date.now());
    const timeAgo = getTimeAgo(timestamp);
    
    let icon = 'comment-alt';
    let iconColor = 'primary';
    let activityText = 'Nouvelle conversation';
    
    // Extraire le titre de la conversation à partir du premier message utilisateur
    if (item.conversationHistory && item.conversationHistory.length > 0) {
      // Chercher le premier message de l'utilisateur
      const userMessages = item.conversationHistory.filter(msg => msg.role === 'user');
      if (userMessages && userMessages.length > 0 && userMessages[0].content) {
        // Limiter la longueur du titre à 30 caractères
        const content = userMessages[0].content.trim();
        activityText = content.length > 30 
          ? content.substring(0, 30) + '...' 
          : content;
      }
    }
    
    // Déterminer l'icône en fonction du type d'agent
    if (item.agent === 'excel') {
      icon = 'file-excel';
      iconColor = 'secondary';
    } else if (item.agent === 'document') {
      icon = 'file-pdf';
      iconColor = 'red';
    } else if (item.agent === 'mail') {
      icon = 'envelope';
      iconColor = 'green';
    }
    
    // Déterminer l'icône et le texte en fonction du type d'activité (pour la rétrocompatibilité)
    if (item.type === 'file' || item.files && item.files.length) {
      const fileType = item.fileType || (item.files && item.files[0] ? item.files[0].type : 'document');
      
      if (fileType.includes('excel') || fileType.includes('spreadsheet')) {
        icon = 'file-excel';
        iconColor = 'secondary';
        if (activityText === 'Nouvelle conversation') {
          activityText = 'Analyse Excel complétée';
        }
      } else if (fileType.includes('pdf') || fileType.includes('document')) {
        icon = 'file-pdf';
        iconColor = 'red';
        if (activityText === 'Nouvelle conversation') {
          activityText = 'Document analysé';
        }
      } else if (fileType.includes('mail') || fileType.includes('email')) {
        icon = 'envelope';
        iconColor = 'green';
        if (activityText === 'Nouvelle conversation') {
          activityText = 'Lettre générée';
        }
      }
    }
    
    // Créer l'élément HTML
    const activityElement = document.createElement('li');
    activityElement.className = 'flex items-start';
    activityElement.innerHTML = `
      <div class="flex-shrink-0 h-8 w-8 rounded-full bg-${iconColor}-100 dark:bg-${iconColor}-900/30 flex items-center justify-center text-${iconColor}-600 dark:text-${iconColor}-400">
        <i class="fas fa-${icon}"></i>
      </div>
      <div class="ml-3">
        <p class="text-sm font-medium">${activityText}</p>
        <p class="text-xs text-neutral-500 dark:text-neutral-400">${timeAgo}</p>
      </div>
    `;
    
    recentActivityContainer.appendChild(activityElement);
  });
}

/**
 * Mise à jour des widgets
 */
function updateWidgets(context, activeAgent, activeFiles) {
  // Mise à jour du widget "Tâches"
  updateTasksWidget(context);
  
  // Mise à jour du widget "Ressources"
  updateResourcesWidget(activeFiles);
  
  // Mise à jour du widget "Usage"
  updateUsageWidget(context);
}

/**
 * Mise à jour du widget Tâches
 */
function updateTasksWidget(context) {
  const tasksContainer = document.querySelector('#tasks-widget');
  
  if (!tasksContainer || !context || !context.tasks) {
    return;
  }
  
  // Récupérer les tâches du contexte
  const tasks = context.tasks || [];
  
  // Sélectionner le conteneur des tâches
  const tasksProgressContainer = tasksContainer.querySelector('.space-y-2');
  
  if (!tasksProgressContainer) {
    return;
  }
  
  // Vider le conteneur
  tasksProgressContainer.innerHTML = '';
  
  // Créer les barres de progression pour chaque tâche
  tasks.forEach(task => {
    const taskElement = document.createElement('div');
    taskElement.innerHTML = `
      <div class="flex justify-between mb-1">
        <span class="text-sm">${task.name || 'Tâche'}</span>
        <span class="text-xs">${task.progress || 0}%</span>
      </div>
      <div class="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
        <div class="bg-purple-600 h-2 rounded-full" style="width: ${task.progress || 0}%"></div>
      </div>
    `;
    
    tasksProgressContainer.appendChild(taskElement);
  });
  
  // Si aucune tâche n'est disponible, ajouter un message
  if (tasks.length === 0) {
    const noTasksElement = document.createElement('div');
    noTasksElement.className = 'text-sm text-neutral-500 text-center py-4';
    noTasksElement.textContent = 'Aucune tâche en cours';
    tasksProgressContainer.appendChild(noTasksElement);
  }
}

/**
 * Mise à jour du widget Ressources
 */
function updateResourcesWidget(activeFiles) {
  const resourcesContainer = document.querySelector('#resources-widget ul');
  
  if (!resourcesContainer) {
    return;
  }
  
  // Vider le conteneur
  resourcesContainer.innerHTML = '';
  
  // Ajouter les ressources par défaut
  const defaultResources = [
    { name: 'Guide utilisateur', icon: 'file-pdf', color: 'red' },
    { name: 'Tutoriel vidéo', icon: 'video', color: 'blue' },
    { name: 'FAQ', icon: 'question-circle', color: 'purple' }
  ];
  
  defaultResources.forEach(resource => {
    const resourceElement = document.createElement('li');
    resourceElement.innerHTML = `
      <a href="#" class="text-sm flex items-center">
        <i class="fas fa-${resource.icon} text-${resource.color}-500 mr-2"></i>
        <span>${resource.name}</span>
      </a>
    `;
    
    resourcesContainer.appendChild(resourceElement);
  });
  
  // Ajouter les fichiers actifs s'il y en a
  if (activeFiles && activeFiles.length > 0) {
    const recentFiles = activeFiles.slice(0, 2); // Limiter à 2 fichiers récents
    
    recentFiles.forEach(file => {
      let icon = 'file';
      let color = 'gray';
      
      // Déterminer l'icône en fonction du type de fichier
      if (file.type.includes('excel') || file.type.includes('spreadsheet')) {
        icon = 'file-excel';
        color = 'green';
      } else if (file.type.includes('pdf')) {
        icon = 'file-pdf';
        color = 'red';
      } else if (file.type.includes('word') || file.type.includes('document')) {
        icon = 'file-word';
        color = 'blue';
      } else if (file.type.includes('image')) {
        icon = 'file-image';
        color = 'yellow';
      }
      
      const fileElement = document.createElement('li');
      fileElement.innerHTML = `
        <a href="#" class="text-sm flex items-center" data-file-path="${file.path || ''}">
          <i class="fas fa-${icon} text-${color}-500 mr-2"></i>
          <span>${file.name || 'Fichier'}</span>
        </a>
      `;
      
      resourcesContainer.appendChild(fileElement);
    });
  }
}

/**
 * Mise à jour du widget Usage (consommation de tokens)
 */
function updateUsageWidget(context) {
  const usageContainer = document.querySelector('#usage-widget');
  
  if (!usageContainer) {
    return;
  }
  
  // Récupérer les éléments du DOM pour les statistiques d'usage
  const todayCountElement = usageContainer.querySelector('#tokens-today-count');
  const todayProgressElement = usageContainer.querySelector('#tokens-today-progress');
  const monthCountElement = usageContainer.querySelector('#tokens-month-count');
  const monthProgressElement = usageContainer.querySelector('#tokens-month-progress');
  const costElement = usageContainer.querySelector('#tokens-cost');
  const modelElement = usageContainer.querySelector('#current-model');
  const lastCallElement = usageContainer.querySelector('#last-api-call');
  
  // Vérifier que les éléments existent
  if (!todayCountElement || !todayProgressElement || !monthCountElement || !monthProgressElement || !costElement || !modelElement || !lastCallElement) {
    console.error('Certains éléments du widget Usage sont manquants');
    return;
  }
  
  // Récupérer les statistiques d'usage depuis le contexte ou via l'API
  let tokenStats = {
    today: 0,
    month: 0,
    total: 0,
    lastCall: null,
    model: 'DeepSeek'
  };
  
  // Si nous avons des statistiques dans le contexte, les utiliser
  if (context && context.tokenStats) {
    tokenStats = { ...tokenStats, ...context.tokenStats };
  }
  
  // Sinon, essayer de les récupérer via l'API
  else if (window.api && typeof window.api.getTokenStats === 'function') {
    window.api.getTokenStats()
      .then(stats => {
        if (stats) {
          tokenStats = { ...tokenStats, ...stats };
          updateUsageDisplay();
        }
      })
      .catch(error => {
        console.error('Erreur lors de la récupération des statistiques de tokens:', error);
      });
  }
  
  // Mettre à jour l'affichage avec les données disponibles
  updateUsageDisplay();
  
  function updateUsageDisplay() {
    // Mettre à jour les compteurs de tokens
    todayCountElement.textContent = formatNumber(tokenStats.today);
    monthCountElement.textContent = formatNumber(tokenStats.month);
    
    // Calculer les pourcentages pour les barres de progression
    // Supposons qu'une utilisation quotidienne "normale" est de 10 000 tokens
    const dailyLimit = 10000;
    const monthlyLimit = 300000; // ~10 000 * 30 jours
    
    const todayProgress = Math.min(Math.round((tokenStats.today / dailyLimit) * 100), 100);
    const monthProgress = Math.min(Math.round((tokenStats.month / monthlyLimit) * 100), 100);
    
    todayProgressElement.style.width = `${todayProgress}%`;
    monthProgressElement.style.width = `${monthProgress}%`;
    
    // Calculer le coût estimé (prix approximatif pour DeepSeek: 0.001$ par 1000 tokens)
    const tokenPrice = 0.001; // $ par 1000 tokens
    const estimatedCost = (tokenStats.month / 1000) * tokenPrice;
    costElement.textContent = `${estimatedCost.toFixed(2)} $`;
    
    // Mettre à jour le modèle
    modelElement.textContent = tokenStats.model || 'DeepSeek';
    
    // Mettre à jour la date du dernier appel
    if (tokenStats.lastCall) {
      const lastCallDate = new Date(tokenStats.lastCall);
      lastCallElement.textContent = getTimeAgo(lastCallDate);
    } else {
      lastCallElement.textContent = 'Jamais';
    }
  }
  
  // Fonction utilitaire pour formater les nombres
  function formatNumber(num) {
    return new Intl.NumberFormat('fr-FR').format(num);
  }
}

/**
 * Charge les données pour la page d'historique
 */
async function loadHistoryData() {
  try {
    console.log("Chargement des données d'historique...");
    
    // Vérifier si l'API est disponible
    if (!window.api) {
      console.error("API non disponible pour charger l'historique");
      return;
    }
    
    // Récupérer l'historique complet des conversations
    const history = await window.api.getConversationHistory(30); // Limité à 30 conversations
    const sessions = await window.api.listSessions(20); // Limité à 20 sessions
    
    // Mettre à jour l'interface avec les données récupérées
    updateHistoryView(history, sessions);
    
    console.log("Données d'historique chargées avec succès");
  } catch (error) {
    console.error("Erreur lors du chargement des données d'historique:", error);
  }
}

/**
 * Met à jour la vue d'historique avec les conversations et sessions récentes
 * @param {Array} history - Liste des conversations
 * @param {Array} sessions - Liste des sessions
 */
function updateHistoryView(history, sessions) {
  // Récupérer le conteneur de l'historique
  const historyView = document.getElementById('history-view');
  
  if (!historyView) {
    console.error("Vue d'historique non trouvée");
    
    // Créer la vue d'historique si elle n'existe pas
    createHistoryView();
    return;
  }
  
  // Construire la liste des conversations récentes avec le nouveau design
  const conversationsContainer = historyView.querySelector('#history-conversations');
  
  if (conversationsContainer) {
    // Vider le conteneur
    conversationsContainer.innerHTML = '';
    
    // Ajouter un message si aucune conversation n'est disponible
    if (!history || history.length === 0) {
      conversationsContainer.innerHTML = `
        <div id="history-empty-message" class="col-span-full flex flex-col items-center justify-center py-16">
          <div class="w-20 h-20 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-6">
            <i class="fas fa-comment-slash text-neutral-400 dark:text-neutral-600 text-3xl"></i>
          </div>
          <p class="text-lg text-neutral-500 dark:text-neutral-400 text-center mb-4">Aucune conversation disponible</p>
          <button id="start-new-conversation" class="btn btn-primary">
            <i class="fas fa-plus mr-2"></i>Démarrer une conversation
          </button>
        </div>
      `;
      
      // Ajouter un écouteur d'événement pour le bouton de nouvelle conversation
      const newConvoButton = conversationsContainer.querySelector('#start-new-conversation');
      if (newConvoButton) {
        newConvoButton.addEventListener('click', () => {
          if (window.navigation && typeof window.navigation.navigateTo === 'function') {
            window.navigation.navigateTo('chat');
          }
        });
      }
      
      // Mettre à jour les informations de pagination
      updatePaginationInfo(0);
      return;
    }
    
    // Ajouter un élément pour le message vide (masqué par défaut)
    const emptyMessageElement = document.createElement('div');
    emptyMessageElement.id = 'history-empty-message';
    emptyMessageElement.className = 'col-span-full flex flex-col items-center justify-center py-16';
    emptyMessageElement.style.display = 'none';
    emptyMessageElement.innerHTML = `
      <div class="w-20 h-20 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-6">
        <i class="fas fa-search text-neutral-400 dark:text-neutral-600 text-3xl"></i>
      </div>
      <p class="text-lg text-neutral-500 dark:text-neutral-400 text-center">Aucune conversation ne correspond à votre recherche</p>
    `;
    conversationsContainer.appendChild(emptyMessageElement);
    
    // Ajouter chaque conversation avec le nouveau design moderne
    history.forEach(convo => {
      // S'assurer que la conversation a un timestamp valide
      const timestamp = convo.timestamp || convo.createdAt || Date.now();
      const convoDate = new Date(timestamp);
      
      // Formater la date pour l'affichage
      const timeAgo = getTimeAgo(convoDate);
      const fullDateTime = formatDateTime(convoDate);
      
      // Déterminer l'icône et la couleur en fonction du type de conversation
      let icon = 'comment-alt';
      let iconColor = 'primary';
      let agentType = 'chat';
      
      if (convo.agent === 'excel') {
        icon = 'file-excel';
        iconColor = 'secondary';
        agentType = 'excel';
      } else if (convo.agent === 'document') {
        icon = 'file-pdf';
        iconColor = 'red';
        agentType = 'document';
      } else if (convo.agent === 'mail') {
        icon = 'envelope';
        iconColor = 'green';
        agentType = 'mail';
      } else if (convo.agent === 'translation') {
        icon = 'language';
        iconColor = 'blue';
        agentType = 'translation';
      }
      
      // Trouver le premier message de l'utilisateur pour l'utiliser comme titre
      let conversationTitle = 'Conversation';
      let lastMessage = 'Aucun message';
      
      // Si nous avons un historique de messages, utiliser la première question de l'utilisateur comme titre
      if (convo.conversationHistory && convo.conversationHistory.length > 0) {
        // Chercher le premier message de l'utilisateur
        const userMessages = convo.conversationHistory.filter(msg => msg.role === 'user');
        if (userMessages && userMessages.length > 0 && userMessages[0].content) {
          // Limiter la longueur du titre à 40 caractères
          const content = userMessages[0].content.trim();
          conversationTitle = content.length > 40 
            ? content.substring(0, 40) + '...' 
            : content;
          
          // Utiliser le dernier message comme aperçu
          const lastMsg = convo.conversationHistory[convo.conversationHistory.length - 1];
          if (lastMsg && lastMsg.content) {
            const lastContent = lastMsg.content.trim();
            lastMessage = lastContent.length > 60
              ? lastContent.substring(0, 60) + '...'
              : lastContent;
          }
        }
      }
      
      // S'assurer que l'ID de session est valide
      const sessionId = convo.sessionId || convo._id || convo.id || '';
      
      // Créer un élément pour la conversation avec le nouveau design moderne
      const convoElement = document.createElement('div');
      convoElement.className = 'bg-white dark:bg-neutral-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden';
      convoElement.setAttribute('data-session-id', sessionId);
      convoElement.setAttribute('data-timestamp', timestamp);
      convoElement.setAttribute('data-agent-type', agentType);
      convoElement.setAttribute('data-title', conversationTitle);
      convoElement.setAttribute('data-content', lastMessage);
      
      convoElement.innerHTML = `
        <div class="p-4 cursor-pointer">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center">
              <div class="flex-shrink-0 h-10 w-10 rounded-full bg-${iconColor}-100 dark:bg-${iconColor}-900/30 flex items-center justify-center text-${iconColor}-600 dark:text-${iconColor}-400">
                <i class="fas fa-${icon}"></i>
              </div>
              <span class="text-xs font-medium ml-2 px-2 py-1 rounded-full bg-${iconColor}-100 dark:bg-${iconColor}-900/30 text-${iconColor}-600 dark:text-${iconColor}-400">
                ${agentType.charAt(0).toUpperCase() + agentType.slice(1)}
              </span>
            </div>
            <div class="flex items-center text-xs text-neutral-500 dark:text-neutral-400" title="${fullDateTime}">
              <i class="fas fa-clock mr-1"></i>
              <span>${timeAgo}</span>
            </div>
          </div>
          
          <h3 class="text-md font-medium text-neutral-800 dark:text-white mb-2 line-clamp-1">${conversationTitle}</h3>
          <p class="text-sm text-neutral-600 dark:text-neutral-400 truncate mb-3">${convo.lastMessage || lastMessage}</p>
          
          <div class="flex justify-between items-center">
            <span class="text-xs text-neutral-500 dark:text-neutral-400">
              ${convo.conversationHistory ? convo.conversationHistory.length : 0} message${convo.conversationHistory && convo.conversationHistory.length !== 1 ? 's' : ''}
            </span>
            <button class="btn btn-xs btn-primary load-conversation-btn" data-session-id="${sessionId}">
              Ouvrir
            </button>
          </div>
        </div>
      `;
      
      // Ajouter un écouteur d'événement pour charger la conversation quand on clique dessus
      convoElement.addEventListener('click', (e) => {
        // Ne pas déclencher si on a cliqué sur le bouton
        if (e.target.closest('.load-conversation-btn')) return;
        
        // Charger la session
        loadSession(sessionId);
      });
      
      // Ajouter un écouteur d'événement spécifique pour le bouton
      const loadButton = convoElement.querySelector('.load-conversation-btn');
      if (loadButton) {
        loadButton.addEventListener('click', (e) => {
          e.stopPropagation(); // Empêcher la propagation au parent
          loadSession(sessionId);
        });
      }
      
      conversationsContainer.appendChild(convoElement);
    });
  } else {
    console.error("Conteneur de conversations non trouvé");
  }
}

/**
 * Crée la vue d'historique avec un design simple et moderne
 */
function createHistoryView() {
  console.log("Création de la vue d'historique avec design moderne...");
  
  // Récupérer le conteneur de contenu
  const contentContainer = document.getElementById('content');
  
  if (!contentContainer) {
    console.error("Conteneur de contenu non trouvé");
    return;
  }
  
  // Créer l'élément de vue d'historique
  const historyView = document.createElement('div');
  historyView.id = 'history-view';
  historyView.className = 'h-full flex flex-col';
  historyView.style.display = 'none';
  
  // Structure HTML de la vue d'historique avec un design simple et moderne
  historyView.innerHTML = `
    <div class="flex-none p-6 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 class="text-2xl font-bold text-neutral-800 dark:text-white">Historique</h1>
        
        <div class="flex items-center space-x-2">
          <div class="relative flex-grow md:w-64">
            <input type="text" id="history-search" placeholder="Rechercher..." 
              class="w-full pl-10 pr-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 
              bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i class="fas fa-search text-neutral-400"></i>
            </div>
          </div>
          
          <button id="history-view-refresh" class="btn btn-icon btn-outline">
            <i class="fas fa-sync-alt"></i>
          </button>
          
          <button id="history-view-new-chat" class="btn btn-primary">
            <i class="fas fa-plus mr-2"></i>Nouvelle
          </button>
        </div>
      </div>
      
      <!-- Filtres rapides -->
      <div class="flex flex-wrap gap-2 mt-4">
        <button class="history-filter-btn px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-400 active" data-filter="all">Toutes</button>
        <button class="history-filter-btn px-3 py-1 rounded-full text-sm font-medium bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300" data-filter="chat">
          <i class="fas fa-comment-alt mr-1"></i>Chat
        </button>
        <button class="history-filter-btn px-3 py-1 rounded-full text-sm font-medium bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300" data-filter="excel">
          <i class="fas fa-file-excel mr-1"></i>Excel
        </button>
        <button class="history-filter-btn px-3 py-1 rounded-full text-sm font-medium bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300" data-filter="document">
          <i class="fas fa-file-pdf mr-1"></i>Document
        </button>
        <button class="history-filter-btn px-3 py-1 rounded-full text-sm font-medium bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300" data-filter="mail">
          <i class="fas fa-envelope mr-1"></i>Email
        </button>
      </div>
    </div>
    
    <!-- Liste des conversations -->
    <div class="flex-grow overflow-y-auto bg-neutral-50 dark:bg-neutral-900/50">
      <div id="history-conversations" class="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div class="flex justify-center items-center py-12 col-span-full">
          <div class="flex flex-col items-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mb-4"></div>
            <p class="text-neutral-500 dark:text-neutral-400">Chargement des conversations...</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Pagination -->
    <div class="flex-none p-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
      <div class="flex justify-between items-center">
        <button id="history-prev-page" class="btn btn-sm btn-outline" disabled>
          <i class="fas fa-chevron-left mr-2"></i>Précédent
        </button>
        <span id="history-page-info" class="text-sm text-neutral-500 dark:text-neutral-400">Page 1 sur 1</span>
        <button id="history-next-page" class="btn btn-sm btn-outline" disabled>
          Suivant<i class="fas fa-chevron-right ml-2"></i>
        </button>
      </div>
    </div>
  `;
  
  // Ajouter la vue au conteneur de contenu
  contentContainer.appendChild(historyView);
  
  // Ajouter les écouteurs d'événements pour les boutons
  const refreshButton = historyView.querySelector('#history-view-refresh');
  if (refreshButton) {
    refreshButton.addEventListener('click', () => {
      loadHistoryData();
      showToast('Actualisation', 'Historique actualisé avec succès', 'success');
    });
  }
  
  const newChatButton = historyView.querySelector('#history-view-new-chat');
  if (newChatButton) {
    newChatButton.addEventListener('click', () => {
      if (window.navigation && typeof window.navigation.navigateTo === 'function') {
        window.navigation.navigateTo('chat');
      }
    });
  }
  
  // Ajouter les écouteurs d'événements pour les filtres
  const filterButtons = historyView.querySelectorAll('.history-filter-btn');
  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Retirer la classe active de tous les boutons
      filterButtons.forEach(btn => btn.classList.remove('active'));
      // Ajouter la classe active au bouton cliqué
      button.classList.add('active');
      
      // Appliquer le filtre
      const filter = button.getAttribute('data-filter');
      applyHistoryFilter(filter);
    });
  });
  
  // Ajouter l'écouteur d'événement pour la recherche
  const searchInput = historyView.querySelector('#history-search');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(() => {
      const searchTerm = searchInput.value.trim().toLowerCase();
      applyHistorySearch(searchTerm);
    }, 300));
  }
  
  console.log("Vue d'historique créée avec succès");
  
  // Charger les données pour la nouvelle vue
  loadHistoryData();
}

/**
 * Charge une session spécifique
 */
/**
 * Charge une session de conversation à partir de son ID
 * @param {string} sessionId - Identifiant de la session à charger
 * @returns {Promise<boolean>} - True si la session a été chargée avec succès, false sinon
 */
async function loadSession(sessionId) {
  // Vérifier que l'ID de session est valide
  if (!sessionId) {
    console.error("Impossible de charger la session: ID de session manquant");
    showToast("Erreur", "Impossible de charger la conversation: identifiant manquant", "error");
    return false;
  }
  
  try {
    console.log(`Chargement de la session ${sessionId}...`);
    
    // Afficher un indicateur de chargement
    const loadingToastId = showToast("Chargement", "Chargement de la conversation en cours...", "info", true);
    
    // Vérifier si l'API est disponible
    if (!window.api) {
      console.error("API non disponible pour charger la session");
      hideToast(loadingToastId);
      showToast("Erreur", "Service de conversation non disponible", "error");
      return false;
    }
    
    // Appeler l'API pour charger la session
    await window.api.loadSession(sessionId);
    
    // Masquer l'indicateur de chargement
    hideToast(loadingToastId);
    
    // Naviguer vers la vue de chat
    if (window.navigation && typeof window.navigation.navigateTo === 'function') {
      window.navigation.navigateTo('chat');
      showToast("Succès", "Conversation chargée avec succès", "success");
    } else {
      console.error("Navigation non disponible pour accéder à la vue de chat");
      showToast("Avertissement", "Conversation chargée mais impossible d'afficher la vue de chat", "warning");
    }
    
    console.log(`Session ${sessionId} chargée avec succès`);
    return true;
  } catch (error) {
    console.error(`Erreur lors du chargement de la session ${sessionId}:`, error);
    showToast("Erreur", `Impossible de charger la conversation: ${error.message || 'Erreur inconnue'}`  , "error");
    return false;
  }
}

/**
 * Ajoute des écouteurs d'événements pour les boutons du tableau de bord
 */
function setupDashboardListeners() {
  // Bouton "Voir tout" du widget Tâches
  const viewAllTasksButton = document.querySelector('#tasks-widget .btn');
  if (viewAllTasksButton) {
    viewAllTasksButton.addEventListener('click', () => {
      // Naviguer vers une page détaillée ou afficher un modal
      console.log("Affichage de toutes les tâches...");
    });
  }
  
  // Bouton "Enregistrer" pour les notes rapides
  const saveNoteButton = document.querySelector('#quick-notes-card .btn');
  if (saveNoteButton) {
    saveNoteButton.addEventListener('click', () => {
      const noteTextarea = document.querySelector('#quick-notes-card textarea');
      if (noteTextarea && noteTextarea.value.trim()) {
        console.log("Enregistrement de la note:", noteTextarea.value);
        // Logique pour sauvegarder la note
        
        // Afficher un feedback visuel
        const originalText = saveNoteButton.textContent;
        saveNoteButton.textContent = 'Enregistré !';
        saveNoteButton.classList.add('btn-success');
        
        // Rétablir après 2 secondes
        setTimeout(() => {
          saveNoteButton.textContent = originalText;
          saveNoteButton.classList.remove('btn-success');
        }, 2000);
      }
    });
  }
}

/**
 * Convertit une date en texte "il y a X temps"
 */
/**
 * Formate une date en texte relatif (il y a X minutes, etc.)
 * @param {Date|string} dateInput - Date à formater (objet Date ou chaîne ISO)
 * @returns {string} - Texte formaté
 */
function getTimeAgo(dateInput) {
  // S'assurer que nous avons un objet Date valide
  let date;
  if (typeof dateInput === 'string') {
    // Essayer de parser la chaîne ISO
    try {
      date = new Date(dateInput);
    } catch (e) {
      console.error('Erreur lors du parsing de la date:', e);
      date = new Date(); // Fallback à la date actuelle
    }
  } else if (dateInput instanceof Date) {
    date = dateInput;
  } else {
    console.error('Format de date non valide:', dateInput);
    date = new Date(); // Fallback à la date actuelle
  }
  
  // Vérifier si la date est valide
  if (isNaN(date.getTime())) {
    console.error('Date invalide:', dateInput);
    return 'Date inconnue';
  }
  
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  
  // Si la date est dans le futur (peut arriver si les horloges ne sont pas synchronisées)
  if (diffMs < 0) {
    return formatDateTime(date); // Afficher la date complète
  }
  
  if (diffSec < 60) {
    return "À l'instant";
  } else if (diffMin < 60) {
    return `Il y a ${diffMin} minute${diffMin > 1 ? 's' : ''}`;
  } else if (diffHour < 24) {
    return `Il y a ${diffHour} heure${diffHour > 1 ? 's' : ''}`;
  } else if (diffDay < 7) {
    return `Il y a ${diffDay} jour${diffDay > 1 ? 's' : ''}`;
  } else if (diffWeek < 4) {
    return `Il y a ${diffWeek} semaine${diffWeek > 1 ? 's' : ''}`;
  } else {
    // Pour les dates plus anciennes, afficher la date complète
    return formatDateTime(date);
  }
}

/**
 * Formate une date en format lisible
 * @param {Date|string} dateInput - Date à formater
 * @returns {string} - Date formatée
 */
function formatDateTime(dateInput) {
  // S'assurer que nous avons un objet Date valide
  let date;
  if (typeof dateInput === 'string') {
    try {
      date = new Date(dateInput);
    } catch (e) {
      console.error('Erreur lors du parsing de la date:', e);
      return 'Date inconnue';
    }
  } else if (dateInput instanceof Date) {
    date = dateInput;
  } else {
    console.error('Format de date non valide:', dateInput);
    return 'Date inconnue';
  }
  
  // Vérifier si la date est valide
  if (isNaN(date.getTime())) {
    console.error('Date invalide:', dateInput);
    return 'Date inconnue';
  }
  
  // Formater la date et l'heure
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Affiche une notification toast à l'utilisateur
 * @param {string} title - Titre de la notification
 * @param {string} message - Message à afficher
 * @param {string} type - Type de notification (success, error, warning, info)
 * @param {boolean} persistent - Si true, la notification ne disparaitra pas automatiquement
 * @returns {string} - ID unique de la notification
 */
function showToast(title, message, type = 'info', persistent = false) {
  // Générer un ID unique pour cette notification
  const toastId = 'toast-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  
  // Déterminer l'icône en fonction du type
  let icon = 'info-circle';
  let bgColor = 'bg-blue-100 dark:bg-blue-900/30';
  let textColor = 'text-blue-600 dark:text-blue-400';
  
  if (type === 'success') {
    icon = 'check-circle';
    bgColor = 'bg-green-100 dark:bg-green-900/30';
    textColor = 'text-green-600 dark:text-green-400';
  } else if (type === 'error') {
    icon = 'exclamation-circle';
    bgColor = 'bg-red-100 dark:bg-red-900/30';
    textColor = 'text-red-600 dark:text-red-400';
  } else if (type === 'warning') {
    icon = 'exclamation-triangle';
    bgColor = 'bg-yellow-100 dark:bg-yellow-900/30';
    textColor = 'text-yellow-600 dark:text-yellow-400';
  }
  
  // Créer le conteneur de notifications s'il n'existe pas
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2';
    document.body.appendChild(toastContainer);
  }
  
  // Créer l'élément toast
  const toastElement = document.createElement('div');
  toastElement.id = toastId;
  toastElement.className = `flex items-center p-4 mb-2 rounded-lg shadow-md bg-white dark:bg-neutral-800 border-l-4 border-${type === 'info' ? 'blue' : type === 'success' ? 'green' : type === 'warning' ? 'yellow' : 'red'}-500 transform transition-all duration-300 ease-in-out translate-x-0 opacity-100`;
  toastElement.innerHTML = `
    <div class="flex-shrink-0 h-8 w-8 rounded-full ${bgColor} flex items-center justify-center ${textColor} mr-3">
      <i class="fas fa-${icon}"></i>
    </div>
    <div class="flex-1">
      <h4 class="text-sm font-medium">${title}</h4>
      <p class="text-xs text-neutral-600 dark:text-neutral-300">${message}</p>
    </div>
    <button class="ml-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200" aria-label="Fermer" data-toast-id="${toastId}">
      <i class="fas fa-times"></i>
    </button>
  `;
  
  // Ajouter le toast au conteneur
  toastContainer.appendChild(toastElement);
  
  // Ajouter un écouteur d'événement pour le bouton de fermeture
  const closeButton = toastElement.querySelector(`button[data-toast-id="${toastId}"]`);
  if (closeButton) {
    closeButton.addEventListener('click', () => hideToast(toastId));
  }
  
  // Faire disparaître automatiquement le toast après 5 secondes si non persistent
  if (!persistent) {
    setTimeout(() => hideToast(toastId), 5000);
  }
  
  return toastId;
}

/**
 * Masque une notification toast
 * @param {string} toastId - ID de la notification à masquer
 */
function hideToast(toastId) {
  const toastElement = document.getElementById(toastId);
  if (!toastElement) return;
  
  // Animer la disparition
  toastElement.classList.add('translate-x-full', 'opacity-0');
  
  // Supprimer l'élément après l'animation
  setTimeout(() => {
    if (toastElement && toastElement.parentNode) {
      toastElement.parentNode.removeChild(toastElement);
    }
  }, 300);
}

/**
 * Mise à jour de la liste des conversations récentes dans la barre latérale
 */
function updateRecentConversations(history) {
  const recentConversationsContainer = document.querySelector('#recent-conversations');
  
  if (!recentConversationsContainer) {
    return;
  }
  
  // Vider le conteneur
  recentConversationsContainer.innerHTML = '';
  
  // Si aucune conversation n'est disponible, afficher un message
  if (!history || history.length === 0) {
    const emptyElement = document.createElement('li');
    emptyElement.className = 'px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400';
    emptyElement.textContent = 'Aucune conversation';
    recentConversationsContainer.appendChild(emptyElement);
    return;
  }
  
  // Prendre les 4 plus récentes conversations
  const recentConversations = history.slice(0, 4);
  
  recentConversations.forEach(conversation => {
    // Trouver le premier message de l'utilisateur pour l'utiliser comme titre
    let conversationTitle = 'Conversation';
    let sessionId = conversation.sessionId || '';
    
    // Si nous avons un historique de messages, utiliser la première question de l'utilisateur comme titre
    if (conversation.conversationHistory && conversation.conversationHistory.length > 0) {
      // Chercher le premier message de l'utilisateur
      const userMessages = conversation.conversationHistory.filter(msg => msg.role === 'user');
      if (userMessages && userMessages.length > 0 && userMessages[0].content) {
        // Limiter la longueur du titre à 20 caractères
        const content = userMessages[0].content.trim();
        conversationTitle = content.length > 20 
          ? content.substring(0, 20) + '...' 
          : content;
      }
    }
    
    // Déterminer l'icône en fonction du type de conversation
    let icon = 'comment-alt';
    
    if (conversation.agent === 'excel') {
      icon = 'file-excel';
    } else if (conversation.agent === 'document') {
      icon = 'file-pdf';
    } else if (conversation.agent === 'mail') {
      icon = 'envelope';
    }
    
    // Créer l'élément de conversation
    const conversationElement = document.createElement('li');
    conversationElement.innerHTML = `
      <a href="#chat" class="sidebar-item" data-session-id="${sessionId}">
        <i class="fas fa-${icon} mr-3"></i>
        <span class="truncate">${conversationTitle}</span>
      </a>
    `;
    
    // Ajouter un écouteur d'événement pour charger la conversation quand on clique dessus
    const conversationLink = conversationElement.querySelector('a');
    if (conversationLink) {
      conversationLink.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Naviguer vers la vue de chat
        if (window.navigation && typeof window.navigation.navigateTo === 'function') {
          window.navigation.navigateTo('chat');
        }
        
        // Charger la conversation si un ID de session est disponible
        if (sessionId && window.api && typeof window.api.loadContext === 'function') {
          window.api.loadContext(sessionId)
            .then(() => {
              console.log(`Conversation ${sessionId} chargée avec succès`);
            })
            .catch(error => {
              console.error(`Erreur lors du chargement de la conversation ${sessionId}:`, error);
            });
        }
      });
    }
    
    recentConversationsContainer.appendChild(conversationElement);
  });
}

/**
 * Applique un filtre sur l'historique des conversations
 * @param {string} filter - Le filtre à appliquer (all, excel, document, mail, chat)
 */
function applyHistoryFilter(filter) {
  const conversationElements = document.querySelectorAll('#history-conversations .conversation-item');
  const searchTerm = document.getElementById('history-search')?.value.trim().toLowerCase() || '';
  
  // Si aucun élément n'est trouvé, ne rien faire
  if (!conversationElements || conversationElements.length === 0) return;
  
  let visibleCount = 0;
  
  conversationElements.forEach(element => {
    const agentType = element.getAttribute('data-agent-type') || '';
    const title = element.getAttribute('data-title')?.toLowerCase() || '';
    const content = element.getAttribute('data-content')?.toLowerCase() || '';
    
    // Vérifier si l'élément correspond au filtre et à la recherche
    const matchesFilter = filter === 'all' || agentType === filter;
    const matchesSearch = searchTerm === '' || 
                         title.includes(searchTerm) || 
                         content.includes(searchTerm);
    
    // Afficher ou masquer l'élément en fonction du filtre et de la recherche
    if (matchesFilter && matchesSearch) {
      element.style.display = '';
      visibleCount++;
    } else {
      element.style.display = 'none';
    }
  });
  
  // Afficher un message si aucune conversation ne correspond aux critères
  const emptyMessage = document.getElementById('history-empty-message');
  if (emptyMessage) {
    if (visibleCount === 0) {
      emptyMessage.style.display = '';
      if (searchTerm) {
        emptyMessage.textContent = `Aucune conversation ne correspond à "${searchTerm}"`;
      } else {
        emptyMessage.textContent = `Aucune conversation de type "${filter}"`;
      }
    } else {
      emptyMessage.style.display = 'none';
    }
  }
  
  // Mettre à jour les informations de pagination
  updatePaginationInfo(visibleCount);
}

/**
 * Applique une recherche sur l'historique des conversations
 * @param {string} searchTerm - Le terme de recherche
 */
function applyHistorySearch(searchTerm) {
  // Récupérer le filtre actif
  const activeFilterButton = document.querySelector('.history-filter-btn.active');
  const filter = activeFilterButton ? activeFilterButton.getAttribute('data-filter') : 'all';
  
  // Appliquer le filtre avec le terme de recherche
  applyHistoryFilter(filter);
}

/**
 * Met à jour les informations de pagination
 * @param {number} visibleCount - Nombre d'éléments visibles
 */
function updatePaginationInfo(visibleCount) {
  const pageInfoElement = document.getElementById('history-page-info');
  const prevButton = document.getElementById('history-prev-page');
  const nextButton = document.getElementById('history-next-page');
  
  if (pageInfoElement) {
    if (visibleCount === 0) {
      pageInfoElement.textContent = 'Aucun résultat';
    } else {
      pageInfoElement.textContent = `${visibleCount} conversation${visibleCount > 1 ? 's' : ''}`;
    }
  }
  
  // Désactiver les boutons de pagination pour l'instant (implémentation future)
  if (prevButton) prevButton.disabled = true;
  if (nextButton) nextButton.disabled = true;
}

/**
 * Fonction utilitaire pour limiter la fréquence d'exécution d'une fonction
 * @param {Function} func - La fonction à exécuter
 * @param {number} wait - Le délai d'attente en millisecondes
 * @returns {Function} - La fonction avec délai
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Exporter les fonctions pour les rendre disponibles dans d'autres modules
window.dashboard = {
  updateDashboardData,
  loadHistoryData,
  updateRecentConversations,
  applyHistoryFilter,
  applyHistorySearch
};
