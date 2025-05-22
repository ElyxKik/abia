Voici une analyse structurée des données extraites du fichier Excel **exceltest.xls** (feuille **CapBudgWS**) :

---

### **1. Structure du Document**
- **Type** : Tableau financier pour l'analyse d'un projet d'investissement (équité).
- **Sections claires** :
  - **Initial Investment** : Coûts initiaux, crédits d'impôts, valeur de récupération.
  - **Cashflow Details** : Revenus, dépenses (variables/fixes), taux d'imposition.
  - **Discount Rate** : Calcul du taux d'actualisation (méthode CAPM utilisée).
  - **Working Capital** : Besoin en fonds de roulement.
  - **Growth Rates** : Taux de croissance des revenus et dépenses par année.

---

### **2. Données Clés**

#### **Investissement Initial**
- **Montant total** : 50 000 (avec crédit d'impôt de 10% → 5 000).
- **Coût d'opportunité** : 7 484 (coût implicite si le projet n'est pas réalisé).
- **Valeur de récupération** : 10 000 en fin de projet (année 10).
- **Méthode d'amortissement** : DDB (Double Declining Balance).

#### **Flux de Trésorerie**
- **Revenus Année 1** : 40 000.
- **Dépenses variables** : 50% des revenus.
- **Taux d'imposition** : 40%.
- **Croissance des revenus** : +10% par an jusqu'à l'année 5, puis stagnation.

#### **Taux d'Actualisation**
- **Méthode CAPM** (Approche 2) :
  - **Beta** : 0.9.
  - **Taux sans risque** : 8%.
  - **Prime de risque marché** : 5.5%.
  - **Ratio d'endettement** : 30%.
  - **Coût de la dette** : 9%.
  - **Taux calculé** : **10.685%**.

#### **Fonds de Roulement**
- **Investissement initial** : 10 000.
- **Ratio WC/Revenus** : 25%.
- **Valeur récupérable en fin de projet** : 100%.

---

### **3. Points d'Attention**
- **Données manquantes** : Certaines colonnes sont libellées "Unnamed" (ex. colonnes vides ou formules masquées).
- **Hypothèses de croissance** : Les dépenses fixes suivent la croissance des revenus par défaut (peut nécessiter vérification).
- **Troncature des données** : Les flux de trésorerie détaillés par année ne sont pas visibles dans l'extrait.

---

### **4. Recommandations pour Analyse Complète**
- **Vérifier les formules** : S'assurer que le calcul du taux d'actualisation (CAPM) et des flux de trésorerie est correct.
- **Compléter les données** : Renseigner les colonnes vides ou étiquetées "Unnamed".
- **Scénarios de sensibilité** : Tester l'impact d'une variation des taux de croissance ou du beta sur la VAN.

---

### **Résumé**
Ce document est un modèle d'analyse financière pour un projet, avec des entrées utilisateur (en gras) et des calculs automatisés. Les données suggèrent un investissement initial de 50 000, des revenus croissants sur 5 ans, et un taux d'actualisation de 10.7%. Une revue détaillée des formules et hypothèses est recommandée pour validation.
