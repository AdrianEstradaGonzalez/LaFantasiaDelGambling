#!/bin/bash
set -e

# Navega al directorio de ios
cd ios

# Elimina instalaciones de pods anteriores
echo "Limpiando instalaciones de Pods anteriores..."
rm -rf Pods Podfile.lock frontend.xcworkspace
pod deintegrate || true
rm -rf Pods Podfile.lock frontend.xcworkspace

# Instala los pods
echo "Instalando Pods..."
pod install --repo-update

echo "¡Proceso completado! Por favor, abre 'frontend.xcworkspace' en Xcode."
