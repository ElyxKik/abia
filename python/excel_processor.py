#!/usr/bin/env python3
"""
Module de traitement des fichiers Excel pour l'intégration avec l'API DeepSeek.
Ce script extrait les données d'un fichier Excel et les formate pour l'envoi à l'API DeepSeek.
"""

import sys
import os
import json
import pandas as pd
import numpy as np
from openpyxl import load_workbook
import xlrd
import traceback

def process_excel_file(file_path, max_rows=100, max_cols=20, format_type='markdown', sheet_index=0):
    """
    Traite un fichier Excel et extrait les données dans le format spécifié.
    
    Args:
        file_path (str): Chemin vers le fichier Excel
        max_rows (int): Nombre maximum de lignes à extraire
        max_cols (int): Nombre maximum de colonnes à extraire
        format_type (str): Format de sortie ('json', 'markdown', 'csv', 'text')
        sheet_index (int): Index de la feuille à traiter (0 = première feuille)
        
    Returns:
        dict: Métadonnées du fichier et données extraites
    """
    try:
        file_ext = os.path.splitext(file_path)[1].lower()
        
        # Vérifier que le fichier existe
        if not os.path.exists(file_path):
            return {"error": f"Le fichier {file_path} n'existe pas"}
        
        # Charger le fichier Excel avec pandas
        if file_ext in ('.xlsx', '.xls', '.xlsm', '.csv'):
            try:
                # Essayer d'abord d'ouvrir le fichier comme CSV si l'extension est .csv
                if file_ext == '.csv':
                    try:
                        df = pd.read_csv(file_path, nrows=max_rows)
                        sheet_names = ["CSV Data"]
                        sheet_count = 1
                        sheet_index = 0
                    except Exception as csv_error:
                        return {"error": f"Erreur lors de la lecture du fichier CSV: {str(csv_error)}"}
                else:
                    # Obtenir le nombre de feuilles et leurs noms
                    sheet_names = []
                    try:
                        if file_ext == '.xlsx' or file_ext == '.xlsm':
                            try:
                                workbook = load_workbook(file_path, read_only=True, data_only=True)
                                sheet_names = workbook.sheetnames
                                sheet_count = len(sheet_names)
                            except Exception as openpyxl_error:
                                if "not a zip file" in str(openpyxl_error).lower() or "central directory" in str(openpyxl_error).lower():
                                    # Essayer de lire le fichier comme CSV si le format XLSX est corrompu
                                    try:
                                        df = pd.read_csv(file_path, nrows=max_rows)
                                        sheet_names = ["Recovered Data"]
                                        sheet_count = 1
                                        sheet_index = 0
                                        print(f"Fichier Excel corrompu, lu comme CSV: {file_path}")
                                    except:
                                        # Si cela échoue également, réessayer avec xlrd comme dernier recours
                                        try:
                                            workbook = xlrd.open_workbook(file_path, on_demand=True, formatting_info=False)
                                            sheet_names = workbook.sheet_names()
                                            sheet_count = workbook.nsheets
                                        except Exception as xlrd_error:
                                            return {"error": f"Format de fichier Excel non reconnu ou corrompu. Essayez de le réenregistrer au format .xlsx ou .csv. Détails: {str(openpyxl_error)}"}
                                else:
                                    raise openpyxl_error
                        else:  # .xls
                            try:
                                workbook = xlrd.open_workbook(file_path, on_demand=True, formatting_info=False)
                                sheet_names = workbook.sheet_names()
                                sheet_count = workbook.nsheets
                            except Exception as xlrd_error:
                                if "not a .xls file" in str(xlrd_error).lower():
                                    # Essayer de lire le fichier comme CSV si le format XLS est corrompu
                                    try:
                                        df = pd.read_csv(file_path, nrows=max_rows)
                                        sheet_names = ["Recovered Data"]
                                        sheet_count = 1
                                        sheet_index = 0
                                        print(f"Fichier Excel corrompu, lu comme CSV: {file_path}")
                                    except:
                                        return {"error": f"Format de fichier Excel non reconnu ou corrompu. Essayez de le réenregistrer au format .xlsx ou .csv. Détails: {str(xlrd_error)}"}
                                else:
                                    raise xlrd_error
                        
                        # Vérifier que l'index de feuille est valide
                        if sheet_index >= sheet_count:
                            sheet_index = 0
                    except Exception as sheet_error:
                        return {"error": f"Erreur lors de la lecture des feuilles du fichier Excel: {str(sheet_error)}"}
                    
                    # Si nous n'avons pas encore de DataFrame (cas où nous avons récupéré les feuilles avec succès)
                    if 'df' not in locals():
                        # Déterminer le moteur en fonction de l'extension du fichier
                        engine = None
                        if file_ext == '.xls':
                            engine = 'xlrd'
                        elif file_ext in ('.xlsx', '.xlsm'):
                            engine = 'openpyxl'
                        
                        try:
                            # Charger la feuille spécifiée avec pandas, en spécifiant le moteur
                            df = pd.read_excel(file_path, sheet_name=sheet_index, nrows=max_rows, engine=engine)
                        except Exception as pd_error:
                            # Essayer une dernière fois avec des options plus permissives
                            try:
                                if engine == 'openpyxl':
                                    # Pour les fichiers XLSX, essayer avec des options plus permissives
                                    df = pd.read_excel(file_path, sheet_name=sheet_index, nrows=max_rows, engine=engine, 
                                                      keep_default_na=True, na_values=['NA'], convert_float=True)
                                else:
                                    # Pour les fichiers XLS, essayer avec des options plus permissives
                                    df = pd.read_excel(file_path, sheet_name=sheet_index, nrows=max_rows, engine=engine,
                                                      keep_default_na=True, na_values=['NA'])
                            except Exception as final_error:
                                return {"error": f"Impossible de lire le contenu du fichier Excel. Le fichier pourrait être corrompu ou dans un format non standard. Détails: {str(final_error)}"}

                
                # Limiter le nombre de colonnes
                if len(df.columns) > max_cols:
                    df = df.iloc[:, :max_cols]
                
                # Obtenir le nom de la feuille
                sheet_name = sheet_names[sheet_index] if sheet_names else f"Sheet {sheet_index+1}"
                
                # Remplacer les valeurs NaN par None pour la sérialisation JSON
                df = df.replace({np.nan: None})
                
                # Extraire les métadonnées
                file_name = os.path.basename(file_path)
                row_count = min(len(df), max_rows)
                col_count = min(len(df.columns), max_cols)
                
                # Formater les données selon le format demandé
                if format_type == 'json':
                    # Convertir en liste de dictionnaires
                    data = df.to_dict(orient='records')
                elif format_type == 'markdown':
                    # Convertir en tableau Markdown
                    data = df.to_markdown(index=False)
                elif format_type == 'csv':
                    # Convertir en CSV
                    data = df.to_csv(index=False)
                else:  # text
                    # Convertir en texte simple
                    data = df.to_string(index=False)
                
                # Retourner les métadonnées et les données
                return {
                    "fileName": file_name,
                    "sheetName": sheet_name,
                    "rowCount": row_count,
                    "columnCount": col_count,
                    "format": format_type,
                    "data": data,
                    "sheet_count": sheet_count,
                    "sheet_names": sheet_names
                }
            
            except Exception as e:
                error_msg = f"Erreur lors du traitement du fichier Excel: {str(e)}"
                traceback.print_exc()
                return {"error": error_msg}
        else:
            return {"error": f"Le format de fichier {file_ext} n'est pas pris en charge"}
    
    except Exception as e:
        error_msg = f"Erreur inattendue: {str(e)}"
        traceback.print_exc()
        return {"error": error_msg}

