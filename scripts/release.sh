#!/bin/bash

# Script de release - Package l'application et crée une release GitHub
# Usage: ./scripts/release.sh <version>
# Exemple: ./scripts/release.sh v1.0.0

set -e

# Version requise
VERSION=${1}

if [ -z "$VERSION" ]; then
  echo "Usage: ./scripts/release.sh <version>"
  echo "Exemple: ./scripts/release.sh v1.0.0"
  exit 1
fi

RELEASE_NAME="jira-report-${VERSION}"
ZIP_NAME="${RELEASE_NAME}.zip"

echo "=== Jira Report Release Script ==="
echo "Version: ${VERSION}"
echo ""

# Créer un dossier temporaire pour la release
TEMP_DIR=$(mktemp -d)
BUILD_DIR="${TEMP_DIR}/${RELEASE_NAME}"
mkdir -p "${BUILD_DIR}"

echo "1. Build du bundle..."
npm run build

echo "2. Copie des fichiers..."

# Copier les fichiers nécessaires
cp index.html "${BUILD_DIR}/"
cp debug.html "${BUILD_DIR}/"
cp -r styles "${BUILD_DIR}/"
cp -r vendors "${BUILD_DIR}/"

# Créer le dossier js et copier uniquement le bundle
mkdir -p "${BUILD_DIR}/js"
cp js/app.bundle.js "${BUILD_DIR}/js/"

echo "2.1 Injection de la version..."

# Date de build
BUILD_DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Ajouter la version au bundle JS
sed -i '' "1i\\
/* Jira Report ${VERSION} - Build: ${BUILD_DATE} */
" "${BUILD_DIR}/js/app.bundle.js"

# Ajouter la version aux fichiers CSS
for css_file in "${BUILD_DIR}/styles/"*.css; do
  sed -i '' "1i\\
/* Jira Report ${VERSION} - Build: ${BUILD_DATE} */
" "$css_file"
done

# Ajouter la version dans le HTML (meta tag + commentaire)
sed -i '' "s|<head>|<head>\\
  <meta name=\"version\" content=\"${VERSION}\">\\
  <!-- Jira Report ${VERSION} - Build: ${BUILD_DATE} -->|" "${BUILD_DIR}/index.html"

# Ajouter la version visible dans le footer
sed -i '' "s|Jira Report - Application HTML/JS pure|Jira Report ${VERSION}|" "${BUILD_DIR}/index.html"

echo "3. Création de l'archive..."

# Créer le zip
cd "${TEMP_DIR}"
zip -r "${ZIP_NAME}" "${RELEASE_NAME}"
cd "${OLDPWD}"

ZIP_PATH="${TEMP_DIR}/${ZIP_NAME}"
ZIP_SIZE=$(du -h "${ZIP_PATH}" | cut -f1)

echo "   Archive: ${ZIP_NAME}"
echo "   Taille:  ${ZIP_SIZE}"
echo ""

echo "4. Création de la release GitHub..."

# Créer la release GitHub avec le zip en pièce jointe
gh release create "${VERSION}" \
  "${ZIP_PATH}" \
  --title "Jira Report ${VERSION}" \
  --notes "## Jira Report ${VERSION}

### Installation
1. Télécharger \`${ZIP_NAME}\`
2. Extraire le zip
3. Ouvrir \`index.html\` dans un navigateur

### Contenu
- Application HTML/JS pure (pas de serveur requis)
- Import XML JIRA
- Sauvegarde/chargement avec File System Access API
- Filtres, timeline, rapports
"

# Nettoyage
rm -rf "${TEMP_DIR}"

echo ""
echo "5. Release créée avec succès!"
echo "   https://github.com/jmjsdev/jira-report/releases/tag/${VERSION}"
