#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Script de traduction de documents utilisant l'API DeepL
Ce script prend en entrée un fichier, une langue cible et optionnellement une langue source
et renvoie le chemin du fichier traduit.
"""

import os
import sys
import json
import time
import requests
from pathlib import Path

def load_config():
    """Charge la configuration depuis le fichier config.json"""
    config_paths = [
        '../config/config.json',
        '../config.json',
        './config/config.json',
        './config.json'
    ]
    
    for config_path in config_paths:
        try:
            script_dir = os.path.dirname(os.path.abspath(__file__))
            full_path = os.path.join(script_dir, config_path)
            if os.path.exists(full_path):
                with open(full_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            print(f"Erreur lors du chargement de la configuration depuis {config_path}: {str(e)}", file=sys.stderr)
    
    # Configuration par défaut si aucun fichier n'est trouvé
    print("ATTENTION: Aucun fichier de configuration trouvé. Utilisez un fichier config.json valide avec votre clé API DeepL.", file=sys.stderr)
    
    # Vérifier si une variable d'environnement est définie
    deepl_api_key = os.environ.get('DEEPL_API_KEY')
    if not deepl_api_key:
        print("ERREUR: Aucune clé API DeepL trouvée. Définissez la variable d'environnement DEEPL_API_KEY ou utilisez un fichier config.json.", file=sys.stderr)
        deepl_api_key = "VOTRE_CLE_API_DEEPL"  # Cette clé ne fonctionnera pas, c'est juste un placeholder
    
    return {
        "api": {
            "deepl": {
                "key": deepl_api_key,
                "url": "https://api.deepl.com/v2"
            }
        }
    }

def translate_document(file_path, target_lang, source_lang='auto'):
    """
    Traduit un document en utilisant l'API DeepL
    
    Args:
        file_path (str): Chemin vers le fichier à traduire
        target_lang (str): Code de la langue cible (ex: 'FR', 'EN-US')
        source_lang (str, optional): Code de la langue source (ex: 'FR', 'EN'). Par défaut 'auto'.
        
    Returns:
        dict: Résultat de la traduction contenant le chemin du fichier traduit
    """
    try:
        # Charger la configuration
        config = load_config()
        api_key = config.get('api', {}).get('deepl', {}).get('key', '')
        api_url = config.get('api', {}).get('deepl', {}).get('url', 'https://api.deepl.com/v2')
        
        if not api_key:
            raise ValueError("Clé API DeepL non trouvée dans la configuration")
        
        # Vérifier que le fichier existe
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Le fichier {file_path} n'existe pas.")
        
        # Vérifier l'extension du fichier
        file_ext = os.path.splitext(file_path)[1].lower()
        supported_types = [".pdf", ".docx", ".pptx", ".txt"]
        if file_ext not in supported_types:
            raise ValueError(f"Le type de fichier {file_ext} n'est pas supporté. Types supportés: {', '.join(supported_types)}")
        
        # Étape 1: Uploader le document
        # Envoyer une mise à jour de progression au format JSON
        progress_data = {
            "progress": {
                "step": "initialisation", 
                "progress": 5, 
                "message": "Initialisation du processus de traduction"
            }
        }
        print(json.dumps(progress_data))
        
        # Mise à jour : Étape d'upload
        progress_data = {
            "progress": {
                "step": "upload", 
                "progress": 10, 
                "message": f"Upload du document {file_path}"
            }
        }
        print(json.dumps(progress_data))
        
        with open(file_path, 'rb') as f:
            files = {'file': f}
            data = {'target_lang': target_lang}
            
            if source_lang != 'auto':
                data['source_lang'] = source_lang
                
            headers = {'Authorization': f'DeepL-Auth-Key {api_key}'}
            
            response = requests.post(
                f"{api_url}/document",
                headers=headers,
                files=files,
                data=data
            )
            
            if response.status_code != 200:
                raise Exception(f"Erreur lors de l'upload du document: {response.text}")
                
            document_id = response.json()['document_id']
            document_key = response.json()['document_key']
        
        # Étape 2: Polling pour vérifier si la traduction est terminée
        # Envoyer une mise à jour de progression au format JSON
        progress_data = {
            "progress": {
                "step": "pretraitement", 
                "progress": 20, 
                "message": "Préparation du document pour la traduction"
            }
        }
        print(json.dumps(progress_data))
        
        # Mise à jour : Début de la traduction
        progress_data = {
            "progress": {
                "step": "translation", 
                "progress": 30, 
                "message": "Traduction du document en cours"
            }
        }
        print(json.dumps(progress_data))
        
        status = ''
        progress_value = 10
        while status != 'done':
            time.sleep(2)  # Attendre 2 secondes entre chaque vérification
            
            check_response = requests.get(
                f"{api_url}/document/{document_id}",
                headers=headers,
                params={'document_key': document_key}
            )
            
            if check_response.status_code != 200:
                raise Exception(f"Erreur lors de la vérification du statut: {check_response.text}")
                
            status = check_response.json()['status']
            
            # Calculer la progression en fonction du statut
            if status == "queued":
                progress_value = 40
                message = "Document en file d'attente pour la traduction"
            elif status == "translating":
                progress_value = 60
                message = "Traduction du document en cours"
            elif status == "done":
                progress_value = 80
                message = "Traduction terminée, préparation du téléchargement"
            else:
                progress_value = 50
                message = f"Statut de la traduction: {status}"
            
            # Envoyer une mise à jour de progression au format JSON
            progress_data = {
                "progress": {
                    "step": "translation", 
                    "progress": progress_value, 
                    "message": message
                }
            }
            print(json.dumps(progress_data))
        
        # Étape 3: Récupération du fichier traduit
        # Envoyer une mise à jour de progression au format JSON
        progress_data = {
            "progress": {
                "step": "post-traitement", 
                "progress": 85, 
                "message": "Préparation du téléchargement"
            }
        }
        print(json.dumps(progress_data))
        
        # Mise à jour : Téléchargement
        progress_data = {
            "progress": {
                "step": "download", 
                "progress": 90, 
                "message": "Téléchargement du document traduit"
            }
        }
        print(json.dumps(progress_data))
        
        download_response = requests.get(
            f"{api_url}/document/{document_id}/result",
            headers=headers,
            params={'document_key': document_key},
            stream=True
        )
        
        if download_response.status_code != 200:
            raise Exception(f"Erreur lors du téléchargement du document traduit: {download_response.text}")
        
        # Créer le dossier de sortie s'il n'existe pas
        downloads_path = os.path.join(os.path.expanduser('~'), 'Downloads', 'ABIA_Traductions')
        os.makedirs(downloads_path, exist_ok=True)
        
        # Générer un nom de fichier pour la traduction
        file_name = os.path.basename(file_path)
        file_name_without_ext = os.path.splitext(file_name)[0]
        output_path = os.path.join(
            downloads_path, 
            f"{file_name_without_ext}_{target_lang}{file_ext}"
        )
        
        # Écrire le fichier traduit
        with open(output_path, 'wb') as f:
            for chunk in download_response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        # Envoyer une mise à jour finale au format JSON
        progress_data = {
            "progress": {
                "step": "finalisation", 
                "progress": 95, 
                "message": "Finalisation du processus"
            }
        }
        print(json.dumps(progress_data))
        
        # Attendre un court instant pour permettre à l'interface de se mettre à jour
        time.sleep(0.5)
        
        # Envoyer la notification de complétion
        progress_data = {
            "progress": {
                "step": "complete", 
                "progress": 100, 
                "message": "Document traduit avec succès!"
            }
        }
        print(json.dumps(progress_data))
        
        return {
            'success': True,
            'translated_file_path': output_path,
            'original_file_path': file_path,
            'target_language': target_lang,
            'source_language': source_lang,
            'fileName': os.path.basename(output_path),
            'outputPath': output_path
        }
        
    except Exception as e:
        error_message = str(e)
        print(f"Erreur lors de la traduction du document: {error_message}", file=sys.stderr)
        return {
            'success': False,
            'error': error_message,
            'original_file_path': file_path
        }

def main():
    """Fonction principale"""
    if len(sys.argv) < 3:
        print("Usage: python translation_processor.py <file_path> <target_lang> [source_lang]", file=sys.stderr)
        sys.exit(1)
    
    file_path = sys.argv[1]
    target_lang = sys.argv[2]
    source_lang = sys.argv[3] if len(sys.argv) > 3 else 'auto'
    
    result = translate_document(file_path, target_lang, source_lang)
    print(json.dumps(result))

if __name__ == "__main__":
    main()
