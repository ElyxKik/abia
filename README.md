# ABIA - Assistant Intelligent

ABIA est une application desktop multiplateforme construite avec Electron.js qui agit comme un assistant intelligent basé sur l'IA. Elle offre une interface utilisateur moderne et minimaliste inspirée de ChatGPT, avec des fonctionnalités avancées pour aider les utilisateurs à accomplir diverses tâches.

## Fonctionnalités principales

- 🧠 **Tableau de bord** - Vue d'ensemble des tâches récentes, widgets personnalisables et statistiques
- 💬 **Interface de Chat IA** - Conversation fluide avec prise en charge du Markdown et des actions enrichies
- 🧩 **Agents IA spécialisés**
  - 🔹 **Agent Excel** - Analyse et traitement de fichiers Excel
  - 🔹 **Agent de génération de courriers** - Création de lettres administratives
  - 🔹 **Agent d'analyse de documents** - Support des formats Word, PDF, Excel
- 🌙 **Fonctionnalités supplémentaires** - Mode sombre/clair, multilingue (FR/EN), notifications locales, etc.

## Technologies utilisées

- **Frontend** : HTML, CSS (Tailwind CSS), JavaScript
- **Backend** : Node.js, Electron.js
- **IA et traitement** : Langchain.js, DeepSeek API
- **Stockage** : SQLite, NeDB
- **Traitement de documents** : docx, xlsx-populate, pdf-lib

## Installation

### Prérequis

- Node.js (v14 ou supérieur)
- npm (v6 ou supérieur)

### Installation des dépendances

```bash
# Cloner le dépôt
git clone https://github.com/votre-username/abia.git
cd abia

# Installer les dépendances
npm install
```

### Configuration

1. Créez un fichier `.env` à la racine du projet (ou modifiez le fichier dans `/config`) avec vos clés API :

```
DEEPSEEK_API_KEY=votre_clé_api_deepseek
```

## Utilisation

### Démarrer l'application en mode développement

```bash
npm run dev
```

Cette commande lancera l'application Electron et démarrera le watcher Tailwind CSS pour recompiler les styles à chaque modification.

### Construire l'application pour la production

```bash
npm run build
```

Les fichiers de build seront disponibles dans le dossier `dist`.

## Structure du projet

```
/main/                # Processus principal (Electron main)
/renderer/            # UI frontend (HTML + Tailwind + JS)
  /css/               # Fichiers CSS (input.css et output.css généré)
  /js/                # Scripts JavaScript pour le frontend
  /assets/            # Images, icônes et autres ressources
/services/            # Scripts Node.js (Excel, PDF, docx, SQLite, NeDB)
/agents/              # Agents spécialisés IA (ExcelAgent.js, DocAgent.js…)
/python/              # Scripts Python pour traitement avancé
/config/              # Clés API, paramètres LLM, config locale
```

## Fonctionnalités détaillées

### Tableau de bord

Le tableau de bord offre une vue d'ensemble des activités récentes et des statistiques d'utilisation. Il comprend :
- Widgets personnalisables (météo, rappels, tâches, etc.)
- Graphiques de performance
- Notes rapides

### Interface de Chat IA

L'interface de chat permet d'interagir avec l'assistant IA de manière naturelle :
- Support du Markdown pour le formatage du texte
- Boutons d'action contextuelle
- Historique des conversations
- Possibilité de télécharger et d'analyser des fichiers

### Agents spécialisés

#### Agent Excel
- Analyse de données tabulaires
- Génération de graphiques et de statistiques
- Extraction d'informations clés

#### Agent de génération de courriers
- Création de lettres administratives
- Modèles personnalisables
- Support multilingue

#### Agent d'analyse de documents
- Extraction de texte et de données structurées
- Résumé automatique
- Classification des documents

## Licence

MIT
