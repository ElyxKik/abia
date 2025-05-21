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
    
    // Déterminer l'icône et le texte en fonction du type d'activité
    if (item.type === 'file' || item.files && item.files.length) {
      const fileType = item.fileType || (item.files && item.files[0] ? item.files[0].type : 'document');
      
      if (fileType.includes('excel') || fileType.includes('spreadsheet')) {
        icon = 'file-excel';
        iconColor = 'secondary';
        activityText = 'Analyse Excel complétée';
      } else if (fileType.includes('pdf') || fileType.includes('document')) {
        icon = 'file-pdf';
        iconColor = 'red';
        activityText = 'Document analysé';
      } else if (fileType.includes('mail') || fileType.includes('email')) {
        icon = 'envelope';
        iconColor = 'green';
        activityText = 'Lettre générée';
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
 * Met à jour la vue d'historique avec les données récupérées
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
  
  // Construire la liste des sessions
  const sessionsContainer = historyView.querySelector('#history-sessions');
  
  if (sessionsContainer && sessions && sessions.length > 0) {
    // Vider le conteneur
    sessionsContainer.innerHTML = '';
    
    // Ajouter chaque session
    sessions.forEach(session => {
      const sessionDate = new Date(session.timestamp || Date.now());
      const formattedDate = sessionDate.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Créer un élément pour la session
      const sessionElement = document.createElement('div');
      sessionElement.className = 'border-b border-neutral-200 dark:border-neutral-700 pb-3 mb-3 last:border-0 last:mb-0 last:pb-0';
      sessionElement.innerHTML = `
        <div class="flex justify-between items-start">
          <div>
            <h3 class="text-md font-medium">${session.title || 'Session ' + formattedDate}</h3>
            <p class="text-sm text-neutral-500 dark:text-neutral-400">${formattedDate}</p>
          </div>
          <button class="btn btn-sm btn-outline py-1 load-session-btn" data-session-id="${session.id}">
            Charger
          </button>
        </div>
        <p class="text-sm mt-2">${session.summary || 'Session avec ' + (session.messages ? session.messages.length : 0) + ' messages'}</p>
      `;
      
      // Ajouter un écouteur d'événement pour le bouton de chargement
      const loadButton = sessionElement.querySelector('.load-session-btn');
      if (loadButton) {
        loadButton.addEventListener('click', () => loadSession(session.id));
      }
      
      sessionsContainer.appendChild(sessionElement);
    });
  } else if (sessionsContainer) {
    sessionsContainer.innerHTML = '<p class="text-center text-neutral-500 dark:text-neutral-400 py-6">Aucune session disponible</p>';
  }
  
  // Construire la liste des conversations récentes
  const conversationsContainer = historyView.querySelector('#history-conversations');
  
  if (conversationsContainer && history && history.length > 0) {
    // Vider le conteneur
    conversationsContainer.innerHTML = '';
    
    // Ajouter chaque conversation
    history.forEach(convo => {
      const convoDate = new Date(convo.timestamp || Date.now());
      const timeAgo = getTimeAgo(convoDate);
      
      // Déterminer l'icône en fonction du type de conversation
      let icon = 'comment-alt';
      let iconColor = 'primary';
      
      if (convo.agent === 'excel') {
        icon = 'file-excel';
        iconColor = 'secondary';
      } else if (convo.agent === 'document') {
        icon = 'file-pdf';
        iconColor = 'red';
      } else if (convo.agent === 'mail') {
        icon = 'envelope';
        iconColor = 'green';
      }
      
      // Créer un élément pour la conversation
      const convoElement = document.createElement('div');
      convoElement.className = 'flex items-start p-3 border-b border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer';
      convoElement.innerHTML = `
        <div class="flex-shrink-0 h-10 w-10 rounded-full bg-${iconColor}-100 dark:bg-${iconColor}-900/30 flex items-center justify-center text-${iconColor}-600 dark:text-${iconColor}-400">
          <i class="fas fa-${icon}"></i>
        </div>
        <div class="ml-3 flex-1">
          <div class="flex justify-between">
            <p class="text-sm font-medium">${convo.title || 'Conversation'}</p>
            <p class="text-xs text-neutral-500 dark:text-neutral-400">${timeAgo}</p>
          </div>
          <p class="text-sm text-neutral-600 dark:text-neutral-300 truncate mt-1">${convo.lastMessage || 'Aucun message'}</p>
        </div>
      `;
      
      conversationsContainer.appendChild(convoElement);
    });
  } else if (conversationsContainer) {
    conversationsContainer.innerHTML = '<p class="text-center text-neutral-500 dark:text-neutral-400 py-6">Aucune conversation disponible</p>';
  }
}

/**
 * Crée la vue d'historique si elle n'existe pas
 */
function createHistoryView() {
  console.log("Création de la vue d'historique...");
  
  // Récupérer le conteneur de contenu
  const contentContainer = document.getElementById('content');
  
  if (!contentContainer) {
    console.error("Conteneur de contenu non trouvé");
    return;
  }
  
  // Créer l'élément de vue d'historique
  const historyView = document.createElement('div');
  historyView.id = 'history-view';
  historyView.className = 'p-6';
  historyView.style.display = 'none';
  
  // Structure HTML de la vue d'historique
  historyView.innerHTML = `
    <h1 class="text-2xl font-bold mb-6">Historique</h1>
    
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Sessions passées -->
      <div class="md:col-span-1">
        <div class="card">
          <h2 class="text-lg font-semibold mb-4">Sessions</h2>
          <div id="history-sessions" class="space-y-4">
            <p class="text-center text-neutral-500 dark:text-neutral-400 py-6">Chargement des sessions...</p>
          </div>
        </div>
      </div>
      
      <!-- Conversations récentes -->
      <div class="md:col-span-2">
        <div class="card">
          <h2 class="text-lg font-semibold mb-4">Conversations récentes</h2>
          <div id="history-conversations" class="max-h-[500px] overflow-y-auto divide-y divide-neutral-200 dark:divide-neutral-700">
            <p class="text-center text-neutral-500 dark:text-neutral-400 py-6">Chargement des conversations...</p>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Ajouter la vue au conteneur de contenu
  contentContainer.appendChild(historyView);
  
  console.log("Vue d'historique créée avec succès");
  
  // Charger les données pour la nouvelle vue
  loadHistoryData();
}

/**
 * Charge une session spécifique
 */
async function loadSession(sessionId) {
  try {
    console.log(`Chargement de la session ${sessionId}...`);
    
    // Vérifier si l'API est disponible
    if (!window.api) {
      console.error("API non disponible pour charger la session");
      return;
    }
    
    // Appeler l'API pour charger la session
    await window.api.loadSession(sessionId);
    
    // Naviguer vers la vue de chat
    if (window.navigation && typeof window.navigation.navigateTo === 'function') {
      window.navigation.navigateTo('chat');
    }
    
    console.log(`Session ${sessionId} chargée avec succès`);
  } catch (error) {
    console.error(`Erreur lors du chargement de la session ${sessionId}:`, error);
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
function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);
  const diffWeek = Math.round(diffDay / 7);
  const diffMonth = Math.round(diffDay / 30);
  
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
    return `Il y a ${diffMonth} mois`;
  }
}

// Exporter les fonctions pour les rendre disponibles dans d'autres modules
window.dashboard = {
  updateDashboardData,
  loadHistoryData
};
