/**
 * Plugin d'exemple pour ABIA
 * Démontre l'interface requise pour un plugin
 */
module.exports = {
  // Identifiant unique du plugin
  id: 'sample-plugin',
  
  // Nom convivial du plugin
  name: 'Plugin d\'exemple',
  
  // Version du plugin
  version: '1.0.0',
  
  // Description du plugin
  description: 'Un plugin d\'exemple pour montrer comment créer des extensions pour ABIA',
  
  // Méthode d'initialisation appelée lors du chargement du plugin
  init: function(appContext) {
    console.log('Plugin d\'exemple initialisé');
    
    // Enregistrer des fonctionnalités ou hooks sur le contexte de l'application
    if (appContext && appContext.registerFunction) {
      appContext.registerFunction('sample-function', this.sampleFunction);
    }
  },
  
  // Exemple de fonction exposée par le plugin
  sampleFunction: function(input) {
    return {
      result: `Le plugin a traité: ${input}`,
      timestamp: new Date().toISOString()
    };
  }
};