def generate_structured_report(data, instructions=""):
    """
    Génère un rapport structuré au format JSON à partir des données Excel.
    
    Args:
        data (dict): Données extraites d'un fichier Excel
        instructions (str): Instructions spécifiques pour l'analyse
        
    Returns:
        dict: Rapport structuré au format JSON
    """
    try:
        # Extraire les métadonnées du fichier
        file_info = {
            "nom": data.get("fileName", ""),
            "feuille": data.get("sheetName", ""),
            "dimensions": f"{data.get('rowCount', 0)} lignes × {data.get('columnCount', 0)} colonnes"
        }
        
        # Analyser les données pour extraire des sections pertinentes
        df = None
        sections = {}
        recommandations = []
        calculs_exemple = {}
        
        # Convertir les données en DataFrame si elles sont au format JSON
        if data.get("format") == "json" and isinstance(data.get("data"), list):
            df = pd.DataFrame(data.get("data"))
        elif data.get("format") == "markdown" and isinstance(data.get("data"), str):
            # Pour les données markdown, on essaie de les reconvertir en DataFrame
            try:
                # Créer un DataFrame à partir des données brutes pour l'analyse
                file_ext = os.path.splitext(data.get("fileName", ""))[1].lower()
                engine = 'xlrd' if file_ext == '.xls' else 'openpyxl'
                df_temp = pd.read_excel(data.get("_file_path", ""), sheet_name=data.get("_sheet_index", 0), 
                                        nrows=data.get("rowCount", 100), engine=engine)
                df = df_temp.replace({np.nan: None})
            except Exception as e:
                print(f"Erreur lors de la conversion des données markdown en DataFrame: {str(e)}")
        
        if df is not None:
            # Identifier les colonnes numériques
            numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
            
            # Statistiques de base
            if len(numeric_cols) > 0:
                sections["Statistiques"] = {}
                for col in numeric_cols[:5]:  # Limiter à 5 colonnes pour éviter la surcharge
                    try:
                        sections["Statistiques"][col] = {
                            "Moyenne": round(df[col].mean(), 2),
                            "Médiane": round(df[col].median(), 2),
                            "Min": round(df[col].min(), 2),
                            "Max": round(df[col].max(), 2)
                        }
                    except:
                        pass
            
            # Détecter les sections potentielles basées sur les noms de colonnes
            finance_keywords = ["montant", "prix", "coût", "revenu", "dépense", "taux", "impôt", "valeur"]
            date_keywords = ["date", "année", "mois", "jour", "période"]
            product_keywords = ["produit", "article", "référence", "stock", "quantité"]
            
            # Créer des sections basées sur les mots-clés détectés
            finance_cols = [col for col in df.columns if any(kw in str(col).lower() for kw in finance_keywords)]
            date_cols = [col for col in df.columns if any(kw in str(col).lower() for kw in date_keywords)]
            product_cols = [col for col in df.columns if any(kw in str(col).lower() for kw in product_keywords)]
            
            if finance_cols:
                sections["Finances"] = {}
                for col in finance_cols[:5]:
                    try:
                        # Prendre les 3 premières valeurs uniques comme exemples
                        unique_vals = df[col].dropna().unique()[:3]
                        sections["Finances"][col] = [float(val) if isinstance(val, (int, float)) else str(val) for val in unique_vals]
                    except:
                        sections["Finances"][col] = "Données variables"
            
            if date_cols:
                sections["Périodes"] = {}
                for col in date_cols[:3]:
                    try:
                        # Prendre les 3 premières valeurs uniques comme exemples
                        unique_vals = df[col].dropna().unique()[:3]
                        sections["Périodes"][col] = [str(val) for val in unique_vals]
                    except:
                        sections["Périodes"][col] = "Données variables"
            
            if product_cols:
                sections["Produits"] = {}
                for col in product_cols[:3]:
                    try:
                        # Prendre les 3 premières valeurs uniques comme exemples
                        unique_vals = df[col].dropna().unique()[:3]
                        sections["Produits"][col] = [str(val) for val in unique_vals]
                    except:
                        sections["Produits"][col] = "Données variables"
            
            # Générer des recommandations basées sur l'analyse des données
            if len(numeric_cols) > 0:
                recommandations.append("Vérifier les valeurs extrêmes dans les colonnes numériques")
            
            if df.isnull().sum().sum() > 0:
                recommandations.append("Traiter les valeurs manquantes dans le jeu de données")
            
            # Ajouter des exemples de calculs si des colonnes numériques sont présentes
            if len(numeric_cols) >= 2:
                calculs_exemple[f"Somme de {numeric_cols[0]}"] = f"Total: {round(df[numeric_cols[0]].sum(), 2)}"
                if len(numeric_cols) >= 2:
                    calculs_exemple[f"Rapport {numeric_cols[0]}/{numeric_cols[1]}"] = f"Formule: {numeric_cols[0]} / {numeric_cols[1]}"
        
        # Créer le rapport structuré
        report = {
            "fichier": file_info,
            "sections": sections,
            "recommandations": recommandations,
            "calculs_exemple": calculs_exemple
        }
        
        return report
    
    except Exception as e:
        print(f"Erreur lors de la génération du rapport structuré: {str(e)}")
        traceback.print_exc()
        return {
            "fichier": {
                "nom": data.get("fileName", ""),
                "feuille": data.get("sheetName", ""),
                "dimensions": f"{data.get('rowCount', 0)} lignes × {data.get('columnCount', 0)} colonnes"
            },
            "sections": {},
            "recommandations": ["Vérifier le format des données", "Analyser manuellement le contenu du fichier"],
            "calculs_exemple": {}
        }

