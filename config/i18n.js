/**
 * Service d'internationalisation (i18n) pour ABIA
 * Gère les traductions et le changement de langue
 */

const fs = require('fs');
const path = require('path');
const ElectronStore = require('electron-store');
const store = new ElectronStore();

class I18nService {
  constructor() {
    this.translations = {
      fr: require('./locales/fr.json'),
      en: require('./locales/en.json')
    };
    
    // Langue par défaut
    this.currentLang = store.get('language', 'fr');
  }
  
  /**
   * Obtient la traduction d'une clé
   * @param {string} key - Clé de traduction
   * @param {Object} params - Paramètres pour remplacer des variables dans la traduction
   * @returns {string} - Texte traduit
   */
  t(key, params = {}) {
    const lang = this.currentLang;
    const translation = this.translations[lang] || this.translations.fr;
    
    if (!translation[key]) {
      console.warn(`Clé de traduction non trouvée: ${key}`);
      return key;
    }
    
    let text = translation[key];
    
    // Remplacer les paramètres dans le texte
    Object.keys(params).forEach(param => {
      const regex = new RegExp(`{{${param}}}`, 'g');
      text = text.replace(regex, params[param]);
    });
    
    return text;
  }
  
  /**
   * Change la langue courante
   * @param {string} lang - Code de langue ('fr', 'en', etc.)
   * @returns {boolean} - True si le changement a réussi
   */
  setLanguage(lang) {
    if (!this.translations[lang]) {
      console.error(`Langue non supportée: ${lang}`);
      return false;
    }
    
    this.currentLang = lang;
    store.set('language', lang);
    return true;
  }
  
  /**
   * Obtient la langue courante
   * @returns {string} - Code de langue courante
   */
  getCurrentLanguage() {
    return this.currentLang;
  }
  
  /**
   * Obtient les langues disponibles
   * @returns {Array} - Liste des langues disponibles
   */
  getAvailableLanguages() {
    return Object.keys(this.translations);
  }
}

module.exports = new I18nService();
