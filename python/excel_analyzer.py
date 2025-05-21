#!/usr/bin/env python3
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