def analyze_excel_data(data, column_types=True, stats=True, preview_rows=5):
    """
    Analyse les données Excel et génère des statistiques et informations descriptives.
    
    Args:
        data (dict): Données extraites d'un fichier Excel
        column_types (bool): Inclure les types de colonnes dans l'analyse
        stats (bool): Inclure des statistiques dans l'analyse
        preview_rows (int): Nombre de lignes à inclure dans l'aperçu
        
    Returns:
        dict: Analyse des données
    """
    try:
        if "error" in data:
            return data
        
        # Récupérer les données au format JSON
        if data["format"] != "json":
            return {"error": "L'analyse nécessite des données au format JSON"}
        
        # Convertir les données en DataFrame
        df = pd.DataFrame(data["data"])
        
        analysis = {
            "fileName": data["fileName"],
            "sheetName": data["sheetName"],
            "rowCount": data["rowCount"],
            "columnCount": data["columnCount"],
            "columns": {}
        }
        
        # Ajouter l'aperçu des données
        if preview_rows > 0:
            analysis["preview"] = df.head(preview_rows).to_dict(orient='records')
        
        # Analyser chaque colonne
        for col in df.columns:
            col_analysis = {}
            
            # Détecter le type de données
            if column_types:
                # Ignorer les valeurs None pour la détection de type
                non_null_values = df[col].dropna()
                
                if len(non_null_values) == 0:
                    col_type = "unknown"
                elif pd.api.types.is_numeric_dtype(non_null_values):
                    if all(non_null_values.apply(lambda x: isinstance(x, int) or x.is_integer())):
                        col_type = "integer"
                    else:
                        col_type = "float"
                elif pd.api.types.is_datetime64_any_dtype(non_null_values):
                    col_type = "datetime"
                elif pd.api.types.is_bool_dtype(non_null_values):
                    col_type = "boolean"
                else:
                    col_type = "string"
                
                col_analysis["type"] = col_type
            
            # Calculer les statistiques
            if stats:
                col_analysis["null_count"] = df[col].isna().sum()
                col_analysis["unique_values"] = df[col].nunique()
                
                # Statistiques pour les colonnes numériques
                if pd.api.types.is_numeric_dtype(df[col]):
                    col_analysis["min"] = df[col].min()
                    col_analysis["max"] = df[col].max()
                    col_analysis["mean"] = df[col].mean()
                    col_analysis["median"] = df[col].median()
                    col_analysis["std"] = df[col].std()
                
                # Valeurs les plus fréquentes pour les colonnes textuelles
                elif col_type == "string":
                    value_counts = df[col].value_counts().head(5).to_dict()
                    col_analysis["most_common_values"] = value_counts
            
            analysis["columns"][col] = col_analysis
        
        return analysis
    
    except Exception as e:
        error_msg = f"Erreur lors de l'analyse des données: {str(e)}"
        traceback.print_exc()
        return {"error": error_msg}

