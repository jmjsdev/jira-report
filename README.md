# Jira Report

Application HTML/JS pure pour le suivi et la gestion de tickets JIRA exportés.

## Fonctionnalités

- **Import XML JIRA** : Importez vos exports XML JIRA
- **Mise à jour sélective** : Choisissez les champs et tickets à mettre à jour lors d'un import
- **Gestion des tâches** : Marquez les tickets comme terminés, modifiez les labels, dates d'échéance
- **Filtres avancés** : Par projet, rapporteur, tag, statut
- **Timeline visuelle** : Vue chronologique des échéances
- **Rapport** : Génération de rapport en format texte
- **Sauvegarde locale** : File System Access API pour sauvegarde directe, IndexedDB en fallback
- **Configuration** : Tags personnalisés, règles de projet, blacklist de tickets

## Installation

### Option 1 : Release (recommandé)

1. Téléchargez la dernière release depuis [GitHub Releases](https://github.com/jmjsdev/jira-report/releases)
2. Décompressez l'archive
3. Ouvrez `index.html` dans votre navigateur

### Option 2 : Build depuis les sources

```bash
# Cloner le repo
git clone https://github.com/jmjsdev/jira-report.git
cd jira-report

# Installer les dépendances
npm install

# Build
npm run build

# Ouvrir index.html dans un navigateur
```

## Utilisation

### Raccourcis clavier

| Raccourci | Action |
|-----------|--------|
| `Ctrl+S` | Sauvegarder |
| `Ctrl+O` | Ouvrir un fichier |
| `Ctrl+I` | Importer XML JIRA |

### Import XML JIRA

1. Exportez vos tickets depuis JIRA au format XML (RSS)
2. Cliquez sur "Import XML" ou utilisez `Ctrl+I`
3. Sélectionnez le fichier XML
4. Les tickets sont automatiquement parsés et ajoutés

### Mise à jour de tickets existants

Lors d'un import, si des tickets existent déjà :
- Choisissez les champs à mettre à jour (titre, statut, échéance, priorité, labels)
- Sélectionnez les tickets spécifiques à mettre à jour
- Les autres tickets seront ignorés

### Configuration

Accédez à la configuration via le bouton "Config" pour :
- Ajouter des tags personnalisés
- Définir des règles de projet (projets à afficher dans les filtres)
- Gérer la blacklist de tickets

## Structure du projet

```
jira-report/
├── index.html          # Point d'entrée
├── styles/             # Fichiers CSS
│   ├── main.css
│   ├── components.css
│   ├── timeline.css
│   └── modals.css
├── js/                 # Sources JavaScript (ES modules)
│   ├── app.js          # Point d'entrée JS
│   ├── state.js        # État global (pattern store)
│   ├── config.js       # Configuration statique
│   ├── components/     # Composants UI
│   ├── services/       # Services (storage, config)
│   ├── parsers/        # Parsers (XML JIRA)
│   └── utils/          # Utilitaires
├── vendors/            # Librairies tierces
└── scripts/            # Scripts de build/release
```

## Technologies

- **HTML/CSS/JavaScript** : Pas de framework, application vanilla
- **ES Modules** : Architecture modulaire bundlée avec esbuild
- **File System Access API** : Sauvegarde directe sur le système de fichiers
- **IndexedDB** : Fallback pour les navigateurs non compatibles

## Développement

```bash
# Mode watch (rebuild automatique)
npm run watch
```

## Créer une release

```bash
./scripts/release.sh v1.0.0
```

Le script :
1. Build le bundle JavaScript
2. Crée une archive ZIP avec les fichiers nécessaires
3. Publie une release sur GitHub avec l'archive en pièce jointe

## Licence

MIT
