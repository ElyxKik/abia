/**
 * Module de gestion de la navigation
 * Ce module contient les fonctions nécessaires pour gérer la navigation
 * entre les différentes vues de l'application.
 */

// Définir un objet de navigation global
window.navigation = {};

// Fonction pour naviguer vers une vue spécifique
function navigateTo(viewName) {
  console.log(`Navigation vers: ${viewName}`);
  
  // Récupération des vues
  const dashboardView = document.getElementById('dashboard-view');
  const chatView = document.getElementById('chat-view');
  const historyView = document.getElementById('history-view');
  const settingsView = document.getElementById('settings-view');
  
  // Vérifier que la vue dashboard existe au minimum
  if (!dashboardView) {
    console.error("Impossible de naviguer: vue dashboard non trouvée");
    return;
  }
  
  // Mise à jour des liens actifs dans la navigation
  const navLinks = document.querySelectorAll('a[href^="#"]');
  navLinks.forEach(link => {
    const linkTarget = link.getAttribute('href').substring(1);
    if (linkTarget === viewName) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
  
  // Masquer toutes les vues existantes
  dashboardView.style.display = 'none';
  if (chatView) chatView.style.display = 'none';
  if (historyView) historyView.style.display = 'none';
  if (settingsView) settingsView.style.display = 'none';
  
  // Afficher la vue demandée
  switch (viewName) {
    case 'dashboard':
      dashboardView.style.display = 'block';
      break;
      
    case 'chat':
      if (chatView) {
        chatView.style.display = 'flex';
        // Donner le focus au champ de saisie
        const chatInput = document.getElementById('chat-input');
        if (chatInput) chatInput.focus();
      } else {
        console.warn("Vue chat non disponible, affichage du tableau de bord");
        dashboardView.style.display = 'block';
      }
      break;
    
    case 'history':
      if (historyView) {
        historyView.style.display = 'block';
      } else {
        console.warn("Vue historique non disponible, affichage du tableau de bord");
        dashboardView.style.display = 'block';
      }
      break;
      
    case 'settings':
      if (settingsView) {
        settingsView.style.display = 'block';
      } else {
        console.warn("Vue paramètres non disponible, affichage du tableau de bord");
        dashboardView.style.display = 'block';
      }
      break;
      
    default:
      // Par défaut, afficher le tableau de bord
      dashboardView.style.display = 'block';
  }
}

// Fonction pour initialiser la navigation
function initNavigation() {
  // Récupération des liens de navigation
  const navLinks = document.querySelectorAll('a[href^="#"]');
  
  // Ajout des écouteurs d'événements pour les liens de navigation
  navLinks.forEach(link => {
    // S'assurer qu'on ne double pas les écouteurs
    link.removeEventListener('click', handleNavClick);
    link.addEventListener('click', handleNavClick);
  });
  
  console.log('Navigation initialisée');
}

// Gestionnaire d'événement pour les clics de navigation
function handleNavClick(e) {
  e.preventDefault();
  const target = this.getAttribute('href').substring(1);
  window.navigation.navigateTo(target);
}

// Exporter les fonctions pour les rendre disponibles dans d'autres modules
window.navigation.init = initNavigation;
window.navigation.navigateTo = navigateTo;

// Initialiser automatiquement la navigation après le chargement du DOM
document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM chargé, initialisation de la navigation");
  window.navigation.init();
});
