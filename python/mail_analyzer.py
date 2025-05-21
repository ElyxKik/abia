#!/usr/bin/env python3
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
        
        # Vérifier la présence de dates
        all_text = ' '.join(content.values())
        date_patterns = [
            r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b',  # Format DD/MM/YYYY
            r'\b\d{1,2}\s(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s\d{4}\b'  # Format DD Month YYYY
        ]
        
        has_date = any(re.search(pattern, all_text) for pattern in date_patterns)
        
        if template_type in ['reclamation', 'administrative'] and not has_date:
            suggestions.append({
                "section": "général",
                "issue": "Date manquante",
                "suggestion": "Incluez une date pertinente (date de commande, date de l'incident, etc.)."
            })
        
        # Analyse spécifique selon le type de modèle
        if template_type == 'motivation':
            if 'experience' in content and len(content['experience']) < 200:
                suggestions.append({
                    "section": "experience",
                    "issue": "Section expérience trop courte",
                    "suggestion": "Développez davantage votre expérience et vos compétences pour renforcer votre candidature."
                })
        
        elif template_type == 'reclamation':
            if 'description' in content and len(content['description']) < 100:
                suggestions.append({
                    "section": "description",
                    "issue": "Description du problème trop courte",
                    "suggestion": "Décrivez le problème de manière plus détaillée pour une meilleure compréhension."
                })
        
        # Évaluation globale
        tone_score = _evaluate_tone(all_text)
        clarity_score = _evaluate_clarity(all_text)
        
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

def generate_mail_template(template_type, parameters=None):
    """
    Génère un modèle d'e-mail basé sur le type et les paramètres fournis.
    
    Args:
        template_type (str): Type de modèle (motivation, reclamation, etc.)
        parameters (dict): Paramètres pour personnaliser le modèle
    
    Returns:
        dict: Modèle d'e-mail généré
    """
    try:
        today = datetime.now().strftime("%d/%m/%Y")
        
        templates = {
            "motivation": {
                "coordonnees_expediteur": f"{parameters.get('nom', 'Prénom NOM')}\n{parameters.get('adresse', 'Adresse')}\n{parameters.get('telephone', 'Téléphone')}\n{parameters.get('email', 'Email')}",
                "coordonnees_destinataire": f"{parameters.get('entreprise', 'Nom de l\'entreprise')}\nÀ l'attention de {parameters.get('destinataire', 'Nom du destinataire')}\n{parameters.get('adresse_entreprise', 'Adresse de l\'entreprise')}",
                "objet": f"Objet : Candidature au poste de {parameters.get('poste', 'intitulé du poste')}",
                "introduction": f"Madame, Monsieur,\n\nJe me permets de vous adresser ma candidature pour le poste de {parameters.get('poste', 'intitulé du poste')} au sein de votre entreprise, suite à l'annonce parue {parameters.get('source_annonce', 'source de l\'annonce')}.",
                "experience": "Titulaire de [diplôme/formation], j'ai acquis une expérience significative dans [domaine d'expertise] au cours de mes [X] années d'expérience professionnelle. J'ai notamment développé des compétences en [compétences clés] qui correspondent parfaitement aux exigences du poste.",
                "motivation": f"Votre entreprise {parameters.get('entreprise', 'nom de l\'entreprise')} m'intéresse particulièrement pour [raisons de l'intérêt pour l'entreprise]. Le poste de {parameters.get('poste', 'intitulé du poste')} représente pour moi une opportunité idéale de mettre à profit mes compétences et mon expérience, tout en relevant de nouveaux défis professionnels.",
                "conclusion": "Je me tiens à votre disposition pour un entretien qui me permettrait de vous présenter plus en détail mes motivations et mes compétences. Dans cette attente, je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.",
                "signature": f"{parameters.get('nom', 'Prénom NOM')}\n{today}"
            },
            "reclamation": {
                "coordonnees_expediteur": f"{parameters.get('nom', 'Prénom NOM')}\n{parameters.get('adresse', 'Adresse')}\n{parameters.get('telephone', 'Téléphone')}\n{parameters.get('email', 'Email')}",
                "coordonnees_destinataire": f"{parameters.get('entreprise', 'Nom de l\'entreprise')}\nService {parameters.get('service', 'client')}\n{parameters.get('adresse_entreprise', 'Adresse de l\'entreprise')}",
                "reference": f"Référence client : {parameters.get('reference_client', 'numéro client')}\nRéférence commande : {parameters.get('reference_commande', 'numéro de commande')}",
                "objet": f"Objet : Réclamation concernant {parameters.get('objet_reclamation', 'objet de la réclamation')}",
                "description": f"Madame, Monsieur,\n\nJe vous contacte au sujet de {parameters.get('objet_reclamation', 'objet de la réclamation')} {parameters.get('date_incident', 'date de l\'incident')}.\n\n[Description détaillée du problème rencontré]",
                "demande": "Suite à ce problème, je vous demande de bien vouloir [demande spécifique : remboursement, échange, réparation, etc.].",
                "conclusion": f"Sans réponse satisfaisante de votre part sous {parameters.get('delai', '15 jours')}, je me verrai contraint(e) de faire appel aux services compétents pour résoudre ce litige.\n\nJe vous remercie par avance de l'attention que vous porterez à ma demande et vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.",
                "signature": f"{parameters.get('nom', 'Prénom NOM')}\n{today}"
            },
            "administrative": {
                "coordonnees_expediteur": f"{parameters.get('nom', 'Prénom NOM')}\n{parameters.get('adresse', 'Adresse')}\n{parameters.get('telephone', 'Téléphone')}\n{parameters.get('email', 'Email')}",
                "coordonnees_destinataire": f"{parameters.get('organisme', 'Nom de l\'organisme')}\nÀ l'attention de {parameters.get('destinataire', 'Nom du destinataire')}\n{parameters.get('adresse_organisme', 'Adresse de l\'organisme')}",
                "objet": f"Objet : {parameters.get('objet', 'Objet de la lettre')}",
                "corps": "Madame, Monsieur,\n\n[Corps de la lettre avec les informations pertinentes]",
                "conclusion": "Je vous remercie par avance de l'attention que vous porterez à ma demande et vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.",
                "signature": f"{parameters.get('nom', 'Prénom NOM')}\n{today}"
            }
        }
        
        if template_type not in templates:
            return {"error": f"Type de modèle non pris en charge: {template_type}"}
        
        return templates.get(template_type, {"error": "Modèle non trouvé"})
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
    
    elif command == "generate":
        if len(sys.argv) < 3:
            print(json.dumps({"error": "Arguments insuffisants pour la génération."}))
            sys.exit(1)
        
        template_type = sys.argv[2]
        parameters = json.loads(sys.argv[3]) if len(sys.argv) > 3 else None
        
        result = generate_mail_template(template_type, parameters)
        print(json.dumps(result))
    
    else:
        print(json.dumps({"error": f"Commande non reconnue: {command}"}))
