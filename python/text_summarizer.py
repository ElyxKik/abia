
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
    clean_text = re.sub(r'\s+', ' ', text)
    clean_text = re.sub(r'[^\w\s]', '', clean_text)
    
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
    clean_text = re.sub(r'\s+', ' ', text)
    clean_text = re.sub(r'[^\w\s]', '', clean_text)
    
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
        print("\n## Mots-clés")
        print(", ".join(keywords))
        
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)
