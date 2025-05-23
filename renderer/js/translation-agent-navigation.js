/**
 * Script de navigation spécifique pour l'agent de traduction
 * Ce script assure que la navigation vers l'agent de traduction fonctionne correctement
 */

// Variable globale pour le lien de l'agent de traduction
let translationAgentLink;

document.addEventListener('DOMContentLoaded', function() {
  // Récupérer le lien de l'agent de traduction
  translationAgentLink = document.getElementById('translation-agent-link');
  
  if (translationAgentLink) {
    // S'assurer qu'on ne double pas les écouteurs
    translationAgentLink.removeEventListener('click', handleTranslationAgentClick);
    translationAgentLink.addEventListener('click', handleTranslationAgentClick);
    
    console.log('Navigation vers l\'agent de traduction initialisée');
  } else {
    console.error('Lien de l\'agent de traduction non trouvé');
  }
});

/**
 * Gestionnaire d'événement pour le clic sur le lien de l'agent de traduction
 * @param {Event} e - L'événement de clic
 */
function handleTranslationAgentClick(e) {
  e.preventDefault();
  
  // Récupérer toutes les vues
  const dashboardView = document.getElementById('dashboard-view');
  const chatView = document.getElementById('chat-view');
  const historyView = document.getElementById('history-view');
  const settingsView = document.getElementById('settings-view');
  const excelAgentView = document.getElementById('excel-agent-view');
  const mailAgentView = document.getElementById('mail-agent-view');
  const docAgentView = document.getElementById('doc-agent-view');
  const translationAgentView = document.getElementById('translation-agent-view');
  
  // Vérifier que la vue de l'agent de traduction existe
  if (!translationAgentView) {
    console.error('Vue de l\'agent de traduction non trouvée');
    return;
  }
  
  // Masquer toutes les autres vues
  if (dashboardView) dashboardView.style.display = 'none';
  if (chatView) chatView.style.display = 'none';
  if (historyView) historyView.style.display = 'none';
  if (settingsView) settingsView.style.display = 'none';
  if (excelAgentView) excelAgentView.style.display = 'none';
  if (mailAgentView) mailAgentView.style.display = 'none';
  if (docAgentView) docAgentView.style.display = 'none';
  
  // Afficher la vue de l'agent de traduction
  translationAgentView.style.display = 'flex';
  
  // Mettre à jour les liens actifs dans la navigation
  const navLinks = document.querySelectorAll('a[href^="#"]');
  navLinks.forEach(link => {
    if (link === translationAgentLink) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
  
  console.log('Navigation vers l\'agent de traduction effectuée');
}
