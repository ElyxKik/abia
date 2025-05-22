/**
 * Module de gestion de l'agent Courriers
 * Ce module contient les fonctions nécessaires pour gérer l'agent Courriers
 * qui permet de générer des lettres, emails et autres documents de correspondance.
 */

document.addEventListener('DOMContentLoaded', () => {
  initMailAgent();
});

/**
 * Initialise l'agent Courriers
 */
function initMailAgent() {
  const mailType = document.getElementById('mail-type');
  const mailDescription = document.getElementById('mail-description');
  const generateBtn = document.getElementById('mail-generate-btn');
  const results = document.getElementById('mail-results');
  const resultsContent = document.getElementById('mail-results-content');
  const copyBtn = document.getElementById('mail-copy-btn');
  const downloadBtn = document.getElementById('mail-download-btn');
  
  if (!mailType || !mailDescription || !generateBtn || !results || !resultsContent || !copyBtn || !downloadBtn) {
    console.error('Éléments de l\'agent Courriers non trouvés');
    return;
  }
  
  // Gestionnaire d'événement pour la génération de document
  generateBtn.addEventListener('click', async () => {
    const type = mailType.value;
    const description = mailDescription.value.trim();
    
    if (!description) {
      alert('Veuillez décrire le contenu que vous souhaitez inclure dans votre document');
      return;
    }
    
    // Afficher le message de patience standard dans le chat principal
    const processingMessageId = window.agentUtils.showFileProcessingMessage('document de correspondance');
    
    // Indiquer que la génération est en cours
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Génération en cours...';
    results.classList.add('hidden');
    
    // S'assurer que le popup de chargement ne s'affiche pas
    const processingAnimation = document.getElementById('processing-animation');
    if (processingAnimation) {
      processingAnimation.style.display = 'none';
    }
    
    try {
      console.log(`Génération d'un document de type ${type} avec la description: ${description}`);
      
      // Préparer les données pour l'API
      const data = {
        type: type,
        description: description
      };
      
      // Appel réel à l'API Electron pour générer le document
      const response = await window.api.generateLetter(type, data);
      
      // Vérifier si la réponse contient une erreur
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Obtenir le contenu du document généré
      let documentContent = response.content;
      
      // Si aucun contenu n'est retourné par l'API, utiliser les fonctions locales de génération
      if (!documentContent) {
        switch (type) {
          case 'letter':
            documentContent = generateFormalLetter(description);
            break;
          case 'email':
            documentContent = generateProfessionalEmail(description);
            break;
          case 'complaint':
            documentContent = generateComplaintLetter(description);
            break;
          case 'cover':
            documentContent = generateCoverLetter(description);
            break;
          case 'resignation':
            documentContent = generateResignationLetter(description);
            break;
          default:
            documentContent = generateCustomDocument(description);
        }
      }
      
      // Formater la réponse pour l'affichage dans le chat
      const typeLabel = mailType.options[mailType.selectedIndex].text;
      const chatResultHtml = `
        <p>Voici le document <strong>${typeLabel}</strong> que j'ai généré selon votre description :</p>
        <blockquote class="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg my-3">${description}</blockquote>
        <div class="document-preview p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg">
          ${documentContent}
        </div>
        <p class="mt-3">Vous pouvez copier ou télécharger ce document depuis l'onglet "Agent Courriers".</p>
      `;
      
      // Mettre à jour le message dans le chat principal avec les résultats
      window.agentUtils.addOrUpdateAgentChatMessage(chatResultHtml, processingMessageId, false);
      
      // Afficher également les résultats dans la section de l'agent Courriers
      resultsContent.innerHTML = documentContent;
      results.classList.remove('hidden');
    } catch (error) {
      console.error('Erreur lors de la génération du document:', error);
      
      // Afficher l'erreur dans le chat principal
      const errorMessage = `
        <p>Une erreur est survenue lors de la génération du document :</p>
        <p class="text-red-500">${error.message || 'Erreur inconnue'}</p>
      `;
      window.agentUtils.addOrUpdateAgentChatMessage(errorMessage, processingMessageId, false);
      
      // Afficher l'erreur dans la section de l'agent Courriers
      resultsContent.innerHTML = `<div class="text-red-500 p-4">${errorMessage}</div>`;
      results.classList.remove('hidden');
    } finally {
      // Réactiver le bouton de génération
      generateBtn.disabled = false;
      generateBtn.innerHTML = '<i class="fas fa-envelope mr-2"></i> Générer le document';
    }
  });
  
  // Gestionnaire d'événement pour copier le document
  copyBtn.addEventListener('click', () => {
    const content = resultsContent.innerText;
    navigator.clipboard.writeText(content)
      .then(() => {
        // Changer temporairement le texte du bouton pour indiquer que la copie a réussi
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fas fa-check mr-1"></i> Copié!';
        setTimeout(() => {
          copyBtn.innerHTML = originalText;
        }, 2000);
      })
      .catch(err => {
        console.error('Erreur lors de la copie du texte:', err);
        alert('Impossible de copier le texte. Veuillez réessayer.');
      });
  });
  
  // Gestionnaire d'événement pour télécharger le document
  downloadBtn.addEventListener('click', () => {
    const content = resultsContent.innerText;
    const type = mailType.options[mailType.selectedIndex].text;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    // Créer un nom de fichier basé sur le type de document
    const date = new Date().toISOString().slice(0, 10);
    const filename = `${type.toLowerCase().replace(' ', '_')}_${date}.txt`;
    
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

/**
 * Génère une lettre formelle
 * @param {string} description - Description du contenu
 * @returns {string} Contenu HTML de la lettre
 */
function generateFormalLetter(description) {
  const date = new Date().toLocaleDateString('fr-FR', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  return `
    <div class="text-right mb-4">${date}</div>
    
    <div class="mb-4">
      <p>Nom de l'expéditeur</p>
      <p>Adresse de l'expéditeur</p>
      <p>Code postal, Ville</p>
      <p>Email / Téléphone</p>
    </div>
    
    <div class="mb-4">
      <p>Nom du destinataire</p>
      <p>Adresse du destinataire</p>
      <p>Code postal, Ville</p>
    </div>
    
    <div class="mb-4">
      <p><strong>Objet :</strong> Objet de la lettre</p>
    </div>
    
    <div class="mb-4">
      <p>Madame, Monsieur,</p>
    </div>
    
    <div class="mb-4">
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur vel sagittis nulla. Duis ornare risus at libero convallis, non varius enim tincidunt. Nulla facilisi. Mauris eget justo in eros faucibus venenatis.</p>
      <p>Praesent euismod, nisl vel tincidunt ultrices, nisi nisl aliquam nisl, vel tincidunt nisl nisl vel nisl. Donec euismod, nisl vel tincidunt ultrices, nisi nisl aliquam nisl, vel tincidunt nisl nisl vel nisl.</p>
      <p>Veuillez agréer, Madame, Monsieur, l'expression de mes salutations distinguées.</p>
    </div>
    
    <div class="text-right">
      <p>Signature</p>
      <p>Nom de l'expéditeur</p>
    </div>
    
    <p class="text-sm text-neutral-500 mt-4">Note: Ceci est une démonstration. Dans la version finale, le contenu sera généré par l'IA en fonction de votre description: "${description}"</p>
  `;
}

/**
 * Génère un email professionnel
 * @param {string} description - Description du contenu
 * @returns {string} Contenu HTML de l'email
 */
function generateProfessionalEmail(description) {
  return `
    <div class="mb-4">
      <p><strong>De :</strong> votre.email@example.com</p>
      <p><strong>À :</strong> destinataire@example.com</p>
      <p><strong>Objet :</strong> Objet de l'email</p>
    </div>
    
    <div class="mb-4">
      <p>Bonjour,</p>
    </div>
    
    <div class="mb-4">
      <p>J'espère que ce message vous trouve en bonne santé.</p>
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur vel sagittis nulla. Duis ornare risus at libero convallis, non varius enim tincidunt. Nulla facilisi.</p>
      <p>Praesent euismod, nisl vel tincidunt ultrices, nisi nisl aliquam nisl, vel tincidunt nisl nisl vel nisl.</p>
      <p>N'hésitez pas à me contacter pour toute question ou précision.</p>
    </div>
    
    <div class="mb-4">
      <p>Cordialement,</p>
      <p>Votre nom</p>
      <p>Votre fonction</p>
      <p>Votre entreprise</p>
      <p>Votre numéro de téléphone</p>
    </div>
    
    <p class="text-sm text-neutral-500 mt-4">Note: Ceci est une démonstration. Dans la version finale, le contenu sera généré par l'IA en fonction de votre description: "${description}"</p>
  `;
}

/**
 * Génère une lettre de réclamation
 * @param {string} description - Description du contenu
 * @returns {string} Contenu HTML de la lettre
 */
function generateComplaintLetter(description) {
  const date = new Date().toLocaleDateString('fr-FR', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  return `
    <div class="text-right mb-4">${date}</div>
    
    <div class="mb-4">
      <p>Nom de l'expéditeur</p>
      <p>Adresse de l'expéditeur</p>
      <p>Code postal, Ville</p>
      <p>Email / Téléphone</p>
    </div>
    
    <div class="mb-4">
      <p>Service Réclamations</p>
      <p>Nom de l'entreprise</p>
      <p>Adresse de l'entreprise</p>
      <p>Code postal, Ville</p>
    </div>
    
    <div class="mb-4">
      <p><strong>Objet :</strong> Réclamation concernant [produit/service]</p>
      <p><strong>Référence :</strong> [numéro de commande/facture/client]</p>
    </div>
    
    <div class="mb-4">
      <p>Madame, Monsieur,</p>
    </div>
    
    <div class="mb-4">
      <p>Je me permets de vous adresser cette réclamation concernant [produit/service] acheté/souscrit le [date] dans votre établissement.</p>
      <p>En effet, j'ai constaté les problèmes suivants : [description des problèmes].</p>
      <p>Conformément à la législation en vigueur, je vous demande de bien vouloir [demande spécifique : remboursement, échange, réparation, etc.].</p>
      <p>Je vous remercie de l'attention que vous porterez à ma demande et vous prie de me tenir informé des suites que vous comptez y donner.</p>
      <p>Dans l'attente de votre réponse, je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.</p>
    </div>
    
    <div class="text-right">
      <p>Signature</p>
      <p>Nom de l'expéditeur</p>
    </div>
    
    <p class="text-sm text-neutral-500 mt-4">Note: Ceci est une démonstration. Dans la version finale, le contenu sera généré par l'IA en fonction de votre description: "${description}"</p>
  `;
}

/**
 * Génère une lettre de motivation
 * @param {string} description - Description du contenu
 * @returns {string} Contenu HTML de la lettre
 */
function generateCoverLetter(description) {
  const date = new Date().toLocaleDateString('fr-FR', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  return `
    <div class="text-right mb-4">${date}</div>
    
    <div class="mb-4">
      <p>Prénom NOM</p>
      <p>Adresse</p>
      <p>Code postal, Ville</p>
      <p>Téléphone</p>
      <p>Email</p>
    </div>
    
    <div class="mb-4">
      <p>Nom de l'entreprise</p>
      <p>À l'attention de [Responsable RH / Recruteur]</p>
      <p>Adresse de l'entreprise</p>
      <p>Code postal, Ville</p>
    </div>
    
    <div class="mb-4">
      <p><strong>Objet :</strong> Candidature au poste de [intitulé du poste]</p>
    </div>
    
    <div class="mb-4">
      <p>Madame, Monsieur,</p>
    </div>
    
    <div class="mb-4">
      <p>Actuellement [situation professionnelle actuelle], je me permets de vous adresser ma candidature pour le poste de [intitulé du poste] que vous proposez.</p>
      <p>Titulaire de [diplômes/qualifications], j'ai acquis une solide expérience en [domaines de compétences] au cours de mes [nombre] années d'expérience professionnelle.</p>
      <p>Particulièrement intéressé(e) par [secteur d'activité/mission de l'entreprise], je souhaite mettre mes compétences au service de votre entreprise.</p>
      <p>Je reste à votre disposition pour un entretien qui me permettrait de vous exposer plus en détail mes motivations.</p>
      <p>Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.</p>
    </div>
    
    <div class="text-right">
      <p>Signature</p>
      <p>Prénom NOM</p>
    </div>
    
    <p class="text-sm text-neutral-500 mt-4">Note: Ceci est une démonstration. Dans la version finale, le contenu sera généré par l'IA en fonction de votre description: "${description}"</p>
  `;
}

/**
 * Génère une lettre de démission
 * @param {string} description - Description du contenu
 * @returns {string} Contenu HTML de la lettre
 */
function generateResignationLetter(description) {
  const date = new Date().toLocaleDateString('fr-FR', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  return `
    <div class="text-right mb-4">${date}</div>
    
    <div class="mb-4">
      <p>Prénom NOM</p>
      <p>Adresse</p>
      <p>Code postal, Ville</p>
      <p>Téléphone</p>
      <p>Email</p>
    </div>
    
    <div class="mb-4">
      <p>Nom de l'entreprise</p>
      <p>À l'attention de [Nom du supérieur hiérarchique / DRH]</p>
      <p>Adresse de l'entreprise</p>
      <p>Code postal, Ville</p>
    </div>
    
    <div class="mb-4">
      <p><strong>Objet :</strong> Démission</p>
    </div>
    
    <div class="mb-4">
      <p>Madame, Monsieur,</p>
    </div>
    
    <div class="mb-4">
      <p>Par la présente, je vous informe de ma décision de démissionner de mon poste de [intitulé du poste] que j'occupe depuis le [date d'embauche].</p>
      <p>Conformément au délai de préavis prévu par [la convention collective / mon contrat de travail], ma démission sera effective à compter du [date de fin de préavis].</p>
      <p>Je tiens à vous remercier pour la confiance que vous m'avez accordée durant ces [durée] années au sein de [nom de l'entreprise], ainsi que pour les opportunités professionnelles qui m'ont été offertes.</p>
      <p>Je m'engage à assurer la transition de mes dossiers dans les meilleures conditions et reste disponible pour former la personne qui me succédera.</p>
      <p>Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.</p>
    </div>
    
    <div class="text-right">
      <p>Signature</p>
      <p>Prénom NOM</p>
    </div>
    
    <p class="text-sm text-neutral-500 mt-4">Note: Ceci est une démonstration. Dans la version finale, le contenu sera généré par l'IA en fonction de votre description: "${description}"</p>
  `;
}

/**
 * Génère un document personnalisé
 * @param {string} description - Description du contenu
 * @returns {string} Contenu HTML du document
 */
function generateCustomDocument(description) {
  const date = new Date().toLocaleDateString('fr-FR', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  return `
    <div class="text-right mb-4">${date}</div>
    
    <div class="mb-4">
      <p><strong>Document personnalisé</strong></p>
    </div>
    
    <div class="mb-4">
      <p>Ce document a été généré selon vos spécifications.</p>
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur vel sagittis nulla. Duis ornare risus at libero convallis, non varius enim tincidunt. Nulla facilisi.</p>
      <p>Praesent euismod, nisl vel tincidunt ultrices, nisi nisl aliquam nisl, vel tincidunt nisl nisl vel nisl.</p>
    </div>
    
    <p class="text-sm text-neutral-500 mt-4">Note: Ceci est une démonstration. Dans la version finale, le contenu sera généré par l'IA en fonction de votre description: "${description}"</p>
  `;
}

// Exporter les fonctions pour les rendre disponibles dans d'autres modules
window.mailAgent = {
  init: initMailAgent
};
