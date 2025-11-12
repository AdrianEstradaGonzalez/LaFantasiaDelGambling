#!/bin/bash

echo "🚀 Instalando Sistema de Notificaciones Push..."
echo ""

# Backend
echo "📦 Instalando dependencias del backend..."
cd backend
npm install firebase-admin
echo "✅ Dependencias del backend instaladas"
echo ""

# Frontend
echo "📦 Instalando dependencias del frontend..."
cd ../frontend
npm install @react-native-firebase/app @react-native-firebase/messaging @notifee/react-native
echo "✅ Dependencias del frontend instaladas"
echo ""

# iOS Pods (si existe carpeta ios)
if [ -d "ios" ]; then
    echo "📦 Instalando pods de iOS..."
    cd ios
    pod install
    cd ..
    echo "✅ Pods de iOS instalados"
else
    echo "⚠️  Carpeta ios no encontrada, saltando instalación de pods"
fi

echo ""
echo "✅ ¡Instalación completada!"
echo ""
echo "📋 Próximos pasos:"
echo "1. Configura Firebase Console y descarga los archivos de configuración"
echo "2. Ejecuta la migración de Prisma: cd backend && npx prisma migrate dev --name add_device_tokens"
echo "3. Configura las variables de entorno en backend/.env"
echo "4. Lee NOTIFICACIONES_GUIA_COMPLETA.md para más detalles"
echo ""
