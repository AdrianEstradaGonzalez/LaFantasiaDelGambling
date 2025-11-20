#!/bin/bash

# Script para eliminar frameworks problemáticos de Hermes antes de distribuir
# Esto evita el error "Invalid Signature" de Apple

echo "🔧 Limpiando frameworks de Hermes para distribución..."

# Ruta al producto compilado
APP_PATH="${TARGET_BUILD_DIR}/${WRAPPER_NAME}"
FRAMEWORKS_PATH="${APP_PATH}/Frameworks"

if [ -d "${FRAMEWORKS_PATH}" ]; then
    echo "📁 Frameworks encontrados en: ${FRAMEWORKS_PATH}"
    
    # Eliminar hermes.framework si existe
    if [ -d "${FRAMEWORKS_PATH}/hermes.framework" ]; then
        echo "❌ Eliminando hermes.framework..."
        rm -rf "${FRAMEWORKS_PATH}/hermes.framework"
    fi
    
    # Strip de todos los frameworks para eliminar símbolos innecesarios
    echo "🔨 Stripping símbolos de frameworks..."
    find "${FRAMEWORKS_PATH}" -name '*.framework' -type d | while read framework; do
        FRAMEWORK_EXECUTABLE_NAME=$(defaults read "$framework/Info.plist" CFBundleExecutable 2>/dev/null)
        if [ -n "$FRAMEWORK_EXECUTABLE_NAME" ]; then
            FRAMEWORK_EXECUTABLE_PATH="$framework/$FRAMEWORK_EXECUTABLE_NAME"
            if [ -f "$FRAMEWORK_EXECUTABLE_PATH" ]; then
                echo "  ✂️  Stripping: $(basename $framework)"
                strip -x "$FRAMEWORK_EXECUTABLE_PATH"
            fi
        fi
    done
    
    echo "✅ Limpieza completada"
else
    echo "⚠️  No se encontró la carpeta Frameworks"
fi
