const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { PythonShell } = require('python-shell');

// Chemins des répertoires
const rootDir = path.resolve(__dirname, '..');
const pythonDir = path.join(rootDir, 'python');
const pythonRuntimeDir = path.join(rootDir, 'python-runtime');
const distDir = path.join(rootDir, 'dist');

// Créer le répertoire python-runtime s'il n'existe pas
if (!fs.existsSync(pythonRuntimeDir)) {
  fs.mkdirSync(pythonRuntimeDir, { recursive: true });
}

// Fonction pour vérifier si Python est installé
function isPythonInstalled() {
  try {
    execSync('python --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    try {
      execSync('python3 --version', { stdio: 'ignore' });
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Fonction pour obtenir la commande Python appropriée
function getPythonCommand() {
  try {
    execSync('python --version', { stdio: 'ignore' });
    return 'python';
  } catch (error) {
    try {
      execSync('python3 --version', { stdio: 'ignore' });
      return 'python3';
    } catch (error) {
      throw new Error('Python n\'est pas installé sur ce système.');
    }
  }
}

// Fonction pour créer un environnement virtuel Python
function createVirtualEnv() {
  console.log('Création d\'un environnement virtuel Python...');
  
  try {
    const pythonCommand = getPythonCommand();
    execSync(`${pythonCommand} -m venv ${pythonRuntimeDir}`, { stdio: 'inherit' });
    console.log('Environnement virtuel créé avec succès.');
    return true;
  } catch (error) {
    console.error('Erreur lors de la création de l\'environnement virtuel:', error.message);
    return false;
  }
}

// Fonction pour installer les dépendances Python
function installPythonDependencies() {
  console.log('Installation des dépendances Python...');
  
  // Créer un fichier requirements.txt s'il n'existe pas
  if (!fs.existsSync(path.join(pythonDir, 'requirements.txt'))) {
    const requirements = [
      'PyPDF2==3.0.1',
      'python-docx==0.8.11',
      'nltk==3.8.1'
    ].join('\n');
    
    fs.writeFileSync(path.join(pythonDir, 'requirements.txt'), requirements);
  }
  
  try {
    // Déterminer le chemin de pip en fonction de l'OS
    let pipPath;
    if (process.platform === 'win32') {
      pipPath = path.join(pythonRuntimeDir, 'Scripts', 'pip');
    } else {
      pipPath = path.join(pythonRuntimeDir, 'bin', 'pip');
    }
    
    // Installer les dépendances
    execSync(`"${pipPath}" install -r "${path.join(pythonDir, 'requirements.txt')}"`, { stdio: 'inherit' });
    console.log('Dépendances Python installées avec succès.');
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'installation des dépendances Python:', error.message);
    return false;
  }
}

// Fonction pour créer des scripts d'initialisation Python
function createPythonScripts() {
  console.log('Création des scripts Python nécessaires...');
  
  // Créer le script d'extraction de texte PDF s'il n'existe pas
  if (!fs.existsSync(path.join(pythonDir, 'pdf_text_extractor.py'))) {
    const pdfExtractorScript = `
import sys
import os
import PyPDF2

def extract_text_from_pdf(pdf_path):
    """Extract text from a PDF file."""
    if not os.path.exists(pdf_path):
        print(f"Error: File {pdf_path} does not exist.", file=sys.stderr)
        sys.exit(1)
    
    try:
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text = ""
            
            for page_num in range(len(reader.pages)):
                page = reader.pages[page_num]
                text += page.extract_text() + "\\n\\n"
            
            return text
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python pdf_text_extractor.py <pdf_file_path>", file=sys.stderr)
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    text = extract_text_from_pdf(pdf_path)
    print(text)
`;
    
    fs.writeFileSync(path.join(pythonDir, 'pdf_text_extractor.py'), pdfExtractorScript);
  }
  
  // Créer le script d'extraction de texte Word s'il n'existe pas
  if (!fs.existsSync(path.join(pythonDir, 'word_text_extractor.py'))) {
    const wordExtractorScript = `
import sys
import os
import json
import docx

def extract_text_from_word(docx_path):
    """Extract text and metadata from a Word document."""
    if not os.path.exists(docx_path):
        print(f"Error: File {docx_path} does not exist.", file=sys.stderr)
        sys.exit(1)
    
    try:
        doc = docx.Document(docx_path)
        
        # Extract text
        full_text = []
        for para in doc.paragraphs:
            full_text.append(para.text)
        
        # Extract metadata
        metadata = {
            "fileName": os.path.basename(docx_path),
            "paragraphCount": len(doc.paragraphs),
            "sectionCount": len(doc.sections),
            "tableCount": len(doc.tables)
        }
        
        # Extract tables
        tables = []
        for i, table in enumerate(doc.tables):
            table_data = []
            for row in table.rows:
                row_data = []
                for cell in row.cells:
                    row_data.append(cell.text)
                table_data.append(row_data)
            tables.append(table_data)
        
        result = {
            "metadata": metadata,
            "text": "\\n".join(full_text),
            "tables": tables
        }
        
        return result
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python word_text_extractor.py <docx_file_path>", file=sys.stderr)
        sys.exit(1)
    
    docx_path = sys.argv[1]
    result = extract_text_from_word(docx_path)
    print(json.dumps(result))
`;
    
    fs.writeFileSync(path.join(pythonDir, 'word_text_extractor.py'), wordExtractorScript);
  }
  
  // Créer le script de résumé de texte s'il n'existe pas
  if (!fs.existsSync(path.join(pythonDir, 'text_summarizer.py'))) {
    const textSummarizerScript = `
import sys
import os
import re
import heapq
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import sent_tokenize, word_tokenize

# Télécharger les ressources NLTK nécessaires
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt', quiet=True)

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords', quiet=True)

def summarize_text(text, num_sentences=5):
    """Generate a summary of the given text."""
    # Nettoyer le texte
    clean_text = re.sub(r'\\s+', ' ', text)
    clean_text = re.sub(r'[^\\w\\s]', '', clean_text)
    
    # Tokeniser le texte en phrases
    sentences = sent_tokenize(text)
    
    # Si le texte est trop court, retourner le texte original
    if len(sentences) <= num_sentences:
        return text
    
    # Calculer la fréquence des mots
    stop_words = set(stopwords.words('french') + stopwords.words('english'))
    word_frequencies = {}
    
    for word in word_tokenize(clean_text.lower()):
        if word not in stop_words:
            if word not in word_frequencies:
                word_frequencies[word] = 1
            else:
                word_frequencies[word] += 1
    
    # Normaliser les fréquences
    if word_frequencies:
        max_frequency = max(word_frequencies.values())
        for word in word_frequencies:
            word_frequencies[word] = word_frequencies[word] / max_frequency
    
    # Calculer le score de chaque phrase
    sentence_scores = {}
    for i, sentence in enumerate(sentences):
        for word in word_tokenize(sentence.lower()):
            if word in word_frequencies:
                if i not in sentence_scores:
                    sentence_scores[i] = word_frequencies[word]
                else:
                    sentence_scores[i] += word_frequencies[word]
    
    # Sélectionner les phrases avec les scores les plus élevés
    summary_sentences = heapq.nlargest(num_sentences, sentence_scores, key=sentence_scores.get)
    summary_sentences.sort()  # Trier par ordre d'apparition
    
    # Construire le résumé
    summary = [sentences[i] for i in summary_sentences]
    
    return ' '.join(summary)

def extract_keywords(text, num_keywords=10):
    """Extract the most important keywords from the text."""
    # Nettoyer le texte
    clean_text = re.sub(r'\\s+', ' ', text)
    clean_text = re.sub(r'[^\\w\\s]', '', clean_text)
    
    # Tokeniser le texte en mots
    words = word_tokenize(clean_text.lower())
    
    # Filtrer les mots vides
    stop_words = set(stopwords.words('french') + stopwords.words('english'))
    filtered_words = [word for word in words if word not in stop_words and len(word) > 2]
    
    # Calculer la fréquence des mots
    word_frequencies = {}
    for word in filtered_words:
        if word not in word_frequencies:
            word_frequencies[word] = 1
        else:
            word_frequencies[word] += 1
    
    # Sélectionner les mots-clés avec les fréquences les plus élevées
    keywords = heapq.nlargest(num_keywords, word_frequencies, key=word_frequencies.get)
    
    return keywords

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python text_summarizer.py <text_file_path>", file=sys.stderr)
        sys.exit(1)
    
    text_path = sys.argv[1]
    
    if not os.path.exists(text_path):
        print(f"Error: File {text_path} does not exist.", file=sys.stderr)
        sys.exit(1)
    
    try:
        with open(text_path, 'r', encoding='utf-8') as file:
            text = file.read()
        
        # Générer le résumé
        summary = summarize_text(text)
        
        # Extraire les mots-clés
        keywords = extract_keywords(text)
        
        # Afficher le résultat
        print("## Résumé du document")
        print(summary)
        print("\\n## Mots-clés")
        print(", ".join(keywords))
        
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)
`;
    
    fs.writeFileSync(path.join(pythonDir, 'text_summarizer.py'), textSummarizerScript);
  }
  
  // Créer le script d'analyse Excel s'il n'existe pas
  if (!fs.existsSync(path.join(pythonDir, 'excel_analyzer.py'))) {
    const excelAnalyzerScript = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Excel Analyzer
-------------
Script Python pour l'analyse avancée des fichiers Excel.
Utilisé par l'agent Excel de l'application ABIA.
"""

import sys
import json
import pandas as pd
import numpy as np
from pathlib import Path

def analyze_excel(file_path):
    """
    Analyse un fichier Excel et retourne des statistiques détaillées.
    
    Args:
        file_path (str): Chemin vers le fichier Excel
    
    Returns:
        dict: Résultats de l'analyse
    """
    try:
        # Vérifier si le fichier existe
        if not Path(file_path).exists():
            return json.dumps({"error": f"Le fichier {file_path} n'existe pas."})
        
        # Lire le fichier Excel
        excel_file = pd.ExcelFile(file_path)
        sheet_names = excel_file.sheet_names
        
        result = {
            "metadata": {
                "file_path": file_path,
                "sheet_count": len(sheet_names),
                "sheets": sheet_names
            },
            "analysis": {
                "summary": {
                    "total_rows": 0,
                    "total_columns": 0,
                    "numeric_columns": {},
                    "categorical_columns": {},
                    "date_columns": {}
                },
                "sheets": {}
            }
        }
        
        # Analyser chaque feuille
        for sheet_name in sheet_names:
            df = pd.read_excel(file_path, sheet_name=sheet_name)
            
            # Statistiques de base
            row_count = len(df)
            col_count = len(df.columns)
            result["analysis"]["summary"]["total_rows"] += row_count
            result["analysis"]["summary"]["total_columns"] += col_count
            
            sheet_analysis = {
                "row_count": row_count,
                "column_count": col_count,
                "columns": {}
            }
            
            # Analyser chaque colonne
            for column in df.columns:
                col_data = df[column]
                col_type = str(col_data.dtype)
                
                # Statistiques de base pour la colonne
                col_stats = {
                    "type": col_type,
                    "null_count": col_data.isna().sum(),
                    "non_null_count": col_data.notna().sum(),
                    "unique_count": col_data.nunique()
                }
                
                # Statistiques spécifiques selon le type de données
                if np.issubdtype(col_data.dtype, np.number):
                    # Colonne numérique
                    numeric_data = col_data.dropna()
                    if len(numeric_data) > 0:
                        col_stats.update({
                            "min": float(numeric_data.min()),
                            "max": float(numeric_data.max()),
                            "mean": float(numeric_data.mean()),
                            "median": float(numeric_data.median()),
                            "std": float(numeric_data.std()) if len(numeric_data) > 1 else 0,
                            "quartiles": [
                                float(numeric_data.quantile(0.25)),
                                float(numeric_data.quantile(0.5)),
                                float(numeric_data.quantile(0.75))
                            ]
                        })
                    result["analysis"]["summary"]["numeric_columns"][str(column)] = sheet_name
                
                elif col_data.dtype == 'object':
                    # Colonne catégorielle (texte)
                    text_data = col_data.dropna()
                    if len(text_data) > 0:
                        # Calculer les valeurs les plus fréquentes
                        value_counts = text_data.value_counts().head(5).to_dict()
                        col_stats["top_values"] = {str(k): int(v) for k, v in value_counts.items()}
                        
                        # Calculer la longueur moyenne des textes
                        text_lengths = text_data.astype(str).apply(len)
                        col_stats["avg_length"] = float(text_lengths.mean())
                        col_stats["max_length"] = int(text_lengths.max())
                    
                    result["analysis"]["summary"]["categorical_columns"][str(column)] = sheet_name
                
                elif pd.api.types.is_datetime64_any_dtype(col_data):
                    # Colonne de dates
                    date_data = col_data.dropna()
                    if len(date_data) > 0:
                        col_stats.update({
                            "min_date": date_data.min().isoformat(),
                            "max_date": date_data.max().isoformat(),
                            "date_range_days": (date_data.max() - date_data.min()).days
                        })
                    
                    result["analysis"]["summary"]["date_columns"][str(column)] = sheet_name
                
                sheet_analysis["columns"][str(column)] = col_stats
            
            result["analysis"]["sheets"][sheet_name] = sheet_analysis
        
        return json.dumps(result)
    
    except Exception as e:
        return json.dumps({"error": str(e)})

if __name__ == "__main__":
    # Vérifier si un chemin de fichier a été fourni
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Aucun chemin de fichier fourni."}))
        sys.exit(1)
    
    file_path = sys.argv[1]
    print(analyze_excel(file_path))
`;
    
    fs.writeFileSync(path.join(pythonDir, 'excel_analyzer.py'), excelAnalyzerScript);
  }

  // Créer le script d'analyse de mail s'il n'existe pas
  if (!fs.existsSync(path.join(pythonDir, 'mail_analyzer.py'))) {
    const mailAnalyzerScript = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Mail Analyzer
------------
Script Python pour l'analyse et la génération de modèles d'e-mails.
Utilisé par l'agent Mail de l'application ABIA.
"""

import sys
import json
import re
from pathlib import Path
from datetime import datetime

def analyze_mail_template(template_type, content):
    """
    Analyse un modèle d'e-mail et suggère des améliorations.
    
    Args:
        template_type (str): Type de modèle (motivation, reclamation, etc.)
        content (dict): Contenu du modèle
    
    Returns:
        dict: Suggestions d'amélioration
    """
    try:
        suggestions = []
        
        # Vérifier la longueur du contenu
        for section, text in content.items():
            if section == 'objet' and len(text) > 100:
                suggestions.append({
                    "section": section,
                    "issue": "L'objet est trop long",
                    "suggestion": "Réduisez l'objet à moins de 100 caractères pour une meilleure lisibilité."
                })
            
            if section in ['introduction', 'conclusion'] and len(text) > 500:
                suggestions.append({
                    "section": section,
                    "issue": "Section trop longue",
                    "suggestion": "Réduisez cette section pour une meilleure concision."
                })
        
        # Vérifier la présence de formules de politesse
        if 'conclusion' in content:
            conclusion = content['conclusion'].lower()
            if not any(phrase in conclusion for phrase in ['cordialement', 'sincères salutations', 'bien à vous']):
                suggestions.append({
                    "section": "conclusion",
                    "issue": "Formule de politesse manquante",
                    "suggestion": "Ajoutez une formule de politesse comme 'Cordialement' ou 'Sincères salutations'."
                })
        
        # Évaluation globale
        tone_score = _evaluate_tone(" ".join(content.values()))
        clarity_score = _evaluate_clarity(" ".join(content.values()))
        
        result = {
            "suggestions": suggestions,
            "evaluation": {
                "tone": tone_score,
                "clarity": clarity_score,
                "overall": (tone_score + clarity_score) / 2
            }
        }
        
        return result
    
    except Exception as e:
        return {"error": str(e)}

def _evaluate_tone(text):
    """
    Évalue le ton du texte (formel, informel, etc.)
    
    Args:
        text (str): Texte à évaluer
    
    Returns:
        float: Score entre 0 et 10
    """
    # Mots formels
    formal_words = ['veuillez', 'agréer', 'salutations distinguées', 'je vous prie', 'madame', 'monsieur']
    
    # Mots informels
    informal_words = ['salut', 'coucou', 'hey', 'cool', 'super']
    
    # Calculer le score
    formal_count = sum(1 for word in formal_words if word.lower() in text.lower())
    informal_count = sum(1 for word in informal_words if word.lower() in text.lower())
    
    # Plus le score est élevé, plus le ton est formel
    if formal_count + informal_count == 0:
        return 5.0  # Score neutre
    
    formality_score = (formal_count * 10) / (formal_count + informal_count * 3)
    return min(10.0, formality_score)

def _evaluate_clarity(text):
    """
    Évalue la clarté du texte
    
    Args:
        text (str): Texte à évaluer
    
    Returns:
        float: Score entre 0 et 10
    """
    # Facteurs qui réduisent la clarté
    avg_sentence_length = len(text) / max(1, len(re.split(r'[.!?]', text)))
    
    # Pénaliser les phrases trop longues
    if avg_sentence_length > 30:
        length_penalty = max(0, (avg_sentence_length - 30) / 10)
    else:
        length_penalty = 0
    
    # Score de base
    base_score = 8.0
    
    # Appliquer les pénalités
    clarity_score = base_score - length_penalty
    
    return max(0, min(10, clarity_score))

if __name__ == "__main__":
    # Vérifier les arguments
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Arguments insuffisants."}))
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "analyze":
        if len(sys.argv) < 4:
            print(json.dumps({"error": "Arguments insuffisants pour l'analyse."}))
            sys.exit(1)
        
        template_type = sys.argv[2]
        content_json = sys.argv[3]
        
        try:
            content = json.loads(content_json)
            result = analyze_mail_template(template_type, content)
            print(json.dumps(result))
        except Exception as e:
            print(json.dumps({"error": str(e)}))
    
    else:
        print(json.dumps({"error": f"Commande non reconnue: {command}"}))
`;
    
    fs.writeFileSync(path.join(pythonDir, 'mail_analyzer.py'), mailAnalyzerScript);
  }
  
  console.log('Scripts Python créés avec succès.');
  return true;
}

// Fonction pour créer un script d'initialisation Python
function createPythonInitScript() {
  console.log('Création du script d\'initialisation Python...');
  
  const initScript = `
import sys
import os
import nltk

# Définir les chemins NLTK
nltk_data_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'nltk_data')
nltk.data.path.append(nltk_data_path)

# Télécharger les ressources NLTK nécessaires
try:
    nltk.download('punkt', download_dir=nltk_data_path, quiet=True)
    nltk.download('stopwords', download_dir=nltk_data_path, quiet=True)
    print("Ressources NLTK téléchargées avec succès.")
except Exception as e:
    print(f"Erreur lors du téléchargement des ressources NLTK: {str(e)}")

print("Initialisation Python terminée.")
`;
  
  fs.writeFileSync(path.join(pythonDir, 'init.py'), initScript);
  console.log('Script d\'initialisation Python créé avec succès.');
  return true;
}

// Fonction pour modifier le service document pour utiliser Python embarqué
function updateDocumentService() {
  console.log('Mise à jour du service document pour utiliser Python embarqué...');
  
  const documentServicePath = path.join(rootDir, 'services', 'document-service.js');
  
  if (fs.existsSync(documentServicePath)) {
    let documentService = fs.readFileSync(documentServicePath, 'utf8');
    
    // Modifier le code pour utiliser Python embarqué
    documentService = documentService.replace(
      'const { spawn } = require(\'child_process\');',
      'const { spawn } = require(\'child_process\');\nconst { PythonShell } = require(\'python-shell\');\nconst electron = require(\'electron\');\nconst app = electron.app || electron.remote.app;'
    );
    
    // Modifier la méthode _createPythonPDFExtractor
    documentService = documentService.replace(
      '_createPythonPDFExtractor() {',
      '_createPythonPDFExtractor() {\n    // Utiliser le Python embarqué\n    const isPacked = app.isPackaged;\n    const pythonPath = isPacked ? path.join(process.resourcesPath, \'python-runtime\') : path.join(__dirname, \'../python-runtime\');\n'
    );
    
    // Modifier la méthode extractTextFromPDF
    documentService = documentService.replace(
      'extractTextFromPDF(filePath) {',
      'extractTextFromPDF(filePath) {\n    const isPacked = app.isPackaged;\n    const pythonScriptPath = isPacked ? path.join(process.resourcesPath, \'python\', \'pdf_text_extractor.py\') : path.join(__dirname, \'../python\', \'pdf_text_extractor.py\');\n    const pythonPath = isPacked ? path.join(process.resourcesPath, \'python-runtime\', process.platform === \'win32\' ? \'Scripts/python.exe\' : \'bin/python\') : null;\n'
    );
    
    // Remplacer l'appel à spawn par PythonShell
    documentService = documentService.replace(
      'const pythonProcess = spawn(\'python\', [pythonScript, filePath]);',
      'const options = {\n        mode: \'text\',\n        args: [filePath]\n      };\n      \n      if (pythonPath) {\n        options.pythonPath = pythonPath;\n      }\n      \n      return new Promise((resolve, reject) => {\n        PythonShell.run(pythonScriptPath, options, (err, results) => {\n          if (err) {\n            reject(new Error(`Erreur lors de l\'extraction du texte: ${err.message}`));\n          } else {\n            resolve(results.join(\'\\n\'));\n          }\n        });\n      });'
    );
    
    // Faire des modifications similaires pour les autres méthodes utilisant Python
    
    fs.writeFileSync(documentServicePath, documentService);
    console.log('Service document mis à jour avec succès.');
    return true;
  } else {
    console.error('Le fichier service document n\'existe pas.');
    return false;
  }
}

// Fonction principale
async function main() {
  console.log('Démarrage du packaging Python pour ABIA...');
  
  // Vérifier si Python est installé
  if (!isPythonInstalled()) {
    console.error('Python n\'est pas installé sur ce système. Impossible de continuer.');
    process.exit(1);
  }
  
  // Créer les scripts Python nécessaires
  createPythonScripts();
  
  // Créer le script d'initialisation Python
  createPythonInitScript();
  
  // Créer l'environnement virtuel Python
  if (!createVirtualEnv()) {
    console.error('Impossible de créer l\'environnement virtuel Python. Abandon.');
    process.exit(1);
  }
  
  // Installer les dépendances Python
  if (!installPythonDependencies()) {
    console.error('Impossible d\'installer les dépendances Python. Abandon.');
    process.exit(1);
  }
  
  // Mettre à jour le service document
  updateDocumentService();
  
  console.log('Packaging Python terminé avec succès !');
}

// Exécuter la fonction principale
main().catch(error => {
  console.error('Erreur lors du packaging Python:', error);
  process.exit(1);
});
