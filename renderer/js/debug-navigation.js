/**
 * Script de débogage pour le module de navigation
 * Ce script doit être temporairement ajouté à index.html pour diagnostiquer les problèmes de navigation
 */

console.log('Script de débogage de navigation chargé');

// Fonction pour vérifier l'état du DOM
function checkNavigationElements() {
  console.log('Vérification des éléments de navigation...');
  
  // Vérifier les liens de navigation
  const navLinks = document.querySelectorAll('a[href^="#"]');
  console.log(`Nombre de liens de navigation trouvés: ${navLinks.length}`);
  
  // Afficher chaque lien de navigation
  navLinks.forEach((link, index) => {
    console.log(`Lien ${index}: href=${link.getAttribute('href')}, text=${link.innerText.trim()}`);
    
    // Vérifier si des écouteurs d'événements sont attachés
    const listeners = getEventListeners(link);
    console.log(`Nombre d'écouteurs click sur ce lien: ${listeners?.click?.length || 0}`);
  });
  
  // Vérifier les vues
  const dashboardView = document.getElementById('dashboard-view');
  const chatView = document.getElementById('chat-view');
  
  console.log(`Vue dashboard trouvée: ${dashboardView ? 'Oui' : 'Non'}`);
  console.log(`Vue chat trouvée: ${chatView ? 'Oui' : 'Non'}`);
  
  if (dashboardView) {
    console.log(`État d'affichage de la vue dashboard: ${dashboardView.style.display}`);
  }
  
  if (chatView) {
    console.log(`État d'affichage de la vue chat: ${chatView.style.display}`);
  }
  
  // Vérifier le module de navigation
  console.log(`Module de navigation disponible: ${window.navigation ? 'Oui' : 'Non'}`);
  if (window.navigation) {
    console.log(`Fonction navigateTo disponible: ${typeof window.navigation.navigateTo === 'function' ? 'Oui' : 'Non'}`);
    console.log(`Fonction init disponible: ${typeof window.navigation.init === 'function' ? 'Oui' : 'Non'}`);
  }
}

// Effectuer les vérifications après le chargement complet de la page
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM chargé, exécution des vérifications de navigation');
  setTimeout(checkNavigationElements, 500); // Attendre que tous les scripts soient chargés
});

// Ajouter un écouteur d'événements pour intercepter les clics sur les liens de navigation
document.addEventListener('click', (e) => {
  if (e.target.closest('a[href^="#"]')) {
    const link = e.target.closest('a[href^="#"]');
    console.log(`Clic intercepté sur le lien: ${link.getAttribute('href')}`);
  }
}, true); // Utiliser la phase de capture pour intercepter avant tout autre gestionnaire

console.log('Script de débogage de navigation installé');