def format_prompt_for_deepseek(data, instructions, include_analysis=True, max_data_length=8000):
    """
    Formate les données Excel et les instructions pour l'envoi à l'API DeepSeek.
    
    Args:
        data (dict): Données extraites d'un fichier Excel
        instructions (str): Instructions pour l'analyse
        include_analysis (bool): Inclure l'analyse automatique dans le prompt
        max_data_length (int): Longueur maximale des données à inclure dans le prompt
        
    Returns:
        str: Prompt formaté pour DeepSeek
    """
    try:
        if "error" in data:
            return f"Erreur lors du traitement du fichier Excel: {data['error']}\n\nInstructions: {instructions}"
        
        # Créer l'en-tête du prompt
        prompt = f"""
Voici des données extraites d'un fichier Excel:
Nom du fichier: {data['fileName']}
Feuille: {data['sheetName']}
Nombre de lignes: {data['rowCount']}
Nombre de colonnes: {data['columnCount']}
Format des données: {data['format']}

"""
        
        # Ajouter les instructions
        prompt += f"INSTRUCTIONS:\n{instructions}\n\n"
        
        # Ajouter l'analyse si demandée
        if include_analysis and data["format"] == "json":
            analysis = analyze_excel_data(data)
            if "error" not in analysis:
                prompt += "ANALYSE AUTOMATIQUE DES DONNÉES:\n"
                
                # Ajouter les types de colonnes
                prompt += "Types de colonnes:\n"
                for col, info in analysis["columns"].items():
                    prompt += f"- {col}: {info.get('type', 'inconnu')}\n"
                
                # Ajouter des statistiques pour les colonnes numériques
                num_cols = [col for col, info in analysis["columns"].items() 
                           if info.get("type") in ("integer", "float")]
                
                if num_cols:
                    prompt += "\nStatistiques des colonnes numériques:\n"
                    for col in num_cols:
                        info = analysis["columns"][col]
                        prompt += f"- {col}: min={info.get('min')}, max={info.get('max')}, moyenne={info.get('mean')}, médiane={info.get('median')}\n"
                
                prompt += "\n"
        
        # Ajouter les données
        prompt += "DONNÉES:\n"
        
        # Convertir les données en texte et les tronquer si nécessaire
        data_str = str(data["data"])
        if len(data_str) > max_data_length:
            data_str = data_str[:max_data_length] + "...[données tronquées pour respecter la limite de contexte]"
        
        prompt += data_str + "\n\n"
        
        # Ajouter des instructions finales
        prompt += "Sur la base de ces données et des instructions fournies, veuillez réaliser une analyse complète."
        
        return prompt
    
    except Exception as e:
        error_msg = f"Erreur lors de la création du prompt: {str(e)}"
        traceback.print_exc()
        return f"Erreur: {error_msg}\n\nInstructions: {instructions}"

