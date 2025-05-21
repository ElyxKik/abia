
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
