/**
 * Service de gestion des thèmes pour ABIA
 * Permet de basculer entre les thèmes clair et sombre
 */

const ElectronStore = require('electron-store');
const store = new ElectronStore();

class ThemeService {
  constructor() {
    // Thèmes disponibles: 'light', 'dark', 'system'
    this.themes = ['light', 'dark', 'system'];
    
    // Récupérer le thème stocké ou utiliser le thème système par défaut
    this.currentTheme = store.get('theme', 'system');
    
    // Écouter les changements de thème système
    this.mediaQuery = typeof window !== 'undefined' ? 
      window.matchMedia('(prefers-color-scheme: dark)') : null;
  }
  
  /**
   * Initialise le service de thème
   * @returns {boolean} - True si l'initialisation a réussi
   */
  initialize() {
    try {
      console.log('Initialisation du service de thème...');
      
      // Appliquer le thème actuel au chargement
      this.applyTheme();
      
      // Écouter les changements de thème système si on est en mode 'system'
      if (this.mediaQuery && this.currentTheme === 'system') {
        this.mediaQuery.addEventListener('change', () => {
          this.applyTheme();
        });
      }
      
      console.log('Service de thème initialisé avec succès');
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du service de thème:', error);
      return false;
    }
  }
  
  /**
   * Définit le thème actuel
   * @param {string} theme - Thème à appliquer ('light', 'dark', 'system')
   * @returns {boolean} - True si le changement a réussi
   */
  setTheme(theme) {
    if (!this.themes.includes(theme)) {
      console.error(`Thème non supporté: ${theme}`);
      return false;
    }
    
    this.currentTheme = theme;
    store.set('theme', theme);
    
    // Appliquer le thème
    this.applyTheme();
    
    return true;
  }
  
  /**
   * Obtient le thème actuel
   * @returns {string} - Thème actuel
   */
  getTheme() {
    return this.currentTheme;
  }
  
  /**
   * Applique le thème actuel
   * @private
   */
  applyTheme() {
    let effectiveTheme = this.currentTheme;
    
    // Si le thème est 'system', déterminer en fonction des préférences du système
    if (effectiveTheme === 'system' && this.mediaQuery) {
      effectiveTheme = this.mediaQuery.matches ? 'dark' : 'light';
    }
    
    // Appliquer les classes CSS au document
    if (typeof document !== 'undefined') {
      if (effectiveTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
      
      // Envoyer un événement pour informer l'application du changement de thème
      const event = new CustomEvent('theme-changed', { detail: { theme: effectiveTheme } });
      document.dispatchEvent(event);
    }
  }
  
  /**
   * Bascule entre les thèmes clair et sombre
   * @returns {string} - Nouveau thème
   */
  toggleTheme() {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
    return newTheme;
  }
}

module.exports = new ThemeService();
