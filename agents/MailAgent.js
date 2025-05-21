const DocumentService = require('../services/document-service');
const fs = require('fs');
const path = require('path');

class MailAgent {
  constructor() {
    this.documentService = new DocumentService();
    this.initialized = false;
    this.templates = {
      'motivation': {
        title: 'Lettre de motivation',
        structure: [
          { name: 'coordonnees_expediteur', label: 'Vos coordonnées' },
          { name: 'coordonnees_destinataire', label: 'Coordonnées du destinataire' },
          { name: 'objet', label: 'Objet de la lettre' },
          { name: 'introduction', label: 'Introduction' },
          { name: 'experience', label: 'Expérience et compétences' },
          { name: 'motivation', label: 'Motivation pour le poste' },
          { name: 'conclusion', label: 'Conclusion' },
          { name: 'signature', label: 'Signature' }
        ]
      },
      'reclamation': {
        title: 'Lettre de réclamation',
        structure: [
          { name: 'coordonnees_expediteur', label: 'Vos coordonnées' },
          { name: 'coordonnees_destinataire', label: 'Coordonnées du destinataire' },
          { name: 'reference', label: 'Références (commande, dossier, etc.)' },
          { name: 'objet', label: 'Objet de la réclamation' },
          { name: 'description', label: 'Description du problème' },
          { name: 'demande', label: 'Votre demande' },
          { name: 'conclusion', label: 'Conclusion' },
          { name: 'signature', label: 'Signature' }
        ]
      },
      'administrative': {
        title: 'Lettre administrative',
        structure: [
          { name: 'coordonnees_expediteur', label: 'Vos coordonnées' },
          { name: 'coordonnees_destinataire', label: 'Coordonnées du destinataire' },
          { name: 'objet', label: 'Objet de la lettre' },
          { name: 'corps', label: 'Corps de la lettre' },
          { name: 'conclusion', label: 'Conclusion' },
          { name: 'signature', label: 'Signature' }
        ]
      },
      'resiliation': {
        title: 'Lettre de résiliation',
        structure: [
          { name: 'coordonnees_expediteur', label: 'Vos coordonnées' },
          { name: 'coordonnees_destinataire', label: 'Coordonnées du destinataire' },
          { name: 'reference', label: 'Références client/contrat' },
          { name: 'objet', label: 'Objet de la résiliation' },
          { name: 'corps', label: 'Demande de résiliation' },
          { name: 'date_effet', label: 'Date d\'effet souhaitée' },
          { name: 'conclusion', label: 'Conclusion' },
          { name: 'signature', label: 'Signature' }
        ]
      }
    };
  }

