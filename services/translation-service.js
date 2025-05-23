const { spawn } = require('child_process');
const path = require('path');

class TranslationService {
  initialize() {
    console.log('Initialisation du TranslationService...');
    // Configuration initiale si nécessaire
  }

  translateDocument(filePath, targetLang = 'en', sourceLang = 'auto', progressCallback = null) {
    return new Promise((resolve, reject) => {
      const script = path.join(__dirname, '../python/translation_processor.py');
      const args = [filePath, targetLang, sourceLang];
      const proc = spawn('python3', [script, ...args]);
      let output = '';
      
      // Gérer les données de sortie standard (stdout)
      proc.stdout.on('data', (data) => { 
        const dataStr = data.toString();
        output += dataStr;
        
        // Essayer de parser les messages JSON de progression
        try {
          const lines = dataStr.trim().split('\n');
          for (const line of lines) {
            if (line.trim()) {
              const jsonData = JSON.parse(line);
              
              // Si c'est une mise à jour de progression et qu'un callback est fourni
              if (jsonData.progress && typeof progressCallback === 'function') {
                progressCallback(jsonData.progress);
              }
            }
          }
        } catch (e) {
          // Ignorer les erreurs de parsing JSON
          // Certaines lignes peuvent ne pas être au format JSON
        }
      });
      
      // Gérer les erreurs
      proc.stderr.on('data', (data) => { 
        // Afficher les erreurs dans la console pour le débogage
        console.error('TranslationService debug:', data.toString()); 
      });
      
      // Gérer la fin du processus
      proc.on('close', (code) => {
        if (code === 0) {
          try {
            // Extraire la dernière ligne JSON qui contient le résultat final
            const lines = output.trim().split('\n');
            const lastLine = lines[lines.length - 1];
            const result = JSON.parse(lastLine);
            resolve(result);
          } catch (e) {
            console.error('Erreur lors du parsing du résultat:', e);
            reject(e);
          }
        } else {
          reject(new Error(`Process exited with code ${code}`));
        }
      });
    });
  }
}

module.exports = TranslationService;
