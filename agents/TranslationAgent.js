const TranslationService = require('../services/translation-service');

class TranslationAgent {
  constructor() {
    this.translationService = new TranslationService();
    this.initialized = false;
  }

  initialize() {
    this.translationService.initialize();
    this.initialized = true;
    console.log('Agent Translation initialisé');
    return true;
  }

  async translate(filePath, targetLang) {
    return await this.translationService.translateDocument(filePath, targetLang);
  }
}

module.exports = TranslationAgent;