  /**
   * Initialise l'agent Mail
   * @returns {boolean} - True si l'initialisation a réussi
   */
  initialize() {
    try {
      console.log('Initialisation de l\'agent Mail...');
      if (this.documentService && typeof this.documentService.initialize === 'function') {
        this.documentService.initialize();
      }
      this.initialized = true;
      console.log('Agent Mail initialisé avec succès');
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de l\'agent Mail:', error);
      return false;
    }
  }

  /**
   * Liste tous les modèles de lettres disponibles
   * @returns {Object} - Liste des modèles disponibles
   */
  getAvailableTemplates() {
    const templates = {};
    
    for (const [key, template] of Object.entries(this.templates)) {
      templates[key] = {
        title: template.title,
        fields: template.structure.map(item => item.label)
      };
    }
    
    return templates;
  }

  /**
   * Obtient la structure d'un modèle spécifique
   * @param {string} templateName - Nom du modèle
   * @returns {Object|null} - Structure du modèle ou null si non trouvé
   */
  getTemplateStructure(templateName) {
    return this.templates[templateName] || null;
  }

  /**
   * Génère une lettre à partir d'un modèle et de données
   * @param {string} templateName - Nom du modèle
   * @param {Object} data - Données pour remplir le modèle
   * @returns {string} - Contenu de la lettre générée
   */
  generateLetterContent(templateName, data) {
    const template = this.getTemplateStructure(templateName);
    
    if (!template) {
      throw new Error(`Le modèle "${templateName}" n'existe pas.`);
    }
    
    let content = '';
    
    // Ajouter les coordonnées de l'expéditeur
    if (data.coordonnees_expediteur) {
      content += `${data.coordonnees_expediteur}\n\n`;
    }
    
    // Ajouter la date
    const today = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    content += `Le ${today.toLocaleDateString('fr-FR', options)}\n\n`;
    
    // Ajouter les coordonnées du destinataire
    if (data.coordonnees_destinataire) {
      content += `${data.coordonnees_destinataire}\n\n`;
    }
    
    // Ajouter les références si présentes
    if (data.reference) {
      content += `Réf: ${data.reference}\n\n`;
    }
    
    // Ajouter l'objet
    if (data.objet) {
      content += `Objet: ${data.objet}\n\n`;
    }
    
    // Ajouter la formule de politesse
    content += `Madame, Monsieur,\n\n`;
    
    // Ajouter le corps de la lettre selon le modèle
    switch (templateName) {
      case 'motivation':
        if (data.introduction) content += `${data.introduction}\n\n`;
        if (data.experience) content += `${data.experience}\n\n`;
        if (data.motivation) content += `${data.motivation}\n\n`;
        break;
        
      case 'reclamation':
        if (data.description) content += `${data.description}\n\n`;
        if (data.demande) content += `${data.demande}\n\n`;
        break;
        
      case 'resiliation':
        if (data.corps) content += `${data.corps}\n\n`;
        if (data.date_effet) content += `Cette résiliation prendra effet le ${data.date_effet}.\n\n`;
        break;
        
      default:
        if (data.corps) content += `${data.corps}\n\n`;
    }
    
    // Ajouter la conclusion
    if (data.conclusion) {
      content += `${data.conclusion}\n\n`;
    } else {
      content += `Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.\n\n`;
    }
    
    // Ajouter la signature
    if (data.signature) {
      content += `${data.signature}`;
    }
    
    return content;
  }

  /**
   * Génère un document Word à partir d'un modèle et de données
   * @param {string} templateName - Nom du modèle
   * @param {Object} data - Données pour remplir le modèle
   * @param {string} outputPath - Chemin de sortie pour le fichier
   * @returns {Promise<string>} - Chemin du fichier généré
   */
  async generateWordLetter(templateName, data, outputPath) {
    try {
      const template = this.getTemplateStructure(templateName);
      
      if (!template) {
        throw new Error(`Le modèle "${templateName}" n'existe pas.`);
      }
      
      // Générer le contenu de la lettre
      const content = this.generateLetterContent(templateName, data);
      
      // Créer le document Word
      const docBuffer = await this.documentService.createWordDocument({
        title: data.objet || template.title,
        content: content,
        author: data.signature || 'ABIA Mail Agent'
      });
      
      // Écrire le fichier
      fs.writeFileSync(outputPath, docBuffer);
      
      return outputPath;
    } catch (error) {
      console.error('Erreur lors de la génération de la lettre Word:', error);
      throw error;
    }
  }

  /**
   * Génère un document PDF à partir d'un modèle et de données
   * @param {string} templateName - Nom du modèle
   * @param {Object} data - Données pour remplir le modèle
   * @param {string} outputPath - Chemin de sortie pour le fichier
   * @returns {Promise<string>} - Chemin du fichier généré
   */
  async generatePDFLetter(templateName, data, outputPath) {
    try {
      const template = this.getTemplateStructure(templateName);
      
      if (!template) {
        throw new Error(`Le modèle "${templateName}" n'existe pas.`);
      }
      
      // Générer le contenu de la lettre
      const content = this.generateLetterContent(templateName, data);
      
      // Créer le document PDF
      const pdfBuffer = await this.documentService.createPDF({
        title: data.objet || template.title,
        content: content,
        author: data.signature || 'ABIA Mail Agent',
        fontSize: 12
      });
      
      // Écrire le fichier
      fs.writeFileSync(outputPath, pdfBuffer);
      
      return outputPath;
    } catch (error) {
      console.error('Erreur lors de la génération de la lettre PDF:', error);
      throw error;
    }
  }

  /**
   * Sauvegarde un modèle personnalisé
   * @param {string} templateName - Nom du modèle
   * @param {Object} templateStructure - Structure du modèle
   * @returns {boolean} - True si le modèle a été sauvegardé avec succès
   */
  saveCustomTemplate(templateName, templateStructure) {
    try {
      if (!templateName || !templateStructure || !templateStructure.title || !templateStructure.structure) {
        throw new Error('Structure de modèle invalide.');
      }
      
      this.templates[templateName] = templateStructure;
      return true;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du modèle personnalisé:', error);
      return false;
    }
  }

  /**
   * Traite une requête en langage naturel pour générer une lettre
   * @param {string} query - Requête en langage naturel
   * @returns {Object} - Informations sur le modèle à utiliser
   */
  processNaturalLanguageQuery(query) {
    const lowercaseQuery = query.toLowerCase();
    
    // Déterminer le type de lettre demandé
    let templateName = 'administrative'; // Par défaut
    
    if (lowercaseQuery.includes('motivation') || lowercaseQuery.includes('emploi') || 
        lowercaseQuery.includes('candidature') || lowercaseQuery.includes('poste')) {
      templateName = 'motivation';
    } else if (lowercaseQuery.includes('réclamation') || lowercaseQuery.includes('plainte') || 
               lowercaseQuery.includes('problème') || lowercaseQuery.includes('litige')) {
      templateName = 'reclamation';
    } else if (lowercaseQuery.includes('résiliation') || lowercaseQuery.includes('annulation') || 
               lowercaseQuery.includes('mettre fin') || lowercaseQuery.includes('arrêter')) {
      templateName = 'resiliation';
    }
    
    // Obtenir la structure du modèle
    const template = this.getTemplateStructure(templateName);
    
    return {
      templateName,
      template,
      query: lowercaseQuery
    };
  }
}

module.exports = MailAgent;
