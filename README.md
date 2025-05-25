# Carte Parcoursup - Visualisation des étudiants

Ce projet permet de visualiser sur une carte interactive la répartition géographique des étudiants à partir d'un fichier Excel contenant leurs informations.

## Prérequis

- Node.js (version 18 ou supérieure)
- Docker et Docker Compose
- Un fichier Excel avec les colonnes suivantes :
  - `étudiant` ou `etudiant` : nom de l'étudiant
  - `ville` : ville de l'étudiant

## Installation

1. Cloner le repository :
```bash
git clone [URL_DU_REPO]
cd Epitech_Map
```

2. Installer les dépendances :
```bash
npm install
```

3. Lancer les services Docker (nécessaires pour le géocodage) :
```bash
docker-compose up -d
```

## Lancement

1. Démarrer l'application en mode développement :
```bash
npm run dev
```

2. Ouvrir votre navigateur à l'adresse : `http://localhost:5173`

## Utilisation

1. Sur la page d'accueil, cliquez sur le bouton "Choisir un fichier" pour sélectionner votre fichier Excel
2. Le système va automatiquement :
   - Lire le fichier Excel
   - Géocoder les villes des étudiants
   - Afficher les points sur la carte
3. Une barre de progression vous indique l'avancement du traitement
4. Une fois terminé, vous verrez tous les étudiants placés sur la carte

## Fonctionnalités

- Visualisation interactive sur une carte Leaflet
- Géocodage automatique des villes
- Barre de progression pendant le traitement
- Gestion des erreurs avec messages explicites
- Interface responsive

## Structure du projet

```
Epitech_Map/
├── src/
│   ├── components/
│   │   └── LeafletMap.tsx    # Composant de la carte
│   ├── App.tsx              # Composant principal
│   └── main.tsx             # Point d'entrée
├── public/                  # Fichiers statiques
├── docker-compose.yml       # Configuration Docker
└── vite.config.ts          # Configuration Vite
```

## Dépannage

Si vous rencontrez des problèmes :

1. Vérifiez que Docker est bien lancé
2. Assurez-vous que le fichier Excel est au bon format
3. Vérifiez que les noms de colonnes sont exactement "étudiant" (ou "etudiant") et "ville"
4. Consultez la console du navigateur pour plus de détails sur les erreurs

## Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
1. Fork le projet
2. Créer une branche pour votre fonctionnalité
3. Commiter vos changements
4. Pousser vers la branche
5. Ouvrir une Pull Request
