# Guía de Configuración de In-App Purchases (IAP)

Esta guía explica cómo configurar In-App Purchases para cumplir con los requisitos de Apple App Store y Google Play Store.

## 📋 Índice

1. [Instalación de Dependencias](#1-instalación-de-dependencias)
2. [Configuración de App Store Connect (iOS)](#2-configuración-de-app-store-connect-ios)
3. [Configuración de Google Play Console (Android)](#3-configuración-de-google-play-console-android)
4. [Configuración del Backend](#4-configuración-del-backend)
5. [Implementación en el Frontend](#5-implementación-en-el-frontend)
6. [Testing](#6-testing)
7. [Deployment](#7-deployment)

---

## 1. Instalación de Dependencias

### Frontend (React Native)

```bash
cd frontend
npm install react-native-iap
```

### iOS Setup

```bash
cd ios
pod install
cd ..
```

### Android Setup

Añadir al `android/app/build.gradle`:

```gradle
dependencies {
    ...
    implementation 'com.android.billingclient:billing:6.0.1'
}
```

---

## 2. Configuración de App Store Connect (iOS)

### Paso 1: Crear el Producto IAP

1. Ve a [App Store Connect](https://appstoreconnect.apple.com)
2. Selecciona tu app
3. Ve a **Features** → **In-App Purchases**
4. Click en **+ (Create)**
5. Selecciona **Auto-Renewable Subscription**

### Paso 2: Configurar el Producto

- **Reference Name**: `Premium Monthly`
- **Product ID**: `com.lafantasiadelgambleo.premium.monthly`
- **Subscription Group**: Crear nuevo grupo "Premium"
- **Subscription Duration**: 1 month
- **Price**: €4.99 / $4.99

### Paso 3: Localización

Añadir información localizada:
- **Display Name**: Premium Mensual / Monthly Premium
- **Description**: Accede a ligas premium con funciones exclusivas

### Paso 4: Obtener el Shared Secret

1. En App Store Connect, ve a **My Apps** → Tu App
2. **Features** → **In-App Purchases**
3. Click en **App-Specific Shared Secret**
4. Copia el valor (lo necesitarás para el backend)

### Paso 5: Configurar Sandbox Testers

1. Ve a **Users and Access** → **Sandbox**
2. Crea usuarios de prueba con emails distintos
3. **IMPORTANTE**: Nunca uses tu Apple ID personal como tester

---

## 3. Configuración de Google Play Console (Android)

### Paso 1: Configurar API de Google Play

1. Ve a [Google Play Console](https://play.google.com/console)
2. **Settings** → **API access**
3. **Link a Google Cloud Project** o crea uno nuevo
4. Habilita **Google Play Android Developer API**
5. Crea una **Service Account** y descarga el JSON

### Paso 2: Crear el Producto IAP

1. En Google Play Console, selecciona tu app
2. **Monetization** → **Products** → **Subscriptions**
3. Click en **Create subscription**

Configuración:
- **Product ID**: `com.lafantasiadelgambleo.premium.monthly`
- **Name**: Premium Mensual
- **Description**: Accede a ligas premium
- **Price**: €4.99 / $4.99
- **Billing period**: 1 month

### Paso 3: Configurar License Testers

1. **Setup** → **License testing**
2. Añade emails de cuentas de prueba
3. Selecciona "License Test Response" → **RESPOND_NORMALLY**

---

## 4. Configuración del Backend

### Variables de Entorno

Añade a tu `.env`:

```env
# Apple IAP
APPLE_SHARED_SECRET=tu_shared_secret_de_app_store_connect

# Google Play IAP (opcional para verificación avanzada)
GOOGLE_PLAY_SERVICE_ACCOUNT=ruta/al/service-account.json
```

### Rutas Añadidas

Ya están configuradas en `backend/src/routes/payment.routes.ts`:

- `POST /api/payments/verify-iap` - Verificar compra de IAP
- `POST /api/payments/restore-iap` - Restaurar compras anteriores

---

## 5. Implementación en el Frontend

### Actualizar el Componente de Upgrade Premium

Reemplaza el código de pago de Stripe/Web con IAP:

```typescript
import { IAPService } from '../../services/IAPService';

// En el componente donde manejas el upgrade a premium:

const handleUpgradeToPremium = async () => {
  try {
    setLoading(true);
    
    // Inicializar IAP Service
    await IAPService.initialize();
    
    // Mostrar productos disponibles (opcional)
    const products = IAPService.getProducts();
    console.log('Productos disponibles:', products);
    
    // Realizar la compra (abre el diálogo nativo de Apple/Google)
    const success = await IAPService.purchasePremium(ligaId);
    
    if (success) {
      Alert.alert(
        '¡Éxito!',
        'Tu liga ha sido actualizada a premium',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  } catch (error) {
    console.error('Error en upgrade:', error);
    Alert.alert('Error', 'No se pudo completar la compra');
  } finally {
    setLoading(false);
  }
};

// Botón de restaurar compras
const handleRestorePurchases = async () => {
  try {
    setLoading(true);
    await IAPService.restorePurchases();
  } catch (error) {
    console.error('Error restaurando:', error);
  } finally {
    setLoading(false);
  }
};
```

### Eliminar Referencias a Stripe

1. Busca y elimina imports de `@stripe/stripe-react-native`
2. Elimina botones/modales de pago web
3. Elimina referencias a `PaymentService` (Stripe)

---

## 6. Testing

### iOS Testing

1. **Logout de tu Apple ID**: Settings → iTunes & App Store → Sign Out
2. **Build en modo Debug**: `npm run ios`
3. Cuando intentes comprar, aparecerá un diálogo pidiendo login
4. **Usa un Sandbox Tester** (nunca tu Apple ID personal)
5. Confirma la compra (es gratis en sandbox)

### Android Testing

1. **Subir APK a Internal Testing** en Google Play Console
2. Añade tu cuenta a la lista de testers
3. Descarga la app desde el link de testing
4. Realiza la compra (es gratis con license testers)

### Verificar en Backend

Revisa los logs del backend para confirmar que:
- El recibo se verificó correctamente
- La liga se actualizó a `isPremium: true`

---

## 7. Deployment

### iOS Production

1. En Xcode, cambia el esquema a **Release**
2. Build → Archive
3. Sube a App Store Connect
4. En **App Information**, verifica que el IAP esté activo
5. Envía para revisión

### Android Production

1. Build release APK/AAB:
   ```bash
   cd android
   ./gradlew bundleRelease
   ```
2. Sube a **Production** en Google Play Console
3. Verifica que la suscripción esté **Active**
4. Envía para revisión

---

## 🚨 Checklist Antes de Enviar a Review

### iOS
- [ ] Producto IAP creado en App Store Connect
- [ ] Shared Secret configurado en backend
- [ ] Testeado con Sandbox Tester
- [ ] Eliminado todo código de Stripe/web payment
- [ ] Botón "Restore Purchases" visible
- [ ] Términos y política de privacidad actualizados

### Android
- [ ] Producto IAP creado en Google Play Console
- [ ] Testeado con License Tester
- [ ] Eliminado todo código de Stripe/web payment
- [ ] Botón "Restore Purchases" visible
- [ ] Términos y política de privacidad actualizados

---

## 📚 Recursos Adicionales

- [React Native IAP Docs](https://github.com/dooboolab/react-native-iap)
- [Apple IAP Guidelines](https://developer.apple.com/in-app-purchase/)
- [Google Play Billing](https://developer.android.com/google/play/billing)
- [App Store Review Guidelines - 3.1.1](https://developer.apple.com/app-store/review/guidelines/#in-app-purchase)

---

## ⚠️ Notas Importantes

1. **Nunca uses tu Apple ID personal para testing** - Usa Sandbox Testers
2. **Los precios deben ser iguales en iOS y Android** - Apple rechazará si no lo son
3. **Botón "Restore Purchases" es obligatorio** - Apple lo requiere
4. **No menciones otras plataformas de pago** - No digas "más barato en web"
5. **Testing exhaustivo** - Prueba compra, restauración y cancelación

---

## 🐛 Troubleshooting

### Error: "No products found"
- Verifica que el Product ID coincida exactamente
- En iOS, espera 1-2 horas después de crear el producto
- Verifica que el producto esté en estado "Ready to Submit"

### Error: "Cannot connect to iTunes Store" (Sandbox)
- Verifica que estés usando un Sandbox Tester
- Cierra sesión de tu Apple ID personal
- Reinicia la app

### Error: "Purchase already owned"
- En sandbox, las compras son gratis pero quedan "activas"
- Usa otro Sandbox Tester
- O cancela la suscripción en Settings → Apple ID → Subscriptions

### Error: "Receipt verification failed"
- Verifica el APPLE_SHARED_SECRET en el backend
- Asegúrate de estar usando la URL correcta (sandbox vs production)
- Revisa que el receipt sea el correcto (iOS envía base64)
