/**
 * Module de gestion des boutons de commande rapide
 * Ce module contient les fonctions nécessaires pour gérer les interactions
 * avec les boutons de commande rapide dans l'interface de chat.
 */

// Fonction pour initialiser les boutons de commande rapide
function initCommandButtons() {
  // Récupération des boutons de commande rapide
  const cmdCreateFolder = document.getElementById('cmd-create-folder');
  const cmdListFiles = document.getElementById('cmd-list-files');
  const cmdImportExcel = document.getElementById('cmd-import-excel');
  const cmdImportDocument = document.getElementById('cmd-import-document');
  const cmdWriteMail = document.getElementById('cmd-write-mail');
  const cmdClassifyDocs = document.getElementById('cmd-classify-docs');
  
  // Ajout des écouteurs d'événements pour les boutons
  if (cmdCreateFolder) cmdCreateFolder.addEventListener('click', () => handleCommandClick('create-folder'));
  if (cmdListFiles) cmdListFiles.addEventListener('click', () => handleCommandClick('list-files'));
  if (cmdImportExcel) cmdImportExcel.addEventListener('click', () => handleCommandClick('import-excel'));
  if (cmdImportDocument) cmdImportDocument.addEventListener('click', () => handleCommandClick('import-document'));
  if (cmdWriteMail) cmdWriteMail.addEventListener('click', () => handleCommandClick('write-mail'));
  if (cmdClassifyDocs) cmdClassifyDocs.addEventListener('click', () => handleCommandClick('classify-docs'));
  
  console.log('Boutons de commande rapide initialisés');
}

// Fonction pour gérer les clics sur les boutons de commande rapide
function handleCommandClick(commandType) {
  console.log(`Commande rapide: ${commandType}`);
  
  // S'assurer que la vue de chat est visible
  ensureChatViewVisible();
  
  // Vérifier que l'API est disponible
  if (!window.api) {
    addAIMessage("Désolé, je ne peux pas exécuter cette commande car l'API n'est pas disponible.");
    return;
  }
  
  // Définir l'agent actif en fonction du type de commande
  let agentType = 'chat'; // Par défaut
  
  switch (commandType) {
    case 'create-folder':
    case 'list-files':
    case 'classify-docs':
      agentType = 'filesystem';
      break;
      
    case 'import-excel':
      agentType = 'excel';
      break;
      
    case 'import-document':
      agentType = 'document';
      break;
      
    case 'write-mail':
      agentType = 'mail';
      break;
  }
  
  // Définir l'agent actif et exécuter l'action appropriée une fois l'agent activé
  window.api.setActiveAgent(agentType)
    .then(() => {
      console.log(`Agent actif défini sur: ${agentType}`);
      
      // Exécuter l'action appropriée en fonction du type de commande
      switch (commandType) {
        case 'create-folder':
          // Demander à l'utilisateur le nom du dossier à créer
          addAIMessage("Pour créer un nouveau dossier, veuillez me donner le nom que vous souhaitez lui attribuer.", [
            { text: "Créer dans Documents", icon: "folder-plus", primary: true },
            { text: "Créer dans un autre emplacement", icon: "folder-tree", primary: false }
          ]);
          break;
          
        case 'list-files':
          // Demander à l'utilisateur quel dossier lister
          addAIMessage("Je peux vous montrer le contenu d'un dossier. Quel dossier souhaitez-vous explorer ?", [
            { text: "Dossier Documents", icon: "folder-open", primary: true },
            { text: "Dossier ABIA", icon: "folder-open", primary: false }
          ]);
          break;
          
        case 'import-excel':
          // Appeler la fonction d'importation Excel après avoir défini l'agent
          if (typeof importExcelFile === 'function') {
            importExcelFile();
          } else {
            addAIMessage("Je suis prêt à analyser votre fichier Excel. Veuillez sélectionner un fichier à importer.");
          }
          break;
          
        case 'import-document':
          // Appeler la fonction d'importation de document après avoir défini l'agent
          if (typeof importDocument === 'function') {
            importDocument();
          } else {
            addAIMessage("Je suis prêt à analyser votre document. Veuillez sélectionner un fichier à importer.");
          }
          break;
          
        case 'write-mail':
          // Demander à l'utilisateur quel type de mail rédiger
          addAIMessage("Je peux vous aider à rédiger un mail. Quel type de mail souhaitez-vous créer ?", [
            { text: "Mail professionnel", icon: "envelope", primary: true },
            { text: "Mail personnel", icon: "envelope-open", primary: false },
            { text: "Mail de réclamation", icon: "exclamation-circle", primary: false }
          ]);
          break;
          
        case 'classify-docs':
          // Demander à l'utilisateur quel dossier classer
          addAIMessage("Je peux vous aider à classer automatiquement vos documents par type. Quel dossier contient les documents à classer ?", [
            { text: "Dossier Téléchargements", icon: "download", primary: true },
            { text: "Dossier Documents", icon: "folder", primary: false },
            { text: "Autre dossier", icon: "folder-plus", primary: false }
          ]);
          break;
          
        default:
          // Message par défaut si la commande n'est pas reconnue
          addAIMessage("Désolé, je ne reconnais pas cette commande. Comment puis-je vous aider autrement ?");
      }
    })
    .catch(error => {
      console.error(`Erreur lors de la définition de l'agent ${agentType}:`, error);
      addAIMessage(`Désolé, je n'ai pas pu activer l'agent approprié pour cette commande. Erreur: ${error.message || 'Erreur inconnue'}`);
    });
  
  // Donner le focus au champ de saisie après avoir traité la commande
  const chatInput = document.getElementById('chat-input');
  if (chatInput) chatInput.focus();
}

// Fonction pour s'assurer que la vue de chat est visible
function ensureChatViewVisible() {
  const chatView = document.getElementById('chat-view');
  const dashboardView = document.getElementById('dashboard-view');
  
  if (!chatView) {
    console.error("Vue de chat non trouvée");
    return;
  }
  
  if (chatView.style.display !== 'flex') {
    // Trouver le lien de navigation vers le chat et simuler un clic
    const chatLink = document.querySelector('a[href="#chat"]');
    if (chatLink) {
      chatLink.click();
    } else {
      // Fallback si le lien n'est pas trouvé
      if (dashboardView) dashboardView.classList.add('hidden');
      chatView.style.display = 'flex';
    }
  }
}

// Exporter les fonctions pour les rendre disponibles dans d'autres modules
window.commandButtons = {
  init: initCommandButtons,
  handleCommand: handleCommandClick
};