def main():
    """
    Point d'entrée principal du script lorsqu'il est exécuté directement.
    Attend un chemin de fichier Excel et des options en arguments.
    """
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Veuillez spécifier un chemin de fichier Excel"}))
        sys.exit(1)
        
    file_path = sys.argv[1]
    format_type = sys.argv[2] if len(sys.argv) > 2 else 'json'
    max_rows = int(sys.argv[3]) if len(sys.argv) > 3 else 100
    max_cols = int(sys.argv[4]) if len(sys.argv) > 4 else 20
    sheet_index = int(sys.argv[5]) if len(sys.argv) > 5 else 0
    
    try:
        # Traiter le fichier Excel
        result = process_excel_file(file_path, max_rows, max_cols, format_type, sheet_index)
        
        # Stocker le chemin du fichier et l'index de la feuille pour une utilisation ultérieure
        result["_file_path"] = file_path
        result["_sheet_index"] = sheet_index
        
        # Vérifier s'il faut générer un rapport structuré
        generate_report = False
        instructions = ""
        
        if len(sys.argv) > 6:
            if sys.argv[6] == "--structured-report":
                generate_report = True
                instructions = sys.argv[7] if len(sys.argv) > 7 else ""
            else:
                instructions = sys.argv[6]
        
        if generate_report:
            # Générer un rapport structuré au format JSON
            structured_report = generate_structured_report(result, instructions)
            result["structured_report"] = structured_report
        elif instructions:  # Si des instructions sont fournies, formater le prompt pour DeepSeek
            prompt = format_prompt_for_deepseek(result, instructions)
            result["prompt"] = prompt
        
        # Supprimer les champs internes avant de retourner le résultat
        if "_file_path" in result:
            del result["_file_path"]
        if "_sheet_index" in result:
            del result["_sheet_index"]
        
        # Retourner le résultat en JSON
        print(json.dumps(result))
    except Exception as e:
        error_msg = f"Erreur lors du traitement du fichier Excel: {str(e)}"
        print(json.dumps({"error": error_msg}))
        traceback.print_exc()

if __name__ == "__main__":
    main()
