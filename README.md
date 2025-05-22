# 🤖 ABIA - Assistant Bureau Intelligent Agentique

ABIA est une application desktop multiplateforme (Windows, macOS, Linux) conçue pour assister les **PME** et les **organisations publiques** dans leurs tâches quotidiennes. Grâce à une interface moderne, une IA performante (DeepSeek) et une architecture modulaire basée sur des agents spécialisés, ABIA vous permet d’automatiser et d’optimiser la gestion documentaire, l’analyse de données, la rédaction de courriers, et plus encore.

---

## 🚀 Fonctionnalités principales

### 💬 Interface de Chat IA
- Interface inspirée de ChatGPT
- Support du Markdown
- Actions contextuelles (analyse, résumé, génération, etc.)
- Prise en charge des fichiers en entrée
- Historique des conversations

### 📁 Traitement de documents
- Extraction de texte depuis fichiers **PDF, DOCX, TXT**
- Résumé automatique de documents longs
- Analyse de contenu juridique, administratif ou RH
- **Indexation vectorielle** avec mémoire locale persistante

### 🌐 Traduction automatique de documents
- Traduction instantanée de **PDF, DOCX, TXT**
- Détection automatique de langue
- Choix de langue cible (FR, EN, ES…)
- Préservation de la mise en forme (si possible)

### 📊 Analyse de données
- Lecture de fichiers **Excel/CSV**
- Génération de tableaux croisés dynamiques
- Création automatique de graphiques
- Préparation de rapports (Word, Markdown, PDF)

### 📝 Rédaction automatique
- Génération de courriers types (administratif, RH, juridique…)
- Personnalisation du ton, style, destinataire
- Réécriture, correction ou amélioration de texte

### ⏳ Tâches asynchrones & programmables
- Chaque agent IA peut exécuter des tâches en **mode asynchrone**
- Programmation des tâches récurrentes (via cron interne)
- Gestion des files d’attente avec notifications locales

### 🧠 Agents IA spécialisés (via Langchain.js)
- **ExcelAgent** : analyse de tableaux, KPI, graphiques
- **DocAgent** : lecture et résumé de documents
- **MailAgent** : rédaction de courriers intelligents
- **TranslationAgent** : traduction automatique de fichiers
- Extensible avec vos propres agents (modèle plugin)

### 📊 Tableau de bord intelligent
- Vue d’ensemble des activités
- Statistiques d’usage, rappels, météo, notes rapides
- Widgets personnalisables

### ⚙️ Autres fonctionnalités
- Mode clair / sombre
- Multilingue (FR / EN)
- Notifications locales
- Mise à jour automatique (à venir)
- Sécurité locale des données (SQLite / NeDB)

---

## 🛠️ Technologies utilisées

| Composant         | Technologie                         |
|-------------------|-------------------------------------|
| Frontend          | HTML, Tailwind CSS, JS              |
| Backend           | Node.js, Electron.js                |
| IA & LLM          | Langchain.js + **DeepSeek**         |
| Scripts IA        | Python (via `child_process`)        |
| Stockage          | SQLite, NeDB                        |
| Docs & fichiers   | `docx`, `xlsx-populate`, `pdf-lib`  |

---

## 📦 Structure du projet