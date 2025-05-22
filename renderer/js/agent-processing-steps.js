/**
 * Module de gestion des étapes de traitement pour les agents
 * Ce module fournit des fonctions standardisées pour gérer les étapes de traitement
 * des fichiers par les différents agents (Excel, Document, etc.)
 */

// Définition des étapes de traitement standardisées
const PROCESSING_STEPS = {
  INITIALIZATION: {
    id: 'initialization',
    label: 'Initialisation',
    icon: 'fa-cog',
    message: 'Initialisation des services...'
  },
  PREPROCESSING: {
    id: 'preprocessing',
    label: 'Prétraitement',
    icon: 'fa-file-import',
    message: 'Validation et préparation du fichier...'
  },
  PROCESSING: {
    id: 'processing',
    label: 'Traitement',
    icon: 'fa-sync',
    message: 'Analyse du fichier en cours...'
  },
  POSTPROCESSING: {
    id: 'postprocessing',
    label: 'Post-traitement',
    icon: 'fa-tasks',
    message: 'Finalisation des résultats...'
  },
  COMPLETION: {
    id: 'completion',
    label: 'Terminé',
    icon: 'fa-check-circle',
    message: 'Traitement terminé avec succès'
  },
  ERROR: {
    id: 'error',
    label: 'Erreur',
    icon: 'fa-exclamation-triangle',
    message: 'Une erreur est survenue'
  }
};

/**
 * Crée un élément de message de traitement avec les étapes standardisées
 * @param {string} agentName - Nom de l'agent (Excel, Document, etc.)
 * @param {string} containerId - ID du conteneur où afficher le message
 * @returns {Object} - Objet avec les méthodes pour mettre à jour les étapes
 */
function createProcessingSteps(agentName, containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Conteneur ${containerId} non trouvé pour les étapes de traitement`);
    return null;
  }
  
  // Créer l'élément de message de traitement
  const processingMessageId = `${agentName.toLowerCase()}-processing-message`;
  const processingMessage = document.createElement('div');
  processingMessage.id = processingMessageId;
  processingMessage.className = 'processing-message bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-4';
  
  // Créer le titre
  const title = document.createElement('h3');
  title.className = 'text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200';
  title.textContent = `Traitement par l'agent ${agentName}`;
  processingMessage.appendChild(title);
  
  // Créer le conteneur des étapes
  const stepsContainer = document.createElement('div');
  stepsContainer.className = 'steps-container';
  processingMessage.appendChild(stepsContainer);
  
  // Créer les étapes
  Object.values(PROCESSING_STEPS).forEach(step => {
    const stepElement = document.createElement('div');
    stepElement.id = `${processingMessageId}-${step.id}`;
    stepElement.className = 'step flex items-center mb-2 text-gray-500 dark:text-gray-400';
    stepElement.innerHTML = `
      <i class="fas ${step.icon} mr-2"></i>
      <span class="step-label">${step.label}:</span>
      <span class="step-message ml-2">${step.message}</span>
      <span class="step-status ml-auto"></span>
    `;
    stepsContainer.appendChild(stepElement);
  });
  
  // Ajouter le message au conteneur
  container.appendChild(processingMessage);
  
  // Fonctions de gestion des étapes
  return {
    /**
     * Met à jour le statut d'une étape
     * @param {string} stepId - ID de l'étape (voir PROCESSING_STEPS)
     * @param {string} status - Statut ('pending', 'active', 'completed', 'error')
     * @param {string} message - Message à afficher (optionnel)
     */
    updateStep(stepId, status, message = null) {
      const stepElement = document.getElementById(`${processingMessageId}-${stepId}`);
      if (!stepElement) {
        console.error(`Étape ${stepId} non trouvée`);
        return;
      }
      
      // Mettre à jour les classes CSS selon le statut
      stepElement.classList.remove('text-gray-500', 'text-blue-500', 'text-green-500', 'text-red-500');
      
      switch (status) {
        case 'pending':
          stepElement.classList.add('text-gray-500');
          break;
        case 'active':
          stepElement.classList.add('text-blue-500');
          break;
        case 'completed':
          stepElement.classList.add('text-green-500');
          break;
        case 'error':
          stepElement.classList.add('text-red-500');
          break;
      }
      
      // Mettre à jour le message si fourni
      if (message) {
        stepElement.querySelector('.step-message').textContent = message;
      }
      
      // Mettre à jour l'indicateur de statut
      const statusElement = stepElement.querySelector('.step-status');
      statusElement.innerHTML = '';
      
      if (status === 'active') {
        statusElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      } else if (status === 'completed') {
        statusElement.innerHTML = '<i class="fas fa-check"></i>';
      } else if (status === 'error') {
        statusElement.innerHTML = '<i class="fas fa-times"></i>';
      }
    },
    
    /**
     * Définit l'étape actuelle et met à jour toutes les étapes en conséquence
     * @param {string} currentStepId - ID de l'étape actuelle
     * @param {string} message - Message à afficher pour l'étape actuelle (optionnel)
     * @param {boolean} hasError - Indique si une erreur s'est produite
     */
    setCurrentStep(currentStepId, message = null, hasError = false) {
      const steps = Object.values(PROCESSING_STEPS);
      let currentStepFound = false;
      
      for (const step of steps) {
        if (step.id === 'error' && !hasError) continue;
        
        if (step.id === currentStepId) {
          this.updateStep(step.id, 'active', message || step.message);
          currentStepFound = true;
        } else if (!currentStepFound) {
          this.updateStep(step.id, 'completed');
        } else {
          this.updateStep(step.id, 'pending');
        }
      }
      
      if (hasError) {
        this.updateStep('error', 'active', message || PROCESSING_STEPS.ERROR.message);
      }
    },
    
    /**
     * Indique qu'une erreur s'est produite
     * @param {string} message - Message d'erreur
     */
    setError(message) {
      this.setCurrentStep('error', message, true);
    },
    
    /**
     * Supprime le message de traitement
     */
    remove() {
      const element = document.getElementById(processingMessageId);
      if (element) {
        element.remove();
      }
    }
  };
}

// Exporter les fonctions et constantes
window.agentProcessingSteps = {
  STEPS: PROCESSING_STEPS,
  createProcessingSteps
};
