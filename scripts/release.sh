#!/bin/bash

# Script de release - Package l'application dans un zip
# Usage: ./scripts/release.sh [version]

set -e

# Version par défaut ou passée en argument
VERSION=${1:-$(date +%Y%m%d-%H%M%S)}
RELEASE_DIR="releases"
RELEASE_NAME="jira-report-${VERSION}"
ZIP_NAME="${RELEASE_NAME}.zip"

echo "=== Jira Report Release Script ==="
echo "Version: ${VERSION}"
echo ""

# Créer le dossier releases si nécessaire
mkdir -p "${RELEASE_DIR}"

# Créer un dossier temporaire pour la release
TEMP_DIR=$(mktemp -d)
BUILD_DIR="${TEMP_DIR}/${RELEASE_NAME}"
mkdir -p "${BUILD_DIR}"

echo "1. Copie des fichiers..."

# Copier les fichiers nécessaires
cp index.html "${BUILD_DIR}/"
cp -r styles "${BUILD_DIR}/"
cp -r vendors "${BUILD_DIR}/"

# Créer le dossier js et copier uniquement le bundle
mkdir -p "${BUILD_DIR}/js"
cp js/app.bundle.js "${BUILD_DIR}/js/"

echo "2. Création de l'archive..."

# Créer le zip
cd "${TEMP_DIR}"
zip -r "${ZIP_NAME}" "${RELEASE_NAME}"
mv "${ZIP_NAME}" "${OLDPWD}/${RELEASE_DIR}/"
cd "${OLDPWD}"

# Nettoyage
rm -rf "${TEMP_DIR}"

echo "3. Release créée avec succès!"
echo ""
echo "   Archive: ${RELEASE_DIR}/${ZIP_NAME}"
echo "   Taille:  $(du -h "${RELEASE_DIR}/${ZIP_NAME}" | cut -f1)"
echo ""
echo "Contenu de l'archive:"
unzip -l "${RELEASE_DIR}/${ZIP_NAME}"
