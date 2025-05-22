const { spawn } = require('child_process');
const path = require('path');

class TranslationService {
  initialize() {
    console.log('Initialisation du TranslationService...');
    // Configuration initiale si nécessaire
  }

  translateDocument(filePath, targetLang = 'en') {
    return new Promise((resolve, reject) => {
      const script = path.join(__dirname, '../python/translation_processor.py');
      const args = [filePath, targetLang];
      const proc = spawn('python3', [script, ...args]);
      let output = '';
      proc.stdout.on('data', (data) => { output += data.toString(); });
      proc.stderr.on('data', (data) => { console.error('TranslationService error:', data.toString()); });
      proc.on('close', (code) => {
        if (code === 0) {
          try {
            resolve(JSON.parse(output));
          } catch (e) {
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
