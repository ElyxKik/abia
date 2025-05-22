const fs = require('fs');
const path = require('path');

class PluginLoader {
  constructor() {
    this.pluginDir = path.join(__dirname);
    this.plugins = [];
    this.pluginRegistry = {};
  }

  loadPlugins(appContext) {
    console.log('Chargement des plugins depuis:', this.pluginDir);
    
    if (!fs.existsSync(this.pluginDir)) {
      console.error('Répertoire de plugins non trouvé:', this.pluginDir);
      return;
    }
    
    const files = fs.readdirSync(this.pluginDir).filter(file => 
      file.endsWith('.js') && file !== 'plugin-loader.js'
    );
    
    console.log(`${files.length} plugins trouvés`);
    
    files.forEach(file => {
      try {
        const pluginPath = path.join(this.pluginDir, file);
        console.log(`Chargement du plugin: ${file}`);
        
        // Nettoyer le cache du module pour le rechargement
        delete require.cache[require.resolve(pluginPath)];
        
        const plugin = require(pluginPath);
        
        if (typeof plugin.init === 'function' && plugin.id && plugin.name) {
          // Initialiser le plugin avec le contexte de l'application
          plugin.init(appContext);
          
          this.plugins.push(plugin);
          this.pluginRegistry[plugin.id] = plugin;
          
          console.log(`Plugin chargé avec succès: ${plugin.name} (${plugin.id})`);
        } else {
          console.error(`Le plugin ${file} n'a pas l'interface requise (init, id, name)`);
        }
      } catch (e) {
        console.error(`Erreur lors du chargement du plugin ${file}:`, e);
      }
    });
    
    return this.plugins;
  }
  
  getPlugin(id) {
    return this.pluginRegistry[id] || null;
  }
  
  getPlugins() {
    return this.plugins;
  }
}

module.exports = new PluginLoader();
