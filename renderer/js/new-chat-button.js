/**
 * Module spécifique pour gérer le bouton Nouvelle conversation
 * Ce module isole la fonctionnalité du bouton Nouvelle conversation
 * pour garantir son bon fonctionnement indépendamment des autres modules
 */

// S'assurer que le module est chargé après le DOM
document.addEventListener('DOMContentLoaded', function() {
  console.log("Initialisation du module new-chat-button");
  
  // Récupérer le bouton Nouvelle conversation
  const newChatButton = document.getElementById('new-chat-button');
  
  if (newChatButton) {
    console.log("Bouton Nouvelle conversation trouvé, ajout de l'écouteur d'événement");
    
    // Supprimer tout écouteur existant pour éviter les doublons
    newChatButton.removeEventListener('click', handleNewChatClick);
    
    // Ajouter l'écouteur d'événement
    newChatButton.addEventListener('click', handleNewChatClick);
  } else {
    console.error("Bouton Nouvelle conversation non trouvé");
  }
});

// Fonction pour gérer le clic sur le bouton Nouvelle conversation
function handleNewChatClick(e) {
  console.log("Clic sur le bouton Nouvelle conversation");
  
  // Empêcher le comportement par défaut
  e.preventDefault();
  
  // Récupérer les éléments nécessaires
  const chatView = document.getElementById('chat-view');
  const dashboardView = document.getElementById('dashboard-view');
  const chatMessages = document.querySelector('.chat-messages');
  
  // Vérifier si les éléments existent
  if (!chatView || !dashboardView) {
    console.error("Vues non trouvées");
    return;
  }
  
  // 1. Vider l'historique de chat
  const chatMessagesContainer = document.getElementById('chat-messages');
  if (chatMessagesContainer) {
    // Rechercher spécifiquement le message d'accueil par son ID
    const welcomeMessage = document.getElementById('welcome-message');
    
    // Vider complètement le conteneur
    chatMessagesContainer.innerHTML = '';
    
    // Si le message d'accueil existe, l'ajouter comme premier élément
    if (welcomeMessage) {
      // Cloner le message d'accueil pour éviter les références
      const welcomeClone = welcomeMessage.cloneNode(true);
      chatMessagesContainer.appendChild(welcomeClone);
    } else {
      console.log("Message d'accueil non trouvé, création d'un nouveau");
      // Créer un nouveau message d'accueil
      const newWelcomeMessage = document.createElement('div');
      newWelcomeMessage.id = 'welcome-message';
      newWelcomeMessage.className = 'chat-message chat-message-ai';
      newWelcomeMessage.innerHTML = `
        <div class="flex items-start">
          <div class="flex-shrink-0 h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
            <i class="fas fa-robot"></i>
          </div>
          <div class="ml-3">
            <p class="text-sm">Bonjour ! Je suis ABIA, votre assistant intelligent. Comment puis-je vous aider aujourd'hui ?</p>
          </div>
        </div>
      `;
      chatMessagesContainer.appendChild(newWelcomeMessage);
    }
  } else {
    console.error("Conteneur de messages non trouvé");
  }
  
  // 2. Définir l'agent actif sur l'agent de chat si l'API est disponible
  if (window.api) {
    window.api.setActiveAgent('chat')
      .then(() => {
        console.log("Agent actif défini sur: chat");
        
        // Créer une nouvelle session
        return window.api.createNewSession();
      })
      .then(sessionId => {
        console.log(`Nouvelle session créée: ${sessionId}`);
      })
      .catch(error => {
        console.error("Erreur lors de la création d'une nouvelle session:", error);
      });
  }
  
  // 3. Naviguer vers la vue de chat (méthode directe sans dépendre d'autres modules)
  dashboardView.classList.add('hidden');
  chatView.style.display = 'flex';
  
  // 4. Mettre à jour les liens de navigation
  const navLinks = document.querySelectorAll('a[href^="#"]');
  navLinks.forEach(link => {
    if (link.getAttribute('href') === '#chat') {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
  
  // 5. Donner le focus au champ de saisie
  const chatInput = document.getElementById('chat-input');
  if (chatInput) {
    chatInput.focus();
  }
  
  console.log("Nouvelle conversation initialisée");
}
